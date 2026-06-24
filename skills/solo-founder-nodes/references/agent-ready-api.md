# Agent-Ready API Gate

The model should not need hidden context to call a tool correctly. A production tool is agent-ready
only when its provider-facing contract tells the model what the tool does, what exact fields are
required, when to call it, when not to call it, what success looks like, what recoverable failure
looks like, and when to stop for a human.

This is the reusable lesson from NodeRoom's provider-schema failure: backend validation is not enough
if the provider sees an empty or vague function schema.

## Required Artifact

Every build/adapter phase that exposes tools must produce `agent-api-contract.md` or an equivalent
JSON contract verified by:

```bash
npm run sfn -- agent-api verify --contract agent-api-contract.json
```

The contract must include:

- tool name and purpose
- input schema and output schema
- provider-facing input schema parity
- required args visible to the provider
- lifecycle: `search -> resolve -> preview -> execute -> verify -> recover`
- when to use and when not to use
- preconditions and success signals
- structured failure modes and recovery paths
- cost/latency class
- permission level, mutation flag, and approval requirement
- example call, example success, and example failure

## Failure Taxonomy

Use the shared failure kinds:

```text
missing_required_arg
invalid_arg_type
permission_denied
private_context_blocked
cas_conflict
lock_blocked
evidence_required
formula_protected
provider_timeout
budget_cap
```

Errors are inputs. Do not treat invalid tool calls as mysterious model failures. Return the structured
failure, record a trace, and let the next loop recover or stop explicitly.

## Research Anchor

The Agent-First Tool API paper argues for semantic tool phases, normalized tool contracts, evidence
and next-action metadata, and governance above CRUD-style interfaces:

https://arxiv.org/abs/2605.10555
