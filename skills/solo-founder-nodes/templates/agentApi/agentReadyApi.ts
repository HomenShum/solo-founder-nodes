export const semanticToolPhases = ["search", "resolve", "preview", "execute", "verify", "recover"] as const;
export type SemanticToolPhase = (typeof semanticToolPhases)[number];

export const toolFailureKinds = [
  "missing_required_arg",
  "invalid_arg_type",
  "permission_denied",
  "private_context_blocked",
  "cas_conflict",
  "lock_blocked",
  "evidence_required",
  "formula_protected",
  "provider_timeout",
  "budget_cap",
] as const;
export type ToolFailureKind = (typeof toolFailureKinds)[number];

export type AgentReadyJsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, AgentReadyJsonSchema>;
  required?: string[];
  items?: AgentReadyJsonSchema;
  enum?: string[];
  additionalProperties?: boolean | AgentReadyJsonSchema;
};

export type ToolFailureContract = {
  kind: ToolFailureKind;
  when: string;
  recoveryPath: string;
  nextAction: "retry" | "recover" | "ask_human" | "stop";
};

export type AgentReadyToolContract = {
  schemaVersion: 1;
  toolName: string;
  purpose: string;
  lifecycle: SemanticToolPhase[];
  inputSchema: AgentReadyJsonSchema;
  outputSchema: AgentReadyJsonSchema;
  providerInputSchema?: AgentReadyJsonSchema;
  requiredArgs: string[];
  useWhen: string[];
  doNotUseWhen: string[];
  preconditions: string[];
  successSignals: string[];
  failureModes: ToolFailureContract[];
  costClass: "free" | "low" | "metered" | "expensive";
  latencyClass: "instant" | "interactive" | "background" | "long-running";
  permissionLevel: "read" | "propose" | "write" | "admin";
  mutates: boolean;
  approvalRequired: boolean;
  examples: {
    call: Record<string, unknown>;
    success: Record<string, unknown>;
    failure: Record<string, unknown>;
  };
};

export type AgentReadyApiVerification = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function makeAgentReadyToolContract(
  input: Omit<AgentReadyToolContract, "schemaVersion">,
): AgentReadyToolContract {
  return { schemaVersion: 1, ...input };
}

