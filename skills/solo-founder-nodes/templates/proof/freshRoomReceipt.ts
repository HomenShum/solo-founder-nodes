import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type FreshRoomProofReceipt = {
  schemaVersion: 1;
  caseId: string;
  roomId: string;
  command: string;
  model: string;
  runtimeProfile: string;
  prompt: string;
  tracePath: string;
  videoPath: string;
  screenshotPaths: string[];
  exportedFiles: string[];
  reopenedFiles: string[];
  scorer: {
    id: string;
    official: boolean;
    passed: boolean;
    resultPath: string;
  };
  costUsd: number;
  latencyMs: number;
  tokenUsage: number;
  mutationCount: number;
  proofSignals: {
    freshRoom: boolean;
    liveBrowser: boolean;
    memoryModeFalse: boolean;
    zeroFabrication: boolean;
    selfTestPassed: boolean;
    exportDownloaded: boolean;
    artifactReopened: boolean;
  };
  pass: boolean;
};

export type FreshRoomReceiptVerification = {
  ok: boolean;
  errors: string[];
};

export function verifyFreshRoomProofReceipt(
  receipt: FreshRoomProofReceipt,
  options: { baseDir?: string; requireFiles?: boolean } = {},
): FreshRoomReceiptVerification {
  const errors: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;
  if (receipt.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const [key, value] of Object.entries({
    caseId: receipt.caseId,
    roomId: receipt.roomId,
    command: receipt.command,
    model: receipt.model,
    runtimeProfile: receipt.runtimeProfile,
    prompt: receipt.prompt,
    tracePath: receipt.tracePath,
    videoPath: receipt.videoPath,
  })) {
    if (!String(value ?? "").trim()) errors.push(`${key} is required`);
  }
  if (receipt.scorer.official !== true) errors.push("official scorer is required");
  if (receipt.scorer.passed !== true) errors.push("official scorer did not pass");
  if (!receipt.scorer.resultPath) errors.push("scorer.resultPath is required");
  if (receipt.costUsd < 0) errors.push("costUsd cannot be negative");
  if (receipt.latencyMs <= 0) errors.push("latencyMs must be positive");
  if (receipt.tokenUsage < 0) errors.push("tokenUsage cannot be negative");
  if (receipt.mutationCount < 0) errors.push("mutationCount cannot be negative");

  for (const signal of ["freshRoom", "liveBrowser", "memoryModeFalse", "zeroFabrication", "selfTestPassed", "exportDownloaded", "artifactReopened"] as const) {
    if (receipt.proofSignals[signal] !== true) errors.push(`proof signal '${signal}' is not true`);
  }
  if (receipt.screenshotPaths.length === 0) errors.push("at least one screenshot is required");
  if (receipt.exportedFiles.length === 0) errors.push("at least one exported file is required");
  if (receipt.reopenedFiles.length === 0) errors.push("at least one reopened file proof is required");

  const paths = [
    receipt.tracePath,
    receipt.videoPath,
    receipt.scorer.resultPath,
    ...receipt.screenshotPaths,
    ...receipt.exportedFiles,
    ...receipt.reopenedFiles,
  ];
  if (requireFiles) {
    for (const path of paths) {
      if (!existsSync(resolve(baseDir, path))) errors.push(`receipt path does not exist: ${path}`);
    }
  }
  if (receipt.pass !== true) errors.push("receipt pass must be true");
  return { ok: errors.length === 0, errors };
}
