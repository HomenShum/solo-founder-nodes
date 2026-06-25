import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const domainPackIds = [
  "3d-assets",
  "construction-mockups",
  "manufacturing-parts",
  "onboarding-docs",
  "avatar-vtuber",
  "film-vfx",
  "game-assets",
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
export type ResearchSourceTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";
export type DomainPackVerdict = "draft" | "accepted" | "needs_research";

export type DomainResearchBrief = {
  schemaVersion: 1;
  briefKind: "domain-self-research";
  goal: string;
  domain: DomainPackId;
  generatedAt: string;
  sourceTiersUsed: ResearchSourceTier[];
  researchQuestions: string[];
  findings: string[];
  acceptanceImplications: string[];
  requiredPackArtifacts: string[];
};

export type DomainInvariant = {
  id: string;
  description: string;
  severity: DomainSeverity;
  professionalFailure: string;
  failureExample: string;
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
  targetUsers: string[];
  jobsToBeDone: string[];
  generatedAt: string;
  ontology: {
    entities: string[];
    relationships: string[];
    operations: string[];
    artifacts: string[];
  };
  sourceTiersUsed: ResearchSourceTier[];
  selfResearch: {
    producedBy: "self-research";
    briefPath: string;
    researchQuestions: string[];
    acceptanceImplications: string[];
  };
  invariants: DomainInvariant[];
  proofGates: DomainProofGate[];
  visualChecks: DomainVisualCheck[];
  regressionFixtures: DomainRegressionFixture[];
  negativeFixtures: Array<{
    id: string;
    description: string;
    shouldFailGate: string;
  }>;
  childRALPH: {
    components: string[];
    assemblies: string[];
    operations: string[];
    exports: string[];
  };
  exports: string[];
  verdict: DomainPackVerdict;
  parentGate: {
    domainProofRequired: true;
    userReportedFailuresBecomeGates: true;
    genericProofIsInsufficient: true;
    selfResearchRequired: true;
    proofGatesRequiredBeforeBuild: true;
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
export const domainResearchBriefRelativePath = ".solo/receipts/R/domain-research-brief.md";
export const domainRegressionRelativeDir = ".solo/domain/regressions";

export function domainPackPath(projectPath: string) {
  return resolve(projectPath, domainPackRelativePath);
}

export function domainRegressionDir(projectPath: string) {
  return resolve(projectPath, domainRegressionRelativeDir);
}

export function makeDomainResearchBrief(input: {
  goal: string;
  domain?: string;
  generatedAt?: string;
}): DomainResearchBrief {
  const domain = normalizeDomainPackId(input.domain ?? classifyDomainFromText(input.goal));
  const seed = domainSeed(domain);
  return {
    schemaVersion: 1,
    briefKind: "domain-self-research",
    goal: input.goal,
    domain,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceTiersUsed: sourceTiersForDomain(domain),
    researchQuestions: [
      `What professional workflow is implied by ${seed.name}?`,
      "What entities, relationships, operations, and artifacts define this domain?",
      "Which blocker failures would make an output unusable even if it renders?",
      "Which receipts prove those failures cannot slip through?",
    ],
    findings: seed.invariants.map((item) => `${item.id}: ${item.description}`),
    acceptanceImplications: [
      "R must produce a domain pack, not only a research summary.",
      "A must compile every blocker invariant into an executable proof gate.",
      "L must not begin until the domain pack and acceptance proof contract exist.",
      "P must prove the gates through receipts from the actual app/runtime.",
      "H must convert user-reported failures into permanent regression fixtures.",
    ],
    requiredPackArtifacts: [
      domainResearchBriefRelativePath,
      domainPackRelativePath,
      ".solo/receipts/A/acceptance-bar.json",
      ".solo/receipts/A/proof-registry.json",
    ],
  };
}

export function renderDomainResearchBrief(brief: DomainResearchBrief) {
  return [
    "# Domain Self-Research Brief",
    "",
    `Goal: ${brief.goal}`,
    `Domain: ${brief.domain}`,
    `Generated: ${brief.generatedAt}`,
    `Source tiers: ${brief.sourceTiersUsed.join(", ")}`,
    "",
    "## Research Questions",
    ...brief.researchQuestions.map((item) => `- ${item}`),
    "",
    "## Findings",
    ...brief.findings.map((item) => `- ${item}`),
    "",
    "## Acceptance Implications",
    ...brief.acceptanceImplications.map((item) => `- ${item}`),
    "",
    "## Required Pack Artifacts",
    ...brief.requiredPackArtifacts.map((item) => `- ${item}`),
    "",
    "Rule: no self-researched domain pack, no build; no domain proof, no domain claim.",
    "",
  ].join("\n");
}

export function classifyDomainFromText(text: string): DomainPackId {
  const normalized = text.toLowerCase();
  if (/construction|architecture|architectural|floorplan|floor plan|wall|window|door|room|brick|wood|material swap|mockup/.test(normalized)) return "construction-mockups";
  if (/manufactur|motorcycle|part|fastener|bolt|hole|tolerance|stl|step|cnc|print|3d print|load-bearing/.test(normalized)) return "manufacturing-parts";
  if (/onboard|training|new hire|documentation|docs|hotspot|explainer|coach|quiz|procedure/.test(normalized)) return "onboarding-docs";
  if (/vtuber|avatar|vrm|rig|skeleton|blendshape|blend shape|facial|weight paint|mocap|motion tracking/.test(normalized)) return "avatar-vtuber";
  if (/film|vfx|cgi|actor|stunt|plate|roto|composit|camera track|occlusion|flicker/.test(normalized)) return "film-vfx";
  if (/game|unity|unreal|godot|lod|collision|poly budget|draw call|fps|engine import/.test(normalized)) return "game-assets";
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
  const sourceTiersUsed = sourceTiersForDomain(domain);
  const proofGates = seed.proofGates.map((gate) => ({ ...gate, status }));
  return {
    schemaVersion: 1,
    packKind: "domain-pack",
    id: domain,
    name: seed.name,
    goal: input.goal,
    targetUsers: seed.targetUsers,
    jobsToBeDone: seed.jobsToBeDone,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    ontology: seed.ontology,
    sourceTiersUsed,
    selfResearch: {
      producedBy: "self-research",
      briefPath: domainResearchBriefRelativePath,
      researchQuestions: makeDomainResearchBrief({ goal: input.goal, domain }).researchQuestions,
      acceptanceImplications: makeDomainResearchBrief({ goal: input.goal, domain }).acceptanceImplications,
    },
    invariants: seed.invariants,
    proofGates,
    visualChecks: seed.visualChecks,
    regressionFixtures: [],
    negativeFixtures: makeNegativeFixtures(seed.invariants, proofGates),
    childRALPH: makeChildRalph(seed),
    exports: seed.exports,
    verdict: status === "pass" ? "accepted" : "draft",
    parentGate: {
      domainProofRequired: true,
      userReportedFailuresBecomeGates: true,
      genericProofIsInsufficient: true,
      selfResearchRequired: true,
      proofGatesRequiredBeforeBuild: true,
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
  if (pack.parentGate?.selfResearchRequired !== true) errors.push("domain pack must require self-research before build");
  if (pack.parentGate?.proofGatesRequiredBeforeBuild !== true) errors.push("domain pack must require proof gates before build");
  if ((pack.ontology?.entities ?? []).length === 0) errors.push("domain pack requires ontology entities");
  if ((pack.ontology?.relationships ?? []).length === 0) errors.push("domain pack requires ontology relationships");
  if ((pack.ontology?.operations ?? []).length === 0) errors.push("domain pack requires ontology operations");
  if ((pack.ontology?.artifacts ?? []).length === 0) errors.push("domain pack requires ontology artifacts");
  if ((pack.sourceTiersUsed ?? []).length === 0) errors.push("domain pack requires source-tiered self-research");
  if (pack.selfResearch?.producedBy !== "self-research") errors.push("domain pack must be produced by self-research");
  if (!pack.selfResearch?.briefPath) errors.push("domain pack requires self-research brief path");
  if (requireFiles && pack.selfResearch?.briefPath && !existsSync(resolve(baseDir, pack.selfResearch.briefPath))) {
    errors.push(`domain self-research brief file does not exist: ${pack.selfResearch.briefPath}`);
    missingProofs.push(pack.selfResearch.briefPath);
  }
  if ((pack.selfResearch?.researchQuestions ?? []).length === 0) errors.push("domain pack requires self-research questions");
  if ((pack.selfResearch?.acceptanceImplications ?? []).length === 0) errors.push("domain pack requires acceptance implications");
  if ((pack.targetUsers ?? []).length === 0) errors.push("domain pack requires target users");
  if ((pack.jobsToBeDone ?? []).length === 0) errors.push("domain pack requires jobs to be done");
  if ((pack.exports ?? []).length === 0) errors.push("domain pack requires export targets");
  if ((pack.invariants ?? []).length === 0) errors.push("domain pack requires professional invariants");
  if ((pack.proofGates ?? []).length === 0) errors.push("domain pack requires proof gates");
  if ((pack.childRALPH?.components ?? []).length === 0) errors.push("domain pack requires child component RALPH targets");
  if ((pack.childRALPH?.assemblies ?? []).length === 0) errors.push("domain pack requires child assembly RALPH targets");
  if ((pack.childRALPH?.operations ?? []).length === 0) errors.push("domain pack requires child operation RALPH targets");
  if ((pack.childRALPH?.exports ?? []).length === 0) errors.push("domain pack requires child export RALPH targets");
  if (!["draft", "accepted", "needs_research"].includes(pack.verdict)) errors.push("domain pack requires verdict");

  const gateById = new Map((pack.proofGates ?? []).map((gate) => [gate.id, gate]));
  const negativeFixtureGateIds = new Set((pack.negativeFixtures ?? []).map((fixture) => fixture.shouldFailGate));
  for (const invariant of pack.invariants ?? []) {
    if (!invariant.id || !invariant.description || !invariant.professionalFailure || !invariant.failureExample) {
      errors.push("domain invariant requires id, description, professionalFailure, and failureExample");
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
    if (invariant.severity === "blocker" && !(invariant.proofGateIds ?? []).some((gateId) => negativeFixtureGateIds.has(gateId))) {
      errors.push(`blocker invariant ${invariant.id} requires a negative fixture`);
      missingProofs.push(`domain.invariant:${invariant.id}:negativeFixture`);
    }
  }

  for (const fixture of pack.negativeFixtures ?? []) {
    if (!fixture.id || !fixture.description || !fixture.shouldFailGate) {
      errors.push(`negative fixture ${fixture.id || "<missing>"} is incomplete`);
    }
    if (fixture.shouldFailGate && !gateById.has(fixture.shouldFailGate)) {
      errors.push(`negative fixture ${fixture.id} references missing proof gate ${fixture.shouldFailGate}`);
      missingProofs.push(`domain.negativeFixture:${fixture.id}:${fixture.shouldFailGate}`);
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
      failureExample: fixture.expectedFailure,
      proofGateIds: [fixture.proofGateId],
    });
  }
  if (!next.regressionFixtures.some((item) => item.id === fixture.id)) {
    next.regressionFixtures.push(fixture);
  }
  if (!next.negativeFixtures.some((item) => item.shouldFailGate === fixture.proofGateId)) {
    next.negativeFixtures.push({
      id: `negative-${slugify(fixture.proofGateId)}`,
      description: fixture.expectedFailure,
      shouldFailGate: fixture.proofGateId,
    });
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
    construction: "construction-mockups",
    "construction-mockup": "construction-mockups",
    "construction-mockups": "construction-mockups",
    architecture: "construction-mockups",
    manufacturing: "manufacturing-parts",
    "manufacturing-parts": "manufacturing-parts",
    "motorcycle-parts": "manufacturing-parts",
    onboarding: "onboarding-docs",
    docs: "onboarding-docs",
    "onboarding-docs": "onboarding-docs",
    avatar: "avatar-vtuber",
    vtuber: "avatar-vtuber",
    "avatar-vtuber": "avatar-vtuber",
    vfx: "film-vfx",
    film: "film-vfx",
    "film-vfx": "film-vfx",
    game: "game-assets",
    games: "game-assets",
    "game-assets": "game-assets",
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

function domainSeed(domain: DomainPackId): Omit<DomainPack, "schemaVersion" | "packKind" | "id" | "goal" | "generatedAt" | "sourceTiersUsed" | "selfResearch" | "regressionFixtures" | "negativeFixtures" | "childRALPH" | "verdict" | "parentGate"> {
  if (domain === "construction-mockups") {
    return packSeed(
      "Construction Mockups",
      ["designer", "contractor", "founder", "reviewer"],
      ["turn sketches/plans/screenshots into editable room mockups", "brush-select surfaces", "replace materials while preserving structure", "export reviewable before/after proof"],
      [
        "source image", "floorplan", "room", "wall", "window", "door", "surface", "material", "annotation", "before/after proof", "export",
      ],
      ["contains", "is embedded in", "supports", "material applied to", "preserves dimensions", "exports to"],
      ["brush-select", "replace-material", "move-window", "delete-object", "annotate", "export-model"],
      [
        invariant("selected-region-accuracy", "Brush selection must bind to the intended wall/object surface.", "blocker", "The edit targets the wrong construction element.", ["selected-region-proof"]),
        invariant("material-swap-locality", "Material replacement applies only to the selected surface.", "blocker", "The whole room changes when only one wall was selected.", ["material-replacement-proof"]),
        invariant("openings-preserved", "Windows, doors, dimensions, and wall connectivity are preserved after edits.", "blocker", "The mockup breaks structural context.", ["structure-preservation-proof"]),
        invariant("before-after-proof", "Before/after screenshots and export/reopen receipts prove the workflow.", "major", "The user cannot review what changed.", ["before-after-proof", "export-reopen-proof"]),
      ],
      [
        gate("selected-region-proof", "Selected region proof", "npm run sfn -- operation verify --project .", "docs/proof/selected-region-receipt.json"),
        gate("material-replacement-proof", "Material replacement proof", "npm run sfn -- operation verify --project .", "docs/proof/material-replacement-receipt.json"),
        gate("structure-preservation-proof", "Structure preservation proof", "npm run sfn -- domain verify --project .", "docs/proof/structure-preservation-receipt.json"),
        gate("before-after-proof", "Before/after visual proof", "npm run sfn -- operation verify --project .", "docs/proof/before-after-visual-receipt.json"),
        gate("export-reopen-proof", "Export/reopen proof", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/export-reopen-receipt.json"),
      ],
      [visual("construction-before-after", "Before/after plus selected surface overlays", ["before", "selected-region", "after", "diff"])],
      ["GLB", "OBJ", "web viewer", "before/after proof pack"],
    );
  }
  if (domain === "manufacturing-parts") {
    return packSeed(
      "Manufacturing / Product Parts",
      ["inventor", "mechanical reviewer", "prototype engineer"],
      ["decompose a reference into manufacturable part concepts", "review dimensions and attachment points", "export a non-production study artifact"],
      ["part", "dimension", "hole", "fastener", "attachment point", "load surface", "material", "exploded view", "export"],
      ["attaches to", "aligns with", "supports load at", "is fastened by", "exports to"],
      ["measure", "add-fastener", "explode-assembly", "export-study-model"],
      [
        invariant("attachment-interface-proof", "Attachment points, holes, and fasteners must align.", "blocker", "The part cannot be reviewed as an assembly.", ["attachment-interface-proof"]),
        invariant("scale-pivot-proof", "Scale, origin, and pivot are explicit.", "major", "The exported part cannot be inspected or reused reliably.", ["scale-pivot-proof"]),
        invariant("study-only-safety", "Physical/human-use claims remain blocked without simulation and engineer approval.", "blocker", "The tool implies a part is safe to manufacture or use.", ["safety-approval-proof"]),
      ],
      [
        gate("attachment-interface-proof", "Attachment interface proof", "npm run sfn -- assembly verify --receipt .solo/ledgers/assembly-coherence.json --base .", ".solo/ledgers/assembly-coherence.json"),
        gate("scale-pivot-proof", "Scale/pivot proof", "npm run sfn -- domain verify --project .", "docs/proof/scale-pivot-receipt.json"),
        gate("safety-approval-proof", "Study-only safety proof", "npm run sfn -- engineering verify --receipt <receipt>", "docs/proof/safety-approval-receipt.json"),
      ],
      [visual("exploded-part-review", "Exploded part and attachment-point labels", ["assembled", "exploded", "dimensioned"])],
      ["OBJ", "STL study export", "GLB viewer", "STEP blocked until CAD proof"],
    );
  }
  if (domain === "onboarding-docs") {
    return packSeed(
      "Onboarding / 3D Documentation",
      ["new hire", "trainer", "ops lead"],
      ["turn a 3D artifact into a teaching doc", "click parts for explanations", "prove learners can answer review questions"],
      ["component", "hotspot", "label", "step", "coach prompt", "quiz", "source note", "export"],
      ["explains", "links to", "orders before", "tests understanding of"],
      ["add-hotspot", "explode-assembly", "ask-coach-question", "export-doc"],
      [
        invariant("hotspot-component-binding", "Every hotspot maps to a real component.", "blocker", "The doc teaches labels that do not correspond to the model.", ["hotspot-binding-proof"]),
        invariant("sequence-proof", "Assembly or process steps are ordered and reviewable.", "major", "The onboarding artifact is not teachable.", ["sequence-proof"]),
        invariant("coach-review-proof", "Coach/quiz prompts bind to components and source notes.", "major", "The learner cannot be evaluated.", ["coach-review-proof"]),
      ],
      [
        gate("hotspot-binding-proof", "Hotspot binding proof", "npm run sfn -- operation verify --project .", "docs/proof/hotspot-binding-receipt.json"),
        gate("sequence-proof", "Sequence proof", "npm run sfn -- domain verify --project .", "docs/proof/sequence-receipt.json"),
        gate("coach-review-proof", "Coach review proof", "npm run sfn -- domain verify --project .", "docs/proof/coach-review-receipt.json"),
      ],
      [visual("labeled-hotspot-doc", "Clickable hotspots and explanation panel", ["overview", "hotspot", "quiz"])],
      ["web doc", "PDF", "video walkthrough"],
    );
  }
  if (domain === "avatar-vtuber") {
    return packSeed(
      "Avatar / Vtuber",
      ["creator", "rigger", "streamer"],
      ["create a controllable avatar", "validate rig, weights, expressions, and runtime export"],
      ["mesh", "skeleton", "bone", "weight map", "blendshape", "eye control", "mouth control", "hair", "material", "runtime export"],
      ["drives", "weights", "deforms", "retargets to", "exports as"],
      ["rig-skeleton", "test-expression", "retarget-animation", "export-vrm"],
      [
        invariant("skeleton-proof", "Bone hierarchy exists and maps to major mesh regions.", "blocker", "The avatar only looks humanoid but cannot animate.", ["skeleton-proof"]),
        invariant("blendshape-proof", "Mouth, eye, and expression blendshapes exist.", "blocker", "The avatar cannot talk or emote.", ["blendshape-proof"]),
        invariant("deformation-proof", "Weighted regions deform without major artifacts.", "blocker", "Animation breaks the mesh.", ["deformation-proof"]),
        invariant("runtime-export-proof", "VRM/FBX/glTF export and reopen proof exists for the target runtime.", "major", "The model cannot be used in avatar tooling.", ["runtime-export-proof"]),
      ],
      [
        gate("skeleton-proof", "Skeleton proof", "npm run sfn -- domain verify --project .", "docs/proof/skeleton-receipt.json"),
        gate("blendshape-proof", "Blendshape proof", "npm run sfn -- domain verify --project .", "docs/proof/blendshape-receipt.json"),
        gate("deformation-proof", "Deformation proof", "npm run sfn -- domain verify --project .", "docs/proof/deformation-receipt.json"),
        gate("runtime-export-proof", "Runtime export proof", "npm run sfn -- proof full-verify --receipt <proof-pack> --base .", "docs/proof/runtime-export-receipt.json"),
      ],
      [visual("avatar-rig-demo", "Skeleton, expression, and deformation proof views", ["rest-pose", "skeleton", "expression", "animation"])],
      ["VRM", "FBX", "glTF/GLB"],
    );
  }
  if (domain === "film-vfx") {
    return packSeed(
      "Film / VFX Replacement",
      ["filmmaker", "VFX artist", "compositor"],
      ["replace or augment an actor/object in footage", "prove camera/lighting/motion consistency over time"],
      ["plate footage", "camera track", "mask", "depth", "clean plate", "CG asset", "lighting", "shadow", "occlusion", "composite", "frame sample"],
      ["tracks", "occludes", "matches lighting of", "composites into", "is sampled at"],
      ["track-camera", "rotoscope", "place-cg-asset", "composite", "sample-frames", "export-shot"],
      [
        invariant("camera-track-proof", "CG asset stays locked to plate motion.", "blocker", "The replacement slides or drifts across frames.", ["camera-track-proof"]),
        invariant("lighting-occlusion-proof", "Lighting, shadows, depth, and occlusion match the plate.", "blocker", "The composite reads as pasted on.", ["lighting-occlusion-proof"]),
        invariant("temporal-consistency-proof", "Frame-sampled QA catches flicker and motion breaks.", "major", "A still frame passes while the video fails.", ["temporal-consistency-proof"]),
      ],
      [
        gate("camera-track-proof", "Camera track proof", "npm run sfn -- domain verify --project .", "docs/proof/camera-track-receipt.json"),
        gate("lighting-occlusion-proof", "Lighting/occlusion proof", "npm run sfn -- domain verify --project .", "docs/proof/lighting-occlusion-receipt.json"),
        gate("temporal-consistency-proof", "Temporal consistency proof", "npm run sfn -- domain verify --project .", "docs/proof/temporal-consistency-receipt.json"),
      ],
      [visual("frame-sampled-vfx", "Frame samples with track/mask/composite overlays", ["start", "mid", "end", "diff"])],
      ["proof video", "frame-sample report", "composite export"],
    );
  }
  if (domain === "game-assets") {
    return packSeed(
      "Game Assets",
      ["game developer", "technical artist", "level designer"],
      ["create engine-usable assets", "prove import, collision, scale, LOD, materials, and runtime budget"],
      ["mesh", "material", "texture", "pivot", "scale", "LOD", "collision", "animation", "engine import", "performance budget"],
      ["imports into", "collides with", "uses LOD", "animates in", "stays within budget"],
      ["set-pivot", "generate-collision", "create-lod", "import-engine", "profile-runtime"],
      [
        invariant("engine-import-proof", "Target engine import succeeds.", "blocker", "The asset is not usable in the game pipeline.", ["engine-import-proof"]),
        invariant("collision-lod-proof", "Collision mesh and LOD levels exist when claimed.", "blocker", "The asset looks good but cannot be played or optimized.", ["collision-lod-proof"]),
        invariant("runtime-budget-proof", "Poly count, draw calls, scale, pivot, and FPS budget are recorded.", "major", "The asset is too heavy or incorrectly placed.", ["runtime-budget-proof"]),
      ],
      [
        gate("engine-import-proof", "Engine import proof", "npm run sfn -- domain verify --project .", "docs/proof/engine-import-receipt.json"),
        gate("collision-lod-proof", "Collision/LOD proof", "npm run sfn -- domain verify --project .", "docs/proof/collision-lod-receipt.json"),
        gate("runtime-budget-proof", "Runtime budget proof", "npm run sfn -- domain verify --project .", "docs/proof/runtime-budget-receipt.json"),
      ],
      [visual("engine-asset-proof", "Engine import, collision, LOD, and runtime proof", ["viewer", "collision", "lod", "engine"])],
      ["GLB", "FBX", "Unity package", "Unreal import receipt", "Godot import receipt"],
    );
  }
  if (domain === "3d-assets") {
    return packSeed("3D Assets", ["3D app founder", "3D artist", "technical reviewer"], ["turn messy visual input into explainable 3D artifacts", "prove component/assembly/export quality"], [
      "source reference", "mask", "component", "subassembly", "interface", "mesh", "material", "export", "viewer proof",
    ], [
      "contains", "attaches", "hinges", "mirrors", "exports to", "reopens as", "is visible in",
    ], [
      "brush-select", "decompose", "generate", "inspect", "export",
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
    ], ["OBJ", "GLB", "viewer proof pack"]);
  }
  if (domain === "finance-nodeagent") {
    return packSeed("Finance NodeAgent", ["banker", "analyst", "ops user"], ["produce reviewable finance artifacts with evidence and no-clobber safety"], [
      "room", "user", "agent job", "spreadsheet", "cell", "formula", "source capture", "evidence fact", "proposal", "trace step", "privacy lane", "export",
    ], [
      "reads from", "writes to", "cites", "locks", "rebases", "proposes", "exports",
    ], [
      "read-source", "write-proposal", "commit-cell", "cite-fact", "export-workbook",
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
    ], ["workbook", "memo", "deck", "trace receipt"]);
  }
  if (domain === "video-remix") {
    return packSeed("Video Remix", ["creator", "marketer", "video editor"], ["turn long media into coherent platform-ready clips"], [
      "source video", "transcript", "speaker", "shot boundary", "clip", "hook", "face track", "crop box", "caption", "safe zone", "audio", "brand template", "export",
    ], [
      "starts at", "ends at", "tracks", "overlays", "fits safe zone", "exports for",
    ], [
      "select-clip", "reframe", "caption", "duck-audio", "export-platform-clip",
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
    ], ["MP4", "SRT", "platform proof pack"]);
  }
  if (domain === "image-editing") {
    return packSeed("Image Editing", ["designer", "founder", "ecommerce operator"], ["edit selected image regions while preserving unrelated content"], [
      "source image", "mask", "subject", "background", "lighting", "shadow", "text layer", "style reference", "generated region", "final composite", "export",
    ], [
      "masks", "preserves", "matches lighting", "casts shadow", "diffs against", "exports as",
    ], [
      "brush-mask", "inpaint", "replace-object", "diff-before-after", "export-image",
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
    ], ["PNG", "JPG", "layered proof pack"]);
  }
  if (domain === "web-app-ui") {
    return packSeed("Web App UI", ["product user", "founder", "operator"], ["complete real workflows in a usable interface"], [
      "route", "component", "state", "action", "loading state", "empty state", "error state", "responsive layout", "accessibility tree", "visual proof",
    ], [
      "renders", "updates", "announces", "responds to", "preserves state in",
    ], [
      "navigate", "submit", "filter", "edit", "recover-from-error",
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
    ], ["deployed URL", "trace", "screenshot pack"]);
  }
  if (domain === "data-pipeline") {
    return packSeed("Data Pipeline", ["data engineer", "operator", "analyst"], ["move data safely through schema-checked transforms and replayable jobs"], [
      "source", "schema", "transform", "state store", "backfill", "replay", "sink", "dashboard", "alert", "audit log",
    ], [
      "validates", "transforms", "persists", "replays", "exports", "alerts",
    ], [
      "ingest", "validate-schema", "transform", "replay", "backfill", "alert",
    ], [
      invariant("schema-contract", "Source and sink schemas are versioned and validated.", "blocker", "The pipeline silently corrupts or drops data.", ["schema-contract-proof"]),
      invariant("replay-backfill", "Replay/backfill produce idempotent results.", "blocker", "Reruns change facts or double count.", ["replay-backfill-proof"]),
      invariant("observability", "Failures have trace, alert, and recovery evidence.", "major", "The pipeline fails without operational visibility.", ["observability-proof"]),
    ], [
      gate("schema-contract-proof", "Schema contract proof", "npm run sfn -- domain verify --project .", "docs/proof/schema-contract-receipt.json"),
      gate("replay-backfill-proof", "Replay/backfill proof", "npm run sfn -- domain verify --project .", "docs/proof/replay-backfill-receipt.json"),
      gate("observability-proof", "Observability proof", "npm run sfn -- domain verify --project .", "docs/proof/observability-receipt.json"),
    ], [], ["dataset", "audit log", "dashboard"]);
  }
  if (domain === "agent-app") {
    return packSeed("Agent App", ["non-technical founder", "operator", "developer"], ["let an agent act through typed tools with traces, memory, UI, and eval proof"], [
      "user intent", "planner", "tool schema", "action", "state", "memory", "trace", "eval", "UI", "proof verdict",
    ], [
      "plans", "calls", "writes", "reads", "observes", "evaluates", "proves",
    ], [
      "plan", "call-tool", "write-state", "observe-ui", "run-eval", "publish-proof",
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
    ], ["trace", "proof verdict", "deployed URL"]);
  }
  return packSeed("Generic Domain", ["founder", "reviewer"], ["define the professional invariants before claiming completion"], [
    "input", "decision", "component", "interface", "artifact", "proof", "export",
  ], [
    "feeds", "depends on", "proves", "exports",
  ], [
    "inspect", "build", "verify", "export",
  ], [
    invariant("professional-invariants-defined", "The domain-specific invariants are explicitly listed before parent proof.", "blocker", "The loop can pass without proving what good means for this domain.", ["domain-invariant-proof"]),
  ], [
    gate("domain-invariant-proof", "Domain invariant proof", "npm run sfn -- domain verify --project .", "docs/proof/domain-invariant-receipt.json"),
  ], [], ["proof pack"]);
}

function packSeed(
  name: string,
  targetUsers: string[],
  jobsToBeDone: string[],
  entities: string[],
  relationships: string[],
  operations: string[],
  invariants: DomainInvariant[],
  proofGates: DomainProofGate[],
  visualChecks: DomainVisualCheck[],
  exports: string[],
) {
  return { name, targetUsers, jobsToBeDone, ontology: { entities, relationships, operations, artifacts: exports }, invariants, proofGates, visualChecks, exports };
}

function invariant(
  id: string,
  description: string,
  severity: DomainSeverity,
  professionalFailure: string,
  proofGateIds: string[],
): DomainInvariant {
  return { id, description, severity, professionalFailure, failureExample: professionalFailure, proofGateIds };
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

function sourceTiersForDomain(domain: DomainPackId): ResearchSourceTier[] {
  if (domain === "generic") return ["T0", "T1"];
  if (["3d-assets", "construction-mockups", "manufacturing-parts", "avatar-vtuber", "film-vfx", "game-assets"].includes(domain)) {
    return ["T0", "T1", "T2", "T4", "T5"];
  }
  if (["finance-nodeagent", "video-remix", "image-editing", "agent-app"].includes(domain)) return ["T0", "T1", "T2", "T3", "T4"];
  return ["T0", "T1", "T2", "T3"];
}

function makeNegativeFixtures(invariants: DomainInvariant[], gates: DomainProofGate[]) {
  const gateIds = new Set(gates.map((gate) => gate.id));
  return invariants
    .filter((invariant) => invariant.severity === "blocker")
    .flatMap((invariant) => invariant.proofGateIds
      .filter((gateId) => gateIds.has(gateId))
      .slice(0, 1)
      .map((gateId) => ({
        id: `negative-${slugify(invariant.id)}`,
        description: invariant.failureExample || invariant.professionalFailure,
        shouldFailGate: gateId,
      })));
}

function makeChildRalph(seed: ReturnType<typeof domainSeed>) {
  const entities = seed.ontology.entities;
  const relationships = seed.ontology.relationships;
  return {
    components: entities.slice(0, Math.max(1, Math.min(8, entities.length))),
    assemblies: relationships.slice(0, Math.max(1, Math.min(6, relationships.length))),
    operations: seed.ontology.operations,
    exports: seed.exports,
  };
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