export function verifyAgentReadyToolContract(contract: AgentReadyToolContract): AgentReadyApiVerification {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (contract.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!contract.toolName.trim()) errors.push("toolName is required");
  if (!contract.purpose.trim()) errors.push(`tool '${contract.toolName}' needs a purpose`);

  for (const phase of semanticToolPhases) {
    if (!contract.lifecycle.includes(phase)) {
      errors.push(`tool '${contract.toolName}' missing lifecycle phase '${phase}'`);
    }
  }

  if (!contract.inputSchema.properties || Object.keys(contract.inputSchema.properties).length === 0) {
    errors.push(`tool '${contract.toolName}' inputSchema must expose provider-visible properties`);
  }
  if ((contract.inputSchema.required ?? []).length === 0 && contract.requiredArgs.length > 0) {
    errors.push(`tool '${contract.toolName}' canonical schema has no required array`);
  }

  for (const arg of contract.requiredArgs) {
    if (!contract.inputSchema.properties?.[arg]) {
      errors.push(`required arg '${arg}' missing from canonical inputSchema.properties`);
    }
    if (!(contract.inputSchema.required ?? []).includes(arg)) {
      errors.push(`required arg '${arg}' missing from canonical inputSchema.required`);
    }
    if (contract.providerInputSchema) {
      if (!contract.providerInputSchema.properties?.[arg]) {
        errors.push(`required arg '${arg}' missing from provider schema properties`);
      }
      if (!(contract.providerInputSchema.required ?? []).includes(arg)) {
        errors.push(`required arg '${arg}' missing from provider schema required array`);
      }
    }
  }

  if (!contract.outputSchema.properties || Object.keys(contract.outputSchema.properties).length === 0) {
    errors.push(`tool '${contract.toolName}' outputSchema must be structured`);
  }
  const outputKeys = new Set(Object.keys(contract.outputSchema.properties ?? {}));
  if (!outputKeys.has("status") && !outputKeys.has("ok")) {
    errors.push(`tool '${contract.toolName}' outputSchema must include status or ok`);
  }
  if (!outputKeys.has("error") && !outputKeys.has("failure")) {
    errors.push(`tool '${contract.toolName}' outputSchema must include structured error/failure`);
  }

  if (contract.useWhen.length === 0) errors.push(`tool '${contract.toolName}' needs useWhen guidance`);
  if (contract.doNotUseWhen.length === 0) errors.push(`tool '${contract.toolName}' needs doNotUseWhen guidance`);
  if (contract.preconditions.length === 0) errors.push(`tool '${contract.toolName}' needs preconditions`);
  if (contract.successSignals.length === 0) errors.push(`tool '${contract.toolName}' needs successSignals`);

  const failureKinds = new Set(contract.failureModes.map((failure) => failure.kind));
  if (contract.failureModes.length === 0) errors.push(`tool '${contract.toolName}' needs recoverable failure modes`);
  for (const failure of contract.failureModes) {
    if (!toolFailureKinds.includes(failure.kind)) errors.push(`unsupported failure kind '${failure.kind}'`);
    if (!failure.when.trim()) errors.push(`failure '${failure.kind}' needs a when description`);
    if (!failure.recoveryPath.trim()) errors.push(`failure '${failure.kind}' needs a recoveryPath`);
  }
  if (!failureKinds.has("missing_required_arg")) warnings.push(`tool '${contract.toolName}' does not document missing_required_arg recovery`);
  if (!failureKinds.has("provider_timeout")) warnings.push(`tool '${contract.toolName}' does not document provider_timeout recovery`);
  if (contract.mutates && !failureKinds.has("permission_denied")) {
    errors.push(`mutating tool '${contract.toolName}' must document permission_denied`);
  }

  if (contract.mutates && contract.permissionLevel === "read") {
    errors.push(`mutating tool '${contract.toolName}' cannot have read permissionLevel`);
  }
  if (contract.permissionLevel === "admin" && !contract.approvalRequired) {
    errors.push(`admin tool '${contract.toolName}' must require approval`);
  }
  if (contract.mutates && contract.approvalRequired === false && contract.costClass === "expensive") {
    errors.push(`expensive mutating tool '${contract.toolName}' must require approval`);
  }

  if (Object.keys(contract.examples.call ?? {}).length === 0) errors.push(`tool '${contract.toolName}' needs example call`);
  if (Object.keys(contract.examples.success ?? {}).length === 0) errors.push(`tool '${contract.toolName}' needs example success`);
  if (Object.keys(contract.examples.failure ?? {}).length === 0) errors.push(`tool '${contract.toolName}' needs example failure`);

  return { ok: errors.length === 0, errors, warnings };
}

export function makeAgentApiContractMarkdown(contract: AgentReadyToolContract): string {
  const lines = [
    `# Agent API Contract: ${contract.toolName}`,
    "",
    `Purpose: ${contract.purpose}`,
    "",
    `Lifecycle: ${contract.lifecycle.join(" -> ")}`,
    "",
    "## Use When",
    ...contract.useWhen.map((item) => `- ${item}`),
    "",
    "## Do Not Use When",
    ...contract.doNotUseWhen.map((item) => `- ${item}`),
    "",
    "## Preconditions",
    ...contract.preconditions.map((item) => `- ${item}`),
    "",
    "## Required Args",
    ...contract.requiredArgs.map((arg) => `- ${arg}`),
    "",
    "## Failure Modes",
    ...contract.failureModes.map((failure) => `- ${failure.kind}: ${failure.recoveryPath}`),
    "",
    "## Governance",
    `- permission: ${contract.permissionLevel}`,
    `- mutates: ${contract.mutates}`,
    `- approvalRequired: ${contract.approvalRequired}`,
    `- costClass: ${contract.costClass}`,
    `- latencyClass: ${contract.latencyClass}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}
