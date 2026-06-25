import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const domainPackIds = [
  "3d-assets",
  "finance-nodeagent",
  "video-remix",
  "image-editing",
  "web-app-ui",
  "data-pipeline",
  "agent-app",
  "generic",
] as const;

export type DomainPackId = (typeof domainPackIds)[number];
export type DomainGateStatus = "planned" | "pass" | "partial" | "blocked";
export type DomainSeverity = "blocker" | "major" | "minor";
export type RegressionStatus = "planned" | "covered" | "parked";

export type DomainInvariant = {
  id: string;
  description: string;
  severity: DomainSeverity;
  professionalFailure: string;
  proofGateIds: string[];
};

export type DomainProofGate = {
  id: string;
  label: string;
  command: string;
  requiredReceipt: string;
  blocksParentClaim: boolean;
  status: DomainGateStatus;
  evidencePaths: string[];
};

export type DomainVisualCheck = {
  id: string;
  label: string;
  screenshotOrVideoRequired: boolean;
  canonicalViews: string[];
};

export type DomainRegressionFixture = {
  id: string;
  sourceReport: string;
  domain: DomainPackId;
  missingInvariantId: string;
  proofGateId: string;
  fixturePath: string;
  expectedFailure: string;
  status: RegressionStatus;
};

export type DomainPack = {
  schemaVersion: 1;
  packKind: "domain-pack";
  id: DomainPackId;
  name: string;
  goal: string;
  generatedAt: string;
  ontology: {
    entities: string[];
    relationships: string[];
  };
  invariants: DomainInvariant[];
  proofGates: DomainProofGate[];
  visualChecks: DomainVisualCheck[];
  regressionFixtures: DomainRegressionFixture[];
  parentGate: {
    domainProofRequired: true;
    userReportedFailuresBecomeGates: true;
    genericProofIsInsufficient: true;
  };
};

export type DomainJudgeVerdict = {
  ok: boolean;
  required: boolean;
  domain: DomainPackId;
  errors: string[];
  warnings: string[];
  missingProofs: string[];
  blockerGateIds: string[];
};

export const domainPackRelativePath = ".solo/domain/domain-pack.json";
export const domainRegressionRelativeDir = ".solo/domain/regressions";

export function domainPackPath(projectPath: string) {
  return resolve(projectPath, domainPackRelativePath);
}

export function domainRegressionDir(projectPath: string) {
  return resolve(projectPath, domainRegressionRelativeDir);
}

export function classifyDomainFromText(text: string): DomainPackId {
  const normalized = text.toLowerCase();
  if (/3d|mesh|model|glb|gltf|obj|cad|blender|spline|webgl|three\.?js|asset/.test(normalized)) return "3d-assets";
  if (/finance|spreadsheet|formula|valuation|company|diligence|bank|cash|ledger|cell|source|citation/.test(normalized)) return "finance-nodeagent";
  if (/video|clip|caption|reframe|opus|shorts|tiktok|reels|transcript|loudness|b-?roll/.test(normalized)) return "video-remix";
  if (/image|photo|mask|brush|inpaint|background|shadow|lighting|product shot/.test(normalized)) return "image-editing";
  if (/dashboard|website|ui|ux|responsive|accessibility|shadcn|design/.test(normalized)) return "web-app-ui";
  if (/etl|pipeline|transform|warehouse|schema|backfill|replay/.test(normalized)) return "data-pipeline";
  if (/agent|tool call|memory|planner|workflow|automation|chat/.test(normalized)) return "agent-app";
  return "generic";
}

export function makeDomainPack(input: {
  goal: string;
  domain?: string;
  generatedAt?: string;
  status?: DomainGateStatus;
}): DomainPack {
  const domain = normalizeDomainPackId(input.domain ?? classifyDomainFromText(input.goal));
  const seed = domainSeed(domain);
  const status = input.status ?? "planned";
  return {
    schemaVersion: 1,
    packKind: "domain-pack",
    id: domain,
    name: seed.name,
    goal: input.goal,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    ontology: seed.ontology,
    invariants: seed.invariants,
    proofGates: seed.proofGates.map((gate) => ({ ...gate, status })),
    visualChecks: seed.visualChecks,
    regressionFixtures: [],
    parentGate: {
      domainProofRequired: true,
      userReportedFailuresBecomeGates: true,
      genericProofIsInsufficient: true,
    },
  };
}

