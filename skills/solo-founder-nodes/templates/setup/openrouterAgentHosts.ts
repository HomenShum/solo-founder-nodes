import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type OpenRouterAgentRole =
  | "openclaw-default"
  | "hermes-default"
  | "coding-fallback"
  | "free-experimental"
  | "multimodal-ui";

export type OpenRouterModelChoice = {
  id: string;
  role: OpenRouterAgentRole;
  providerModelId: string;
  createdUtc: string;
  contextTokens: number;
  promptPerMillionUsd: number;
  completionPerMillionUsd: number;
  supportsTools: boolean;
  supportsStructuredOutputs: boolean;
  smokeStatus: "passed" | "not-run" | "failed";
  conformanceStatus: "passed" | "fallback-only" | "optional-only";
  rationale: string;
  caveat?: string;
};

export type OpenRouterAgentSetupPack = {
  schemaVersion: 1;
  optional: true;
  generatedAt: string;
  sourceCatalogUrl: string;
  modelAudit?: OpenRouterModelAudit;
  modelPolicy: {
    selectionRule: string;
    choices: OpenRouterModelChoice[];
  };
  environment: Record<string, string>;
  installCommands: {
    windowsPowerShell: string[];
  };
  verificationCommands: string[];
  safetyRules: string[];
};

export type OpenRouterCatalogModel = {
  id: string;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
};

export type OpenRouterModelAuditCandidate = {
  id: string;
  name: string;
  createdUtc: string;
  contextTokens: number;
  promptPerMillionUsd: number;
  completionPerMillionUsd: number;
  blendedPerMillionUsd: number;
  supportsTools: boolean;
  supportsStructuredOutputs: boolean;
  modality: string;
  category: "paid-code" | "free-code" | "multimodal-ui";
  score: number;
  reasons: string[];
};

export type OpenRouterModelAudit = {
  schemaVersion: 1;
  generatedAt: string;
  sourceCatalogUrl: string;
  warning: string;
  recommended: {
    paidCode?: OpenRouterModelAuditCandidate;
    freeCode?: OpenRouterModelAuditCandidate;
    multimodalUi?: OpenRouterModelAuditCandidate;
  };
  topCandidates: OpenRouterModelAuditCandidate[];
};

