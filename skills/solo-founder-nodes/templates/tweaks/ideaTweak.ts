export const loopPhasesForTweaks = ["discover", "benchmark", "setup", "build", "adapter", "verify", "iterate"] as const;
export type LoopPhaseForTweak = (typeof loopPhasesForTweaks)[number];

export const ideaTweakCategories = [
  "user-workflow",
  "input-source",
  "artifact-quality",
  "storage-inventory",
  "agent-ux",
  "deployment",
  "benchmark-proof",
  "safety-rights",
  "design-reference",
  "animation-interaction",
  "provider-strategy",
] as const;
export type IdeaTweakCategory = (typeof ideaTweakCategories)[number];

export type IdeaTweakDelta = {
  id: string;
  label: string;
  category: IdeaTweakCategory;
  priority: "must" | "should" | "could";
  sourceExcerpt: string;
  affectedPhases: LoopPhaseForTweak[];
  requiredReceipts: string[];
  proofObligations: string[];
  componentRalphRequired: boolean;
  designQualityRequired: boolean;
  unsupportedUntil: string[];
};

export type IdeaTweakReceipt = {
  schemaVersion: 1;
  goal: string;
  domain: string;
  createdAt: string;
  sourceMessages: string[];
  deltas: IdeaTweakDelta[];
  reroute: {
    earliestPhase: LoopPhaseForTweak;
    phasesToRevisit: LoopPhaseForTweak[];
    reason: string;
  };
  requiredActions: {
    updateIntentRalph: boolean;
    updateComponentRalph: boolean;
    updateDesignFlow: boolean;
    updateAgentChatUx: boolean;
    updateSetupMatrix: boolean;
    updateLiveProof: boolean;
    updateDocs: boolean;
    rerunFreshContextJudge: boolean;
  };
  parentLoopGate: {
    noSilentScopeCreep: true;
    tweakRequiresProof: true;
    rerunJudgeAfterPatch: true;
  };
};

export type IdeaTweakVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    deltas: number;
    earliestPhase: LoopPhaseForTweak | null;
    proofObligations: number;
  };
};

type PatternTweak = {
  id: string;
  label: string;
  category: IdeaTweakCategory;
  priority: IdeaTweakDelta["priority"];
  pattern: RegExp;
  phases: LoopPhaseForTweak[];
  receipts: string[];
  proofs: string[];
  component?: boolean;
  design?: boolean;
  unsupportedUntil?: string[];
};

