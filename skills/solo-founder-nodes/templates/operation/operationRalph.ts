import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const operationRalphStages = ["R", "A", "L", "P", "H"] as const;
export type OperationRalphStage = (typeof operationRalphStages)[number];
export type OperationRalphStatus = "planned" | "completed" | "blocked";

export type OperationInput = {
  id: string;
  label: string;
  domain?: string;
  required?: boolean;
  expected?: Record<string, unknown>;
  proof?: Record<string, string>;
};

export type OperationRalphStageReceipt = {
  stage: OperationRalphStage;
  question: string;
  status: OperationRalphStatus;
  evidencePaths: string[];
};

export type OperationRalphNode = {
  operationId: string;
  label: string;
  domain: string;
  required: boolean;
  expected: Record<string, unknown>;
  proof: Record<string, string>;
  ralph: Record<OperationRalphStage, OperationRalphStageReceipt>;
  verdict: "pass" | "partial" | "fail";
  reason: string;
};

export type OperationRalphReceipt = {
  schemaVersion: 1;
  receiptKind: "operation-ralph";
  goal: string;
  domain: string;
  generatedAt: string;
  doctrine: {
    objectProofIsNotWorkflowProof: true;
    beforeAfterProofRequired: true;
    failedOperationsBlockParentClaim: true;
  };
  operations: OperationRalphNode[];
  blockedClaims: string[];
};

export type OperationRalphVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingProofs: string[];
};

export const operationRalphRelativePath = ".solo/operation/operation-ralph.json";

export function operationRalphPath(projectPath: string) {
  return resolve(projectPath, operationRalphRelativePath);
}

export function makeOperationRalphReceipt(input: {
  goal: string;
  domain?: string;
  generatedAt?: string;
  operations?: OperationInput[];
  status?: OperationRalphStatus;
}): OperationRalphReceipt {
  const domain = input.domain ?? "generic";
  const status = input.status ?? "planned";
  const operations = input.operations?.length ? input.operations : defaultOperations(domain, input.goal);
  return {
    schemaVersion: 1,
    receiptKind: "operation-ralph",
    goal: input.goal,
    domain,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    doctrine: {
      objectProofIsNotWorkflowProof: true,
      beforeAfterProofRequired: true,
      failedOperationsBlockParentClaim: true,
    },
    operations: operations.map((operation) => makeOperationNode(operation, domain, status)),
    blockedClaims: [
      "domain workflow completion",
      "professional editor behavior",
      "real-user task completion",
    ],
  };
}

export function verifyOperationRalphReceipt(
  receipt: OperationRalphReceipt,
  options: { baseDir?: string; requireFiles?: boolean; requireCompleted?: boolean } = {},
): OperationRalphVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingProofs: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;
  const requireCompleted = options.requireCompleted ?? true;

  if (receipt.schemaVersion !== 1) errors.push("operation RALPH schemaVersion must be 1");
  if (receipt.receiptKind !== "operation-ralph") errors.push("operation RALPH receiptKind must be operation-ralph");
  if (!receipt.goal?.trim()) errors.push("operation RALPH requires goal");
  if (!receipt.domain?.trim()) errors.push("operation RALPH requires domain");
  if (receipt.doctrine?.objectProofIsNotWorkflowProof !== true) errors.push("operation RALPH must reject object-only proof");
  if (receipt.doctrine?.beforeAfterProofRequired !== true) errors.push("operation RALPH must require before/after proof");
  if (receipt.doctrine?.failedOperationsBlockParentClaim !== true) errors.push("operation RALPH must block parent claims when operations fail");
  if ((receipt.operations ?? []).length === 0) errors.push("operation RALPH requires at least one operation");

  for (const operation of receipt.operations ?? []) {
    if (!operation.operationId || !operation.label || !operation.domain) errors.push("operation requires id, label, and domain");
    const stageEntries = operationRalphStages.map((stage) => operation.ralph?.[stage]);
    if (stageEntries.some((stage) => !stage)) {
      errors.push(`operation ${operation.operationId} is missing RALPH stages`);
      missingProofs.push(`operation:${operation.operationId}:ralph`);
      continue;
    }
    if (operation.required && requireCompleted) {
      for (const stage of operationRalphStages) {
        const stageReceipt = operation.ralph[stage];
        if (stageReceipt.status !== "completed") {
          errors.push(`operation ${operation.operationId} stage ${stage} is not completed`);
          missingProofs.push(`operation.${operation.operationId}.${stage}`);
        }
      }
      if (operation.verdict !== "pass") {
        errors.push(`operation ${operation.operationId} verdict is ${operation.verdict}`);
        missingProofs.push(`operation.${operation.operationId}.verdict`);
      }
    }
    const proofPaths = Object.values(operation.proof ?? {});
    if (operation.required && proofPaths.length === 0) {
      errors.push(`operation ${operation.operationId} needs proof paths`);
      missingProofs.push(`operation.${operation.operationId}.proof`);
    }
    const hasBeforeAfter = ["beforeScreenshot", "afterScreenshot", "diffReceipt", "materialDiff", "selectionReceipt"]
      .some((key) => Boolean(operation.proof?.[key]));
    if (operation.required && !hasBeforeAfter) {
      errors.push(`operation ${operation.operationId} needs before/after or selection proof`);
      missingProofs.push(`operation.${operation.operationId}.before-after`);
    }
    if (requireFiles) {
      for (const proofPath of proofPaths) {
        if (!existsSync(resolve(baseDir, proofPath))) {
          errors.push(`operation ${operation.operationId} proof file does not exist: ${proofPath}`);
          missingProofs.push(proofPath);
        }
      }
      for (const stage of operationRalphStages) {
        for (const evidencePath of operation.ralph[stage].evidencePaths ?? []) {
          if (!existsSync(resolve(baseDir, evidencePath))) {
            errors.push(`operation ${operation.operationId} stage ${stage} evidence file does not exist: ${evidencePath}`);
            missingProofs.push(evidencePath);
          }
        }
      }
    }
  }

  if ((receipt.operations ?? []).some((operation) => operation.verdict === "partial")) {
    warnings.push("one or more operations are partial; parent claims should stay scoped");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    missingProofs: [...new Set(missingProofs)],
  };
}

