// SoloControlPlane - local durable loop controller.
// It turns the markdown loop into resumable state: triggers, phase checkpoints, approvals, traces,
// budget stops, worktree leases, and improvement candidates.
import { createClient, type Client } from "@libsql/client";
import { nanoid } from "nanoid";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CONTROL_SCHEMA_SQL } from "./schema";
import { type GraphContextReceipt, requireGraphContext } from "../context/graphContext";

export const loopPhases = ["discover", "benchmark", "setup", "build", "adapter", "iterate", "verify"] as const;
export type LoopPhase = (typeof loopPhases)[number];
export type LoopStatus = "queued" | "running" | "paused" | "blocked" | "completed";
export type ApprovalDecision = "approve" | "edit" | "reject" | "respond";

export type LoopRow = {
  id: string;
  projectId: string;
  goal: string;
  status: LoopStatus;
  currentPhase: LoopPhase;
  budgetUsd: number;
  spentUsd: number;
  policy: Record<string, unknown>;
  context?: GraphContextReceipt;
  createdAt: number;
  updatedAt: number;
};

export type TraceSpanInput = {
  phase: LoopPhase;
  name: string;
  status: "ok" | "error" | "refuted";
  startedAt?: number;
  endedAt?: number;
  tokens?: number;
  costUsd?: number;
  attrs?: Record<string, unknown>;
};

function ensureFileDir(url: string) {
  if (!url.startsWith("file:")) return;
  const p = url.slice(5).split("?")[0];
  if (p && p !== ":memory:") mkdirSync(dirname(p), { recursive: true });
}

