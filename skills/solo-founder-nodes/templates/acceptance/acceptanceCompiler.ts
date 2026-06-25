import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DomainPack } from "../domain-pack/domainJudge";

export type AcceptanceCompileReceipt = {
  schemaVersion: 1;
  receiptKind: "acceptance-compile";
  sourceDomainPack: string;
  domainId: string;
  goal: string;
  doctrine: {
    noDomainPackNoBuild: true;
    noProofGateNoParentPass: true;
    negativeFixturesRequiredForBlockers: true;
  };
  childRALPH: DomainPack["childRALPH"];
  proofRegistry: Array<{
    gateId: string;
    invariantIds: string[];
    command: string;
    requiredReceipt: string;
    blocksParentClaim: boolean;
    status: string;
  }>;
  requiredReceipts: string[];
  blockerInvariantIds: string[];
  negativeFixtures: DomainPack["negativeFixtures"];
  verdict: {
    ok: boolean;
    missingProofs: string[];
    blockedClaims: string[];
  };
};

export function makeAcceptanceCompileReceipt(input: {
  pack: DomainPack;
  sourceDomainPack?: string;
}): AcceptanceCompileReceipt {
  const gateToInvariantIds = new Map<string, string[]>();
  for (const invariant of input.pack.invariants) {
    for (const gateId of invariant.proofGateIds) {
      const existing = gateToInvariantIds.get(gateId) ?? [];
      existing.push(invariant.id);
      gateToInvariantIds.set(gateId, existing);
    }
  }
  const proofRegistry = input.pack.proofGates.map((gate) => ({
    gateId: gate.id,
    invariantIds: gateToInvariantIds.get(gate.id) ?? [],
    command: gate.command,
    requiredReceipt: gate.requiredReceipt,
    blocksParentClaim: gate.blocksParentClaim,
    status: gate.status,
  }));
  const blockerInvariantIds = input.pack.invariants
    .filter((invariant) => invariant.severity === "blocker")
    .map((invariant) => invariant.id);
  const missingProofs = [
    ...proofRegistry
      .filter((gate) => gate.blocksParentClaim && !gate.requiredReceipt)
      .map((gate) => `gate:${gate.gateId}:requiredReceipt`),
    ...blockerInvariantIds
      .filter((invariantId) => !input.pack.negativeFixtures.some((fixture) => (
        input.pack.invariants.find((invariant) => invariant.id === invariantId)?.proofGateIds.includes(fixture.shouldFailGate)
      )))
      .map((invariantId) => `invariant:${invariantId}:negativeFixture`),
  ];
  return {
    schemaVersion: 1,
    receiptKind: "acceptance-compile",
    sourceDomainPack: input.sourceDomainPack ?? ".solo/domain/domain-pack.json",
    domainId: input.pack.id,
    goal: input.pack.goal,
    doctrine: {
      noDomainPackNoBuild: true,
      noProofGateNoParentPass: true,
      negativeFixturesRequiredForBlockers: true,
    },
    childRALPH: input.pack.childRALPH,
    proofRegistry,
    requiredReceipts: proofRegistry.filter((gate) => gate.blocksParentClaim).map((gate) => gate.requiredReceipt),
    blockerInvariantIds,
    negativeFixtures: input.pack.negativeFixtures,
    verdict: {
      ok: missingProofs.length === 0 && proofRegistry.length > 0 && blockerInvariantIds.length > 0,
      missingProofs,
      blockedClaims: proofRegistry
        .filter((gate) => gate.blocksParentClaim && gate.status !== "pass")
        .map((gate) => gate.gateId),
    },
  };
}

export function verifyAcceptanceCompileReceipt(
  receipt: AcceptanceCompileReceipt | undefined,
  options: { baseDir?: string; requireFiles?: boolean } = {},
) {
  const errors: string[] = [];
  const missingProofs: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;

  if (!receipt) {
    return {
      ok: false,
      errors: ["acceptance compile receipt is required"],
      missingProofs: [".solo/receipts/A/acceptance-bar.json"],
    };
  }

  if (receipt.schemaVersion !== 1) errors.push("acceptance compile schemaVersion must be 1");
  if (receipt.receiptKind !== "acceptance-compile") errors.push("acceptance compile receiptKind must be acceptance-compile");
  if (receipt.doctrine?.noDomainPackNoBuild !== true) errors.push("acceptance compiler must enforce noDomainPackNoBuild");
  if (receipt.doctrine?.noProofGateNoParentPass !== true) errors.push("acceptance compiler must enforce noProofGateNoParentPass");
  if (receipt.doctrine?.negativeFixturesRequiredForBlockers !== true) errors.push("acceptance compiler must require negative fixtures for blockers");
  if ((receipt.proofRegistry ?? []).length === 0) errors.push("acceptance compile requires proof registry entries");
  if ((receipt.blockerInvariantIds ?? []).length === 0) errors.push("acceptance compile requires blocker invariants");
  if ((receipt.negativeFixtures ?? []).length === 0) errors.push("acceptance compile requires negative fixtures");
  if ((receipt.childRALPH?.components ?? []).length === 0) errors.push("acceptance compile requires component child RALPH targets");
  if ((receipt.childRALPH?.assemblies ?? []).length === 0) errors.push("acceptance compile requires assembly child RALPH targets");
  if ((receipt.childRALPH?.operations ?? []).length === 0) errors.push("acceptance compile requires operation child RALPH targets");

  for (const gate of receipt.proofRegistry ?? []) {
    if (!gate.gateId || !gate.command || !gate.requiredReceipt) {
      errors.push(`acceptance proof gate ${gate.gateId || "<missing>"} requires gateId, command, and requiredReceipt`);
    }
    if (gate.blocksParentClaim && requireFiles && !existsSync(resolve(baseDir, gate.requiredReceipt))) {
      errors.push(`acceptance proof gate ${gate.gateId} receipt file does not exist: ${gate.requiredReceipt}`);
      missingProofs.push(gate.requiredReceipt);
    }
  }

  for (const missing of receipt.verdict?.missingProofs ?? []) {
    errors.push(`acceptance compiler reports missing proof: ${missing}`);
    missingProofs.push(missing);
  }

  return {
    ok: errors.length === 0 && receipt.verdict.ok,
    errors,
    missingProofs: [...new Set(missingProofs)],
  };
}

export function readAcceptanceCompileReceipt(path: string): AcceptanceCompileReceipt | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as AcceptanceCompileReceipt;
}