export function makeOpenRouterAgentSetupPack(input: { generatedAt?: string; hostRoot?: string; modelAudit?: OpenRouterModelAudit } = {}): OpenRouterAgentSetupPack {
  const hostRoot = input.hostRoot ?? "D:\\ai-agent-hosts";
  return {
    schemaVersion: 1,
    optional: true,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceCatalogUrl: "https://openrouter.ai/api/v1/models",
    modelAudit: input.modelAudit,
    modelPolicy: {
      selectionRule:
        "Prefer the cheapest current model that passes this agent's conformance lane; keep free and multimodal lanes optional until separately proved.",
      choices: [
        {
          id: "deepseek/deepseek-v4-flash",
          role: "openclaw-default",
          providerModelId: "openrouter/deepseek/deepseek-v4-flash",
          createdUtc: "2026-04-24",
          contextTokens: 1048576,
          promptPerMillionUsd: 0.09,
          completionPerMillionUsd: 0.18,
          supportsTools: true,
          supportsStructuredOutputs: true,
          smokeStatus: "passed",
          conformanceStatus: "passed",
          rationale:
            "Cheapest paid long-context route found in the current OpenRouter audit that supports tools/structured output and passed OpenClaw conformance.",
          caveat: "Hermes returned one 15/16 conformance run on this model, so Hermes uses the Qwen coding fallback until re-proved.",
        },
        {
          id: "qwen/qwen3-coder-next",
          role: "hermes-default",
          providerModelId: "openrouter/qwen/qwen3-coder-next",
          createdUtc: "2026-02-04",
          contextTokens: 262144,
          promptPerMillionUsd: 0.11,
          completionPerMillionUsd: 0.8,
          supportsTools: true,
          supportsStructuredOutputs: true,
          smokeStatus: "passed",
          conformanceStatus: "passed",
          rationale:
            "Coding-agent-specialized route that passed Hermes conformance and remains the paid fallback when DeepSeek is not stable for a host.",
        },
        {
          id: "qwen/qwen3-coder-next",
          role: "coding-fallback",
          providerModelId: "openrouter/qwen/qwen3-coder-next",
          createdUtc: "2026-02-04",
          contextTokens: 262144,
          promptPerMillionUsd: 0.11,
          completionPerMillionUsd: 0.8,
          supportsTools: true,
          supportsStructuredOutputs: true,
          smokeStatus: "passed",
          conformanceStatus: "passed",
          rationale: "Use when a host needs stronger coding behavior than the cheapest paid route.",
        },
        {
          id: "cohere/north-mini-code:free",
          role: "free-experimental",
          providerModelId: "openrouter/cohere/north-mini-code:free",
          createdUtc: "2026-06-17",
          contextTokens: 256000,
          promptPerMillionUsd: 0,
          completionPerMillionUsd: 0,
          supportsTools: true,
          supportsStructuredOutputs: false,
          smokeStatus: "passed",
          conformanceStatus: "optional-only",
          rationale:
            "Latest free coding-specific route in the audit; useful for exploratory work, but not default because free routes can be rate-limited and lack structured output.",
        },
        {
          id: "google/gemini-3.1-flash-lite",
          role: "multimodal-ui",
          providerModelId: "openrouter/google/gemini-3.1-flash-lite",
          createdUtc: "2026-05-07",
          contextTokens: 1048576,
          promptPerMillionUsd: 0.25,
          completionPerMillionUsd: 1.5,
          supportsTools: true,
          supportsStructuredOutputs: true,
          smokeStatus: "passed",
          conformanceStatus: "optional-only",
          rationale:
            "Cheap multimodal lane for screenshot/UI reasoning; do not spend it on plain code loops when text-only routes pass.",
        },
      ],
    },
    environment: {
      AGENT_HOST_ROOT: hostRoot,
      OPENROUTER_API_KEY: "<set in your shell or secret manager; never commit>",
      OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
      SOLO_OPENROUTER_OPENCLAW_MODEL: "deepseek/deepseek-v4-flash",
      SOLO_OPENROUTER_HERMES_MODEL: "qwen/qwen3-coder-next",
      SOLO_OPENROUTER_CODING_FALLBACK_MODEL: "qwen/qwen3-coder-next",
      SOLO_OPENROUTER_FREE_CODE_MODEL: "cohere/north-mini-code:free",
      SOLO_OPENROUTER_MULTIMODAL_MODEL: "google/gemini-3.1-flash-lite",
      SOLO_OPENROUTER_AUDITED_PAID_CODE_MODEL: input.modelAudit?.recommended.paidCode?.id ?? "<run sfn agents openrouter-audit first>",
      SOLO_OPENROUTER_AUDITED_FREE_CODE_MODEL: input.modelAudit?.recommended.freeCode?.id ?? "<run sfn agents openrouter-audit first>",
      SOLO_OPENROUTER_AUDITED_MULTIMODAL_MODEL: input.modelAudit?.recommended.multimodalUi?.id ?? "<run sfn agents openrouter-audit first>",
    },
    installCommands: {
      windowsPowerShell: [
        `$root = "${hostRoot}"`,
        "New-Item -ItemType Directory -Force -Path $root, \"$root\\npm-global\", \"$root\\uv-tools\", \"$root\\uv-bin\", \"$root\\openclaw-state\", \"$root\\openclaw-workspace\" | Out-Null",
        "npm config set prefix \"$root\\npm-global\"",
        "npm install -g openclaw",
        "uv tool install --tool-dir \"$root\\uv-tools\" --install-dir \"$root\\uv-bin\" hermes-agent",
        "$env:Path = \"$root\\npm-global;$root\\uv-bin;$env:Path\"",
        "$env:OPENAI_BASE_URL = \"https://openrouter.ai/api/v1\"",
        "$env:OPENAI_API_KEY = $env:OPENROUTER_API_KEY",
        "$env:OPENCLAW_STATE_DIR = \"$root\\openclaw-state\"",
        "$env:OPENCLAW_CONFIG_PATH = \"$root\\openclaw-state\\openclaw.json\"",
        "openclaw setup --non-interactive --accept-risk --mode local --workspace \"$root\\openclaw-workspace\"",
        "openclaw models set \"openrouter/$env:SOLO_OPENROUTER_OPENCLAW_MODEL\"",
        "hermes config set model.provider openrouter",
        "hermes config set model.name $env:SOLO_OPENROUTER_HERMES_MODEL",
        "hermes config set model.model $env:SOLO_OPENROUTER_HERMES_MODEL",
      ],
    },
    verificationCommands: [
      "node skills/solo-founder-nodes/conformance/conformance.mjs --run-smoke",
      "openclaw agent --local --agent main --session-key agent:main:solo-founder-conformance --model openrouter/$env:SOLO_OPENROUTER_OPENCLAW_MODEL --message \"Do not edit files or create workaround scripts. Run node -v, then run node skills/solo-founder-nodes/conformance/conformance.mjs --run-smoke. If Node is below 18, report an environment failure instead of patching. Return the PASS/FAIL receipt.\" --timeout 900 --json",
      "hermes --provider openrouter --model $env:SOLO_OPENROUTER_HERMES_MODEL --yolo --oneshot \"Do not edit files or create workaround scripts. Run node -v, then run node skills/solo-founder-nodes/conformance/conformance.mjs --run-smoke. If Node is below 18, report an environment failure instead of patching. Return the PASS/FAIL receipt.\"",
    ],
    safetyRules: [
      "This setup is optional; Solo Founder Nodes remains markdown + Node/Python and does not require OpenClaw, Hermes, or OpenRouter.",
      "Never write OPENROUTER_API_KEY into repo files, prompts, proof artifacts, screenshots, or committed setup packs.",
      "Free model routes are exploratory only until they pass the same conformance receipt as a paid lane.",
      "If a model changes or fails, rerun the OpenRouter smoke and the agent-specific conformance command before updating public claims.",
    ],
  };
}

