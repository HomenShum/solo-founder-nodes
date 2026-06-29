# RALPH anchors — machine-readable loop state

The phases write prose (`capability-spec.md`, `benchmark-choice.md`, `SETUP.md`). These anchors are
the **machine-readable** companions a runtime (or NodeRL) can consume to gate the loop and audit
honesty. Drop them under `.solo/anchors/` in your repo. They are templates — fill the placeholders;
do not invent values.

## `capability-spec.json` (Phase 1 — what *good* means, before building)
```json
{
  "schema": "solo-founder/capability-spec/v1",
  "app": "<your app>",
  "agentGoal": "<one sentence: what the agent must accomplish in the live app>",
  "surfaces": ["<UI surface the agent acts on>"],
  "tools": ["<tool the agent may call>"],
  "deliverables": ["<artifact type the run must produce>"],
  "outOfScope": ["<explicitly not claimed>"]
}
```

## `benchmark-choice.json` (Phase 2 — the bar, chosen to EXPOSE overfitting)
```json
{
  "schema": "solo-founder/benchmark-choice/v1",
  "benchmark": "<id, e.g. bankertoolbench>",
  "scorer": "<official verifier; no LLM on the scored path>",
  "rubricWeights": { "<criterion>": 1 },
  "headlineMode": "generic-only",
  "passReportedAs": "completion+scoring (NOT a 100% rubric pass rate)"
}
```

## `held-out-split.json` (Phase 2 — frozen BEFORE building; never tuned on)
```json
{
  "schema": "solo-founder/held-out-split/v1",
  "frozenAt": "<iso timestamp>",
  "tuned": ["<task id>"],
  "heldOut": ["<task id>"],
  "offDistribution": ["<non-benchmark task id>"],
  "rule": "never tune on heldOut/offDistribution; a fix counts only if these hold or rise"
}
```

## `setup-provenance.json` (Phase 3 — HONEST_PROVENANCE root)
```json
{
  "schema": "solo-founder/setup-provenance/v1",
  "imageDigest": "<harbor/docker image sha or 'docker-free'>",
  "datasetRevision": "<hf dataset rev / commit>",
  "toolchain": { "node": "<v>", "python": "<v>" },
  "recordedAt": "<iso timestamp>"
}
```

## `memory-quarantine.json` (anti-cheat — what recall is allowed on a scored run)
```json
{
  "schema": "solo-founder/memory-quarantine/v1",
  "allowedOnScoredRun": ["uploaded room files", "fresh room context"],
  "forbiddenOnScoredRun": ["golden outputs", "rubrics", "canaries", "prior-run paths", "answer-key writers"],
  "taintFromRecall": true
}
```

## How the loop consumes them
- Phase 6 promotion gate reads `held-out-split.json` + the per-run scorecard: keep a fix only if
  held-out **and** off-distribution hold or rise (else you found an answer-key — revert).
- A NodeRL-style full-suite/live-suite gate turns these anchors + recorded receipts into a durable,
  evidence-derived pass/blocked verdict (see the NodeRL bridge in `MASTER_SKILL.md`).