function json(value: unknown) {
  return JSON.stringify(value ?? {});
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class SoloControlPlane {
  private readonly db: Client;
  private readonly now: () => number;

  constructor(args: { dbUrl?: string; now?: () => number } = {}) {
    const url = args.dbUrl ?? process.env.SOLO_CONTROL_DB_URL ?? "file:.solo-control/control.db";
    ensureFileDir(url);
    this.db = createClient({ url });
    this.now = args.now ?? (() => Date.now());
  }

  async init() {
    await this.db.executeMultiple(CONTROL_SCHEMA_SQL);
  }

  async startLoop(args: {
    projectId: string;
    goal: string;
    budgetUsd: number;
    policy?: Record<string, unknown>;
    context?: GraphContextReceipt;
  }) {
    const id = `loop_${nanoid(10)}`;
    const now = this.now();
    await this.db.execute({
      sql: `INSERT INTO control_loops(id, project_id, goal, status, current_phase, budget_usd, spent_usd, policy_json, context_receipt_json, created_at, updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id,
        args.projectId,
        args.goal,
        "queued",
        "discover",
        args.budgetUsd,
        0,
        json(args.policy ?? {}),
        args.context ? json(args.context) : null,
        now,
        now,
      ],
    });
    return { loopId: id };
  }

  async ingestTrigger(args: {
    source: string;
    idempotencyKey: string;
    projectId: string;
    goal: string;
    budgetUsd: number;
    payload?: Record<string, unknown>;
  }) {
    const existing = await this.db.execute({
      sql: `SELECT loop_id FROM control_events WHERE source = ? AND idempotency_key = ?`,
      args: [args.source, args.idempotencyKey],
    });
    if (existing.rows[0]) {
      return { duplicate: true, loopId: String(existing.rows[0].loop_id) };
    }

    const { loopId } = await this.startLoop({
      projectId: args.projectId,
      goal: args.goal,
      budgetUsd: args.budgetUsd,
      policy: { triggerSource: args.source },
    });
    await this.recordEvent(loopId, {
      kind: "trigger",
      source: args.source,
      idempotencyKey: args.idempotencyKey,
      payload: args.payload ?? {},
    });
    return { duplicate: false, loopId };
  }

  async attachContext(loopId: string, context: GraphContextReceipt) {
    await this.db.execute({
      sql: `UPDATE control_loops SET context_receipt_json = ?, updated_at = ? WHERE id = ?`,
      args: [json(context), this.now(), loopId],
    });
  }

  async startPhase(loopId: string, phase: LoopPhase) {
    const loop = await this.getLoop(loopId);
    if (!loop) throw new Error(`loop not found: ${loopId}`);
    if (phase !== "discover") {
      if (!loop.context) throw new Error(`phase '${phase}' requires graph context receipt`);
      requireGraphContext(loop.context, phase);
    }

    const count = await this.db.execute({
      sql: `SELECT COUNT(*) AS n FROM control_phase_runs WHERE loop_id = ? AND phase = ?`,
      args: [loopId, phase],
    });
    const attempt = Number(count.rows[0]?.n ?? 0) + 1;
    const id = `phase_${nanoid(10)}`;
    const now = this.now();
    await this.db.execute({
      sql: `INSERT INTO control_phase_runs(id, loop_id, phase, status, attempt, checkpoint_json, started_at)
            VALUES(?,?,?,?,?,?,?)`,
      args: [id, loopId, phase, "running", attempt, "{}", now],
    });
    await this.updateLoop(loopId, { status: "running", currentPhase: phase });
    return { phaseRunId: id, attempt };
  }

  async checkpointPhase(phaseRunId: string, checkpoint: Record<string, unknown>) {
    await this.db.execute({
      sql: `UPDATE control_phase_runs SET checkpoint_json = ? WHERE id = ?`,
      args: [json(checkpoint), phaseRunId],
    });
  }

  async completePhase(phaseRunId: string, checkpoint: Record<string, unknown> = {}) {
    const row = await this.db.execute({
      sql: `SELECT loop_id FROM control_phase_runs WHERE id = ?`,
      args: [phaseRunId],
    });
    const loopId = row.rows[0]?.loop_id;
    if (!loopId) throw new Error(`phase run not found: ${phaseRunId}`);
    await this.db.execute({
      sql: `UPDATE control_phase_runs SET status = 'completed', checkpoint_json = ?, completed_at = ? WHERE id = ?`,
      args: [json(checkpoint), this.now(), phaseRunId],
    });
    await this.updateLoop(String(loopId), { status: "queued" });
  }

  async requestApproval(loopId: string, phase: LoopPhase, request: Record<string, unknown>) {
    const id = `approval_${nanoid(10)}`;
    await this.db.execute({
      sql: `INSERT INTO control_approvals(id, loop_id, phase, request_json, status, created_at)
            VALUES(?,?,?,?,?,?)`,
      args: [id, loopId, phase, json(request), "pending", this.now()],
    });
    await this.updateLoop(loopId, { status: "paused", currentPhase: phase });
    return { approvalId: id };
  }

  async decideApproval(approvalId: string, decision: { decision: ApprovalDecision; note?: string; edits?: Record<string, unknown> }) {
    const row = await this.db.execute({
      sql: `SELECT loop_id FROM control_approvals WHERE id = ?`,
      args: [approvalId],
    });
    const loopId = row.rows[0]?.loop_id;
    if (!loopId) throw new Error(`approval not found: ${approvalId}`);
    await this.db.execute({
      sql: `UPDATE control_approvals SET status = ?, decision_json = ?, decided_at = ? WHERE id = ?`,
      args: [decision.decision, json(decision), this.now(), approvalId],
    });
    await this.updateLoop(String(loopId), { status: decision.decision === "reject" ? "blocked" : "queued" });
  }

  async spend(loopId: string, amountUsd: number, label: string, attrs: Record<string, unknown> = {}) {
    const loop = await this.getLoop(loopId);
    if (!loop) throw new Error(`loop not found: ${loopId}`);
    const next = loop.spentUsd + amountUsd;
    if (next > loop.budgetUsd) {
      await this.recordEvent(loopId, {
        kind: "budget_exceeded",
        source: "control-plane",
        idempotencyKey: `budget-${nanoid(8)}`,
        payload: { label, amountUsd, spentUsd: loop.spentUsd, budgetUsd: loop.budgetUsd, attrs },
      });
      await this.updateLoop(loopId, { status: "paused" });
      return { allowed: false, spentUsd: loop.spentUsd, budgetUsd: loop.budgetUsd };
    }
    await this.db.execute({
      sql: `UPDATE control_loops SET spent_usd = ?, updated_at = ? WHERE id = ?`,
      args: [next, this.now(), loopId],
    });
    await this.recordEvent(loopId, {
      kind: "spend",
      source: "control-plane",
      idempotencyKey: `spend-${nanoid(8)}`,
      payload: { label, amountUsd, spentUsd: next, attrs },
    });
    return { allowed: true, spentUsd: next, budgetUsd: loop.budgetUsd };
  }

  async recordTraceSpan(loopId: string, input: TraceSpanInput) {
    const startedAt = input.startedAt ?? this.now();
    const endedAt = input.endedAt ?? this.now();
    const id = `trace_${nanoid(10)}`;
    await this.db.execute({
      sql: `INSERT INTO control_traces(id, loop_id, phase, name, status, started_at, ended_at, duration_ms, tokens, cost_usd, attrs_json)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id,
        loopId,
        input.phase,
        input.name,
        input.status,
        startedAt,
        endedAt,
        Math.max(0, endedAt - startedAt),
        input.tokens ?? 0,
        input.costUsd ?? 0,
        json(input.attrs ?? {}),
      ],
    });
    if (input.costUsd && input.costUsd > 0) {
      await this.spend(loopId, input.costUsd, `trace:${input.name}`, { phase: input.phase });
    }
    return { traceId: id };
  }

  async proposeImprovement(args: {
    loopId: string;
    sourceTraceId?: string;
    title: string;
    hypothesis: string;
    patchHint: string;
    scoreDelta?: number;
  }) {
    const id = `improve_${nanoid(10)}`;
    await this.db.execute({
      sql: `INSERT INTO control_improvements(id, loop_id, source_trace_id, title, hypothesis, patch_hint, status, score_delta, created_at)
            VALUES(?,?,?,?,?,?,?,?,?)`,
      args: [
        id,
        args.loopId,
        args.sourceTraceId ?? null,
        args.title,
        args.hypothesis,
        args.patchHint,
        "proposed",
        args.scoreDelta ?? null,
        this.now(),
      ],
    });
    return { improvementId: id };
  }

  async leaseWorktree(loopId: string, purpose: string, path: string, branch: string) {
    const active = await this.db.execute({
      sql: `SELECT id FROM control_worktrees WHERE loop_id = ? AND purpose = ? AND status = 'active'`,
      args: [loopId, purpose],
    });
    if (active.rows[0]) throw new Error(`active worktree lease already exists for ${purpose}`);
    const id = `wt_${nanoid(10)}`;
    await this.db.execute({
      sql: `INSERT INTO control_worktrees(id, loop_id, purpose, path, branch, status, created_at)
            VALUES(?,?,?,?,?,?,?)`,
      args: [id, loopId, purpose, path, branch, "active", this.now()],
    });
    return { leaseId: id };
  }

  async releaseWorktree(leaseId: string) {
    await this.db.execute({
      sql: `UPDATE control_worktrees SET status = 'released', released_at = ? WHERE id = ?`,
      args: [this.now(), leaseId],
    });
  }

  async getLoop(loopId: string): Promise<LoopRow | null> {
    const r = await this.db.execute({ sql: `SELECT * FROM control_loops WHERE id = ?`, args: [loopId] });
    const row = r.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      goal: String(row.goal),
      status: row.status as LoopStatus,
      currentPhase: row.current_phase as LoopPhase,
      budgetUsd: Number(row.budget_usd),
      spentUsd: Number(row.spent_usd),
      policy: parseJson<Record<string, unknown>>(row.policy_json, {}),
      context: parseJson<GraphContextReceipt | undefined>(row.context_receipt_json, undefined),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }

  async resumeSummary(loopId: string) {
    const loop = await this.getLoop(loopId);
    if (!loop) throw new Error(`loop not found: ${loopId}`);
    const pendingApprovals = await this.db.execute({
      sql: `SELECT id, phase, request_json FROM control_approvals WHERE loop_id = ? AND status = 'pending' ORDER BY created_at ASC`,
      args: [loopId],
    });
    const improvements = await this.db.execute({
      sql: `SELECT id, title, status, source_trace_id FROM control_improvements WHERE loop_id = ? ORDER BY created_at ASC`,
      args: [loopId],
    });
    const traces = await this.db.execute({
      sql: `SELECT COUNT(*) AS n, COALESCE(SUM(tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost FROM control_traces WHERE loop_id = ?`,
      args: [loopId],
    });
    return {
      loop,
      pendingApprovals: pendingApprovals.rows.map((row) => ({
        id: String(row.id),
        phase: String(row.phase),
        request: parseJson<Record<string, unknown>>(row.request_json, {}),
      })),
      improvements: improvements.rows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        status: String(row.status),
        sourceTraceId: row.source_trace_id ? String(row.source_trace_id) : undefined,
      })),
      traceSummary: {
        count: Number(traces.rows[0]?.n ?? 0),
        tokens: Number(traces.rows[0]?.tokens ?? 0),
        costUsd: Number(traces.rows[0]?.cost ?? 0),
      },
    };
  }

  private async recordEvent(loopId: string, args: { kind: string; source: string; idempotencyKey: string; payload: Record<string, unknown> }) {
    await this.db.execute({
      sql: `INSERT INTO control_events(id, loop_id, kind, source, idempotency_key, payload_json, created_at)
            VALUES(?,?,?,?,?,?,?)`,
      args: [`evt_${nanoid(10)}`, loopId, args.kind, args.source, args.idempotencyKey, json(args.payload), this.now()],
    });
  }

  private async updateLoop(loopId: string, patch: { status?: LoopStatus; currentPhase?: LoopPhase }) {
    const loop = await this.getLoop(loopId);
    if (!loop) throw new Error(`loop not found: ${loopId}`);
    await this.db.execute({
      sql: `UPDATE control_loops SET status = ?, current_phase = ?, updated_at = ? WHERE id = ?`,
      args: [patch.status ?? loop.status, patch.currentPhase ?? loop.currentPhase, this.now(), loopId],
    });
  }
}
