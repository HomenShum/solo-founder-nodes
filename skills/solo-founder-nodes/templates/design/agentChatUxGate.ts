export const agentChatUxSurfaceKinds = [
  "creative-production",
  "3d-asset-workspace",
  "workflow-agent",
  "analytics-agent",
  "marketplace-agent",
  "generic-agent-app",
] as const;
export type AgentChatUxSurfaceKind = (typeof agentChatUxSurfaceKinds)[number];

export const agentChatUxCapabilities = [
  "workspace-composer",
  "artifact-workspace",
  "tool-status-timeline",
  "async-job-status",
  "cost-latency-ledger",
  "approval-dry-run-actions",
  "analytics-loopback",
  "memory-signal-extraction",
  "taste-profile-export",
  "provenance-links",
  "trace-export",
  "model-provider-comparison",
  "deployment-publish-handoff",
] as const;
export type AgentChatUxCapability = (typeof agentChatUxCapabilities)[number];

export const requiredAgentChatUxCapabilities: AgentChatUxCapability[] = [
  "workspace-composer",
  "artifact-workspace",
  "tool-status-timeline",
  "async-job-status",
  "cost-latency-ledger",
  "approval-dry-run-actions",
  "analytics-loopback",
  "memory-signal-extraction",
  "taste-profile-export",
  "provenance-links",
  "trace-export",
];

export const agentChatUxSurfaces = [
  "agent-composer",
  "artifact-rail",
  "tool-status-timeline",
  "cost-latency-ledger",
  "memory-insights",
  "approval-console",
  "analytics-panel",
  "trace-export-panel",
] as const;
export type AgentChatUxSurface = (typeof agentChatUxSurfaces)[number];

export const requiredAgentChatUxDomSignals = [
  "agent-composer",
  "artifact-rail",
  "tool-status-timeline",
  "cost-latency-ledger",
  "memory-taste-export",
  "approval-dry-run",
  "analytics-loopback",
  "trace-export",
] as const;
export type RequiredAgentChatUxDomSignal = (typeof requiredAgentChatUxDomSignals)[number];

export interface AgentChatUxInspirationSource {
  id: string;
  title: string;
  url: string;
  pattern: string;
}

export function agentChatUxInspirationSources(): AgentChatUxInspirationSource[] {
  return [
    {
      id: "visual-labs-production-line",
      title: "VisualLabs - Sponsor-Powered AI Ad Production Line",
      url: "https://github.com/HomenShum/AWS-Hackathon",
      pattern:
        "Chat is a production workspace: import/intake, remix, tool calls, artifacts, costs, publish handoff, analytics, and training export are visible in one loop.",
    },
    {
      id: "harness4visuals-taste-memory",
      title: "Harness4Visuals ETL Follow-Up",
      url: "https://github.com/HomenShum/harness4visuals-etl-followup",
      pattern:
        "Long creative chat becomes provenance-backed taste memory and SLM-ready JSONL: chat history -> normalize -> preference signals -> taste profile -> prompt records -> evaluator.",
    },
  ];
}

export interface AgentChatUxPlanInput {
  goal: string;
  surfaceKind?: AgentChatUxSurfaceKind;
  productCategory?: string;
  needsModelComparison?: boolean;
  needsDeploymentHandoff?: boolean;
  createdAt?: string;
}

export interface AgentChatUxStage {
  id: string;
  title: string;
  purpose: string;
  requiredCapabilities: AgentChatUxCapability[];
  requiredArtifacts: string[];
  gates: string[];
}

export interface AgentChatUxPlan {
  schemaVersion: 1;
  goal: string;
  surfaceKind: AgentChatUxSurfaceKind;
  productCategory: string;
  inspirationSourceIds: string[];
  requiredCapabilities: AgentChatUxCapability[];
  requiredSurfaces: AgentChatUxSurface[];
  requiredDomSignals: RequiredAgentChatUxDomSignal[];
  stages: AgentChatUxStage[];
  requiredReceipts: string[];
  warnings: string[];
  createdAt: string;
}

export interface AgentChatUxEvidence {
  desktopScreenshotPaths: string[];
  mobileScreenshotPaths: string[];
  interactionProofPaths: string[];
  tracePaths: string[];
  domTestIds: string[];
  artifactPaths: string[];
  costLatencyReceiptPaths: string[];
  memoryReceiptPaths: string[];
  approvalReceiptPaths: string[];
  analyticsReceiptPaths: string[];
  provenanceReceiptPaths: string[];
  publishHandoffReceiptPaths?: string[];
  modelComparisonPaths?: string[];
}

export interface AgentChatUxReceipt {
  schemaVersion: 1;
  goal: string;
  surfaceKind: AgentChatUxSurfaceKind;
  productCategory: string;
  inspirationSourceIds: string[];
  completedCapabilities: AgentChatUxCapability[];
  implementedSurfaces: AgentChatUxSurface[];
  evidence: AgentChatUxEvidence;
  designQualityReceiptPath?: string;
  notes?: string[];
  createdAt: string;
}

