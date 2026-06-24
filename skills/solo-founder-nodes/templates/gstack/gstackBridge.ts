export const soloLoopPhases = [
  "discover",
  "benchmark",
  "setup",
  "build",
  "adapter",
  "iterate",
  "verify",
] as const;
export type SoloLoopPhase = (typeof soloLoopPhases)[number];

export const gstackRiskLevels = ["low", "medium", "high"] as const;
export type GstackRiskLevel = (typeof gstackRiskLevels)[number];

export type GstackLaneKind =
  | "product"
  | "architecture"
  | "design"
  | "devex"
  | "code-review"
  | "qa"
  | "security"
  | "release"
  | "learning"
  | "guard"
  | "eval"
  | "docs";

export interface GstackRoleSource {
  id: string;
  title: string;
  upstreamCommand: string;
  url: string;
  kind: GstackLaneKind;
  mapsToPhases: SoloLoopPhase[];
  purpose: string;
  requiredEvidence: string[];
  portabilityNote: string;
  agentLocked: boolean;
}

export interface GstackRecommendationInput {
  phase: SoloLoopPhase;
  goal: string;
  surfaceKind?: string;
  risk?: GstackRiskLevel;
  hasUi?: boolean;
  hasDeployment?: boolean;
  hasSecurityBoundary?: boolean;
  needsDevex?: boolean;
  needsDocs?: boolean;
  needsPerformance?: boolean;
  needsMobile?: boolean;
}

export interface GstackReviewPlan {
  schemaVersion: 1;
  phase: SoloLoopPhase;
  goal: string;
  flags: {
    surfaceKind: string;
    risk: GstackRiskLevel;
    hasUi: boolean;
    hasDeployment: boolean;
    hasSecurityBoundary: boolean;
    needsDevex: boolean;
    needsDocs: boolean;
    needsPerformance: boolean;
    needsMobile: boolean;
  };
  selectedRoleIds: string[];
  sequence: string[];
  requiredReceipts: string[];
  warnings: string[];
}

export interface GstackPlanVerification {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    roles: number;
    receipts: number;
    sequenceSteps: number;
  };
}

function role(
  id: string,
  title: string,
  upstreamCommand: string,
  kind: GstackLaneKind,
  mapsToPhases: SoloLoopPhase[],
  purpose: string,
  requiredEvidence: string[],
): GstackRoleSource {
  return {
    id,
    title,
    upstreamCommand,
    url: `https://github.com/garrytan/gstack/tree/main/${upstreamCommand.replace(/^\//, "")}`,
    kind,
    mapsToPhases,
    purpose,
    requiredEvidence,
    portabilityNote: "Use the upstream gstack skill as a review-method inspiration; write the receipt in this repo so Codex, Claude Code, Cursor, Windsurf, OpenCode, or any coding agent can execute it.",
    agentLocked: false,
  };
}

