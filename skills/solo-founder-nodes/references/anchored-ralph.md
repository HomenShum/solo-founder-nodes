# Anchored RALPH

## Doctrine

> **No anchor artifact, no next phase.**

Each RALPH phase must produce a concrete anchor artifact before the next phase can begin. The anchor proves the agent understood the system, defined quality, built with discipline, ran real proof, and hardened failures.

Without anchors, the agent drifts into:

```text
prompt-following
  -> broad architecture invention
  -> bad directory shape
  -> god objects
  -> shallow tests
  -> sycophantic "this is great"
  -> fake done
```

With anchors:

```text
each major phase
  -> must produce a required artifact
  -> must read architecture graph
  -> must run research governor if needed
  -> must pass directory shape rules
  -> must pass fresh-context critique
  -> must leave receipts
```

## Phase anchors

### R — Reality

**Anchor:** `R-system-context.json`

Required:
- repo inventory
- system map read receipt
- target user/workflow
- affected graph nodes
- current directory map
- existing patterns to reuse
- anti-god-object risk list

Block if:
- no architecture graph read
- no affected nodes identified
- no current repo pattern inspection

### A — Acceptance

**Anchor:** `A-proof-contract.json`

Required:
- domain pack
- reference pack if inspired by existing products
- proof gates
- negative fixtures
- directory contract
- "what not to build" list

Block if:
- no proof gates
- no rejected options
- no directory contract
- no research brief when required

### L — Live Build

**Anchor:** `L-implementation-map.json`

Required:
- implementation slices
- file placement plan
- no god-object check
- component ownership boundaries
- generated architecture delta

Block if:
- new runtime/tool/agent/db/ui code not reflected in graph
- file exceeds size/ownership threshold
- implementation creates unowned shared blob

### P — Proof

**Anchor:** `P-proof-ledger.json`

Required:
- real browser proof for UI
- export/reopen proof for artifacts
- domain proof for professional workflow
- visual/taste proof if product surface changed
- cost/runtime/model/tool-call telemetry

Block if:
- unit-only proof for UI
- DOM-only proof for visual state
- no negative regression

### H — Harden

**Anchor:** `H-hardening-ledger.json`

Required:
- root-cause patch contract
- rework ledger
- changed system map
- ADR if architecture changed
- next run/resume command

Block if:
- failure fixed with no regression fixture
- architecture changed with no ADR/graph update

## Anchor file locations

```text
.solo/
  anchors/
    R-system-context.json
    A-proof-contract.json
    L-implementation-map.json
    P-proof-ledger.json
    H-hardening-ledger.json
```

Schemas: [`templates/anchors/`](../templates/anchors/)

## Architecture graph as phase gate

The canonical architecture graph (`docs/system-map.graph.json`) is not a pretty diagram. It is the phase gate.

```text
R phase: must read graph
A phase: must identify affected nodes
L phase: must update graph if architecture changes
P phase: must prove graph-linked runtime path
H phase: must record architecture delta or rejected update
```

## Hook enforcement

```text
Hook event        Required behavior
────────────────────────────────────────────────────────────────────────────
SessionStart      Read docs/system-map.graph.json; store graph hash.
UserPromptSubmit  Classify: architecture? research? UI? eval? domain?
PreToolUse        If editing architecture-sensitive paths without R/A anchors, block.
PostToolUse       If changed files touch agents/tools/db/ui/hooks, mark graph update required.
SubagentStart     Inject affected graph nodes, directory contract, invariants.
Stop              Block if anchors, graph update, research brief, tests, or proof are missing.
CI/pre-commit     Repeat the graph/research/directory/proof checks outside the agent.
```

CI is required because hooks can guide supported agent lifecycles, but they are not the hard correctness boundary. Repo-level guards must backstop them.

## Major-loop anchor checklist

```text
ANCHOR REQUIREMENTS

R — Reality
  [ ] Read architecture graph through MCP or file
  [ ] Write architecture_read receipt
  [ ] Inspect existing directory patterns
  [ ] Identify affected nodes/edges/files
  [ ] Identify current user/product/domain
  [ ] Identify anti-pattern risks
  [ ] Write System Context Packet

A — Acceptance
  [ ] Create domain pack
  [ ] Create reference pack when applicable
  [ ] Create proof contract
  [ ] Create directory contract
  [ ] Create negative fixtures
  [ ] Run Preceptor Council
  [ ] Write accepted/rejected options

L — Live Build
  [ ] Implement within planned file map
  [ ] Avoid god objects
  [ ] Keep functions/modules bounded
  [ ] Update architecture graph if runtime changes
  [ ] Update ADR if architectural decision changes
  [ ] Emit implementation receipts

P — Proof
  [ ] Run deterministic tests
  [ ] Run live browser if UI changed
  [ ] Run export/reopen if artifacts changed
  [ ] Run visual/taste proof if product surface changed
  [ ] Run domain proof if professional workflow changed
  [ ] Run anti-shallow QA
  [ ] Write proof ledger

H — Harden
  [ ] Add regression fixture
  [ ] Write root-cause patch contract
  [ ] Update rework ledger
  [ ] Update system map / research brief / ADR
  [ ] Run fresh-context judge
  [ ] Emit GOAL_RESULT
```

## What this changes in practice

Before:

```text
Agent: "I'll add an agent runtime."
Writes:
  src/agent.ts
  src/tools.ts
  src/App.tsx
  Maybe tests.
Says done.
```

After:

```text
Agent: "I'll add an agent runtime."
Must first:
  read architecture graph
  produce System Impact Brief
  research if SDK/harness-sensitive
  decide tool vs subagent vs MCP vs hook
  write file placement plan
  pass preceptor review

Then:
  implement bounded modules
  update graph
  run tests/evals
  run proof
  block final if receipts missing
```

This is how you stop "AI-shaped architecture."