export function rankOpenRouterModelsFromCatalog(
  catalog: { data?: OpenRouterCatalogModel[] },
  input: { generatedAt?: string; maxCandidates?: number } = {},
): OpenRouterModelAudit {
  const candidates = (catalog.data ?? [])
    .flatMap((model) => toAuditCandidates(model))
    .sort((a, b) => b.score - a.score || a.blendedPerMillionUsd - b.blendedPerMillionUsd || b.contextTokens - a.contextTokens);
  const paidCode = candidates.find((candidate) => candidate.category === "paid-code");
  const freeCode = candidates.find((candidate) => candidate.category === "free-code");
  const multimodalUi = candidates.find((candidate) => candidate.category === "multimodal-ui");
  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceCatalogUrl: "https://openrouter.ai/api/v1/models",
    warning:
      "Catalog audit only. A model is not verified for Solo Founder Nodes until it passes OpenRouter smoke plus agent-specific conformance receipts.",
    recommended: { paidCode, freeCode, multimodalUi },
    topCandidates: candidates.slice(0, input.maxCandidates ?? 20),
  };
}

function toAuditCandidates(model: OpenRouterCatalogModel): OpenRouterModelAuditCandidate[] {
  const inputModalities = model.architecture?.input_modalities ?? [];
  const outputModalities = model.architecture?.output_modalities ?? [];
  const textIn = inputModalities.includes("text");
  const textOut = outputModalities.includes("text");
  const modality = model.architecture?.modality ?? "";
  const contextTokens = model.context_length ?? 0;
  const promptPerMillionUsd = pricePerMillion(model.pricing?.prompt);
  const completionPerMillionUsd = pricePerMillion(model.pricing?.completion);
  const blendedPerMillionUsd = roundUsd((promptPerMillionUsd * 3 + completionPerMillionUsd) / 4);
  const supportsTools = (model.supported_parameters ?? []).includes("tools");
  const supportsStructuredOutputs = (model.supported_parameters ?? []).some((param) => param === "structured_outputs" || param === "response_format");
  const searchText = `${model.id} ${model.name ?? ""} ${model.description ?? ""}`.toLowerCase();
  const codeish = /(code|coder|coding|software|terminal|swe|qwen|deepseek|north|poolside|gpt-oss|glm|mistral)/i.test(searchText);
  const multimodal = inputModalities.some((m) => ["image", "video", "audio", "file"].includes(m));
  if (model.id === "openrouter/auto" || promptPerMillionUsd < 0 || completionPerMillionUsd < 0) return [];
  if (!textIn || !textOut || contextTokens < 64000 || !supportsTools) return [];

  const createdUtc = model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : "unknown";
  const free = promptPerMillionUsd === 0 && completionPerMillionUsd === 0;
  const reasons = [
    `${contextTokens.toLocaleString("en-US")} context`,
    supportsStructuredOutputs ? "structured output" : "no structured output",
    free ? "free route" : `$${promptPerMillionUsd}/$${completionPerMillionUsd} per 1M prompt/completion`,
  ];

  const base = 100;
  const recency = model.created ? Math.min(30, Math.max(0, (model.created - 1750000000) / 10000000)) : 0;
  const contextBonus = Math.min(30, contextTokens / 50000);
  const structuredBonus = supportsStructuredOutputs ? 15 : 0;
  const codeBonus = codeish ? 30 : 0;
  const pricePenalty = free ? 0 : Math.min(80, blendedPerMillionUsd * 20);
  const score = Math.round((base + recency + contextBonus + structuredBonus + codeBonus - pricePenalty) * 100) / 100;

  const candidates: OpenRouterModelAuditCandidate[] = [];
  if (codeish && !multimodal) {
    candidates.push({
      id: model.id,
      name: model.name ?? model.id,
      createdUtc,
      contextTokens,
      promptPerMillionUsd,
      completionPerMillionUsd,
      blendedPerMillionUsd,
      supportsTools,
      supportsStructuredOutputs,
      modality,
      category: free ? "free-code" : "paid-code",
      score,
      reasons,
    });
  }
  if (multimodal && !free) {
    candidates.push({
      id: model.id,
      name: model.name ?? model.id,
      createdUtc,
      contextTokens,
      promptPerMillionUsd,
      completionPerMillionUsd,
      blendedPerMillionUsd,
      supportsTools,
      supportsStructuredOutputs,
      modality,
      category: "multimodal-ui",
      score: score - 10,
      reasons: [...reasons, "multimodal inputs"],
    });
  }
  return candidates;
}

