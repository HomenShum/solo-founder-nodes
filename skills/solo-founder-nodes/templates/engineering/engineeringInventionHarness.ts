export const engineeringRiskLevels = ["low", "material_damage", "safety_critical", "medical_or_life_support"] as const;
export type EngineeringRiskLevel = (typeof engineeringRiskLevels)[number];

export const engineeringUrgencies = ["routine", "urgent", "emergency"] as const;
export type EngineeringUrgency = (typeof engineeringUrgencies)[number];

export const engineeringHarnessStages = [
  "intent-and-emergency-triage",
  "reference-rights-provenance",
  "study-replica-sandbox",
  "first-principles-extraction",
  "ip-protected-expression-filter",
  "hazard-analysis",
  "simulation-and-bench-test-plan",
  "independent-engineer-review",
  "original-design-export",
  "field-use-monitoring",
] as const;
export type EngineeringHarnessStageId = (typeof engineeringHarnessStages)[number];

export type EngineeringHarnessStage = {
  id: EngineeringHarnessStageId;
  role: string;
  proofRequired: string[];
  canAccessRawReplica: boolean;
  canExport: boolean;
};

export type EngineeringInventionHarness = {
  schemaVersion: 1;
  goal: string;
  riskLevel: EngineeringRiskLevel;
  urgency: EngineeringUrgency;
  generatedAt: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  sandboxPolicy: {
    exactReplicaAllowedForStudy: boolean;
    replicaExportAllowed: boolean;
    rawReplicaReadableByFinalGenerator: boolean;
    allowedReplicaUses: string[];
  };
  safetyPolicy: {
    urgentModeDoesNotRelaxGates: boolean;
    noHumanUseUntilQualifiedReview: boolean;
    requiresLicensedEngineerForSafetyCritical: boolean;
    requiresRegulatoryReviewWhenMedical: boolean;
    productionUseBlockedUntil: string[];
    disallowedOutputs: string[];
  };
  breakGlassPolicy: {
    canRecordExternalOverrideRequest: boolean;
    overrideCanProducePassingVerdict: boolean;
    allowedBeforeReceipts: string[];
    stillBlockedBeforeReceipts: string[];
    requiredOverrideRecordFields: string[];
  };
  stages: EngineeringHarnessStage[];
  hardStops: string[];
};

