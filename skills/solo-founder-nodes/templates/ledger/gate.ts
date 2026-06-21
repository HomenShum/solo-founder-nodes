// S9 — the honest gate is DERIVED from observed evidence, never accepted as a self-reported boolean.
// A row counts toward the headline only if EVERY condition holds; each failure is a named reason.

export type GateEvidence = {
  firedWriterLeaf: string;       // S10: from a writer-provenance receipt tied to the deliverable bytes
  tokensUsed: number;            // S11: from the signed transport ledger
  transportNonceValid: boolean;  // S11: the transport receipt carried this run's issued nonce
  taskOnSealedHeldOut: boolean;  // S12: taskId is on the sealed held-out manifest
  taskPreviouslyTuned: boolean;  // S12: the immutable split-ledger saw this task as tuned first
  memoryLeak: boolean;           // S14: a memory recalled during the run matched sealed gold
};

export const GENERIC_WRITER_LEAF = "write_general";

export function deriveCleanProbe(ev: GateEvidence): { clean: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (ev.firedWriterLeaf !== GENERIC_WRITER_LEAF) reasons.push(`non-generic-writer:${ev.firedWriterLeaf}`);
  if (!(ev.tokensUsed > 0)) reasons.push("model-off");
  if (!ev.transportNonceValid) reasons.push("unsigned-transport");
  if (!ev.taskOnSealedHeldOut) reasons.push("not-held-out");
  if (ev.taskPreviouslyTuned) reasons.push("tuned-task-reuse");
  if (ev.memoryLeak) reasons.push("memory-leak");
  return { clean: reasons.length === 0, reasons };
}
