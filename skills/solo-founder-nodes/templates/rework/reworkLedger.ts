import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type ReworkLedgerEntry = {
  id: string;
  oldApproach: string;
  whyItSeemedRight: string;
  failureMode: string;
  failureReceiptPath: string;
  newApproach: string;
  whyItSurvived: string;
  proofReceiptPaths: string[];
  deletedArtifacts: string[];
  keptArtifacts: string[];
  lesson: string;
};

export type ReworkLedger = {
  schemaVersion: 1;
  projectId: string;
  entries: ReworkLedgerEntry[];
};

export type ReworkLedgerVerification = {
  ok: boolean;
  errors: string[];
};

export function makeReworkLedger(input: Omit<ReworkLedger, "schemaVersion">): ReworkLedger {
  return { schemaVersion: 1, ...input };
}

export function verifyReworkLedger(
  ledger: ReworkLedger,
  options: { baseDir?: string; requireFiles?: boolean } = {},
): ReworkLedgerVerification {
  const errors: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;
  if (ledger.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!ledger.projectId) errors.push("projectId is required");
  if (ledger.entries.length === 0) errors.push("at least one rework entry is required");
  const ids = new Set<string>();
  for (const entry of ledger.entries) {
    const label = `rework entry '${entry.id || "<missing>"}'`;
    if (!entry.id) errors.push("rework entry missing id");
    if (ids.has(entry.id)) errors.push(`duplicate rework entry id '${entry.id}'`);
    ids.add(entry.id);
    for (const key of ["oldApproach", "whyItSeemedRight", "failureMode", "failureReceiptPath", "newApproach", "whyItSurvived", "lesson"] as const) {
      if (!entry[key].trim()) errors.push(`${label} missing ${key}`);
    }
    if (entry.proofReceiptPaths.length === 0) errors.push(`${label} needs proofReceiptPaths`);
    if (entry.deletedArtifacts.length === 0) errors.push(`${label} must record at least one deleted/disposable artifact`);
    if (entry.keptArtifacts.length === 0) errors.push(`${label} must record what survived`);
    if (requireFiles && entry.failureReceiptPath && !existsSync(resolve(baseDir, entry.failureReceiptPath))) {
      errors.push(`${label} failureReceiptPath does not exist: ${entry.failureReceiptPath}`);
    }
    if (requireFiles) {
      for (const path of entry.proofReceiptPaths) {
        if (!existsSync(resolve(baseDir, path))) errors.push(`${label} proofReceiptPath does not exist: ${path}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
