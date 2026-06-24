export const deconstructionIntentLanes = [
  "reverse-engineering-for-innovation-study-only",
  "interview-practice-study-only",
  "owned-source-reconstruction",
  "public-domain-functional-reference",
] as const;
export type DeconstructionIntentLane = (typeof deconstructionIntentLanes)[number];

export type FirstPrinciplesComponent = {
  id: string;
  function: string;
  extractedPrinciple: string;
  protectedExpressionRemoved: string[];
};

export type FirstPrinciplesDeconstructionReceipt = {
  schemaVersion: 1;
  receiptId: string;
  generatedAt: string;
  intentLane: DeconstructionIntentLane;
  projectId: string;
  goal: string;
  workflow: string[];
  referenceSource: {
    inputType: string;
    sourceDescription: string;
    originalInputHash: string;
    rightsClassification: {
      copyrightStatus: "user_owned" | "public_domain" | "likely_protected" | "unknown";
      patentStatus: "not_queried" | "queried_no_known_conflict" | "known_conflict_possible" | "unknown";
      trademarkStatus: "none_detected" | "scrubbed" | "present" | "unknown";
      userOwnsCapture: boolean;
      legalPosture: "study_only_clean_room" | "licensed_export_allowed" | "blocked";
      notes: string[];
    };
  };
  replicaSandbox: {
    exactReplicaCreated: boolean;
    replicaMeshHash?: string;
    containerId: string;
    exportCapability: false;
    purgeConfirmed: boolean;
    purgedAt?: string;
    postPurgeResidualMeshData: false;
    finalGeneratorCanAccessReplica: false;
  };
  componentBreakdown: FirstPrinciplesComponent[];
  functionalSpec: {
    format: "json" | "yaml" | "markdown";
    content: string;
    containsMeshData: false;
    containsSurfaceTextures: false;
    containsDecorativeGeometry: false;
    passedToReinventionAgent: boolean;
  };
  originalityAndConstraints: {
    minimumNoveltyDelta: string;
    patentSearchRequired: boolean;
    finalMayReplicateExactContours: false;
    finalAgentProhibitedFromReplicaAccess: true;
    flaggedRisks: string[];
  };
  notices: {
    notLegalOpinion: true;
    notSafetyApproval: true;
    noFreedomToOperateOpinion: true;
    noHumanUseApproval: true;
    allowedUseStatement: string;
    prohibitedClaims: string[];
  };
  audit: {
    previousReceiptLink?: string;
    nextReceiptExpected?: string;
    receiptSignature?: string;
    timestampAnchor?: string;
  };
};

export type FirstPrinciplesDeconstructionVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function makeFirstPrinciplesDeconstructionReceipt(input: {
  goal: string;
  projectId: string;
  sourceDescription?: string;
  receiptId?: string;
  generatedAt?: string;
  originalInputHash?: string;
}): FirstPrinciplesDeconstructionReceipt {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: 1,
    receiptId: input.receiptId ?? `FPB-${generatedAt.slice(0, 10).replace(/-/g, "")}-${slug(input.projectId)}`,
    generatedAt,
    intentLane: "reverse-engineering-for-innovation-study-only",
    projectId: input.projectId,
    goal: input.goal,
    workflow: [
      "exact-replica-acquisition",
      "rights-gate",
      "volatile-sandbox",
      "deconstruction-engine",
      "functional-spec",
      "replica-purge",
      "receipt-seal",
    ],
    referenceSource: {
      inputType: "user-supplied reference media",
      sourceDescription: input.sourceDescription ?? "user-provided previous model/reference media",
      originalInputHash: input.originalInputHash ?? "sha256:pending",
      rightsClassification: {
        copyrightStatus: "unknown",
        patentStatus: "not_queried",
        trademarkStatus: "unknown",
        userOwnsCapture: false,
        legalPosture: "study_only_clean_room",
        notes: [
          "Study-only deconstruction is not export permission.",
          "Run patent/trademark/license review before export or commercial use.",
        ],
      },
    },
    replicaSandbox: {
      exactReplicaCreated: true,
      replicaMeshHash: "sha256:pending",
      containerId: "volatile-study-sandbox",
      exportCapability: false,
      purgeConfirmed: true,
      purgedAt: generatedAt,
      postPurgeResidualMeshData: false,
      finalGeneratorCanAccessReplica: false,
    },
    componentBreakdown: [
      {
        id: "component-1",
        function: "Primary functional requirement extracted from the reference.",
        extractedPrinciple: "Functional principle only; no exact contour, branding, texture, or decorative surface data.",
        protectedExpressionRemoved: ["logos", "ornamental styling", "surface texture", "exact contour signature"],
      },
    ],
    functionalSpec: {
      format: "yaml",
      content: "Functional_Spec:\n  export_source: filtered_first_principles_only\n  replica_mesh_data: none\n",
      containsMeshData: false,
      containsSurfaceTextures: false,
      containsDecorativeGeometry: false,
      passedToReinventionAgent: true,
    },
    originalityAndConstraints: {
      minimumNoveltyDelta: "Final output must solve from the functional spec with independently generated geometry and must not preserve exact protected contours, styling, logos, or texture expression.",
      patentSearchRequired: true,
      finalMayReplicateExactContours: false,
      finalAgentProhibitedFromReplicaAccess: true,
      flaggedRisks: ["patent search not complete", "legal review not complete", "safety approval not complete"],
    },
    notices: {
      notLegalOpinion: true,
      notSafetyApproval: true,
      noFreedomToOperateOpinion: true,
      noHumanUseApproval: true,
      allowedUseStatement: "This receipt documents a study-only clean-room deconstruction effort. It is not export permission, a legal opinion, freedom-to-operate analysis, or approval for human use.",
      prohibitedClaims: [
        "legal non-infringement certification",
        "freedom-to-operate opinion",
        "safety approval",
        "human-use approval",
        "exact replica export approval",
      ],
    },
    audit: {
      nextReceiptExpected: "reinvention-start",
    },
  };
}