export interface AgentChatUxVerdict {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    capabilities: number;
    surfaces: number;
    domSignals: number;
    evidencePaths: number;
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function countEvidencePaths(evidence: AgentChatUxEvidence) {
  return [
    evidence.desktopScreenshotPaths,
    evidence.mobileScreenshotPaths,
    evidence.interactionProofPaths,
    evidence.tracePaths,
    evidence.artifactPaths,
    evidence.costLatencyReceiptPaths,
    evidence.memoryReceiptPaths,
    evidence.approvalReceiptPaths,
    evidence.analyticsReceiptPaths,
    evidence.provenanceReceiptPaths,
    evidence.publishHandoffReceiptPaths ?? [],
    evidence.modelComparisonPaths ?? [],
  ].reduce((sum, paths) => sum + paths.length, 0);
}

function allRequiredSources(sourceIds: string[]) {
  const ids = new Set(sourceIds);
  return agentChatUxInspirationSources().every((source) => ids.has(source.id));
}

export function makeAgentChatUxPlan(input: AgentChatUxPlanInput): AgentChatUxPlan {
  const surfaceKind = input.surfaceKind ?? "generic-agent-app";
  const requiredCapabilities = unique([
    ...requiredAgentChatUxCapabilities,
    ...(input.needsModelComparison ? ["model-provider-comparison" as const] : []),
    ...(input.needsDeploymentHandoff ? ["deployment-publish-handoff" as const] : []),
  ]);

  const stages: AgentChatUxStage[] = [
    {
      id: "workspace-not-chatbot",
      title: "Chat is the production workspace",
      purpose:
        "Replace a generic chatbot column with a composer connected to artifacts, tool state, costs, approvals, and traces.",
      requiredCapabilities: ["workspace-composer", "artifact-workspace", "tool-status-timeline"],
      requiredArtifacts: ["Design Brief agent-chat section", "Component Contract agent workspace states"],
      gates: ["generic chat-only UI cannot pass"],
    },
    {
      id: "observable-agent-loop",
      title: "Make the agent loop observable",
      purpose:
        "Every tool call and async job exposes status, retry/failure state, cost, latency, and provenance so the user can trust the loop.",
      requiredCapabilities: ["async-job-status", "cost-latency-ledger", "provenance-links", "trace-export"],
      requiredArtifacts: ["tool timeline receipt", "cost latency receipt", "trace export"],
      gates: ["no hidden job runner", "no unpriced provider lane"],
    },
    {
      id: "approval-and-handoff",
      title: "Gate real-world actions",
      purpose:
        "Publish, deploy, marketplace, or customer-facing actions are dry-run/approval-gated and visible in the same workspace.",
      requiredCapabilities: ["approval-dry-run-actions"],
      requiredArtifacts: ["approval receipt", "dry-run command transcript"],
      gates: ["no mutation without approval receipt"],
    },
    {
      id: "learning-loop",
      title: "Turn chat into memory and eval fuel",
      purpose:
        "Extract preference signals, taste profiles, prompt records, analytics, and training/eval JSONL from the session with source provenance.",
      requiredCapabilities: ["analytics-loopback", "memory-signal-extraction", "taste-profile-export"],
      requiredArtifacts: ["taste memory receipt", "prompt record JSONL", "analytics loopback receipt"],
      gates: ["no transcript-only memory", "memory must cite source messages/artifacts"],
    },
    {
      id: "proof-receipt",
      title: "Prove the chat workspace in browser",
      purpose:
        "Desktop/mobile screenshots, DOM signals, interaction proof, traces, artifacts, and receipts must prove the UI is not an internal harness.",
      requiredCapabilities,
      requiredArtifacts: ["agent-chat-ux-receipt", "desktop screenshot", "mobile screenshot", "Playwright trace"],
      gates: ["all required DOM signals present", "design-quality receipt still required"],
    },
  ];

  return {
    schemaVersion: 1,
    goal: input.goal,
    surfaceKind,
    productCategory: input.productCategory ?? "unspecified",
    inspirationSourceIds: agentChatUxInspirationSources().map((source) => source.id),
    requiredCapabilities,
    requiredSurfaces: [...agentChatUxSurfaces],
    requiredDomSignals: [...requiredAgentChatUxDomSignals],
    stages,
    requiredReceipts: unique(stages.flatMap((stage) => stage.requiredArtifacts)),
    warnings: [
      "Agent chat UX is a hard gate for UI-facing agent apps; it complements, not replaces, design-quality and live-browser proof.",
      "Model/provider comparison and deployment/publish handoff are required when the product claim includes them.",
    ],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function verifyAgentChatUxPlan(plan: AgentChatUxPlan): AgentChatUxVerdict {
  const errors: string[] = [];
  const warnings = [...plan.warnings];
  const capabilitySet = new Set(plan.requiredCapabilities);
  const surfaceSet = new Set(plan.requiredSurfaces);
  const domSignalSet = new Set(plan.requiredDomSignals);

  if (plan.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!plan.goal.trim()) errors.push("goal is required");
  if (!agentChatUxSurfaceKinds.includes(plan.surfaceKind)) errors.push(`unsupported surface kind '${plan.surfaceKind}'`);
  if (!allRequiredSources(plan.inspirationSourceIds)) errors.push("plan must cite VisualLabs and Harness4Visuals inspiration sources");
  if (plan.stages.length === 0) errors.push("plan must include stages");
  if (plan.stages[0]?.id !== "workspace-not-chatbot") errors.push("agent chat UX plan must start by rejecting generic chat-only UI");
  if (plan.stages[plan.stages.length - 1]?.id !== "proof-receipt") errors.push("agent chat UX plan must end with proof-receipt");

  for (const capability of requiredAgentChatUxCapabilities) {
    if (!capabilitySet.has(capability)) errors.push(`missing required capability '${capability}'`);
  }
  for (const surface of agentChatUxSurfaces) {
    if (!surfaceSet.has(surface)) errors.push(`missing required surface '${surface}'`);
  }
  for (const signal of requiredAgentChatUxDomSignals) {
    if (!domSignalSet.has(signal)) errors.push(`missing required DOM signal '${signal}'`);
  }
  for (const stage of plan.stages) {
    if (stage.requiredCapabilities.length === 0) errors.push(`stage '${stage.id}' has no required capabilities`);
    if (stage.requiredArtifacts.length === 0) errors.push(`stage '${stage.id}' has no required artifacts`);
    if (stage.gates.length === 0) errors.push(`stage '${stage.id}' has no gates`);
  }

  return {
    ok: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    summary: {
      capabilities: plan.requiredCapabilities.length,
      surfaces: plan.requiredSurfaces.length,
      domSignals: plan.requiredDomSignals.length,
      evidencePaths: 0,
    },
  };
}

export function verifyAgentChatUxReceipt(receipt: AgentChatUxReceipt): AgentChatUxVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const capabilitySet = new Set(receipt.completedCapabilities);
  const surfaceSet = new Set(receipt.implementedSurfaces);
  const domSignalSet = new Set(receipt.evidence.domTestIds);

  if (receipt.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!receipt.goal.trim()) errors.push("goal is required");
  if (!agentChatUxSurfaceKinds.includes(receipt.surfaceKind)) errors.push(`unsupported surface kind '${receipt.surfaceKind}'`);
  if (!allRequiredSources(receipt.inspirationSourceIds)) errors.push("receipt must cite VisualLabs and Harness4Visuals inspiration sources");

  for (const capability of requiredAgentChatUxCapabilities) {
    if (!capabilitySet.has(capability)) errors.push(`missing completed capability '${capability}'`);
  }
  for (const surface of agentChatUxSurfaces) {
    if (!surfaceSet.has(surface)) errors.push(`missing implemented surface '${surface}'`);
  }
  for (const signal of requiredAgentChatUxDomSignals) {
    if (!domSignalSet.has(signal)) errors.push(`missing DOM signal '${signal}'`);
  }

  const evidence = receipt.evidence;
  if (evidence.desktopScreenshotPaths.length === 0) errors.push("missing desktop screenshot proof");
  if (evidence.mobileScreenshotPaths.length === 0) errors.push("missing mobile screenshot proof");
  if (evidence.interactionProofPaths.length === 0) errors.push("missing interaction proof");
  if (evidence.tracePaths.length === 0) errors.push("missing trace export proof");
  if (evidence.artifactPaths.length === 0) errors.push("missing artifact proof");
  if (evidence.costLatencyReceiptPaths.length === 0) errors.push("missing cost/latency receipt");
  if (evidence.memoryReceiptPaths.length === 0) errors.push("missing memory/taste export receipt");
  if (evidence.approvalReceiptPaths.length === 0) errors.push("missing approval/dry-run receipt");
  if (evidence.analyticsReceiptPaths.length === 0) errors.push("missing analytics loopback receipt");
  if (evidence.provenanceReceiptPaths.length === 0) errors.push("missing provenance receipt");
  if (!receipt.designQualityReceiptPath) errors.push("missing design-quality receipt path");

  if (capabilitySet.has("deployment-publish-handoff") && (evidence.publishHandoffReceiptPaths ?? []).length === 0) {
    errors.push("deployment/publish handoff capability requires publishHandoffReceiptPaths");
  }
  if (capabilitySet.has("model-provider-comparison") && (evidence.modelComparisonPaths ?? []).length === 0) {
    errors.push("model/provider comparison capability requires modelComparisonPaths");
  }

  const noteText = (receipt.notes ?? []).join("\n").toLowerCase();
  if (/plain chat only|chatbot only|generic chat box|internal harness|test harness/.test(noteText)) {
    errors.push("agent chat UX notes still describe a generic/internal chat surface");
  }
  if (!capabilitySet.has("model-provider-comparison")) {
    warnings.push("model/provider comparison is optional only when the product claim does not compare models/providers");
  }
  if (!capabilitySet.has("deployment-publish-handoff")) {
    warnings.push("deployment/publish handoff is optional only when the product claim is local or personal research");
  }

  return {
    ok: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    summary: {
      capabilities: receipt.completedCapabilities.length,
      surfaces: receipt.implementedSurfaces.length,
      domSignals: receipt.evidence.domTestIds.length,
      evidencePaths: countEvidencePaths(receipt.evidence),
    },
  };
}
