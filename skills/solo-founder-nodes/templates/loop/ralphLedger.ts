import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { nanoid } from "nanoid";

export const ralphMilestones = ["R", "A", "L", "P", "H"] as const;
export type RalphMilestone = (typeof ralphMilestones)[number];
export type RalphStatus = "not_started" | "running" | "blocked" | "completed" | "failed";
export type SoloLoopStatus = "running" | "blocked" | "completed" | "failed";
export type BlockedKind = "approval" | "secret" | "install" | "budget" | "missing_receipt";

export type SoloLoopBlockedOn = {
  kind: BlockedKind;
  message: string;
  nextAction: string;
};

export type SoloLoopMilestoneState = {
  status: RalphStatus;
  startedAt?: string;
  completedAt?: string;
  inputs: string[];
  outputs: string[];
  receipts: string[];
  resumeCommand?: string;
  blockedOn?: SoloLoopBlockedOn;
};

export type SoloLoopRun = {
  schemaVersion: 1;
  loopId: string;
  projectId: string;
  repoPath: string;
  goal: string;
  currentMilestone: RalphMilestone;
  status: SoloLoopStatus;
  milestones: Record<RalphMilestone, SoloLoopMilestoneState>;
  budgets: {
    maxUsd?: number;
    maxRuntimeMs?: number;
    maxModelCalls?: number;
  };
  lastSafeCheckpointAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SoloStepEvent = {
  id: string;
  loopId: string;
  milestone: RalphMilestone;
  kind:
    | "init"
    | "start"
    | "status"
    | "resume"
    | "verify"
    | "receipt"
    | "approval"
    | "blocker"
    | "command"
    | "file_edit"
    | "browser_run"
    | "model_call";
  message: string;
  receiptPath?: string;
  attrs?: Record<string, unknown>;
  createdAt: string;
};

export type RalphLedgerPaths = {
  soloDir: string;
  statePath: string;
  eventsPath: string;
  memoryDbPath: string;
  proofVerdictPath: string;
  reworkLedgerPath: string;
  receiptsDir: string;
};

export type RalphVerification = {
  ok: boolean;
  milestone: RalphMilestone;
  errors: string[];
  missing: string[];
  resumeCommand: string;
};

export type RalphDoctorReport = {
  ok: boolean;
  repoPath: string;
  loopState: boolean;
  events: boolean;
  receiptsDir: boolean;
  proofVerdict: "pass" | "fail" | "missing" | "invalid";
  reworkLedger: boolean;
  errors: string[];
  warnings: string[];
};

export const ralphMilestoneLabels: Record<RalphMilestone, string> = {
  R: "Reality / Research",
  A: "Acceptance Bar",
  L: "Live Build",
  P: "Proof Run",
  H: "Harden",
};

export const ralphReceiptDirs: Record<RalphMilestone, string> = {
  R: "R-reality",
  A: "A-acceptance-bar",
  L: "L-live-build",
  P: "P-proof-run",
  H: "H-harden",
};

export const ralphRequiredReceipts: Record<RalphMilestone, string[]> = {
  R: ["capability-spec", "research-spine", "graph-context"],
  A: ["benchmark-choice", "rubric", "heldout-split-policy"],
  L: ["agent-api-contract", "design-brief", "build-note"],
  P: ["fresh-room-receipt", "proof-verdict"],
  H: ["rework-ledger", "memory-quarantine", "cost-ledger"],
};

export const ralphPriorMilestones: Record<RalphMilestone, RalphMilestone[]> = {
  R: [],
  A: ["R"],
  L: ["R", "A"],
  P: ["R", "A", "L"],
  H: ["R", "A", "L", "P"],
};

export function createRalphLedger(input: {
  repoPath: string;
  goal: string;
  projectId?: string;
  budgets?: SoloLoopRun["budgets"];
  now?: string;
}): { loop: SoloLoopRun; paths: RalphLedgerPaths } {
  const repoPath = resolve(input.repoPath);
  const now = input.now ?? new Date().toISOString();
  const paths = ralphPaths(repoPath);
  ensureRalphDirs(paths);
  const loop: SoloLoopRun = {
    schemaVersion: 1,
    loopId: `loop_${nanoid(10)}`,
    projectId: input.projectId ?? slugProject(repoPath),
    repoPath,
    goal: input.goal,
    currentMilestone: "R",
    status: "running",
    milestones: makeInitialMilestones(),
    budgets: input.budgets ?? {},
    lastSafeCheckpointAt: now,
    createdAt: now,
    updatedAt: now,
  };
  loop.milestones.R.status = "running";
  loop.milestones.R.startedAt = now;
  loop.milestones.R.resumeCommand = "npm run sfn -- loop start --from R";
  writeLoopState(paths.statePath, loop);
  appendStepEvent(paths, {
    loopId: loop.loopId,
    milestone: "R",
    kind: "init",
    message: "Initialized RALPH loop ledger.",
    attrs: { goal: input.goal, repoPath },
  });
  return { loop, paths };
}

export function loadRalphLoop(repoPath: string): { loop: SoloLoopRun; paths: RalphLedgerPaths } {
  const paths = ralphPaths(resolve(repoPath));
  if (!existsSync(paths.statePath)) {
    throw new Error(`missing RALPH loop state: ${paths.statePath}`);
  }
  return { loop: JSON.parse(readFileSync(paths.statePath, "utf8")) as SoloLoopRun, paths };
}

export function startRalphMilestone(repoPath: string, milestone: RalphMilestone, now = new Date().toISOString()) {
  const { loop, paths } = loadRalphLoop(repoPath);
  const verification = verifyRalphEntry(loop, paths, milestone);
  if (!verification.ok) {
    loop.status = "blocked";
    loop.currentMilestone = milestone;
    loop.milestones[milestone].status = "blocked";
    loop.milestones[milestone].blockedOn = {
      kind: "missing_receipt",
      message: `Cannot start ${ralphMilestoneLabels[milestone]}.`,
      nextAction: verification.resumeCommand,
    };
    loop.milestones[milestone].resumeCommand = verification.resumeCommand;
    loop.updatedAt = now;
    writeLoopState(paths.statePath, loop);
    appendStepEvent(paths, {
      loopId: loop.loopId,
      milestone,
      kind: "blocker",
      message: `Blocked starting ${milestone}; missing receipts.`,
      attrs: { missing: verification.missing, errors: verification.errors },
    });
    return { loop, verification };
  }

  loop.status = "running";
  loop.currentMilestone = milestone;
  const state = loop.milestones[milestone];
  state.status = "running";
  state.blockedOn = undefined;
  state.startedAt ??= now;
  state.resumeCommand = `npm run sfn -- loop start --from ${milestone}`;
  loop.lastSafeCheckpointAt = now;
  loop.updatedAt = now;
  writeLoopState(paths.statePath, loop);
  appendStepEvent(paths, {
    loopId: loop.loopId,
    milestone,
    kind: "start",
    message: `Started ${ralphMilestoneLabels[milestone]}.`,
  });
  return { loop, verification };
}

export function verifyRalphEntry(
  loop: SoloLoopRun,
  paths: RalphLedgerPaths,
  milestone: RalphMilestone,
): RalphVerification {
  const missing: string[] = [];
  const errors: string[] = [];
  for (const prior of ralphPriorMilestones[milestone]) {
    const state = loop.milestones[prior];
    if (state.status !== "completed") {
      missing.push(`${prior}:completed`);
      errors.push(`prior milestone ${prior} is not completed`);
    }
    for (const receipt of ralphRequiredReceipts[prior]) {
      if (!hasReceipt(state, receipt, paths.soloDir)) {
        missing.push(`${prior}:${receipt}`);
      }
    }
  }
  return {
    ok: errors.length === 0 && missing.length === 0,
    milestone,
    errors,
    missing,
    resumeCommand: `npm run sfn -- loop start --from ${firstMissingMilestone(missing, milestone)}`,
  };
}

export function verifyRalphMilestone(repoPath: string, milestone: RalphMilestone): RalphVerification {
  const { loop, paths } = loadRalphLoop(repoPath);
  const missing: string[] = [];
  const errors: string[] = [];
  const state = loop.milestones[milestone];
  if (!state) errors.push(`unknown milestone ${milestone}`);
  if (state?.status !== "completed") errors.push(`milestone ${milestone} is not completed`);
  for (const receipt of ralphRequiredReceipts[milestone]) {
    if (!state || !hasReceipt(state, receipt, paths.soloDir)) missing.push(`${milestone}:${receipt}`);
  }
  if (milestone === "P" && !proofVerdictOk(paths.proofVerdictPath)) {
    missing.push("P:proof-verdict-ok");
    errors.push("proof-verdict.json must exist and contain ok=true");
  }
  return {
    ok: errors.length === 0 && missing.length === 0,
    milestone,
    errors,
    missing,
    resumeCommand: `npm run sfn -- loop start --from ${milestone}`,
  };
}

export function completeRalphMilestone(repoPath: string, milestone: RalphMilestone, receipts: string[], now = new Date().toISOString()) {
  const { loop, paths } = loadRalphLoop(repoPath);
  const state = loop.milestones[milestone];
  for (const receipt of receipts) {
    if (!state.receipts.includes(receipt)) state.receipts.push(receipt);
  }
  state.status = "completed";
  state.completedAt = now;
  state.blockedOn = undefined;
  loop.lastSafeCheckpointAt = now;
  loop.updatedAt = now;
  if (milestone === "H") loop.status = "completed";
  writeLoopState(paths.statePath, loop);
  appendStepEvent(paths, {
    loopId: loop.loopId,
    milestone,
    kind: "receipt",
    message: `Completed ${ralphMilestoneLabels[milestone]}.`,
    attrs: { receipts },
  });
  return { loop, paths };
}

export function pauseRalphLoop(
  repoPath: string,
  input: { kind?: BlockedKind; message: string; nextAction?: string; now?: string },
) {
  const { loop, paths } = loadRalphLoop(repoPath);
  const now = input.now ?? new Date().toISOString();
  const state = loop.milestones[loop.currentMilestone];
  loop.status = "blocked";
  state.status = "blocked";
  state.blockedOn = {
    kind: input.kind ?? "approval",
    message: input.message,
    nextAction: input.nextAction ?? `npm run sfn -- loop resume --loop-id ${loop.loopId}`,
  };
  state.resumeCommand = state.blockedOn.nextAction;
  loop.updatedAt = now;
  writeLoopState(paths.statePath, loop);
  appendStepEvent(paths, {
    loopId: loop.loopId,
    milestone: loop.currentMilestone,
    kind: "blocker",
    message: input.message,
    attrs: { blockedOn: state.blockedOn },
  });
  return { loop, paths };
}

export function recordRalphStep(repoPath: string, event: Omit<SoloStepEvent, "id" | "createdAt" | "loopId">) {
  const { loop, paths } = loadRalphLoop(repoPath);
  appendStepEvent(paths, { ...event, loopId: loop.loopId });
}

export function ralphStatus(repoPath: string) {
  const { loop, paths } = loadRalphLoop(repoPath);
  appendStepEvent(paths, {
    loopId: loop.loopId,
    milestone: loop.currentMilestone,
    kind: "status",
    message: "Read RALPH loop status.",
  });
  return { loop, paths, next: verifyRalphEntry(loop, paths, loop.currentMilestone) };
}

export function ralphPaths(repoPath: string): RalphLedgerPaths {
  const soloDir = join(resolve(repoPath), ".solo");
  return {
    soloDir,
    statePath: join(soloDir, "loop-state.json"),
    eventsPath: join(soloDir, "events.jsonl"),
    memoryDbPath: join(soloDir, "memory.db"),
    proofVerdictPath: join(soloDir, "proof-verdict.json"),
    reworkLedgerPath: join(soloDir, "rework-ledger.md"),
    receiptsDir: join(soloDir, "receipts"),
  };
}

export function parseRalphMilestone(value?: string): RalphMilestone {
  if (value && ralphMilestones.includes(value as RalphMilestone)) return value as RalphMilestone;
  throw new Error(`unsupported RALPH milestone '${value ?? ""}' (expected one of: ${ralphMilestones.join(", ")})`);
}

export function doctorRalphLoop(repoPath: string): RalphDoctorReport {
  const paths = ralphPaths(resolve(repoPath));
  const errors: string[] = [];
  const warnings: string[] = [];
  const loopState = existsSync(paths.statePath);
  const events = existsSync(paths.eventsPath);
  const receiptsDir = existsSync(paths.receiptsDir);
  const reworkLedger = existsSync(paths.reworkLedgerPath);
  if (!loopState) errors.push(`missing loop-state.json: ${paths.statePath}`);
  if (!events) warnings.push(`missing events.jsonl: ${paths.eventsPath}`);
  if (!receiptsDir) errors.push(`missing receipts dir: ${paths.receiptsDir}`);

  let proofVerdict: RalphDoctorReport["proofVerdict"] = "missing";
  if (existsSync(paths.proofVerdictPath)) {
    try {
      const parsed = JSON.parse(readFileSync(paths.proofVerdictPath, "utf8")) as { ok?: unknown };
      proofVerdict = parsed.ok === true ? "pass" : "fail";
    } catch {
      proofVerdict = "invalid";
    }
  }

  if (loopState) {
    try {
      const loop = JSON.parse(readFileSync(paths.statePath, "utf8")) as SoloLoopRun;
      for (const milestone of ralphMilestones) {
        if (!loop.milestones[milestone]) errors.push(`loop-state missing milestone ${milestone}`);
      }
      if (loop.currentMilestone === "P" && proofVerdict !== "pass") {
        warnings.push("current milestone is P but proof-verdict.json is not passing");
      }
    } catch {
      errors.push("loop-state.json is not valid JSON");
    }
  }

  return {
    ok: errors.length === 0,
    repoPath: resolve(repoPath),
    loopState,
    events,
    receiptsDir,
    proofVerdict,
    reworkLedger,
    errors,
    warnings,
  };
}

function makeInitialMilestones(): Record<RalphMilestone, SoloLoopMilestoneState> {
  return Object.fromEntries(
    ralphMilestones.map((milestone) => [
      milestone,
      {
        status: "not_started",
        inputs: [],
        outputs: [],
        receipts: [],
        resumeCommand: `npm run sfn -- loop start --from ${milestone}`,
      },
    ]),
  ) as unknown as Record<RalphMilestone, SoloLoopMilestoneState>;
}

function ensureRalphDirs(paths: RalphLedgerPaths) {
  mkdirSync(paths.soloDir, { recursive: true });
  mkdirSync(paths.receiptsDir, { recursive: true });
  for (const dir of Object.values(ralphReceiptDirs)) {
    mkdirSync(join(paths.receiptsDir, dir), { recursive: true });
  }
}

function writeLoopState(path: string, loop: SoloLoopRun) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(loop, null, 2)}\n`, "utf8");
}

function appendStepEvent(paths: RalphLedgerPaths, input: Omit<SoloStepEvent, "id" | "createdAt">) {
  mkdirSync(dirname(paths.eventsPath), { recursive: true });
  const event: SoloStepEvent = {
    id: `evt_${nanoid(10)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  appendFileSync(paths.eventsPath, `${JSON.stringify(event)}\n`, "utf8");
}

function hasReceipt(state: SoloLoopMilestoneState, receipt: string, soloDir: string) {
  return state.receipts.some((path) => path.includes(receipt) && existsSync(resolve(soloDir, path)));
}

function firstMissingMilestone(missing: string[], fallback: RalphMilestone): RalphMilestone {
  const first = missing[0]?.slice(0, 1);
  return ralphMilestones.includes(first as RalphMilestone) ? (first as RalphMilestone) : fallback;
}

function proofVerdictOk(path: string) {
  if (!existsSync(path)) return false;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { ok?: unknown };
    return parsed.ok === true;
  } catch {
    return false;
  }
}

function slugProject(repoPath: string) {
  return repoPath.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(-64) || "project";
}