export function gstackRoleRegistry(): GstackRoleSource[] {
  return [
    role(
      "office-hours",
      "YC Office Hours",
      "/office-hours",
      "product",
      ["discover"],
      "Force the founder prompt through pain, user, urgency, wedge, and scope questions before code.",
      ["founder pain examples", "assumptions", "alternate wedges", "open questions"],
    ),
    role(
      "spec",
      "Spec Author",
      "/spec",
      "product",
      ["discover", "benchmark"],
      "Convert vague intent into an executable spec with scope, constraints, non-goals, and acceptance criteria.",
      ["executable spec", "non-goals", "acceptance criteria", "secret redaction note"],
    ),
    role(
      "autoplan",
      "Reviewed Planning Pipeline",
      "/autoplan",
      "architecture",
      ["discover", "benchmark", "setup", "build"],
      "Run the product, design, engineering, and devex reviews as one plan pipeline when the request is broad.",
      ["combined review summary", "taste decisions", "architecture decisions", "DX decisions"],
    ),
    role(
      "plan-ceo-review",
      "CEO / Founder Plan Review",
      "/plan-ceo-review",
      "product",
      ["discover", "benchmark"],
      "Challenge framing, market wedge, 10-star product, and what to expand, hold, or cut.",
      ["strategy verdict", "scope mode", "recommended wedge", "risks"],
    ),
    role(
      "plan-eng-review",
      "Engineering Manager Plan Review",
      "/plan-eng-review",
      "architecture",
      ["benchmark", "setup", "build", "adapter"],
      "Lock architecture, data flow, state, failure modes, performance, and tests before mutation.",
      ["architecture diagram", "data-flow notes", "edge cases", "test matrix"],
    ),
    role(
      "plan-design-review",
      "Senior Designer Plan Review",
      "/plan-design-review",
      "design",
      ["build", "verify"],
      "Detect generic AI UI, rate design dimensions, and force a concrete visual/product direction before UI code.",
      ["design score", "taste decision", "component implications", "before-implementation notes"],
    ),
    role(
      "design-review",
      "Designer Who Codes Live Review",
      "/design-review",
      "design",
      ["verify", "iterate"],
      "Audit and fix rendered UI with before/after screenshots and atomic changes.",
      ["before screenshot", "after screenshot", "visual diff note", "interaction proof"],
    ),
    role(
      "design-consultation",
      "Design Partner",
      "/design-consultation",
      "design",
      ["discover", "build"],
      "Research design landscape and generate a complete design-system direction for products where taste matters.",
      ["design landscape notes", "creative risks", "design-system direction"],
    ),
    role(
      "plan-devex-review",
      "Developer Experience Plan Review",
      "/plan-devex-review",
      "devex",
      ["setup", "build", "adapter"],
      "Plan onboarding, service-provider choices, CLI/API docs, and time-to-hello-world for technical users or judges.",
      ["developer personas", "TTHW target", "friction map", "DX score"],
    ),
    role(
      "devex-review",
      "Live Developer Experience Audit",
      "/devex-review",
      "devex",
      ["adapter", "verify", "iterate"],
      "Actually test onboarding, docs, setup, API/CLI paths, and compare reality against the plan.",
      ["onboarding transcript", "TTHW measurement", "screenshots", "DX gaps"],
    ),
    role(
      "review",
      "Staff Engineer Code Review",
      "/review",
      "code-review",
      ["build", "adapter", "iterate"],
      "Find production bugs that pass CI: unsafe queries, trust-boundary mistakes, state bugs, and completeness gaps.",
      ["diff summary", "bug findings", "fixed findings", "open asks"],
    ),
    role(
      "codex",
      "Second Opinion Review",
      "/codex",
      "code-review",
      ["build", "adapter", "verify", "iterate"],
      "Add an independent reviewer or adversarial challenge when the first pass is high-impact or contested.",
      ["independent verdict", "disagreement notes", "cross-model finding reconciliation"],
    ),
    role(
      "investigate",
      "Root Cause Debugger",
      "/investigate",
      "learning",
      ["iterate"],
      "Trace failures before fixing; stop random patching and require a hypothesis-backed fix.",
      ["failure timeline", "hypotheses tested", "root cause", "fix target"],
    ),
    role(
      "retro",
      "Engineering Retro",
      "/retro",
      "learning",
      ["verify", "iterate"],
      "Turn runs, failures, and successful patterns into safe memory/improvement candidates.",
      ["what shipped", "what failed", "next improvement", "memory updates"],
    ),
    role(
      "learn",
      "Memory Manager",
      "/learn",
      "learning",
      ["verify", "iterate"],
      "Review and prune persistent learnings so the loop compounds without leaking answers or secrets.",
      ["accepted learnings", "rejected learnings", "quarantine note"],
    ),
    role(
      "qa",
      "QA Lead",
      "/qa",
      "qa",
      ["verify"],
      "Open the real app, click through real flows, find and fix bugs, then re-verify.",
      ["browser transcript", "screenshots", "bugs found", "regression tests", "re-verify proof"],
    ),
    role(
      "qa-only",
      "QA Reporter",
      "/qa-only",
      "qa",
      ["verify"],
      "Run the same live-browser QA methodology but produce a report without mutating code.",
      ["browser transcript", "screenshots", "bug report", "ship-readiness score"],
    ),
    role(
      "browse",
      "Browser Eyes",
      "/browse",
      "qa",
      ["verify"],
      "Give the agent a real browser surface for navigation, screenshots, DOM inspection, and proof collection.",
      ["URL opened", "actions taken", "screenshots", "DOM signals"],
    ),
    role(
      "cso",
      "Chief Security Officer",
      "/cso",
      "security",
      ["setup", "build", "adapter", "verify"],
      "Run OWASP and STRIDE-style threat review with concrete exploit scenarios and false-positive discipline.",
      ["threat model", "exploit scenarios", "risk ratings", "mitigations"],
    ),
    role(
      "ship",
      "Release Engineer",
      "/ship",
      "release",
      ["verify"],
      "Sync, run tests, audit coverage, push, and prepare a PR/release receipt.",
      ["test output", "coverage delta", "push/PR reference", "release notes"],
    ),
    role(
      "land-and-deploy",
      "Production Release Engineer",
      "/land-and-deploy",
      "release",
      ["verify"],
      "Merge, wait for CI/deploy, verify production health, and record the live URL.",
      ["CI result", "deployment URL", "production health check", "rollback note"],
    ),
    role(
      "canary",
      "Post-Deploy SRE",
      "/canary",
      "release",
      ["verify"],
      "Watch post-deploy errors, performance, and page failures before declaring the result usable.",
      ["console errors", "page health", "latency/perf notes", "canary verdict"],
    ),
    role(
      "setup-deploy",
      "Deploy Configurator",
      "/setup-deploy",
      "release",
      ["setup", "verify"],
      "Detect and document platform-specific deploy configuration before a production proof is required.",
      ["platform choice", "deploy command", "env vars needed", "health URL"],
    ),
    role(
      "benchmark",
      "Performance / Benchmark Engineer",
      "/benchmark",
      "eval",
      ["benchmark", "verify", "iterate"],
      "Baseline metrics and compare before/after against a declared rubric instead of vibes.",
      ["baseline", "rubric", "before-after result", "measurement method"],
    ),
    role(
      "document-release",
      "Documentation Release Writer",
      "/document-release",
      "docs",
      ["verify"],
      "Update docs to match what shipped and expose stale or missing usage paths.",
      ["docs diff", "coverage map", "stale-doc fixes", "release summary"],
    ),
    role(
      "document-generate",
      "Documentation Author",
      "/document-generate",
      "docs",
      ["build", "verify"],
      "Generate missing reference/how-to/tutorial/explanation docs from real code and shipped behavior.",
      ["doc outline", "source files read", "generated docs", "review notes"],
    ),
    role(
      "guard",
      "Full Safety Guard",
      "/guard",
      "guard",
      ["setup", "build", "adapter", "verify", "iterate"],
      "Apply careful command review plus file-scope freeze when production data, secrets, or broad edits are in play.",
      ["scope boundary", "dangerous command review", "allowed paths", "unlock condition"],
    ),
    role(
      "freeze",
      "Edit Lock",
      "/freeze",
      "guard",
      ["build", "adapter", "iterate"],
      "Restrict edits to the intended surface so agent repair work does not spill into unrelated modules.",
      ["allowed directory", "excluded paths", "reason"],
    ),
    role(
      "careful",
      "Destructive Command Guard",
      "/careful",
      "guard",
      ["setup", "build", "adapter", "verify", "iterate"],
      "Warn before destructive commands, force-pushes, data deletes, or production-impacting changes.",
      ["risky command inventory", "approval note", "safe alternative"],
    ),
  ];
}

