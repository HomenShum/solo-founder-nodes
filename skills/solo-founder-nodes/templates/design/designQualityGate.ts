import { designSurfaceKinds, type DesignSurfaceKind } from "./designSkillBridge";

export const defaultDesignQualityCriteria = [
  "surface-classification",
  "distinctive-direction",
  "industry-fit",
  "component-system",
  "state-matrix",
  "responsive-proof",
  "visual-screenshot-proof",
  "interaction-proof",
  "accessibility-check",
  "anti-generic-review",
] as const;

export type DesignQualityCriterion = (typeof defaultDesignQualityCriteria)[number];
export type DesignVisualVerdict = "pass" | "needs-redesign" | "internal-harness" | "not-run";
export type DesignQualityBar = "shipping" | "prototype" | "internal";

export interface DesignQualityGateInput {
  surfaceKind: DesignSurfaceKind;
  selectedSkillIds: string[];
  completedCriteria: DesignQualityCriterion[];
  desktopScreenshotPaths: string[];
  mobileScreenshotPaths: string[];
  designBriefPath?: string;
  componentContractPath?: string;
  interactionProofPaths?: string[];
  accessibilityProofPaths?: string[];
  visualVerdict?: DesignVisualVerdict;
  qualityBar?: DesignQualityBar;
  primarySurface?: string;
  notes?: string[];
  createdAt?: string;
}

export interface DesignQualityReceipt extends Required<Omit<DesignQualityGateInput, "designBriefPath" | "componentContractPath">> {
  schemaVersion: 1;
  designBriefPath: string | null;
  componentContractPath: string | null;
  missingCriteria: DesignQualityCriterion[];
}

export interface DesignQualityVerdict {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    completedCriteria: number;
    missingCriteria: number;
    skills: number;
    desktopScreenshots: number;
    mobileScreenshots: number;
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function missingCriteria(completed: DesignQualityCriterion[]) {
  const completedSet = new Set(completed);
  return defaultDesignQualityCriteria.filter((criterion) => !completedSet.has(criterion));
}

function isFunctionalSurface(surfaceKind: DesignSurfaceKind) {
  return ["dashboard", "saas-app", "data-app", "component-system", "3d-app"].includes(surfaceKind);
}

function hasAny(selectedSkillIds: string[], ids: string[]) {
  return ids.some((id) => selectedSkillIds.includes(id));
}

export function makeDesignQualityReceipt(input: DesignQualityGateInput): DesignQualityReceipt {
  const completedCriteria = unique(input.completedCriteria);
  return {
    schemaVersion: 1,
    surfaceKind: input.surfaceKind,
    selectedSkillIds: unique(input.selectedSkillIds),
    completedCriteria,
    desktopScreenshotPaths: unique(input.desktopScreenshotPaths),
    mobileScreenshotPaths: unique(input.mobileScreenshotPaths),
    designBriefPath: input.designBriefPath ?? null,
    componentContractPath: input.componentContractPath ?? null,
    interactionProofPaths: unique(input.interactionProofPaths ?? []),
    accessibilityProofPaths: unique(input.accessibilityProofPaths ?? []),
    visualVerdict: input.visualVerdict ?? "not-run",
    qualityBar: input.qualityBar ?? "prototype",
    primarySurface: input.primarySurface ?? "unspecified",
    notes: input.notes ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
    missingCriteria: missingCriteria(completedCriteria),
  };
}

export function verifyDesignQualityReceipt(receipt: DesignQualityReceipt): DesignQualityVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (receipt.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!designSurfaceKinds.includes(receipt.surfaceKind)) errors.push(`unsupported surface kind '${receipt.surfaceKind}'`);
  if (receipt.selectedSkillIds.length === 0) errors.push("no design skills selected");

  for (const criterion of receipt.missingCriteria) {
    errors.push(`missing design quality criterion '${criterion}'`);
  }

  if (!receipt.designBriefPath) errors.push("missing design brief path");
  if (!receipt.componentContractPath) errors.push("missing component contract path");
  if (receipt.desktopScreenshotPaths.length === 0) errors.push("missing desktop screenshot proof");
  if (receipt.mobileScreenshotPaths.length === 0) errors.push("missing mobile screenshot proof");
  if (receipt.interactionProofPaths.length === 0) errors.push("missing interaction proof path");
  if (receipt.accessibilityProofPaths.length === 0) errors.push("missing accessibility proof path");

  if (receipt.qualityBar !== "shipping") {
    errors.push(`design quality bar must be 'shipping' before UI proof can pass, got '${receipt.qualityBar}'`);
  }
  if (receipt.visualVerdict !== "pass") {
    errors.push(`visual verdict must be 'pass', got '${receipt.visualVerdict}'`);
  }
  if (receipt.visualVerdict === "internal-harness") {
    errors.push("internal harness visual verdict cannot pass as product UI");
  }

  if (!receipt.selectedSkillIds.includes("frontend-design")) {
    errors.push("missing frontend-design direction skill; every UI-facing build needs a distinctive direction before code");
  }
  if (isFunctionalSurface(receipt.surfaceKind) && !receipt.selectedSkillIds.includes("ui-ux-pro-max")) {
    errors.push("missing ui-ux-pro-max industry-fit/product UX skill for functional UI");
  }
  if (isFunctionalSurface(receipt.surfaceKind) && !hasAny(receipt.selectedSkillIds, ["shadcn-ui", "awesome-design-skills"])) {
    errors.push("missing component-system or registry skill for functional UI");
  }
  if ((receipt.surfaceKind === "dashboard" || receipt.surfaceKind === "data-app") && !receipt.selectedSkillIds.includes("dashboard-arrangement")) {
    errors.push("dashboard/data surfaces require dashboard-arrangement skill");
  }
  if (receipt.surfaceKind === "mobile-app" && !receipt.selectedSkillIds.includes("mobile-app-ui-design")) {
    errors.push("mobile app surfaces require mobile-app-ui-design skill");
  }
  if (receipt.surfaceKind === "3d-app") {
    if (!["full-bleed-viewer", "workspace-console"].includes(receipt.primarySurface)) {
      errors.push("3d-app UI must use a full-bleed viewer or workspace-console primary surface, not a framed preview card");
    }
    if (!hasAny(receipt.selectedSkillIds, ["premium-frontend-ui", "frontend-ui-ux"])) {
      warnings.push("3d-app proof is stronger with premium-frontend-ui or frontend-ui-ux taste guidance");
    }
    if (!receipt.selectedSkillIds.includes("gsap-skills")) {
      warnings.push("3d-app with camera/viewer motion should record why GSAP-style motion guidance was not needed");
    }
  }

  const noteText = receipt.notes.join("\n").toLowerCase();
  if (/internal test harness|default harness|ai slop|generic default/.test(noteText)) {
    errors.push("design notes still describe the UI as an internal/generic harness");
  }

  return {
    ok: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    summary: {
      completedCriteria: receipt.completedCriteria.length,
      missingCriteria: receipt.missingCriteria.length,
      skills: receipt.selectedSkillIds.length,
      desktopScreenshots: receipt.desktopScreenshotPaths.length,
      mobileScreenshots: receipt.mobileScreenshotPaths.length,
    },
  };
}