export function verifyFirstPrinciplesDeconstructionReceipt(
  receipt: FirstPrinciplesDeconstructionReceipt,
): FirstPrinciplesDeconstructionVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (receipt.schemaVersion !== 1) errors.push("first-principles receipt schemaVersion must be 1");
  if (!receipt.receiptId?.trim()) errors.push("first-principles receipt requires receiptId");
  if (!receipt.projectId?.trim()) errors.push("first-principles receipt requires projectId");
  if (!receipt.goal?.trim()) errors.push("first-principles receipt requires goal");
  if (!deconstructionIntentLanes.includes(receipt.intentLane)) errors.push(`unsupported intent lane: ${receipt.intentLane}`);
  for (const step of ["rights-gate", "volatile-sandbox", "functional-spec", "replica-purge"]) {
    if (!receipt.workflow?.includes(step)) errors.push(`first-principles receipt workflow missing ${step}`);
  }

  const rights = receipt.referenceSource?.rightsClassification;
  if (!receipt.referenceSource?.originalInputHash?.startsWith("sha256:")) errors.push("reference source must include sha256 input hash");
  if (rights?.legalPosture === "blocked") errors.push("blocked references cannot produce a deconstruction receipt");
  if (rights?.trademarkStatus === "present") errors.push("trademarks/logos must be scrubbed or absent before deconstruction proceeds");
  if (rights?.patentStatus === "not_queried" || rights?.patentStatus === "unknown") warnings.push("patent status is not cleared; require patent/FTO review before final design");
  if (rights?.copyrightStatus === "likely_protected" && rights.legalPosture !== "study_only_clean_room") {
    errors.push("likely protected references must stay study_only_clean_room unless license proof exists");
  }

  const sandbox = receipt.replicaSandbox;
  if (sandbox?.exactReplicaCreated) {
    if (!sandbox.replicaMeshHash?.startsWith("sha256:")) errors.push("exact replica requires replicaMeshHash");
    if (sandbox.exportCapability !== false) errors.push("exact replica sandbox must have exportCapability=false");
    if (sandbox.purgeConfirmed !== true) errors.push("exact replica must be purged or sealed after extraction");
    if (!sandbox.purgedAt) errors.push("exact replica purge requires purgedAt timestamp");
    if (sandbox.postPurgeResidualMeshData !== false) errors.push("post-purge residual mesh data must be false");
    if (sandbox.finalGeneratorCanAccessReplica !== false) errors.push("final generator must not access the exact replica");
  }

  if ((receipt.componentBreakdown ?? []).length === 0) errors.push("component breakdown must contain at least one component");
  for (const component of receipt.componentBreakdown ?? []) {
    if (!component.id || !component.function || !component.extractedPrinciple) errors.push(`component '${component.id || "<missing>"}' is incomplete`);
    if ((component.protectedExpressionRemoved ?? []).length === 0) errors.push(`component '${component.id}' must list protected expression removed`);
  }

  const spec = receipt.functionalSpec;
  if (!spec?.content?.trim()) errors.push("functional spec content is required");
  if (spec?.containsMeshData !== false) errors.push("functional spec must not contain mesh data");
  if (spec?.containsSurfaceTextures !== false) errors.push("functional spec must not contain surface textures");
  if (spec?.containsDecorativeGeometry !== false) errors.push("functional spec must not contain decorative geometry");
  if (spec?.passedToReinventionAgent !== true) errors.push("filtered functional spec must be the only artifact passed to reinvention agent");

  const constraints = receipt.originalityAndConstraints;
  if (!constraints?.minimumNoveltyDelta?.trim()) errors.push("minimum novelty delta is required");
  if (constraints?.finalMayReplicateExactContours !== false) errors.push("final output must not replicate exact protected contours");
  if (constraints?.finalAgentProhibitedFromReplicaAccess !== true) errors.push("final agent must be prohibited from replica access");
  if (constraints?.patentSearchRequired === true) warnings.push("patent search required before final engineering export");

  const notices = receipt.notices;
  for (const [key, value] of Object.entries({
    notLegalOpinion: notices?.notLegalOpinion,
    notSafetyApproval: notices?.notSafetyApproval,
    noFreedomToOperateOpinion: notices?.noFreedomToOperateOpinion,
    noHumanUseApproval: notices?.noHumanUseApproval,
  })) {
    if (value !== true) errors.push(`notice '${key}' must be true`);
  }
  for (const claim of ["legal non-infringement certification", "freedom-to-operate opinion", "safety approval", "human-use approval", "exact replica export approval"]) {
    if (!notices?.prohibitedClaims?.includes(claim)) errors.push(`missing prohibited claim notice: ${claim}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function slug(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "PROJECT";
}