export function readOperationRalphReceipt(projectPath: string): OperationRalphReceipt | undefined {
  const path = operationRalphPath(projectPath);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as OperationRalphReceipt;
}

function makeOperationNode(operation: OperationInput, domain: string, status: OperationRalphStatus): OperationRalphNode {
  const proof = operation.proof ?? defaultProof(operation.id);
  const completed = status === "completed";
  return {
    operationId: operation.id,
    label: operation.label,
    domain: operation.domain ?? domain,
    required: operation.required ?? true,
    expected: operation.expected ?? defaultExpected(operation.id),
    proof,
    ralph: {
      R: stage("R", "What does this operation mean in the selected professional domain?", status, operation.id),
      A: stage("A", "What must be true after the operation completes?", status, operation.id),
      L: stage("L", "Is the live UI/tool/action implemented?", status, operation.id),
      P: stage("P", "Was the operation run with before/after proof?", status, operation.id),
      H: stage("H", "Did failures become regression fixtures?", status, operation.id),
    },
    verdict: completed ? "pass" : "fail",
    reason: completed
      ? "Operation has completed R/A/L/P/H proof."
      : "Operation is not yet proven; object proof alone cannot satisfy workflow proof.",
  };
}

function stage(stageId: OperationRalphStage, question: string, status: OperationRalphStatus, operationId: string): OperationRalphStageReceipt {
  return {
    stage: stageId,
    question,
    status,
    evidencePaths: [`operation/${operationId}/${stageId}.json`],
  };
}

function defaultOperations(domain: string, goal: string): OperationInput[] {
  const text = `${domain} ${goal}`.toLowerCase();
  if (/construction|wall|window|brick|wood|material|mockup/.test(text)) {
    return [
      {
        id: "construction.brush-select-wall",
        label: "Brush-select wall surface",
        domain: "construction-mockups",
        expected: { selectedRegionBound: true, nonTargetSurfacesUnchanged: true },
        proof: {
          selectionReceipt: "docs/proof/selected-region-receipt.json",
          beforeScreenshot: "docs/proof/screenshots/before-material-operation.png",
        },
      },
      {
        id: "construction.replace-wall-material",
        label: "Replace selected wall material",
        domain: "construction-mockups",
        expected: { onlySelectedWallChanged: true, windowsPreserved: true, dimensionsPreserved: true, exportReopens: true },
        proof: {
          afterScreenshot: "docs/proof/screenshots/after-material-operation.png",
          diffReceipt: "docs/proof/before-after-visual-receipt.json",
          materialDiff: "docs/proof/material-replacement-receipt.json",
        },
      },
      {
        id: "construction.export-mockup",
        label: "Export and reopen construction mockup",
        domain: "construction-mockups",
        expected: { exportReopens: true, changedMaterialPersists: true },
        proof: { diffReceipt: "docs/proof/export-reopen-receipt.json" },
      },
    ];
  }
  if (/image|mask|brush|crop/.test(text)) {
    return [
      {
        id: "image.brush-select-subject",
        label: "Brush-select subject",
        expected: { maskMatchesSubject: true, backgroundPreserved: true },
        proof: { selectionReceipt: "docs/proof/mask-boundary-receipt.json" },
      },
    ];
  }
  return [
    {
      id: "workflow.primary-action",
      label: "Primary workflow action",
      expected: { userVisibleStateChange: true, proofReceiptWritten: true },
      proof: { diffReceipt: "docs/proof/operation-receipt.json" },
    },
  ];
}

function defaultExpected(operationId: string): Record<string, unknown> {
  if (/replace.*material/.test(operationId)) {
    return { onlySelectedRegionChanged: true, beforeAfterProof: true, exportReopens: true };
  }
  if (/select|brush|mask/.test(operationId)) {
    return { selectionBoundToIntendedRegion: true, selectionReceiptWritten: true };
  }
  return { actionCompletesInLiveUi: true, proofReceiptWritten: true };
}

function defaultProof(operationId: string): Record<string, string> {
  const slug = operationId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return { diffReceipt: `docs/proof/${slug}-operation-receipt.json` };
}
