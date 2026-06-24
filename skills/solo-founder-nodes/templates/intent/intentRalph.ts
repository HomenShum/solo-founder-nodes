import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const intentRalphStages = ["R", "A", "L", "P", "H"] as const;
export type IntentRalphStage = (typeof intentRalphStages)[number];

export type IntentRalphStageStatus = "planned" | "completed";

export type IntentSourceKind =
  | "paper"
  | "official-doc"
  | "product"
  | "benchmark"
  | "dataset"
  | "industry-reference"
  | "internal-doctrine";

export type IntentResearchSource = {
  id: string;
  title: string;
  url: string;
  kind: IntentSourceKind;
  domain: string;
  claim: string;
};

export type IntentWorkstreamInput = {
  id: string;
  label: string;
  role: string;
  kind?: string;
  artifact?: string;
  owner?: string;
  dependsOn?: string[];
};

export type IntentRequirement = {
  id: string;
  requirement: string;
  sourceIds: string[];
  evidenceRequired: string[];
};

export type IntentInterface = {
  id: string;
  targetWorkstreamId: string;
  constraint: string;
  sourceIds: string[];
  evidenceRequired: string[];
};

export type IntentStageReceipt = {
  stage: IntentRalphStage;
  label: string;
  question: string;
  requiredReceipts: string[];
  evidencePaths: string[];
  status: IntentRalphStageStatus;
};

export type IntentRalphLoop = {
  workstreamId: string;
  label: string;
  workstreamKind: string;
  role: string;
  researchSourceIds: string[];
  requirements: IntentRequirement[];
  interfaces: IntentInterface[];
  implementationPlan: {
    artifact: string;
    owner: string;
    generatedFromUserIntentOnly: true;
  };
  stages: Record<IntentRalphStage, IntentStageReceipt>;
  unsupportedUntil: string[];
};

export type IntentDependencyEdge = {
  fromWorkstreamId: string;
  toWorkstreamId: string;
  constraint: string;
  sourceIds: string[];
};

export type IntentRalphReceipt = {
  schemaVersion: 1;
  goal: string;
  domain: string;
  generatedAt: string;
  sources: IntentResearchSource[];
  workstreamLoops: IntentRalphLoop[];
  dependencyGraph: {
    nodes: string[];
    edges: IntentDependencyEdge[];
  };
  globalConstraints: string[];
  restrictions: {
    noUnverifiedClaims: true;
    highRiskHumanApprovalRequired: true;
    productionUseUserOwnedDecision: true;
  };
};

export type IntentRalphVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function intentResearchSources(domain = "general"): IntentResearchSource[] {
  return [
    {
      id: "react",
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      url: "https://arxiv.org/abs/2210.03629",
      kind: "paper",
      domain: "agent-loop",
      claim: "Agent work should interleave reasoning traces with concrete actions and observations.",
    },
    {
      id: "webarena",
      title: "WebArena",
      url: "https://arxiv.org/abs/2307.13854",
      kind: "benchmark",
      domain: "eval",
      claim: "Real web tasks require end-to-end task completion in live-like environments.",
    },
    {
      id: "osworld",
      title: "OSWorld",
      url: "https://arxiv.org/abs/2404.07972",
      kind: "benchmark",
      domain: "eval",
      claim: "Computer-use agents need executable environment proof, not only text answers.",
    },
    {
      id: "research-spine",
      title: "Solo Founder Research Spine",
      url: "references/research-spine.md",
      kind: "internal-doctrine",
      domain,
      claim: "Implementation choices trace user need to inspiration, research, decision, metric, and proof.",
    },
    {
      id: "design-quality-gate",
      title: "Solo Founder Design Quality Gate",
      url: "templates/design/designQualityGate.ts",
      kind: "internal-doctrine",
      domain: "ui",
      claim: "UI-facing work needs design direction, state coverage, interaction proof, and screenshots.",
    },
    {
      id: "agent-ready-api",
      title: "Solo Founder Agent-ready API Gate",
      url: "templates/agentApi/agentReadyApi.ts",
      kind: "internal-doctrine",
      domain: "agent-api",
      claim: "Model-facing tools need provider schema parity, lifecycle guidance, recovery paths, and examples.",
    },
    {
      id: "fresh-room-proof",
      title: "Solo Founder Fresh-room Proof Receipt",
      url: "templates/proof/freshRoomReceipt.ts",
      kind: "internal-doctrine",
      domain: "proof",
      claim: "A claim counts only when live UI evidence, artifacts, and verifier receipts support it.",
    },
  ];
}