function pricePerMillion(value?: string): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? roundUsd(parsed * 1_000_000) : -1;
}

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function verifyOpenRouterAgentSetupPack(pack: OpenRouterAgentSetupPack): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!pack.optional) errors.push("agent host setup must be optional");
  if (pack.sourceCatalogUrl !== "https://openrouter.ai/api/v1/models") errors.push("source catalog must be OpenRouter's models API");
  const roles = new Set(pack.modelPolicy.choices.map((choice) => choice.role));
  for (const role of ["openclaw-default", "hermes-default", "coding-fallback", "free-experimental", "multimodal-ui"] as OpenRouterAgentRole[]) {
    if (!roles.has(role)) errors.push(`missing model role '${role}'`);
  }
  for (const choice of pack.modelPolicy.choices) {
    if (!choice.id.includes("/")) errors.push(`model '${choice.id}' is not an OpenRouter model id`);
    if (!choice.supportsTools) errors.push(`model '${choice.id}' does not support tools`);
    if (choice.role !== "free-experimental" && choice.promptPerMillionUsd === 0 && choice.completionPerMillionUsd === 0) {
      errors.push(`non-free role '${choice.role}' cannot use a free-only model`);
    }
  }
  const allCommands = [...pack.installCommands.windowsPowerShell, ...pack.verificationCommands];
  if (!allCommands.some((cmd) => cmd.includes("openclaw"))) errors.push("setup must include OpenClaw commands");
  if (!allCommands.some((cmd) => cmd.includes("hermes"))) errors.push("setup must include Hermes commands");
  if (!pack.verificationCommands.some((cmd) => cmd.includes("conformance.mjs"))) errors.push("setup must include conformance verification");
  if (pack.modelAudit) {
    if (!pack.modelAudit.warning.includes("conformance")) errors.push("catalog audit must warn that conformance is still required");
    for (const candidate of Object.values(pack.modelAudit.recommended)) {
      if (candidate && !candidate.id.includes("/")) errors.push(`audit candidate '${candidate.id}' is not an OpenRouter model id`);
    }
  }
  for (const command of allCommands) {
    if (/OPENROUTER_API_KEY\s*=/.test(command) && !command.includes("<set in your shell")) {
      errors.push("setup command appears to assign a concrete OpenRouter key");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function writeOpenRouterAgentSetupPack(outDir: string, pack: OpenRouterAgentSetupPack): void {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "scripts"), { recursive: true });
  writeFileSync(join(outDir, "openrouter-agent-setup.json"), `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  writeFileSync(join(outDir, ".env.example"), envExample(pack), "utf8");
  writeFileSync(join(outDir, "README.md"), readme(pack), "utf8");
  writeFileSync(join(outDir, "scripts", "Setup-OpenRouterAgents.ps1"), setupPowerShell(pack), "utf8");
}

function envExample(pack: OpenRouterAgentSetupPack): string {
  return [
    "# Copy these into your shell, Windows user env, Vercel env, or secret manager.",
    "# Do not commit real keys.",
    ...Object.entries(pack.environment).map(([key, value]) => `${key}=${value}`),
    "",
  ].join("\n");
}

function setupPowerShell(pack: OpenRouterAgentSetupPack): string {
  return [
    "$ErrorActionPreference = \"Stop\"",
    "if (-not $env:OPENROUTER_API_KEY) { throw \"OPENROUTER_API_KEY is missing. Set it in this shell or secret manager first.\" }",
    `$env:SOLO_OPENROUTER_OPENCLAW_MODEL = "${pack.environment.SOLO_OPENROUTER_OPENCLAW_MODEL}"`,
    `$env:SOLO_OPENROUTER_HERMES_MODEL = "${pack.environment.SOLO_OPENROUTER_HERMES_MODEL}"`,
    `$env:SOLO_OPENROUTER_CODING_FALLBACK_MODEL = "${pack.environment.SOLO_OPENROUTER_CODING_FALLBACK_MODEL}"`,
    `$env:SOLO_OPENROUTER_FREE_CODE_MODEL = "${pack.environment.SOLO_OPENROUTER_FREE_CODE_MODEL}"`,
    `$env:SOLO_OPENROUTER_MULTIMODAL_MODEL = "${pack.environment.SOLO_OPENROUTER_MULTIMODAL_MODEL}"`,
    `$env:SOLO_OPENROUTER_AUDITED_PAID_CODE_MODEL = "${pack.environment.SOLO_OPENROUTER_AUDITED_PAID_CODE_MODEL}"`,
    `$env:SOLO_OPENROUTER_AUDITED_FREE_CODE_MODEL = "${pack.environment.SOLO_OPENROUTER_AUDITED_FREE_CODE_MODEL}"`,
    `$env:SOLO_OPENROUTER_AUDITED_MULTIMODAL_MODEL = "${pack.environment.SOLO_OPENROUTER_AUDITED_MULTIMODAL_MODEL}"`,
    ...pack.installCommands.windowsPowerShell,
    "Write-Host \"Optional OpenRouter agent hosts configured. Now run the conformance commands in README.md.\"",
    "",
  ].join("\n");
}

function readme(pack: OpenRouterAgentSetupPack): string {
  const choices = pack.modelPolicy.choices
    .map((choice) => `- ${choice.role}: \`${choice.id}\` (${choice.promptPerMillionUsd}/${choice.completionPerMillionUsd} USD per 1M prompt/completion tokens) - ${choice.rationale}`)
    .join("\n");
  const commands = pack.verificationCommands.map((cmd) => `\`\`\`powershell\n${cmd}\n\`\`\``).join("\n\n");
  const auditCandidates = modelAuditReadme(pack.modelAudit);
  return [
    "# Optional OpenRouter Agent Host Setup",
    "",
    "This setup is optional. Solo Founder Nodes works without OpenRouter, OpenClaw, or Hermes.",
    "",
    "## Model Policy",
    "",
    pack.modelPolicy.selectionRule,
    "",
    choices,
    "",
    ...auditCandidates,
    "## Setup",
    "",
    "1. Set `OPENROUTER_API_KEY` in your shell or secret manager.",
    "2. Run `scripts/Setup-OpenRouterAgents.ps1` from PowerShell.",
    "3. Run the conformance commands below and keep the receipts.",
    "",
    "## Verification",
    "",
    commands,
    "",
    "## Safety",
    "",
    ...pack.safetyRules.map((rule) => `- ${rule}`),
    "",
  ].join("\n");
}

function modelAuditReadme(audit?: OpenRouterModelAudit): string[] {
  if (!audit) return [];
  const rows = [
    ["paid code", audit.recommended.paidCode],
    ["free code", audit.recommended.freeCode],
    ["multimodal UI", audit.recommended.multimodalUi],
  ]
    .filter((entry): entry is [string, OpenRouterModelAuditCandidate] => Boolean(entry[1]))
    .map(([label, candidate]) => `- ${label}: \`${candidate.id}\` (${candidate.contextTokens} context, ${candidate.promptPerMillionUsd}/${candidate.completionPerMillionUsd} USD per 1M prompt/completion tokens, score ${candidate.score})`);
  return [
    "## Live Catalog Audit Candidates",
    "",
    audit.warning,
    "",
    ...rows,
    "",
    "Use the `SOLO_OPENROUTER_AUDITED_*` variables only after the selected host has produced a smoke and conformance receipt.",
    "",
  ];
}