function add(ids: Set<string>, ...roleIds: string[]) {
  for (const id of roleIds) ids.add(id);
}

function receiptsFor(ids: string[]) {
  const byId = new Map(gstackRoleRegistry().map((r) => [r.id, r]));
  const receipts: string[] = [];
  for (const id of ids) {
    const source = byId.get(id);
    if (!source) continue;
    receipts.push(`${id}: ${source.requiredEvidence.join("; ")}`);
  }
  return receipts;
}

function sequenceFor(ids: Set<string>, phase: SoloLoopPhase) {
  const registry = gstackRoleRegistry();
  const selected = [...ids].map((id) => registry.find((r) => r.id === id)).filter(Boolean) as GstackRoleSource[];
  const kinds = new Set(selected.map((r) => r.kind));
  const sequence = ["role-selection"];
  if (kinds.has("product")) sequence.push("problem-framing");
  if (kinds.has("eval")) sequence.push("benchmark-rubric");
  if (kinds.has("architecture") || kinds.has("design") || kinds.has("devex") || kinds.has("security") || kinds.has("guard")) {
    sequence.push("plan-review");
  }
  if (["setup", "build", "adapter", "iterate"].includes(phase)) sequence.push("implementation");
  if (kinds.has("code-review")) sequence.push("code-review");
  if (kinds.has("qa")) sequence.push("live-qa");
  if (kinds.has("release")) sequence.push("release-verify");
  if (kinds.has("docs")) sequence.push("docs-sync");
  if (kinds.has("learning")) sequence.push("learning-receipt");
  return [...new Set(sequence)];
}