export function makeIntentRalphReceipt(input: {
  goal: string;
  domain?: string;
  workstreams?: IntentWorkstreamInput[];
  generatedAt?: string;
  status?: IntentRalphStageStatus;
  evidenceRoot?: string;
}): IntentRalphReceipt {
  const domain = input.domain ?? "general";
  const workstreams = input.workstreams?.length ? input.workstreams : defaultWorkstreams(domain);
  const status = input.status ?? "planned";
  const loops = workstreams.map((workstream, index) =>
    makeWorkstreamLoop(workstream, workstreams, index, domain, status, input.evidenceRoot ?? "intent-ralph"),
  );
  return {
    schemaVersion: 1,
    goal: input.goal,
    domain,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sources: intentResearchSources(domain),
    workstreamLoops: loops,
    dependencyGraph: {
      nodes: loops.map((loop) => loop.workstreamId),
      edges: loops.flatMap((loop) =>
        loop.interfaces.map((edge) => ({
          fromWorkstreamId: loop.workstreamId,
          toWorkstreamId: edge.targetWorkstreamId,
          constraint: edge.constraint,
          sourceIds: edge.sourceIds,
        })),
      ),
    },
    globalConstraints: [
      "Every major user-intent workstream must carry a nested R/A/L/P/H receipt before completion is claimed.",
      "Domain-specific adapters may add stricter gates, but they cannot replace the generic intent RALPH gate.",
      "Implementation work must trace to user need, research-backed decision, executable proof, and unsupported-claim labels.",
      "Production, safety, legal, financial, medical, or commercial claims stay blocked until external approvals and proof receipts exist.",
    ],
    restrictions: {
      noUnverifiedClaims: true,
      highRiskHumanApprovalRequired: true,
      productionUseUserOwnedDecision: true,
    },
  };
}

export function verifyIntentRalphReceipt(
  receipt: IntentRalphReceipt,
  options: { baseDir?: string; requireFiles?: boolean; requireCompleted?: boolean } = {},
): IntentRalphVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;
  const requireCompleted = options.requireCompleted ?? true;

  if (receipt.schemaVersion !== 1) errors.push("intent RALPH receipt schemaVersion must be 1");
  if (!receipt.goal?.trim()) errors.push("intent RALPH receipt requires goal");
  if (!receipt.domain?.trim()) errors.push("intent RALPH receipt requires domain");
  if (receipt.restrictions?.noUnverifiedClaims !== true) errors.push("intent RALPH must block unverified claims");
  if (receipt.restrictions?.highRiskHumanApprovalRequired !== true) errors.push("high-risk work must require human approval");
  if (receipt.restrictions?.productionUseUserOwnedDecision !== true) errors.push("production/commercial decision must stay user-owned");

  const sourceIds = new Set((receipt.sources ?? []).map((source) => source.id));
  for (const required of ["research-spine", "fresh-room-proof"]) {
    if (!sourceIds.has(required)) errors.push(`missing generic intent source: ${required}`);
  }

  if (!receipt.workstreamLoops?.length) errors.push("intent RALPH requires at least one workstream loop");
  const workstreamIds = new Set(receipt.workstreamLoops.map((loop) => loop.workstreamId));
  const graphNodes = new Set(receipt.dependencyGraph?.nodes ?? []);
  for (const id of workstreamIds) {
    if (!graphNodes.has(id)) errors.push(`dependency graph missing node for workstream: ${id}`);
  }

  for (const loop of receipt.workstreamLoops ?? []) {
    if (!loop.workstreamId || !loop.label || !loop.role) errors.push(`workstream ${loop.workstreamId || "<missing>"} requires id, label, and role`);
    if (loop.researchSourceIds.length < 2) errors.push(`workstream ${loop.workstreamId} requires at least two research sources`);
    for (const sourceId of loop.researchSourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`workstream ${loop.workstreamId} references unknown source ${sourceId}`);
    }
    if (loop.requirements.length < 2) errors.push(`workstream ${loop.workstreamId} requires at least two requirements`);
    for (const requirement of loop.requirements) {
      if (requirement.sourceIds.length === 0) errors.push(`workstream ${loop.workstreamId} requirement ${requirement.id} has no sourceIds`);
      if (requirement.evidenceRequired.length === 0) errors.push(`workstream ${loop.workstreamId} requirement ${requirement.id} has no evidence requirements`);
    }
    if (loop.interfaces.length === 0) errors.push(`workstream ${loop.workstreamId} requires at least one dependency/interface`);
    for (const edge of loop.interfaces) {
      if (!workstreamIds.has(edge.targetWorkstreamId) && edge.targetWorkstreamId !== "external-human") {
        errors.push(`workstream ${loop.workstreamId} interface ${edge.id} targets unknown workstream ${edge.targetWorkstreamId}`);
      }
      if (edge.sourceIds.length === 0) errors.push(`workstream ${loop.workstreamId} interface ${edge.id} has no sourceIds`);
    }
    if (loop.implementationPlan.generatedFromUserIntentOnly !== true) {
      errors.push(`workstream ${loop.workstreamId} implementation must be generated from user intent and receipts only`);
    }
    for (const stage of intentRalphStages) {
      const stageReceipt = loop.stages?.[stage];
      if (!stageReceipt) {
        errors.push(`workstream ${loop.workstreamId} missing nested RALPH stage ${stage}`);
        continue;
      }
      if (requireCompleted && stageReceipt.status !== "completed") errors.push(`workstream ${loop.workstreamId} stage ${stage} is not completed`);
      if (stageReceipt.requiredReceipts.length === 0) errors.push(`workstream ${loop.workstreamId} stage ${stage} has no required receipts`);
      if (stageReceipt.evidencePaths.length === 0) errors.push(`workstream ${loop.workstreamId} stage ${stage} has no evidence paths`);
      if (requireFiles) {
        for (const path of stageReceipt.evidencePaths) {
          if (!existsSync(resolve(baseDir, path))) errors.push(`workstream ${loop.workstreamId} stage ${stage} evidence file does not exist: ${path}`);
        }
      }
    }
    if (loop.unsupportedUntil.length === 0) warnings.push(`workstream ${loop.workstreamId} has no unsupported-until limits; check overclaims`);
  }

  if ((receipt.dependencyGraph?.edges ?? []).length < Math.max(0, workstreamIds.size - 1)) {
    errors.push("dependency graph must connect the workstream loops with interface constraints");
  }
  if ((receipt.globalConstraints ?? []).length < 3) errors.push("global constraints are too thin");

  return { ok: errors.length === 0, errors, warnings };
}

