// Turnkey proof of the local substrates. Run: npm i && npm run smoke
// Every S-mechanism is a pass/fail assertion; the process exits non-zero if any fails.
import { createClient } from "@libsql/client";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SoloLedger } from "./ledger/ledger";
import { SoloMemory } from "./memory/localMemory";
import { sealGold, contentGate } from "./ledger/contentGate";
import { sha256 } from "./ledger/hash";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  console.log("\n=== Solo Founder Nodes — local substrate smoke ===\n");

  // ---------------- SoloLedger: derive-don't-accept ----------------
  console.log("SoloLedger (S9/S12/S14/S16 enforced; S10/S11/S15 wired):");
  const dbFile = join(tmpdir(), `solo-smoke-ledger-${process.pid}-${Date.now()}.db`);
  const ledger = new SoloLedger({ dbUrl: `file:${dbFile}`, salt: "smoke-salt" });
  await ledger.init();

  // S12 — tuned first, then seal a DISJOINT held-out manifest
  await ledger.markTuned(["t-tuned"]);
  const manifest = await ledger.sealHeldOut(["t1", "t2", "t3", "t4", "t5", "vt1"]);
  check("S12 sealed held-out manifest (HMAC)", /^[0-9a-f]{64}$/.test(manifest));
  let sealThrew = false;
  try {
    await ledger.sealHeldOut(["t-tuned"]);
  } catch {
    sealThrew = true;
  }
  check("S12 refuses to seal a tuned task as held-out", sealThrew);

  const { runId, nonce } = await ledger.startRun({
    iterationLabel: "smoke-iter",
    benchmark: "demo",
    model: "demo-model",
    materializerMode: "generic-only",
  });

  // a writer receipt tied to the actual deliverable bytes (S10)
  const deliv = (leaf: string, bytes: string) => {
    const h = sha256(bytes);
    return { writer: { firedWriterLeaf: leaf, deliverableHash: h }, deliverableHash: h };
  };

  // (a) HONEST: generic writer + model-in-loop + valid nonce + held-out
  const a = await ledger.recordTask(runId, { taskId: "t1", reward: 0.42, ...deliv("write_general", "t1 bytes"), transport: { tokensUsed: 4200, nonce }, claimedClean: true });
  check("S9 honest generic + model-in-loop + held-out COUNTS", a.counts === true, a.reasons.join(","));

  // (b) FAMILY writer but agent CLAIMS clean -> derived false -> disagreement -> quarantined
  const b = await ledger.recordTask(runId, { taskId: "t2", reward: 0.97, ...deliv("write_comcast_package", "t2 bytes"), transport: { tokensUsed: 50, nonce }, claimedClean: true });
  check("S10 family-writer excluded despite 0.97 reward", b.counts === false && b.reasons.some((r) => r.startsWith("non-generic-writer")));
  check("S9 quarantines agent-claim vs derived disagreement", b.quarantined === true);

  // (c) MODEL-OFF
  const c = await ledger.recordTask(runId, { taskId: "t3", reward: 0.40, ...deliv("write_general", "t3 bytes"), transport: { tokensUsed: 0, nonce }, claimedClean: true });
  check("S11 model-off (0 tokens) excluded", c.counts === false && c.reasons.includes("model-off"));

  // (d) FORGED transport nonce
  const d = await ledger.recordTask(runId, { taskId: "t4", reward: 0.41, ...deliv("write_general", "t4 bytes"), transport: { tokensUsed: 9999, nonce: "forged" }, claimedClean: true });
  check("S11 forged transport nonce excluded", d.counts === false && d.reasons.includes("unsigned-transport"));

  // (e) MEMORY-LEAK taint
  const e = await ledger.recordTask(runId, { taskId: "t5", reward: 0.55, ...deliv("write_general", "t5 bytes"), transport: { tokensUsed: 3000, nonce }, recalledMemoryLeak: true, claimedClean: true });
  check("S14 memory-leak taint excludes the row", e.counts === false && e.reasons.includes("memory-leak"));

  // (f) TUNED-REUSE
  const f = await ledger.recordTask(runId, { taskId: "t-tuned", reward: 0.99, ...deliv("write_general", "tuned bytes"), transport: { tokensUsed: 3000, nonce }, claimedClean: true });
  check("S12 tuned-task-reuse excluded", f.counts === false && (f.reasons.includes("tuned-task-reuse") || f.reasons.includes("not-held-out")));

  // headline = mean over the clean row ONLY (just t1)
  const fin = await ledger.finishRun(runId);
  check("S6/S9 headline counts ONLY the clean row", fin.headlineN === 1 && Math.abs((fin.headlineMean ?? -1) - 0.42) < 1e-9, `mean=${fin.headlineMean} n=${fin.headlineN}`);

  // S16 — chain verifies, then an out-of-band tamper breaks it
  check("S16 hash-chain verifies (clean)", (await ledger.verifyChain(runId)).ok === true);
  const raw = createClient({ url: `file:${dbFile}` });
  await raw.execute({ sql: `UPDATE ledger_tasks SET reward = 9.99 WHERE run_id = ? AND task_id = 't1'`, args: [runId] });
  const tampered = await ledger.verifyChain(runId);
  check("S16 DETECTS out-of-band tampering (chain breaks)", tampered.ok === false, JSON.stringify(tampered));

  // ---------------- S15 independent verifier ----------------
  console.log("\nSoloLedger S15 (independent refute-by-default verifier):");
  const r2 = await ledger.startRun({ iterationLabel: "verifier-iter", benchmark: "demo", materializerMode: "generic-only" });
  const g = await ledger.recordTask(r2.runId, { taskId: "vt1", reward: 0.80, ...deliv("write_general", "vt1 bytes"), transport: { tokensUsed: 5000, nonce: r2.nonce }, claimedClean: true });
  check("clean row counts before the verifier", g.counts === true, g.reasons.join(","));
  const finV = await ledger.finishRun(r2.runId, { verifier: async () => true });
  check("S15 refute-by-default verifier demotes the row", finV.headlineN === 0, `n=${finV.headlineN}`);

  // ---------------- SoloMemory: S13 content gate ----------------
  console.log("\nSoloMemory (S13 content gate — the honor-system label is no longer enough):");
  const goldText = "Project Comcast take-private teaser: TEV 6538.0M, EV/EBITDA 17.0x, COTY 902.90M diluted shares, premium 35%.";
  const sealedGold = sealGold([goldText]);
  const mem = new SoloMemory({ dbUrl: ":memory:", heldOutGuard: (inp) => contentGate(sealedGold, `${inp.summary}\n${inp.content}`) });
  await mem.init();

  let benignOk = false;
  await mem.remember({ projectId: "smoke", phase: "build", kind: "decision", summary: "Use a design brief before any Figma write.", content: "Gate design calls behind a human approval.", benchmarkSafety: "safe" });
  benignOk = true;
  check("S13 benign write accepted", benignOk);

  let goldThrew = false;
  try {
    await mem.remember({ projectId: "smoke", phase: "iterate", kind: "decision", summary: "Methodology note", content: "EV/EBITDA 17.0x, TEV 6538.0M, COTY 902.90M diluted shares, premium 35% — reuse for the next comp.", benchmarkSafety: "safe" });
  } catch {
    goldThrew = true;
  }
  check("S13 rejects laundered held-out gold despite 'safe' label", goldThrew);

  let labelThrew = false;
  try {
    await mem.remember({ projectId: "smoke", phase: "iterate", kind: "run_result", summary: "held-out answer", content: "x", benchmarkSafety: "heldout_forbidden" });
  } catch {
    labelThrew = true;
  }
  check("honor-system heldout_forbidden label still rejected", labelThrew);

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