export function verifyDomainPack(
  pack: DomainPack | undefined,
  options: { baseDir?: string; requireFiles?: boolean; requireCompleted?: boolean; required?: boolean } = {},
): DomainJudgeVerdict {
  const required = options.required ?? !!pack;
  const domain = pack?.id ?? "generic";
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingProofs: string[] = [];
  const blockerGateIds: string[] = [];
  const baseDir = options.baseDir ?? process.cwd();
  const requireFiles = options.requireFiles ?? true;
  const requireCompleted = options.requireCompleted ?? true;

  if (!pack) {
    if (required) {
      errors.push("domain pack is required for this parent claim");
      missingProofs.push(domainPackRelativePath);
    }
    return { ok: errors.length === 0, required, domain, errors, warnings, missingProofs, blockerGateIds };
  }

  if (pack.schemaVersion !== 1) errors.push("domain pack schemaVersion must be 1");
  if (pack.packKind !== "domain-pack") errors.push("domain pack kind must be domain-pack");
  if (!domainPackIds.includes(pack.id)) errors.push(`unsupported domain pack id: ${pack.id}`);
  if (!pack.goal?.trim()) errors.push("domain pack requires goal");
  if (pack.parentGate?.domainProofRequired !== true) errors.push("domain pack must require domain proof");
  if (pack.parentGate?.userReportedFailuresBecomeGates !== true) errors.push("domain pack must convert user reports into gates");
  if (pack.parentGate?.genericProofIsInsufficient !== true) errors.push("domain pack must reject generic proof as sufficient");
  if ((pack.ontology?.entities ?? []).length === 0) errors.push("domain pack requires ontology entities");
  if ((pack.ontology?.relationships ?? []).length === 0) errors.push("domain pack requires ontology relationships");
  if ((pack.invariants ?? []).length === 0) errors.push("domain pack requires professional invariants");
  if ((pack.proofGates ?? []).length === 0) errors.push("domain pack requires proof gates");

  const gateById = new Map((pack.proofGates ?? []).map((gate) => [gate.id, gate]));
  for (const invariant of pack.invariants ?? []) {
    if (!invariant.id || !invariant.description || !invariant.professionalFailure) {
      errors.push("domain invariant requires id, description, and professionalFailure");
    }
    if ((invariant.proofGateIds ?? []).length === 0) {
      errors.push(`domain invariant ${invariant.id} requires proofGateIds`);
      missingProofs.push(`domain.invariant:${invariant.id}:proofGate`);
    }
    for (const gateId of invariant.proofGateIds ?? []) {
      if (!gateById.has(gateId)) {
        errors.push(`domain invariant ${invariant.id} references missing proof gate ${gateId}`);
        missingProofs.push(`domain.gate:${gateId}`);
      }
    }
  }

  for (const gate of pack.proofGates ?? []) {
    if (!gate.id || !gate.label || !gate.command || !gate.requiredReceipt) {
      errors.push(`domain proof gate ${gate.id || "<missing>"} requires id, label, command, and requiredReceipt`);
    }
    if (gate.blocksParentClaim && requireCompleted && gate.status !== "pass") {
      errors.push(`domain proof gate ${gate.id} blocks parent claim and is ${gate.status}`);
      missingProofs.push(gate.requiredReceipt);
      blockerGateIds.push(gate.id);
    }
    const receiptPath = resolve(baseDir, gate.requiredReceipt);
    if (requireFiles && gate.status === "pass" && !existsSync(receiptPath)) {
      errors.push(`domain proof gate ${gate.id} receipt file does not exist: ${gate.requiredReceipt}`);
      missingProofs.push(gate.requiredReceipt);
    }
    if (requireFiles && gate.status === "pass") {
      for (const evidencePath of gate.evidencePaths ?? []) {
        if (!existsSync(resolve(baseDir, evidencePath))) {
          errors.push(`domain proof gate ${gate.id} evidence file does not exist: ${evidencePath}`);
          missingProofs.push(evidencePath);
        }
      }
    }
  }

  for (const fixture of pack.regressionFixtures ?? []) {
    if (!fixture.id || !fixture.missingInvariantId || !fixture.proofGateId || !fixture.expectedFailure) {
      errors.push(`domain regression fixture ${fixture.id || "<missing>"} is incomplete`);
    }
    if (!gateById.has(fixture.proofGateId)) {
      errors.push(`domain regression fixture ${fixture.id} references missing proof gate ${fixture.proofGateId}`);
      missingProofs.push(`domain.regression:${fixture.id}:${fixture.proofGateId}`);
    }
    if (requireCompleted && fixture.status !== "covered") {
      errors.push(`domain regression fixture ${fixture.id} is not covered`);
      missingProofs.push(fixture.fixturePath);
    }
  }

  if ((pack.visualChecks ?? []).some((check) => check.screenshotOrVideoRequired && check.canonicalViews.length === 0)) {
    warnings.push("at least one visual check requires media but has no canonical views");
  }

  return {
    ok: errors.length === 0,
    required,
    domain: pack.id,
    errors,
    warnings,
    missingProofs: [...new Set(missingProofs)],
    blockerGateIds: [...new Set(blockerGateIds)],
  };
}