const patternTweaks: PatternTweak[] = [
  {
    id: "source-brush-isolation",
    label: "Brush-select target object before generation",
    category: "input-source",
    priority: "must",
    pattern: /\b(brush|crop|mask|segment|remove stuff|specific part|isolate)\b/i,
    phases: ["discover", "build", "verify"],
    receipts: ["source-isolation-receipt", "brush-crop-ui-receipt", "proof-verdict"],
    proofs: ["UI lets the user mark/select the target source region", "local storage or trace records the source-selection receipt", "generated output treats unselected pixels as context only"],
    component: true,
    unsupportedUntil: ["No claim that source extraction works until the brush/mask receipt is visible in UI proof."],
  },
  {
    id: "asset-inventory-storage",
    label: "Asset inventory and storage decision",
    category: "storage-inventory",
    priority: "must",
    pattern: /\b(inventory|library|s3|storage|store|assets alongside|same environment|generated assets)\b/i,
    phases: ["setup", "build", "verify"],
    receipts: ["setup-matrix-receipt", "asset-inventory-receipt", "storage-decision-receipt"],
    proofs: ["UI shows generated assets in a shared inventory/scene stack", "storage/db/object-store choice is explicit", "exported artifacts remain addressable by ID"],
    component: true,
    unsupportedUntil: ["No customer/judge workflow claim until asset persistence or a user-owned storage decision is proven."],
  },
  {
    id: "camera-animation-lane",
    label: "Laptop-camera animation lane",
    category: "animation-interaction",
    priority: "should",
    pattern: /\b(camera|webcam|animate|animation|motion tracking|motion|rig)\b/i,
    phases: ["discover", "adapter", "verify"],
    receipts: ["camera-permission-contract", "animation-action-protocol", "live-ui-proof"],
    proofs: ["UI separates permission-gated camera setup from mesh generation", "typed action or rig contract is visible", "proof labels camera animation as blocked or armed with user permission"],
    component: true,
    unsupportedUntil: ["No motion-tracking claim until camera permission, rig mapping, and live animation proof pass."],
  },
  {
    id: "voice-chat-transcript",
    label: "Voice input and chat transcription",
    category: "agent-ux",
    priority: "should",
    pattern: /\b(voice|transcript|dictation|chat transcription|talk)\b/i,
    phases: ["build", "adapter", "verify"],
    receipts: ["agent-chat-ux-receipt", "voice-transcript-contract", "trace-export"],
    proofs: ["Voice/transcript text can enter the same agent loop as typed chat", "agent response is connected to artifacts/actions", "trace records the transcript handoff"],
    design: true,
    unsupportedUntil: ["No voice-agent claim until transcript handoff and tool/action proof pass."],
  },
  {
    id: "interactive-web-3d-reference",
    label: "Interactive web 3D design reference lane",
    category: "design-reference",
    priority: "should",
    pattern: /\b(spline|framer|bruno|emergent|interactive 3d|3d website|pretty|web design|scroll animation)\b/i,
    phases: ["discover", "build", "verify"],
    receipts: ["design-flow-receipt", "design-quality-receipt", "visual-regression-proof"],
    proofs: ["Design reference is converted into interaction principles, not copied assets", "UI proves a polished 3D workspace or web export lane", "desktop and mobile screenshots pass visual inspection"],
    design: true,
    unsupportedUntil: ["No top-tier design claim until visual screenshots and design-quality receipt pass."],
  },
  {
    id: "competitor-reference-intake",
    label: "Competitor/reference inspiration intake",
    category: "design-reference",
    priority: "should",
    pattern: /\b(competitor|lovart|reference|visual insight|design references|inspiration)\b/i,
    phases: ["discover", "build", "verify"],
    receipts: ["reference-strategy-receipt", "rights-provenance-receipt", "design-flow-receipt"],
    proofs: ["UI names reference strategy and rights/provenance boundary", "agent generates original direction rather than replica instructions", "proof keeps inspiration links separate from generated asset output"],
    design: true,
    unsupportedUntil: ["No replica/export claim from competitor references; only original clean-room outputs can pass."],
  },
  {
    id: "provider-optional-first-party-core",
    label: "Provider-optional first-party core",
    category: "provider-strategy",
    priority: "must",
    pattern: /\b(no api|without api|no provider|provider|self-hosted|first-party|own solution|external dependency)\b/i,
    phases: ["setup", "build", "verify"],
    receipts: ["provider-setup-matrix", "first-party-fallback-proof", "cost-latency-receipt"],
    proofs: ["Core demo runs without third-party generation keys", "providers are labeled optional comparator/accelerator lanes", "blocked self-hosted/GPU lanes are explicit"],
    unsupportedUntil: ["No high-fidelity generation claim until first-party model/runtime proof or approved provider proof passes."],
  },
  {
    id: "deployment-marketplace-lane",
    label: "Deployment and marketplace lane",
    category: "deployment",
    priority: "should",
    pattern: /\b(deploy|deployment|agentbox|gmi|aws|marketplace|live url|ship|sponsor)\b/i,
    phases: ["setup", "verify"],
    receipts: ["deployment-target-receipt", "live-url-proof", "marketplace-readiness-check"],
    proofs: ["Deployment target and required env vars are explicit", "live URL proof exists when claimed", "marketplace listing is optional/user-owned unless actually submitted"],
    unsupportedUntil: ["No deployable/customer-ready claim until live URL, env, persistence, and observability receipts pass."],
  },
  {
    id: "rights-safe-originality",
    label: "Rights-aware original asset boundary",
    category: "safety-rights",
    priority: "must",
    pattern: /\b(copyright|exact replica|replica|3d print|movie|textbook|social media|personal research|commercial)\b/i,
    phases: ["discover", "build", "verify"],
    receipts: ["rights-provenance-receipt", "clean-room-delta-receipt", "unsupported-claim-labels"],
    proofs: ["Exact replica export is blocked", "clean-room delta is visible", "commercial/physical/human use stays user-owned"],
    component: true,
    unsupportedUntil: ["No commercial, physical, or exact-copy claim until qualified approval and rights receipts exist."],
  },
];