export function recommendGstackLanes(input: GstackRecommendationInput): GstackReviewPlan {
  const risk = input.risk ?? "medium";
  const ids = new Set<string>();
  const warnings: string[] = [];
  const hasUi = input.hasUi ?? ["build", "verify"].includes(input.phase);
  const hasDeployment = input.hasDeployment ?? input.phase === "verify";
  const hasSecurityBoundary = input.hasSecurityBoundary ?? false;
  const needsDevex = input.needsDevex ?? false;
  const needsDocs = input.needsDocs ?? input.phase === "verify";
  const needsPerformance = input.needsPerformance ?? input.phase === "benchmark";
  const needsMobile = input.needsMobile ?? false;

  switch (input.phase) {
    case "discover":
      add(ids, "office-hours", "plan-ceo-review", "spec");
      if (hasUi) add(ids, "design-consultation");
      break;
    case "benchmark":
      add(ids, "plan-ceo-review", "plan-eng-review", "benchmark");
      break;
    case "setup":
      add(ids, "plan-eng-review", "plan-devex-review");
      if (hasDeployment) add(ids, "setup-deploy");
      break;
    case "build":
      add(ids, "plan-eng-review", "review");
      if (hasUi) add(ids, "plan-design-review");
      if (needsDevex) add(ids, "plan-devex-review");
      if (needsDocs) add(ids, "document-generate");
      break;
    case "adapter":
      add(ids, "plan-eng-review", "review");
      if (needsDevex) add(ids, "plan-devex-review", "devex-review");
      break;
    case "iterate":
      add(ids, "investigate", "review", "qa-only", "retro");
      if (hasUi) add(ids, "design-review");
      if (needsPerformance) add(ids, "benchmark");
      break;
    case "verify":
      add(ids, "qa-only", "browse", "benchmark", "retro");
      if (hasUi) add(ids, "design-review");
      if (needsDevex) add(ids, "devex-review");
      if (needsDocs) add(ids, "document-release");
      if (hasDeployment) add(ids, "ship", "land-and-deploy", "canary");
      break;
  }

  if (hasSecurityBoundary) add(ids, "cso");
  if (risk === "high") add(ids, "guard", "careful");
  if (needsMobile) add(ids, "design-review", "qa-only");

  if (!input.goal.trim()) warnings.push("goal is empty; receipts will not be useful for future memory or audit");
  if (input.phase === "verify" && !hasDeployment) warnings.push("verification without --deploy proves local UI behavior, not customer/judge usability");
  if (input.phase === "build" && !hasUi) warnings.push("build plan was created without --ui; UI/design lanes are skipped");

  const registryOrder = gstackRoleRegistry().map((r) => r.id);
  const selectedRoleIds = [...ids].sort((a, b) => registryOrder.indexOf(a) - registryOrder.indexOf(b));
  return {
    schemaVersion: 1,
    phase: input.phase,
    goal: input.goal,
    flags: {
      surfaceKind: input.surfaceKind ?? "unspecified",
      risk,
      hasUi,
      hasDeployment,
      hasSecurityBoundary,
      needsDevex,
      needsDocs,
      needsPerformance,
      needsMobile,
    },
    selectedRoleIds,
    sequence: sequenceFor(ids, input.phase),
    requiredReceipts: receiptsFor(selectedRoleIds),
    warnings,
  };
}

