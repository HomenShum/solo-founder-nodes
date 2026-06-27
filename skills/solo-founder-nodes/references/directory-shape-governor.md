# Directory Shape Governor

## Why this exists

A coding agent left unchecked will create:

- a single 1,400-line `App.tsx` god object
- scattered `src/core` folders with no clear boundary
- agent runtimes mixed into UI components
- proof code mixed into product routes
- no separation between agent harness, tools, models, and guardrails

The Directory Shape Governor forces code organization before edits and blocks god objects.

## Recommended structure for agent apps

Use NodeRoom's `src/nodeagent` organization as the default mental model: one signature engine boundary, then `core`, `models`, `skills`, `mcp`, `integration`, and `guardrails`.

```text
generated-app/
├── .agent/
│   ├── AGENT.md
│   ├── skills.md
│   ├── policy.json
│   └── templates/
│
├── docs/
│   ├── system-map.graph.json
│   ├── system-map.mmd
│   ├── system-map.html
│   ├── research-policy.yaml
│   ├── research/
│   │   └── briefs/
│   ├── adr/
│   └── proof/
│
├── mcp/
│   ├── architecture-governor/
│   └── research-governor/
│
├── src/
│   ├── nodeagent/
│   │   ├── index.ts
│   │   ├── core/
│   │   │   ├── orchestrator.ts
│   │   │   ├── state.ts
│   │   │   ├── events.ts
│   │   │   ├── hooks.ts
│   │   │   ├── queue.ts
│   │   │   └── receipts.ts
│   │   │
│   │   ├── models/
│   │   │   ├── router.ts
│   │   │   ├── openRouter.ts
│   │   │   └── prompts/
│   │   │
│   │   ├── tools/
│   │   │   ├── registry.ts
│   │   │   ├── filesystem/
│   │   │   ├── browser/
│   │   │   ├── search/
│   │   │   └── domain/
│   │   │
│   │   ├── domains/
│   │   │   └── <domain>/
│   │   │       ├── domainPack.ts
│   │   │       ├── invariants.ts
│   │   │       ├── proofGates.ts
│   │   │       └── fixtures.ts
│   │   │
│   │   ├── guardrails/
│   │   │   ├── approval.ts
│   │   │   ├── circuitBreaker.ts
│   │   │   ├── antiShallowQa.ts
│   │   │   └── sanitize.ts
│   │   │
│   │   └── mcp/
│   │       ├── tools.ts
│   │       ├── resources.ts
│   │       └── prompts.ts
│   │
│   ├── features/
│   │   └── <product-feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── types.ts
│   │       └── proof.ts
│   │
│   ├── ui/
│   └── shared/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
└── package.json
```

## Anti-god-object limits

Add these to the generated repo policy:

```json
{
  "directoryShape": {
    "maxFileLines": 350,
    "maxComponentLines": 250,
    "maxFunctionLines": 80,
    "maxToolSchemaLines": 160,
    "noGodObjects": true,
    "requiredFoldersForAgentApp": [
      "src/nodeagent/core",
      "src/nodeagent/tools",
      "src/nodeagent/models",
      "src/nodeagent/guardrails",
      "docs/proof",
      "tests"
    ]
  }
}
```

If the agent creates `src/App.tsx` with 1,400 lines, the judge should return `not_done`.

## Enforcement points

```text
L phase (Live Build):
  - file placement plan must be written before edits
  - each planned file has an owner and max line count
  - post-write check: if file exceeds threshold, block

H phase (Harden):
  - if a god object was created and split, record the split in rework ledger
  - if a god object persists, judge returns not_done

CI/pre-commit:
  - scan changed files for line-count violations
  - scan for required folder structure when agent app is detected
  - block merge if god-object thresholds exceeded
```

## Path aliases

When a NodeAgent-style harness is generated, set up path aliases:

```text
@nodeagent/core
@nodeagent/tools
@nodeagent/models
@nodeagent/guardrails
@nodeagent/domains
```

This makes imports clean and prevents the engine from being scattered across generic `src/core` folders.
