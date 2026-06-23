export const designAgentRuntimes = [
  "codex",
  "claude-code",
  "cursor",
  "windsurf",
  "copilot",
  "opencode",
  "generic-agent",
] as const;
export type DesignAgentRuntime = (typeof designAgentRuntimes)[number];

export const designSurfaceKinds = [
  "marketing-site",
  "portfolio",
  "dashboard",
  "saas-app",
  "data-app",
  "mobile-app",
  "animation-heavy",
  "3d-app",
  "component-system",
] as const;
export type DesignSurfaceKind = (typeof designSurfaceKinds)[number];

export type DesignSkillKind =
  | "direction"
  | "component-system"
  | "dashboard"
  | "animation"
  | "mobile"
  | "native"
  | "registry";

export interface DesignSkillSource {
  id: string;
  title: string;
  url: string;
  kind: DesignSkillKind;
  origin: string;
  agentLocked: boolean;
  runtimeSupport: DesignAgentRuntime[];
  bestFor: DesignSurfaceKind[];
  useAs: string;
  portabilityNote: string;
}

export interface DesignSkillRecommendationInput {
  surfaceKind: DesignSurfaceKind;
  stack?: string;
  runtime?: DesignAgentRuntime;
  needsAnimation?: boolean;
  needsMobileNative?: boolean;
  usesShadcn?: boolean;
}

export interface DesignSkillPlan {
  runtime: DesignAgentRuntime;
  surfaceKind: DesignSurfaceKind;
  selectedSkillIds: string[];
  sequence: string[];
  warnings: string[];
}

export interface DesignSkillVerification {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function designSkillRegistry(): DesignSkillSource[] {
  return [
    {
      id: "frontend-design",
      title: "Anthropic frontend-design skill",
      url: "https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md",
      kind: "direction",
      origin: "Anthropic skill repository",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "opencode", "generic-agent"],
      bestFor: ["marketing-site", "portfolio", "saas-app", "3d-app"],
      useAs: "A design-direction brief: distinctive visual point of view, typography, density, and anti-generic choices before code.",
      portabilityNote: "Although authored for Claude skills, the value is the markdown design direction. Any coding agent can read and apply it.",
    },
    {
      id: "shadcn-ui",
      title: "shadcn/ui skills and component guidance",
      url: "https://ui.shadcn.com/docs/skills",
      kind: "component-system",
      origin: "shadcn/ui docs",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "copilot", "opencode", "generic-agent"],
      bestFor: ["dashboard", "saas-app", "data-app", "component-system", "3d-app"],
      useAs: "Component composition and project-aware shadcn/ui rules: use existing components, CLI, tokens, and registry patterns.",
      portabilityNote: "Treat the skill as shadcn project knowledge. The component rules are independent of the assistant vendor.",
    },
    {
      id: "ui-ux-pro-max",
      title: "UI UX Pro Max",
      url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
      kind: "dashboard",
      origin: "nextlevelbuilder/ui-ux-pro-max-skill",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "copilot", "generic-agent"],
      bestFor: ["dashboard", "saas-app", "data-app", "mobile-app"],
      useAs: "Industry-aware palette, typography, layout, accessibility, and UX audit intelligence before implementation.",
      portabilityNote: "The project advertises multiple AI-coding-agent targets; consume it as design intelligence, not as a Claude runtime dependency.",
    },
    {
      id: "gsap-skills",
      title: "GSAP AI Skills",
      url: "https://github.com/greensock/gsap-skills",
      kind: "animation",
      origin: "GreenSock",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "copilot", "generic-agent"],
      bestFor: ["animation-heavy", "marketing-site", "portfolio", "3d-app"],
      useAs: "Animation correctness, timelines, ScrollTrigger, framework usage, and performance rules.",
      portabilityNote: "Official GSAP skills state support for multiple agents including Codex, Cursor, Windsurf, Copilot, and Claude Code.",
    },
    {
      id: "awesome-design-skills",
      title: "Awesome Design Skills registry",
      url: "https://github.com/bergside/awesome-design-skills",
      kind: "registry",
      origin: "bergside/awesome-design-skills",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "generic-agent"],
      bestFor: ["marketing-site", "portfolio", "dashboard", "saas-app", "component-system"],
      useAs: "A registry to select a concrete style system only after the product surface and audience are known.",
      portabilityNote: "The registry is explicitly framed for Claude Code, Cursor, Codex, and other agentic tools.",
    },
    {
      id: "material-3",
      title: "Material Design 3 skill",
      url: "https://github.com/hamen/material-3-skill",
      kind: "mobile",
      origin: "hamen/material-3-skill",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "generic-agent"],
      bestFor: ["mobile-app", "component-system"],
      useAs: "Material 3 tokens, components, responsive layout, and MD3 audit checks.",
      portabilityNote: "The repository is Claude-labeled, but the design tokens/audit checklist are portable markdown instructions.",
    },
    {
      id: "mobile-app-ui-design",
      title: "Mobile App UI/UX Design",
      url: "https://github.com/ceorkm/mobile-app-ui-design",
      kind: "mobile",
      origin: "ceorkm/mobile-app-ui-design",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "copilot", "generic-agent"],
      bestFor: ["mobile-app"],
      useAs: "Mobile screen craft: hierarchy, gestures, spacing, empty/loading/error states, and polished app feel.",
      portabilityNote: "Use as a mobile design checklist; do not depend on Claude-specific invocation names.",
    },
    {
      id: "expo-skills",
      title: "Expo Skills",
      url: "https://docs.expo.dev/skills/",
      kind: "native",
      origin: "Expo",
      agentLocked: false,
      runtimeSupport: ["claude-code", "codex", "cursor", "windsurf", "generic-agent"],
      bestFor: ["mobile-app"],
      useAs: "Expo and React Native UI/deploy/debug guidance when the target app is native or Expo.",
      portabilityNote: "Expo documents these skills as usable with Claude Code, Cursor, Codex, and other AI agents.",
    },
  ];
}