export function readDomainPack(projectPath: string): DomainPack | undefined {
  const path = domainPackPath(projectPath);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as DomainPack;
}

export function makeDomainRegressionFixture(input: {
  report: string;
  domain?: string;
  id?: string;
  status?: RegressionStatus;
}): DomainRegressionFixture {
  const domain = normalizeDomainPackId(input.domain ?? classifyDomainFromText(input.report));
  const classified = classifyMissingInvariant(domain, input.report);
  const id = input.id ?? `regression-${slugify(classified.proofGateId)}-${stableSuffix(input.report)}`;
  return {
    id,
    sourceReport: input.report.slice(0, 500),
    domain,
    missingInvariantId: classified.invariantId,
    proofGateId: classified.proofGateId,
    fixturePath: join(domainRegressionRelativeDir, `${id}.json`).replace(/\\/g, "/"),
    expectedFailure: classified.expectedFailure,
    status: input.status ?? "planned",
  };
}

export function addRegressionToDomainPack(pack: DomainPack, fixture: DomainRegressionFixture): DomainPack {
  const next = clone(pack);
  const gateExists = next.proofGates.some((gate) => gate.id === fixture.proofGateId);
  if (!gateExists) {
    next.proofGates.push({
      id: fixture.proofGateId,
      label: titleize(fixture.proofGateId),
      command: `npm run sfn -- domain verify --project .`,
      requiredReceipt: fixture.fixturePath,
      blocksParentClaim: true,
      status: fixture.status === "covered" ? "pass" : "planned",
      evidencePaths: [],
    });
  }
  const invariantExists = next.invariants.some((invariant) => invariant.id === fixture.missingInvariantId);
  if (!invariantExists) {
    next.invariants.push({
      id: fixture.missingInvariantId,
      description: `User-reported invariant for ${fixture.expectedFailure}.`,
      severity: "blocker",
      professionalFailure: fixture.expectedFailure,
      proofGateIds: [fixture.proofGateId],
    });
  }
  if (!next.regressionFixtures.some((item) => item.id === fixture.id)) {
    next.regressionFixtures.push(fixture);
  }
  return next;
}

export function domainPackRequiredFor(input: {
  goal?: string;
  lastAssistantMessage?: string;
  componentLayerRequired?: boolean;
  assemblyLayerRequired?: boolean;
}): boolean {
  const text = `${input.goal ?? ""}\n${input.lastAssistantMessage ?? ""}`;
  return !!input.componentLayerRequired
    || !!input.assemblyLayerRequired
    || classifyDomainFromText(text) !== "generic"
    || /professional|industry|production|deploy|benchmark|live ui|real user|proof/i.test(text);
}

