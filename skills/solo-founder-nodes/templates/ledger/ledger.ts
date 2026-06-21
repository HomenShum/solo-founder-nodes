// SoloLedger — local-first honest-lane eval ledger that DERIVES the gate, never accepts it.
// Implements (fully, locally): S9 derive-the-gate + quarantine-on-disagreement, S12 split sealing +
// immutable split-ledger (reject tuned reuse / off-manifest), S14 memory-leak taint, S16 hash-chain.
// Hooks (app-coupled, wired here): S10 writer receipt (tied to deliverable bytes), S11 signed transport
// (nonce issued per run), S15 independent verifier. The harness produces the receipts; the ledger checks them.
import { createClient, type Client } from "@libsql/client";
import { nanoid } from "nanoid";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { LEDGER_SCHEMA_SQL } from "./schema";
import { deriveCleanProbe, type GateEvidence } from "./gate";
import { sha256, hmac, canon } from "./hash";

// A `file:` db needs its parent dir to exist before libsql opens it (else SQLITE_CANTOPEN).
function ensureFileDir(url: string) {
  if (!url.startsWith("file:")) return;
  const p = url.slice(5).split("?")[0];
  if (p && p !== ":memory:") mkdirSync(dirname(p), { recursive: true });
}

export type WriterReceipt = { firedWriterLeaf: string; deliverableHash: string };
export type TransportReceipt = { tokensUsed: number; nonce: string };
export type Verifier = (taskId: string, reward: number) => Promise<boolean>; // true = refuted

export type RecordInput = {
  taskId: string;
  reward: number;
  writer: WriterReceipt;        // S10
  transport: TransportReceipt;  // S11
  deliverableHash: string;      // actual bytes hash; must equal writer.deliverableHash
  recalledMemoryLeak?: boolean; // S14 (caller computes via contentGate over recalled memory)
  claimedClean?: boolean;       // S9: agent self-report — used ONLY to detect disagreement
};

export class SoloLedger {
  private db: Client;
  private salt: string;
  private now: () => number;

  constructor(o: { dbUrl?: string; salt?: string; now?: () => number } = {}) {
    const url = o.dbUrl ?? process.env.SOLO_LEDGER_DB_URL ?? "file:.solo-ledger/ledger.db";
    ensureFileDir(url);
    this.db = createClient({ url });
    this.salt = o.salt ?? process.env.SOLO_LEDGER_SALT ?? "dev-salt-change-me";
    this.now = o.now ?? (() => Date.now());
  }

  async init() {
    await this.db.executeMultiple(LEDGER_SCHEMA_SQL);
  }

  private async splitOf(taskId: string): Promise<"tuned" | "held-out" | undefined> {
    const r = await this.db.execute({ sql: `SELECT split FROM split_ledger WHERE task_id = ?`, args: [taskId] });
    return r.rows[0]?.split as "tuned" | "held-out" | undefined;
  }

  /** S12: record tuned tasks first. First-seen split is permanent; a held-out task can never be re-marked tuned. */
  async markTuned(taskIds: string[]) {
    for (const id of taskIds) {
      const cur = await this.splitOf(id);
      if (cur === "held-out") throw new Error(`split violation: ${id} sealed held-out, cannot mark tuned`);
      if (!cur) await this.db.execute({ sql: `INSERT INTO split_ledger(task_id, split, first_seen_at) VALUES(?, 'tuned', ?)`, args: [id, this.now()] });
    }
  }

  /** S12: seal the held-out manifest once. A task already tuned cannot be sealed held-out. Returns the HMAC. */
  async sealHeldOut(taskIds: string[]): Promise<string> {
    const sorted = [...new Set(taskIds)].sort();
    for (const id of sorted) {
      if ((await this.splitOf(id)) === "tuned") throw new Error(`split violation: ${id} was tuned, cannot seal as held-out`);
    }
    const hash = hmac(this.salt, sorted.join(","));
    const now = this.now();
    await this.db.execute({ sql: `INSERT OR REPLACE INTO sealed_manifest(id, hash, task_count, created_at) VALUES(1, ?, ?, ?)`, args: [hash, sorted.length, now] });
    for (const id of sorted) {
      if (!(await this.splitOf(id))) await this.db.execute({ sql: `INSERT INTO split_ledger(task_id, split, first_seen_at, manifest_hash) VALUES(?, 'held-out', ?, ?)`, args: [id, now, hash] });
    }
    return hash;
  }

  async startRun(meta: { iterationLabel: string; benchmark: string; model?: string; materializerMode: string }): Promise<{ runId: string; nonce: string }> {
    const runId = `run_${nanoid(10)}`;
    const nonce = `nonce_${nanoid(16)}`;
    await this.db.execute({
      sql: `INSERT INTO ledger_runs(id, iteration_label, benchmark, model, materializer_mode, nonce, status, started_at) VALUES(?,?,?,?,?,?, 'running', ?)`,
      args: [runId, meta.iterationLabel, meta.benchmark, meta.model ?? null, meta.materializerMode, nonce, this.now()],
    });
    return { runId, nonce };
  }

  private async runRow(runId: string) {
    const r = await this.db.execute({ sql: `SELECT * FROM ledger_runs WHERE id = ?`, args: [runId] });
    if (!r.rows[0]) throw new Error("run not found");
    return r.rows[0];
  }