const phaseRank: Record<LoopPhaseForTweak, number> = {
  discover: 0,
  benchmark: 1,
  setup: 2,
  build: 3,
  adapter: 4,
  verify: 5,
  iterate: 6,
};

function compactId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function excerptFor(pattern: RegExp, messages: string[]) {
  const match = messages.find((message) => pattern.test(message));
  return (match ?? messages[0] ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function defaultTweak(messages: string[]): IdeaTweakDelta {
  return {
    id: "general-founder-tweak",
    label: "General founder idea delta",
    category: "user-workflow",
    priority: "should",
    sourceExcerpt: excerptFor(/./, messages),
    affectedPhases: ["discover", "verify"],
    requiredReceipts: ["updated-capability-spec", "proof-verdict"],
    proofObligations: [
      "Restate the new user request as requirements and non-claims",
      "Update the live UI/proof verdict if the request changes user-visible behavior",
    ],
    componentRalphRequired: false,
    designQualityRequired: false,
    unsupportedUntil: ["No done claim until the tweak is either implemented with proof or explicitly deferred with user-visible rationale."],
  };
}

export function makeIdeaTweakReceipt(input: {
  goal: string;
  domain?: string;
  messages: string[];
  createdAt?: string;
}): IdeaTweakReceipt {
  const messages = input.messages.map((message) => message.trim()).filter(Boolean);
  const deltas = patternTweaks
    .filter((candidate) => messages.some((message) => candidate.pattern.test(message)))
    .map<IdeaTweakDelta>((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      category: candidate.category,
      priority: candidate.priority,
      sourceExcerpt: excerptFor(candidate.pattern, messages),
      affectedPhases: candidate.phases,
      requiredReceipts: candidate.receipts,
      proofObligations: candidate.proofs,
      componentRalphRequired: candidate.component ?? false,
      designQualityRequired: candidate.design ?? false,
      unsupportedUntil: candidate.unsupportedUntil ?? [
        `No ${candidate.label.toLowerCase()} claim until the required receipts and proof obligations pass.`,
      ],
    }));

  const finalDeltas = deltas.length ? deltas : [defaultTweak(messages)];
  const allPhases = unique(finalDeltas.flatMap((delta) => delta.affectedPhases)).sort((a, b) => phaseRank[a] - phaseRank[b]);
  const earliestPhase = allPhases[0] ?? "discover";

  return {
    schemaVersion: 1,
    goal: input.goal,
    domain: input.domain ?? "general",
    createdAt: input.createdAt ?? new Date().toISOString(),
    sourceMessages: messages,
    deltas: finalDeltas,
    reroute: {
      earliestPhase,
      phasesToRevisit: allPhases,
      reason: `New founder tweak changes ${finalDeltas.length} workstream(s); restart from ${earliestPhase} and re-run proof.`,
    },
    requiredActions: {
      updateIntentRalph: true,
      updateComponentRalph: finalDeltas.some((delta) => delta.componentRalphRequired),
      updateDesignFlow: finalDeltas.some((delta) => delta.designQualityRequired),
      updateAgentChatUx: finalDeltas.some((delta) => delta.category === "agent-ux" || delta.designQualityRequired),
      updateSetupMatrix: finalDeltas.some((delta) => ["storage-inventory", "deployment", "provider-strategy"].includes(delta.category)),
      updateLiveProof: true,
      updateDocs: true,
      rerunFreshContextJudge: true,
    },
    parentLoopGate: {
      noSilentScopeCreep: true,
      tweakRequiresProof: true,
      rerunJudgeAfterPatch: true,
    },
  };
}

export function verifyIdeaTweakReceipt(receipt: IdeaTweakReceipt): IdeaTweakVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (receipt.schemaVersion !== 1) errors.push("idea tweak receipt schemaVersion must be 1");
  if (!receipt.goal?.trim()) errors.push("idea tweak receipt requires goal");
  if (!receipt.domain?.trim()) errors.push("idea tweak receipt requires domain");
  if (!receipt.sourceMessages?.length) errors.push("idea tweak receipt requires at least one source message");
  if (!receipt.deltas?.length) errors.push("idea tweak receipt requires at least one delta");
  if (receipt.parentLoopGate?.noSilentScopeCreep !== true) errors.push("idea tweak gate must block silent scope creep");
  if (receipt.parentLoopGate?.tweakRequiresProof !== true) errors.push("idea tweak gate must require proof");
  if (receipt.parentLoopGate?.rerunJudgeAfterPatch !== true) errors.push("idea tweak gate must rerun judge after patch");
  if (!receipt.requiredActions?.updateIntentRalph) errors.push("idea tweaks must update or re-check Intent RALPH");
  if (!receipt.requiredActions?.updateLiveProof) errors.push("idea tweaks must update live proof");
  if (!receipt.requiredActions?.rerunFreshContextJudge) errors.push("idea tweaks must rerun the fresh-context judge");

  const phasesToRevisit = new Set(receipt.reroute?.phasesToRevisit ?? []);
  if (!receipt.reroute?.earliestPhase) errors.push("idea tweak receipt requires reroute.earliestPhase");
  if (!phasesToRevisit.has(receipt.reroute?.earliestPhase)) errors.push("earliestPhase must be included in phasesToRevisit");

  for (const delta of receipt.deltas ?? []) {
    if (!delta.id || !delta.label || !delta.sourceExcerpt) errors.push(`delta ${delta.id || "<missing>"} requires id, label, and sourceExcerpt`);
    if (!ideaTweakCategories.includes(delta.category)) errors.push(`delta ${delta.id} has unsupported category ${delta.category}`);
    if (!["must", "should", "could"].includes(delta.priority)) errors.push(`delta ${delta.id} has invalid priority`);
    if (!delta.affectedPhases.length) errors.push(`delta ${delta.id} requires affected phases`);
    for (const phase of delta.affectedPhases) {
      if (!loopPhasesForTweaks.includes(phase)) errors.push(`delta ${delta.id} has unsupported phase ${phase}`);
      if (!phasesToRevisit.has(phase)) errors.push(`delta ${delta.id} phase ${phase} missing from reroute phases`);
    }
    if (delta.requiredReceipts.length < 2) errors.push(`delta ${delta.id} needs at least two required receipts`);
    if (delta.proofObligations.length < 2) errors.push(`delta ${delta.id} needs at least two proof obligations`);
    if (!delta.unsupportedUntil.length) warnings.push(`delta ${delta.id} has no unsupported-until labels`);
  }

  const needsDesign = receipt.deltas?.some((delta) => delta.designQualityRequired);
  if (needsDesign && !receipt.requiredActions.updateDesignFlow) errors.push("design tweak requires updateDesignFlow");
  const needsComponent = receipt.deltas?.some((delta) => delta.componentRalphRequired);
  if (needsComponent && !receipt.requiredActions.updateComponentRalph) errors.push("component tweak requires updateComponentRalph");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      deltas: receipt.deltas?.length ?? 0,
      earliestPhase: receipt.reroute?.earliestPhase ?? null,
      proofObligations: (receipt.deltas ?? []).reduce((sum, delta) => sum + delta.proofObligations.length, 0),
    },
  };
}