export function verifyGstackPlan(plan: GstackReviewPlan): GstackPlanVerification {
  const errors: string[] = [];
  const warnings = [...plan.warnings];
  const registry = gstackRoleRegistry();
  const byId = new Map(registry.map((r) => [r.id, r]));
  const selected = new Set(plan.selectedRoleIds);

  if (plan.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!soloLoopPhases.includes(plan.phase)) errors.push(`unsupported phase '${plan.phase}'`);
  if (!gstackRiskLevels.includes(plan.flags.risk)) errors.push(`unsupported risk '${plan.flags.risk}'`);
  if (plan.selectedRoleIds.length === 0) errors.push("no gstack roles selected");

  for (const id of plan.selectedRoleIds) {
    const source = byId.get(id);
    if (!source) {
      errors.push(`unknown gstack role '${id}'`);
      continue;
    }
    if (source.agentLocked) errors.push(`gstack role '${id}' is marked agent-locked`);
    if (!source.mapsToPhases.includes(plan.phase) && !["cso", "guard", "careful", "codex"].includes(id)) {
      warnings.push(`gstack role '${id}' is not normally mapped to phase '${plan.phase}'`);
    }
  }

  const roleSelectionIndex = plan.sequence.indexOf("role-selection");
  const implementationIndex = plan.sequence.indexOf("implementation");
  const reviewIndex = plan.sequence.indexOf("code-review");
  const qaIndex = plan.sequence.indexOf("live-qa");
  const releaseIndex = plan.sequence.indexOf("release-verify");
  if (roleSelectionIndex < 0) errors.push("sequence missing role-selection");
  if (implementationIndex >= 0 && roleSelectionIndex > implementationIndex) {
    errors.push("role-selection must happen before implementation");
  }
  if (reviewIndex >= 0 && implementationIndex >= 0 && reviewIndex < implementationIndex) {
    errors.push("code-review must happen after implementation");
  }
  if (qaIndex >= 0 && implementationIndex >= 0 && qaIndex < implementationIndex) {
    errors.push("live-qa must happen after implementation");
  }
  if (releaseIndex >= 0 && qaIndex >= 0 && releaseIndex < qaIndex) {
    errors.push("release-verify must happen after live-qa");
  }

  if (plan.phase === "discover" && (!selected.has("office-hours") || !selected.has("plan-ceo-review"))) {
    errors.push("discover requires office-hours and plan-ceo-review lanes");
  }
  if (plan.phase === "benchmark" && (!selected.has("plan-ceo-review") || !selected.has("benchmark"))) {
    errors.push("benchmark requires product review and benchmark lanes");
  }
  if (["setup", "build", "adapter"].includes(plan.phase) && !selected.has("plan-eng-review")) {
    errors.push(`${plan.phase} requires plan-eng-review before implementation`);
  }
  if (plan.phase === "build" && !selected.has("review")) {
    errors.push("build requires staff-engineer review before landing");
  }
  if (plan.phase === "build" && plan.flags.hasUi && !selected.has("plan-design-review")) {
    errors.push("UI build requires plan-design-review before implementation");
  }
  if (plan.phase === "verify" && plan.flags.hasUi && !selected.has("design-review")) {
    errors.push("UI verification requires design-review evidence");
  }
  if (plan.phase === "verify" && plan.flags.hasUi && !selected.has("qa") && !selected.has("qa-only")) {
    errors.push("UI verification requires qa or qa-only live-browser evidence");
  }
  if (plan.flags.hasDeployment && plan.phase === "setup" && !selected.has("setup-deploy")) {
    errors.push("deployment setup requires setup-deploy lane");
  }
  if (plan.flags.hasDeployment && plan.phase === "verify" && (!selected.has("land-and-deploy") || !selected.has("canary"))) {
    errors.push("deployed verification requires land-and-deploy and canary lanes");
  }
  if (plan.flags.hasSecurityBoundary && !selected.has("cso")) {
    errors.push("security boundary requires cso lane");
  }
  if (plan.flags.risk === "high" && !selected.has("guard")) {
    errors.push("high-risk work requires guard lane");
  }

  if (plan.requiredReceipts.length < plan.selectedRoleIds.length) {
    errors.push("each selected gstack role must produce a receipt");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      roles: plan.selectedRoleIds.length,
      receipts: plan.requiredReceipts.length,
      sequenceSteps: plan.sequence.length,
    },
  };
}