  /** S9/S10/S11/S12/S14/S16: derive the verdict from evidence, quarantine on disagreement, hash-chain the row. */
  async recordTask(runId: string, inp: RecordInput) {
    const run = await this.runRow(runId);
    const split = await this.splitOf(inp.taskId);
    const writerOk = inp.writer.deliverableHash === inp.deliverableHash;          // S10
    const transportNonceValid = inp.transport.nonce === String(run.nonce);        // S11

    const ev: GateEvidence = {
      firedWriterLeaf: writerOk ? inp.writer.firedWriterLeaf : "receipt-mismatch",
      tokensUsed: inp.transport.tokensUsed,
      transportNonceValid,
      taskOnSealedHeldOut: split === "held-out",
      taskPreviouslyTuned: split === "tuned",
      memoryLeak: !!inp.recalledMemoryLeak,
    };
    const { clean, reasons } = deriveCleanProbe(ev);

    let quarantined = false;
    if (inp.claimedClean !== undefined && inp.claimedClean !== clean) {
      quarantined = true;
      reasons.push(`claim-disagreement(agent=${inp.claimedClean},derived=${clean})`);
    }
    const counts = clean && !quarantined;

    const payload = canon({ taskId: inp.taskId, reward: inp.reward, ev, counts, quarantined, reasons });
    const prevHash = String(run.chain_head);
    const rowHash = sha256(prevHash + payload);
    await this.db.execute({
      sql: `INSERT INTO ledger_tasks(id, run_id, task_id, reward, fired_writer_leaf, tokens_used, transport_nonce_valid, derived_clean, quarantined, counts_toward_headline, reasons, payload, prev_hash, row_hash, created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [`lt_${nanoid(10)}`, runId, inp.taskId, inp.reward, ev.firedWriterLeaf, ev.tokensUsed, transportNonceValid ? 1 : 0, clean ? 1 : 0, quarantined ? 1 : 0, counts ? 1 : 0, reasons.join("|"), payload, prevHash, rowHash, this.now()],
    });
    await this.db.execute({ sql: `UPDATE ledger_runs SET chain_head = ?, task_count = task_count + 1 WHERE id = ?`, args: [rowHash, runId] });
    return { counts, clean, quarantined, reasons };
  }

  /** S15: an independent verifier (different model/lens) refutes a sample of counted rows; refuted -> demoted. */
  async finishRun(runId: string, opts: { verifier?: Verifier; sample?: number } = {}) {
    if (opts.verifier) {
      const r = await this.db.execute({ sql: `SELECT id, task_id, reward FROM ledger_tasks WHERE run_id = ? AND counts_toward_headline = 1 ORDER BY rowid ASC`, args: [runId] });
      const rows = r.rows;
      const sample = Math.min(opts.sample ?? rows.length, rows.length);
      for (let i = 0; i < sample; i++) {
        const row = rows[i];
        if (await opts.verifier(String(row.task_id), Number(row.reward))) {
          await this.db.execute({ sql: `UPDATE ledger_tasks SET counts_toward_headline = 0, reasons = reasons || '|verifier-refuted' WHERE id = ?`, args: [row.id as string] });
        }
      }
    }
    const r2 = await this.db.execute({ sql: `SELECT reward FROM ledger_tasks WHERE run_id = ? AND counts_toward_headline = 1`, args: [runId] });
    const n = r2.rows.length;
    const mean = n ? r2.rows.reduce((s, row) => s + Number(row.reward), 0) / n : undefined;
    const run = await this.runRow(runId);
    await this.db.execute({ sql: `UPDATE ledger_runs SET status='completed', completed_at=?, headline_mean=?, headline_n=? WHERE id=?`, args: [this.now(), mean ?? null, n, runId] });
    return { headlineMean: mean, headlineN: n, chainHead: String(run.chain_head) };
  }

  /** S16: recompute the chain to detect tampering/reordering/deletion. */
  async verifyChain(runId: string): Promise<{ ok: boolean; brokenAt?: string }> {
    const r = await this.db.execute({ sql: `SELECT * FROM ledger_tasks WHERE run_id = ? ORDER BY rowid ASC`, args: [runId] });
    let prev = "GENESIS";
    for (const row of r.rows) {
      const expect = sha256(prev + String(row.payload));
      if (String(row.prev_hash) !== prev || String(row.row_hash) !== expect) return { ok: false, brokenAt: String(row.task_id) };
      // the queried columns must agree with the hashed payload — catches out-of-band column tampering
      const p = JSON.parse(String(row.payload)) as { reward: number; counts: boolean };
      if (Number(p.reward) !== Number(row.reward) || (p.counts ? 1 : 0) !== Number(row.counts_toward_headline)) {
        return { ok: false, brokenAt: `${row.task_id}:column-divergence` };
      }
      prev = String(row.row_hash);
    }
    return { ok: true };
  }

  async listRuns() {
    const r = await this.db.execute({ sql: `SELECT id, iteration_label, materializer_mode, status, task_count, headline_mean, headline_n FROM ledger_runs ORDER BY started_at DESC`, args: [] });
    return r.rows;
  }

  async tasksForRun(runId: string) {
    const r = await this.db.execute({ sql: `SELECT task_id, reward, fired_writer_leaf, tokens_used, counts_toward_headline, quarantined, reasons FROM ledger_tasks WHERE run_id = ? ORDER BY rowid ASC`, args: [runId] });
    return r.rows;
  }
}