export function recommendDesignSkills(input: DesignSkillRecommendationInput): DesignSkillPlan {
  const runtime = input.runtime ?? "generic-agent";
  const stack = (input.stack ?? "").toLowerCase();
  const ids = new Set<string>();
  const warnings: string[] = [];

  if (["marketing-site", "portfolio", "saas-app", "3d-app"].includes(input.surfaceKind)) {
    ids.add("frontend-design");
  }
  if (input.surfaceKind === "dashboard" || input.surfaceKind === "data-app" || input.surfaceKind === "saas-app") {
    ids.add("ui-ux-pro-max");
  }
  if (input.usesShadcn || stack.includes("shadcn") || stack.includes("tailwind") || input.surfaceKind === "dashboard" || input.surfaceKind === "saas-app" || input.surfaceKind === "3d-app") {
    ids.add("shadcn-ui");
  }
  if (input.needsAnimation || input.surfaceKind === "animation-heavy") {
    ids.add("gsap-skills");
  }
  if (input.surfaceKind === "mobile-app" || input.needsMobileNative || stack.includes("react native") || stack.includes("expo") || stack.includes("swiftui")) {
    ids.add("mobile-app-ui-design");
    if (stack.includes("expo") || stack.includes("react native")) ids.add("expo-skills");
    if (stack.includes("android") || stack.includes("material") || stack.includes("flutter")) ids.add("material-3");
  }
  if (ids.size === 0 || input.surfaceKind === "component-system") ids.add("awesome-design-skills");

  const registry = designSkillRegistry();
  const selected = [...ids].filter((id) => registry.some((s) => s.id === id));
  const unsupported = selected.filter((id) => {
    const skill = registry.find((s) => s.id === id);
    return skill && !skill.runtimeSupport.includes(runtime) && !skill.runtimeSupport.includes("generic-agent");
  });
  for (const id of unsupported) warnings.push(`skill '${id}' does not declare runtime support for '${runtime}'; use as markdown guidance only`);

  return {
    runtime,
    surfaceKind: input.surfaceKind,
    selectedSkillIds: selected,
    sequence: [
      "design-brief",
      "design-skill-selection",
      "component-contract",
      "implementation",
      "browser-verify",
    ],
    warnings,
  };
}

export function verifyDesignSkillPlan(plan: DesignSkillPlan): DesignSkillVerification {
  const errors: string[] = [];
  const warnings = [...plan.warnings];
  const registry = designSkillRegistry();
  const byId = new Map(registry.map((s) => [s.id, s]));

  if (!designAgentRuntimes.includes(plan.runtime)) errors.push(`unsupported runtime '${plan.runtime}'`);
  if (!designSurfaceKinds.includes(plan.surfaceKind)) errors.push(`unsupported surface kind '${plan.surfaceKind}'`);
  if (plan.selectedSkillIds.length === 0) errors.push("no design skills selected");

  for (const id of plan.selectedSkillIds) {
    const skill = byId.get(id);
    if (!skill) {
      errors.push(`unknown design skill '${id}'`);
      continue;
    }
    if (skill.agentLocked) errors.push(`design skill '${id}' is marked agent-locked`);
    if (!skill.runtimeSupport.includes(plan.runtime) && !skill.runtimeSupport.includes("generic-agent")) {
      warnings.push(`design skill '${id}' has no explicit '${plan.runtime}' support; use as portable markdown only`);
    }
  }

  const briefIndex = plan.sequence.indexOf("design-brief");
  const implementationIndex = plan.sequence.indexOf("implementation");
  const verifyIndex = plan.sequence.indexOf("browser-verify");
  if (briefIndex < 0) errors.push("sequence missing design-brief");
  if (implementationIndex < 0) errors.push("sequence missing implementation");
  if (verifyIndex < 0) errors.push("sequence missing browser-verify");
  if (briefIndex >= 0 && implementationIndex >= 0 && briefIndex > implementationIndex) {
    errors.push("design-brief must happen before implementation");
  }
  if (verifyIndex >= 0 && implementationIndex >= 0 && verifyIndex < implementationIndex) {
    errors.push("browser-verify must happen after implementation");
  }

  return { ok: errors.length === 0, errors, warnings };
}