function makeWorkstreamLoop(
  workstream: IntentWorkstreamInput,
  allWorkstreams: IntentWorkstreamInput[],
  index: number,
  domain: string,
  status: IntentRalphStageStatus,
  evidenceRoot: string,
): IntentRalphLoop {
  const sourceIds = sourceIdsForWorkstream(workstream, domain);
  const target = dependencyTarget(workstream, allWorkstreams, index);
  return {
    workstreamId: workstream.id,
    label: workstream.label,
    workstreamKind: workstream.kind ?? classifyWorkstream(workstream),
    role: workstream.role,
    researchSourceIds: sourceIds,
    requirements: [
      {
        id: `${workstream.id}-intent`,
        requirement: `Define what '${workstream.label}' must do for the user's intent before implementation starts.`,
        sourceIds,
        evidenceRequired: ["intent requirement note", "source-backed decision"],
      },
      {
        id: `${workstream.id}-proof-contract`,
        requirement: `Define the executable proof that shows '${workstream.label}' works in the actual product context.`,
        sourceIds: ["fresh-room-proof", "webarena", ...sourceIds.slice(0, 1)],
        evidenceRequired: ["proof artifact path", "verifier or live UI signal", "unsupported-claim labels"],
      },
    ],
    interfaces: [
      {
        id: `${workstream.id}-to-${target}`,
        targetWorkstreamId: target,
        constraint: interfaceConstraint(workstream, target),
        sourceIds: ["research-spine", "fresh-room-proof", ...sourceIds.slice(0, 1)],
        evidenceRequired: ["dependency edge", "handoff contract"],
      },
    ],
    implementationPlan: {
      artifact: workstream.artifact ?? `${workstream.id}-receipt.json`,
      owner: workstream.owner ?? "coding-agent",
      generatedFromUserIntentOnly: true,
    },
    stages: makeStages(workstream, evidenceRoot, status),
    unsupportedUntil: [
      "No done claim until R/A/L/P/H receipts are complete.",
      "No production/customer/judge claim until live proof and deployment or environment receipts pass.",
      "No high-risk legal, safety, financial, medical, or commercial claim until qualified human approval is attached.",
    ],
  };
}