export type EngineeringHarnessVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function makeEngineeringInventionHarness(input: {
  goal: string;
  riskLevel?: EngineeringRiskLevel;
  urgency?: EngineeringUrgency;
  generatedAt?: string;
}): EngineeringInventionHarness {
  const riskLevel = input.riskLevel ?? "safety_critical";
  const urgency = input.urgency ?? "urgent";
  const medical = riskLevel === "medical_or_life_support";
  const safetyCritical = riskLevel === "safety_critical" || medical;
  const productionUseBlockedUntil = [
    "rights-provenance-receipt",
    "study-replica-sandbox-receipt",
    "component-breakdown-receipt",
    "protected-expression-filter-receipt",
    "hazard-analysis-receipt",
    "simulation-test-receipt",
    "human-engineer-approval",
    "export-eligibility-verdict",
  ];
  if (medical) productionUseBlockedUntil.push("regulatory-scope-review");

  return {
    schemaVersion: 1,
    goal: input.goal,
    riskLevel,
    urgency,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sources: [
      { id: "nist-ai-rmf", title: "NIST AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
      { id: "nasa-system-safety", title: "NASA System Safety", url: "https://sma.nasa.gov/sma-disciplines/system-safety" },
      { id: "nasa-se-handbook", title: "NASA Systems Engineering Handbook", url: "https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf" },
      { id: "iso-14971", title: "ISO 14971:2019 Medical devices - Risk management", url: "https://www.iso.org/standard/72704.html" },
      { id: "fda-ai-medical-devices", title: "FDA Artificial Intelligence-Enabled Medical Devices", url: "https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices" },
      { id: "usco-fair-use", title: "U.S. Copyright Office Fair Use Index", url: "https://www.copyright.gov/fair-use/" },
      { id: "uspto-design-definition", title: "USPTO MPEP 1502 Definition of a Design", url: "https://www.uspto.gov/web/offices/pac/mpep/s1502.html" },
    ],
    sandboxPolicy: {
      exactReplicaAllowedForStudy: true,
      replicaExportAllowed: false,
      rawReplicaReadableByFinalGenerator: false,
      allowedReplicaUses: ["measurement", "private study", "first-principles extraction", "hazard discovery"],
    },
    safetyPolicy: {
      urgentModeDoesNotRelaxGates: true,
      noHumanUseUntilQualifiedReview: safetyCritical,
      requiresLicensedEngineerForSafetyCritical: safetyCritical,
      requiresRegulatoryReviewWhenMedical: medical,
      productionUseBlockedUntil,
      disallowedOutputs: [
        "exporting an exact replica of protected source material",
        "instructions for immediate human use before qualified review",
        "production deployment before hazard analysis, simulation, and approval receipts",
        "medical or life-support claims without regulatory scope review",
        "use of confidential or trade-secret source material without authorization",
      ],
    },
    breakGlassPolicy: {
      canRecordExternalOverrideRequest: true,
      overrideCanProducePassingVerdict: false,
      allowedBeforeReceipts: [
        "triage summary for qualified responders",
        "read-only first-principles notes",
        "non-human bench/fit-check plan",
        "missing-receipt checklist",
      ],
      stillBlockedBeforeReceipts: [
        "exact replica export",
        "customer or regulator-facing safety claim",
        "instructions to use the design on people",
        "production deployment or field installation",
      ],
      requiredOverrideRecordFields: [
        "qualified-human-owner",
        "emergency-context",
        "why-standard-proof-cannot-wait",
        "scope-and-time-limit",
        "known-unknowns",
        "post-hoc-review-plan",
      ],
    },
    stages: [
      stage("intent-and-emergency-triage", "Classify urgency, affected people, safety domain, and whether the user needs emergency services or professional response before invention work continues.", ["urgency-classification", "domain-risk-label", "human-safety-notice"], false, false),
      stage("reference-rights-provenance", "Record where previous models, images, scans, CAD, or videos came from and decide whether exact study is user-owned, licensed, public, functional reference, or blocked.", ["source-manifest", "rights-provenance-receipt", "trade-secret-screen"], false, false),
      stage("study-replica-sandbox", "Allow an exact replica only inside a sealed study container for measurement and learning; the replica cannot be exported or seen by the final generator.", ["non-exportable-replica-container", "replica-watermark-metadata", "replica-access-log", "replica-purge-or-seal-receipt"], true, false),
      stage("first-principles-extraction", "Convert the replica/reference into components, forces, materials, constraints, physical assumptions, parameter ranges, and failure modes.", ["component-breakdown-receipt", "functional-geometry-map", "physics-assumptions", "constraint-table"], true, false),
      stage("ip-protected-expression-filter", "Remove logos, ornamental expression, distinctive surface treatments, and patent/trade-dress conflict signals before any exportable design is generated.", ["protected-expression-filter-receipt", "design-patent-screen", "utility-patent-screen", "originality-delta-plan"], false, false),
      stage("hazard-analysis", "Identify hazards, misuse cases, severity, likelihood, safety margins, mitigations, and residual risk before prototype generation.", ["hazard-log", "fmea-or-fta", "misuse-case-list", "safety-margin-table", "residual-risk-verdict"], false, false),
      stage("simulation-and-bench-test-plan", "Require simulation or bench-test evidence appropriate to the risk before treating the design as usable.", ["simulation-report", "bench-test-plan", "acceptance-criteria", "calibration-or-validation-notes"], false, false),
      stage("independent-engineer-review", "Require qualified human engineering review for safety-critical outputs and regulatory review for medical or life-support outputs.", medical ? ["human-engineer-approval", "reviewer-qualification", "signoff-scope", "regulatory-scope-review"] : ["human-engineer-approval", "reviewer-qualification", "signoff-scope"], false, false),
      stage("original-design-export", "Export only the original redesigned asset/CAD created from the filtered functional spec, with provenance and safety receipts attached.", ["originality-delta-receipt", "export-eligibility-verdict", "cad-or-asset-hash", "bill-of-materials", "test-limitations"], false, true),
      stage("field-use-monitoring", "Track incidents, design changes, operating limits, and rollback instructions after any approved prototype leaves the lab.", ["post-deployment-monitoring-plan", "incident-reporting-path", "configuration-control-log"], false, false),
    ],
    hardStops: [
      "The user asks to export the exact study replica.",
      "The user asks to use the design on people before qualified engineering review.",
      "Safety-critical or medical risk exists and hazard/simulation/approval receipts are missing.",
      "The reference appears to be confidential, trade-secret, or access-controlled material without authorization.",
      "The user wants a regulator-facing or customer-facing claim without proof and scope review.",
    ],
  };
}

export function verifyEngineeringInventionHarness(plan: EngineeringInventionHarness): EngineeringHarnessVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (plan.schemaVersion !== 1) errors.push("engineering harness schemaVersion must be 1");
  if (!plan.goal.trim()) errors.push("engineering harness requires a goal");
  if (!engineeringRiskLevels.includes(plan.riskLevel)) errors.push(`unsupported engineering risk level: ${plan.riskLevel}`);
  if (!engineeringUrgencies.includes(plan.urgency)) errors.push(`unsupported engineering urgency: ${plan.urgency}`);

  const stageMap = new Map(plan.stages.map((stage) => [stage.id, stage]));
  for (const id of engineeringHarnessStages) {
    if (!stageMap.has(id)) errors.push(`missing engineering harness stage: ${id}`);
  }

  if (plan.sandboxPolicy.exactReplicaAllowedForStudy !== true) errors.push("study replica sandbox must explicitly allow exact replica for study");
  if (plan.sandboxPolicy.replicaExportAllowed !== false) errors.push("study replica export must be blocked");
  if (plan.sandboxPolicy.rawReplicaReadableByFinalGenerator !== false) errors.push("final generator must not read the raw replica");

  const sandboxStage = stageMap.get("study-replica-sandbox");
  if (sandboxStage?.canExport !== false) errors.push("study-replica-sandbox must not export");
  if (sandboxStage?.canAccessRawReplica !== true) errors.push("study-replica-sandbox must be the only raw-replica study lane");
  if (!sandboxStage?.proofRequired.includes("non-exportable-replica-container")) errors.push("study-replica-sandbox must require a non-exportable replica container");
  if (!sandboxStage?.proofRequired.includes("replica-purge-or-seal-receipt")) errors.push("study-replica-sandbox must require a purge/seal receipt");

  const finalStage = stageMap.get("original-design-export");
  if (finalStage?.canAccessRawReplica !== false) errors.push("original-design-export must not access raw replica");
  if (finalStage?.canExport !== true) errors.push("original-design-export must be the only export lane");
  if (!finalStage?.proofRequired.includes("originality-delta-receipt")) errors.push("original-design-export must require an originality delta receipt");
  if (!finalStage?.proofRequired.includes("export-eligibility-verdict")) errors.push("original-design-export must require an export eligibility verdict");

  if (plan.safetyPolicy.urgentModeDoesNotRelaxGates !== true) errors.push("urgent/emergency mode must not relax safety/IP gates");
  if (!plan.safetyPolicy.productionUseBlockedUntil.includes("hazard-analysis-receipt")) errors.push("production use must be blocked until hazard-analysis receipt exists");
  if (!plan.safetyPolicy.productionUseBlockedUntil.includes("simulation-test-receipt")) errors.push("production use must be blocked until simulation/test receipt exists");
  if (!plan.safetyPolicy.productionUseBlockedUntil.includes("human-engineer-approval")) errors.push("production use must be blocked until human engineer approval exists");
  if (!plan.safetyPolicy.productionUseBlockedUntil.includes("export-eligibility-verdict")) errors.push("production use must be blocked until export eligibility verdict exists");
  if (plan.breakGlassPolicy.canRecordExternalOverrideRequest !== true) errors.push("break-glass policy must allow recording external override requests");
  if (plan.breakGlassPolicy.overrideCanProducePassingVerdict !== false) errors.push("break-glass override must not produce a passing system verdict");
  if (!plan.breakGlassPolicy.stillBlockedBeforeReceipts.includes("exact replica export")) errors.push("break-glass policy must still block exact replica export before receipts");
  if (!plan.breakGlassPolicy.stillBlockedBeforeReceipts.includes("instructions to use the design on people")) errors.push("break-glass policy must still block human-use instructions before receipts");
  for (const field of ["qualified-human-owner", "emergency-context", "why-standard-proof-cannot-wait", "post-hoc-review-plan"]) {
    if (!plan.breakGlassPolicy.requiredOverrideRecordFields.includes(field)) errors.push(`break-glass policy missing required record field: ${field}`);
  }

  const safetyCritical = plan.riskLevel === "safety_critical" || plan.riskLevel === "medical_or_life_support";
  if (safetyCritical) {
    if (plan.safetyPolicy.noHumanUseUntilQualifiedReview !== true) errors.push("safety-critical plans must block human use until qualified review");
    if (plan.safetyPolicy.requiresLicensedEngineerForSafetyCritical !== true) errors.push("safety-critical plans must require qualified engineering review");
  }
  if (plan.riskLevel === "medical_or_life_support") {
    if (plan.safetyPolicy.requiresRegulatoryReviewWhenMedical !== true) errors.push("medical/life-support plans must require regulatory scope review");
    if (!plan.safetyPolicy.productionUseBlockedUntil.includes("regulatory-scope-review")) errors.push("medical/life-support production use must be blocked until regulatory scope review");
  }

  if (plan.urgency === "emergency") {
    warnings.push("emergency urgency accelerates triage and evidence collection, not deployment approval");
  }

  return { ok: errors.length === 0, errors, warnings };
}

function stage(
  id: EngineeringHarnessStageId,
  role: string,
  proofRequired: string[],
  canAccessRawReplica: boolean,
  canExport: boolean,
): EngineeringHarnessStage {
  return { id, role, proofRequired, canAccessRawReplica, canExport };
}