function normalizeDomainPackId(value: string): DomainPackId {
  const normalized = value.toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, DomainPackId> = {
    "3d": "3d-assets",
    "3d-generation": "3d-assets",
    "3d-asset": "3d-assets",
    "3d-assets": "3d-assets",
    finance: "finance-nodeagent",
    noderoom: "finance-nodeagent",
    "finance-nodeagent": "finance-nodeagent",
    video: "video-remix",
    "video-remix": "video-remix",
    image: "image-editing",
    "image-editing": "image-editing",
    ui: "web-app-ui",
    "web-app-ui": "web-app-ui",
    data: "data-pipeline",
    "data-pipeline": "data-pipeline",
    agent: "agent-app",
    "agent-app": "agent-app",
    generic: "generic",
  };
  const mapped = aliases[normalized];
  if (mapped) return mapped;
  if (domainPackIds.includes(normalized as DomainPackId)) return normalized as DomainPackId;
  return classifyDomainFromText(value);
}

function domainSeed(domain: DomainPackId): Omit<DomainPack, "schemaVersion" | "packKind" | "id" | "goal" | "generatedAt" | "regressionFixtures" | "parentGate"> {
  if (domain === "3d-assets") {
    return packSeed("3D Assets", [
      "source reference", "mask", "component", "subassembly", "interface", "mesh", "material", "export", "viewer proof",
    ], [
      "contains", "attaches", "hinges", "mirrors", "exports to", "reopens as", "is visible in",
    ], [
      invariant("assembly-interface-coherence", "Required parts attach, contain, align, mirror, or support each other.", "blocker", "Named parts can float or fail to form a coherent object.", ["assembly-coherence"]),
      invariant("canonical-view-coherence", "Canonical front/side/top/three-quarter views expose major failures.", "blocker", "A single flattering screenshot hides broken geometry.", ["canonical-view-proof"]),
      invariant("export-reopen-equivalence", "Exported OBJ/GLB reopens as the same component graph.", "blocker", "The preview and exported asset describe different artifacts.", ["export-reopen-proof"]),
      invariant("target-quality-bar", "Claim level declares scaffold, web-ready, game-ready, or CAD-ready constraints.", "major", "The app overclaims industry readiness from a scaffold.", ["asset-quality-gate"]),
    ], [
      gate("assembly-coherence", "Assembly/interface coherence", "npm run sfn -- assembly verify --receipt .solo/ledgers/assembly-coherence.json --base .", ".solo/ledgers/assembly-coherence.json"),
      gate("canonical-view-proof", "Canonical 3D visual proof", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/canonical-views.json"),
      gate("export-reopen-proof", "Export/reopen equivalence", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/export-reopen.json"),
      gate("asset-quality-gate", "3D target quality gate", "npm run sfn -- 3d quality-verify --receipt <asset-quality-receipt>", "docs/proof/asset-quality-receipt.json"),
    ], [
      visual("canonical-views", "Front, left, right, top, and three-quarter views", ["front", "left", "right", "top", "three-quarter"]),
      visual("interface-failure-overlays", "Failed interfaces need labeled visual overlays", ["failed-interface", "exploded"]),
    ]);
  }
  if (domain === "finance-nodeagent") {
    return packSeed("Finance NodeAgent", [
      "room", "user", "agent job", "spreadsheet", "cell", "formula", "source capture", "evidence fact", "proposal", "trace step", "privacy lane", "export",
    ], [
      "reads from", "writes to", "cites", "locks", "rebases", "proposes", "exports",
    ], [
      invariant("no-silent-clobber", "Human authored or formula cells cannot be silently overwritten.", "blocker", "The agent corrupts professional work while appearing helpful.", ["no-clobber-proof"]),
      invariant("evidence-coverage", "Material finance claims need source evidence and citation provenance.", "blocker", "Numbers or claims appear without reviewable support.", ["evidence-coverage-proof"]),
      invariant("entity-disambiguation", "Company/person/product identity is verified before enrichment.", "major", "The agent writes facts about the wrong entity.", ["entity-disambiguation-proof"]),
      invariant("privacy-boundary", "Private notes, PII, and uploads cannot leak into public outputs.", "blocker", "Sensitive information crosses lanes.", ["privacy-boundary-proof"]),
      invariant("live-ui-proof", "Benchmark claims require actual UI execution, trace, video, export, and scorer receipts.", "blocker", "A planner eval passes without proving live workflow completion.", ["live-ui-proof"]),
    ], [
      gate("no-clobber-proof", "No-clobber/CAS proof", "npm run nodeagent:frame:smoke", "docs/proof/no-clobber-receipt.json"),
      gate("evidence-coverage-proof", "Evidence coverage proof", "npm test -- --run tests/nodeagentTraceSpine.test.ts", "docs/proof/evidence-coverage-receipt.json"),
      gate("entity-disambiguation-proof", "Entity disambiguation proof", "npm test -- --run tests/entity-disambiguation.test.ts", "docs/proof/entity-disambiguation-receipt.json"),
      gate("privacy-boundary-proof", "Privacy boundary proof", "npm test -- --run tests/privacy-boundary.test.ts", "docs/proof/privacy-boundary-receipt.json"),
      gate("live-ui-proof", "Live UI task proof", "npm run proof:live-ui", "docs/proof/live-ui-receipt.json"),
    ], [
      visual("focus-box", "Focus boxes show active cell/source/output regions", ["spreadsheet", "source", "proposal"]),
    ]);
  }
  if (domain === "video-remix") {
    return packSeed("Video Remix", [
      "source video", "transcript", "speaker", "shot boundary", "clip", "hook", "face track", "crop box", "caption", "safe zone", "audio", "brand template", "export",
    ], [
      "starts at", "ends at", "tracks", "overlays", "fits safe zone", "exports for",
    ], [
      invariant("clip-boundary-coherence", "Clips start and end at semantic boundaries.", "blocker", "The export cuts mid-thought or removes needed setup.", ["clip-boundary-proof"]),
      invariant("caption-safe-zone", "Captions align to audio and avoid faces/platform overlays.", "blocker", "Captions hide the speaker or are mistimed.", ["caption-safe-zone-proof"]),
      invariant("reframe-tracking", "Moving subjects stay intentionally framed across sampled frames.", "blocker", "The crop loses the subject during motion.", ["reframe-tracking-proof"]),
      invariant("audio-export-quality", "Loudness, clipping, duration, codec, aspect ratio, and platform target pass.", "major", "The clip is not publishable on the target platform.", ["export-spec-proof"]),
    ], [
      gate("clip-boundary-proof", "Clip boundary proof", "npm run sfn -- domain verify --project .", "docs/proof/clip-boundary-receipt.json"),
      gate("caption-safe-zone-proof", "Caption safe-zone proof", "npm run sfn -- domain verify --project .", "docs/proof/caption-safe-zone-receipt.json"),
      gate("reframe-tracking-proof", "Reframe tracking proof", "npm run sfn -- domain verify --project .", "docs/proof/reframe-tracking-receipt.json"),
      gate("export-spec-proof", "Video export spec proof", "npm run sfn -- domain verify --project .", "docs/proof/video-export-spec-receipt.json"),
    ], [
      visual("sampled-frame-overlays", "Frame samples show subject, crop, caption, and safe-zone boxes", ["0s", "25%", "50%", "75%", "end"]),
    ]);
  }
  if (domain === "image-editing") {
    return packSeed("Image Editing", [
      "source image", "mask", "subject", "background", "lighting", "shadow", "text layer", "style reference", "generated region", "final composite", "export",
    ], [
      "masks", "preserves", "matches lighting", "casts shadow", "diffs against", "exports as",
    ], [
      invariant("mask-alignment", "The edited area matches the intended brush/mask.", "blocker", "The app edits the wrong object or leaves unwanted context.", ["mask-boundary-proof"]),
      invariant("identity-shape-preservation", "The requested subject/product shape stays stable when required.", "major", "The object becomes unrecognizable or unfit for the task.", ["subject-preservation-proof"]),
      invariant("lighting-shadow-consistency", "Generated regions match scene lighting and contact shadows.", "major", "The composite looks pasted on.", ["lighting-shadow-proof"]),
      invariant("no-unintended-edits", "Unrelated regions remain unchanged unless requested.", "blocker", "The edit damages unrelated content.", ["before-after-diff-proof"]),
    ], [
      gate("mask-boundary-proof", "Mask boundary proof", "npm run sfn -- domain verify --project .", "docs/proof/mask-boundary-receipt.json"),
      gate("subject-preservation-proof", "Subject preservation proof", "npm run sfn -- domain verify --project .", "docs/proof/subject-preservation-receipt.json"),
      gate("lighting-shadow-proof", "Lighting/shadow proof", "npm run sfn -- domain verify --project .", "docs/proof/lighting-shadow-receipt.json"),
      gate("before-after-diff-proof", "Before/after diff proof", "npm run sfn -- domain verify --project .", "docs/proof/before-after-diff-receipt.json"),
    ], [
      visual("before-after-mask", "Before/after/mask visual diff", ["before", "mask", "after", "diff"]),
    ]);
  }
  if (domain === "web-app-ui") {
    return packSeed("Web App UI", [
      "route", "component", "state", "action", "loading state", "empty state", "error state", "responsive layout", "accessibility tree", "visual proof",
    ], [
      "renders", "updates", "announces", "responds to", "preserves state in",
    ], [
      invariant("workflow-completion", "Primary user workflows complete in the actual UI.", "blocker", "The UI looks present but cannot complete the job.", ["live-ui-proof"]),
      invariant("responsive-accessible-states", "Responsive and accessibility states are verified.", "major", "The app breaks on common devices or assistive paths.", ["responsive-a11y-proof"]),
      invariant("design-quality", "The UI follows industry-fit visual hierarchy and design receipts.", "major", "The product reads as an internal harness.", ["design-quality-proof"]),
    ], [
      gate("live-ui-proof", "Live UI workflow proof", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/live-ui-receipt.json"),
      gate("responsive-a11y-proof", "Responsive/a11y proof", "npm run sfn -- design quality-verify --receipt <receipt>", "docs/proof/responsive-a11y-receipt.json"),
      gate("design-quality-proof", "Design quality proof", "npm run sfn -- design quality-verify --receipt <receipt>", "docs/proof/design-quality-receipt.json"),
    ], [
      visual("viewport-matrix", "Desktop/mobile/tablet screenshots for key workflows", ["desktop", "mobile", "tablet"]),
    ]);
  }
  if (domain === "data-pipeline") {
    return packSeed("Data Pipeline", [
      "source", "schema", "transform", "state store", "backfill", "replay", "sink", "dashboard", "alert", "audit log",
    ], [
      "validates", "transforms", "persists", "replays", "exports", "alerts",
    ], [
      invariant("schema-contract", "Source and sink schemas are versioned and validated.", "blocker", "The pipeline silently corrupts or drops data.", ["schema-contract-proof"]),
      invariant("replay-backfill", "Replay/backfill produce idempotent results.", "blocker", "Reruns change facts or double count.", ["replay-backfill-proof"]),
      invariant("observability", "Failures have trace, alert, and recovery evidence.", "major", "The pipeline fails without operational visibility.", ["observability-proof"]),
    ], [
      gate("schema-contract-proof", "Schema contract proof", "npm run sfn -- domain verify --project .", "docs/proof/schema-contract-receipt.json"),
      gate("replay-backfill-proof", "Replay/backfill proof", "npm run sfn -- domain verify --project .", "docs/proof/replay-backfill-receipt.json"),
      gate("observability-proof", "Observability proof", "npm run sfn -- domain verify --project .", "docs/proof/observability-receipt.json"),
    ], []);
  }
  if (domain === "agent-app") {
    return packSeed("Agent App", [
      "user intent", "planner", "tool schema", "action", "state", "memory", "trace", "eval", "UI", "proof verdict",
    ], [
      "plans", "calls", "writes", "reads", "observes", "evaluates", "proves",
    ], [
      invariant("typed-tool-contract", "Tools have typed contracts, validation, and error handling.", "blocker", "The agent acts through brittle or unsafe calls.", ["tool-contract-proof"]),
      invariant("state-trace-binding", "Actions bind to durable state, traces, and proof receipts.", "blocker", "The agent cannot self-orient or explain what changed.", ["trace-binding-proof"]),
      invariant("live-eval-loop", "Eval tasks run through the live UI or target runtime.", "blocker", "The benchmark is disconnected from real user task completion.", ["live-eval-proof"]),
    ], [
      gate("tool-contract-proof", "Typed tool contract proof", "npm run sfn -- agent-api verify --contract <file>", "docs/proof/tool-contract-receipt.json"),
      gate("trace-binding-proof", "Trace/state binding proof", "npm run sfn -- domain verify --project .", "docs/proof/trace-binding-receipt.json"),
      gate("live-eval-proof", "Live eval proof", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/live-eval-receipt.json"),
    ], [
      visual("agent-workspace", "Agent chat, trace, tools, and artifact panes visible together", ["workspace", "trace", "artifact"]),
    ]);
  }
  return packSeed("Generic Domain", [
    "input", "decision", "component", "interface", "artifact", "proof", "export",
  ], [
    "feeds", "depends on", "proves", "exports",
  ], [
    invariant("professional-invariants-defined", "The domain-specific invariants are explicitly listed before parent proof.", "blocker", "The loop can pass without proving what good means for this domain.", ["domain-invariant-proof"]),
  ], [
    gate("domain-invariant-proof", "Domain invariant proof", "npm run sfn -- domain verify --project .", "docs/proof/domain-invariant-receipt.json"),
  ], []);
}

function packSeed(
  name: string,
  entities: string[],
  relationships: string[],
  invariants: DomainInvariant[],
  proofGates: DomainProofGate[],
  visualChecks: DomainVisualCheck[],
) {
  return { name, ontology: { entities, relationships }, invariants, proofGates, visualChecks };
}

function invariant(
  id: string,
  description: string,
  severity: DomainSeverity,
  professionalFailure: string,
  proofGateIds: string[],
): DomainInvariant {
  return { id, description, severity, professionalFailure, proofGateIds };
}

function gate(id: string, label: string, command: string, requiredReceipt: string): DomainProofGate {
  return {
    id,
    label,
    command,
    requiredReceipt,
    blocksParentClaim: true,
    status: "planned",
    evidencePaths: [],
  };
}

function visual(id: string, label: string, canonicalViews: string[]): DomainVisualCheck {
  return { id, label, screenshotOrVideoRequired: true, canonicalViews };
}

function classifyMissingInvariant(domain: DomainPackId, report: string) {
  const text = report.toLowerCase();
  if (domain === "3d-assets" && /float|detach|hinge|temple|connect|assembly|part/.test(text)) {
    return {
      invariantId: "assembly-interface-coherence",
      proofGateId: "assembly-coherence",
      expectedFailure: "Required 3D parts can be named but not physically connected.",
    };
  }
  if (domain === "finance-nodeagent" && /wrong company|entity|same name|conflat|identity/.test(text)) {
    return {
      invariantId: "entity-disambiguation",
      proofGateId: "entity-disambiguation-proof",
      expectedFailure: "Agent enriches the wrong entity.",
    };
  }
  if (domain === "finance-nodeagent" && /overwrite|clobber|formula|cell|typing/.test(text)) {
    return {
      invariantId: "no-silent-clobber",
      proofGateId: "no-clobber-proof",
      expectedFailure: "Agent overwrites protected or human-active spreadsheet work.",
    };
  }
  if (domain === "video-remix" && /caption|face|safe zone|overlay/.test(text)) {
    return {
      invariantId: "caption-safe-zone",
      proofGateId: "caption-safe-zone-proof",
      expectedFailure: "Captions overlap face or platform safe-zone.",
    };
  }
  if (domain === "video-remix" && /crop|reframe|drift|out of frame/.test(text)) {
    return {
      invariantId: "reframe-tracking",
      proofGateId: "reframe-tracking-proof",
      expectedFailure: "Subject drifts out of the generated crop.",
    };
  }
  if (domain === "image-editing" && /mask|brush|crop|remove|wrong object/.test(text)) {
    return {
      invariantId: "mask-alignment",
      proofGateId: "mask-boundary-proof",
      expectedFailure: "Mask/brush target does not match the intended subject.",
    };
  }
  return {
    invariantId: "professional-invariants-defined",
    proofGateId: `${domain}-user-reported-regression`,
    expectedFailure: "A user-reported professional failure is not covered by a permanent gate.",
  };
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "domain";
}

function stableSuffix(input: string) {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).slice(0, 8);
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