function makeStages(
  workstream: IntentWorkstreamInput,
  evidenceRoot: string,
  status: IntentRalphStageStatus,
): Record<IntentRalphStage, IntentStageReceipt> {
  const prefix = `${evidenceRoot}/${workstream.id}`;
  return {
    R: stage("R", "Research", `What does '${workstream.label}' require and which sources support it?`, ["source-map", "requirement-note"], [`${prefix}/R-research.md`], status),
    A: stage("A", "Alignment", `What workstreams or external decisions must '${workstream.label}' align with?`, ["dependency-interface", "handoff-contract"], [`${prefix}/A-alignment.md`], status),
    L: stage("L", "Live Build", `What implementation artifact will satisfy '${workstream.label}'?`, ["implementation-plan", "artifact-contract"], [`${prefix}/L-live-build.md`], status),
    P: stage("P", "Proof", `How is '${workstream.label}' proven in the actual environment?`, ["proof-artifact", "verifier-signal"], [`${prefix}/P-proof.md`], status),
    H: stage("H", "Hardening", `Which claims remain blocked for '${workstream.label}'?`, ["unsupported-claim-labels", "risk-approval-limits"], [`${prefix}/H-hardening.md`], status),
  };
}

function stage(
  stageId: IntentRalphStage,
  label: string,
  question: string,
  requiredReceipts: string[],
  evidencePaths: string[],
  status: IntentRalphStageStatus,
): IntentStageReceipt {
  return { stage: stageId, label, question, requiredReceipts, evidencePaths, status };
}

function defaultWorkstreams(domain: string): IntentWorkstreamInput[] {
  return [
    { id: "user-intent", label: "User intent extraction", role: `Convert the user's ${domain} request into explicit requirements, risks, and non-claims.`, kind: "discover", artifact: "capability-spec.json" },
    { id: "research-map", label: "Research map", role: "Collect research, product references, datasets, and benchmarks before decisions.", kind: "research", artifact: "research-spine.json", dependsOn: ["user-intent"] },
    { id: "build-surface", label: "Build surface", role: "Implement the app, agent, workflow, or artifact needed by the user.", kind: "implementation", artifact: "build-receipt.json", dependsOn: ["research-map"] },
    { id: "adapter-contract", label: "Adapter contract", role: "Wire tools, APIs, model calls, UI actions, or external services through typed contracts.", kind: "adapter", artifact: "agent-api-contract.json", dependsOn: ["build-surface"] },
    { id: "live-proof", label: "Live proof", role: "Prove the user intent in the real UI/environment with traceable artifacts.", kind: "proof", artifact: "proof-verdict.json", dependsOn: ["adapter-contract"] },
  ];
}

function sourceIdsForWorkstream(workstream: IntentWorkstreamInput, domain: string): string[] {
  const text = `${domain} ${workstream.id} ${workstream.label} ${workstream.role} ${workstream.kind ?? ""}`.toLowerCase();
  const base = ["research-spine", "fresh-room-proof"];
  if (/ui|design|surface|dashboard|app|viewer|mobile/.test(text)) return [...base, "design-quality-gate", "webarena", "osworld"];
  if (/api|adapter|tool|model|agent|workflow/.test(text)) return [...base, "agent-ready-api", "react", "osworld"];
  if (/benchmark|proof|verify|eval|score/.test(text)) return [...base, "webarena", "osworld"];
  return [...base, "react", "webarena"];
}

function classifyWorkstream(workstream: IntentWorkstreamInput): string {
  const text = `${workstream.id} ${workstream.label} ${workstream.role}`.toLowerCase();
  if (/research|source|reference/.test(text)) return "research";
  if (/api|adapter|tool|model/.test(text)) return "adapter";
  if (/proof|verify|eval|benchmark/.test(text)) return "proof";
  if (/ui|design|surface|app|viewer/.test(text)) return "product-surface";
  return "implementation-workstream";
}

function dependencyTarget(workstream: IntentWorkstreamInput, allWorkstreams: IntentWorkstreamInput[], index: number): string {
  if (workstream.dependsOn?.[0]) return workstream.dependsOn[0];
  return allWorkstreams[index === 0 ? Math.min(1, allWorkstreams.length - 1) : index - 1]?.id ?? "external-human";
}

function interfaceConstraint(workstream: IntentWorkstreamInput, targetWorkstreamId: string): string {
  const kind = workstream.kind ?? classifyWorkstream(workstream);
  if (kind.includes("research")) return `Must cite and constrain decisions consumed by ${targetWorkstreamId}.`;
  if (kind.includes("adapter")) return `Must expose typed contracts and recovery paths to ${targetWorkstreamId}.`;
  if (kind.includes("proof")) return `Must verify outputs from ${targetWorkstreamId} in the actual environment.`;
  if (kind.includes("surface")) return `Must render the user-facing workflow implied by ${targetWorkstreamId}.`;
  return `Must declare dependency and handoff contract with ${targetWorkstreamId}.`;
}
