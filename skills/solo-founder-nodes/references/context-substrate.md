# Context substrate - self-orientation before mutation

Solo Founder Nodes has two different context systems:

- **Graph context**: the current app/codebase map. Recommended producer: Graphify.
- **SoloMemory**: durable loop history: decisions, approvals, failures, scorecards, proofs.

Do not collapse them into one prompt. The graph answers "what is connected to what?" Memory answers
"what did this loop already decide or prove?"

## Why this exists

A coding agent can follow the seven phases and still fail because it misreads the app. Common failure:
it picks the wrong benchmark, edits the wrong UI seam, wires an adapter against a stale backend path,
or verifies a static mock instead of the live surface. Graph context closes that by giving the agent a
queryable structural map before it mutates code.

## Required graph receipt

The recommended producer is Graphify, but the contract is tool-agnostic. A graph context is ready when
the app repo contains:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`

The reference inspector is `templates/context/graphContext.ts`. It emits a receipt with:

- status: `ready | missing | stale`
- report path and graph path
- node/edge/community counts
- stale reasons
- query/update commands
- evidence refs to store in SoloMemory and the control plane

Post-discover phases must fail closed if the receipt is not `ready`.

## Phase rules

| Phase | Required behavior |
|---|---|
| discover | Build or refresh the graph. Read `GRAPH_REPORT.md` before raw grep. |
| benchmark | Query the graph to find real app capabilities, deliverable shapes, UI/backend seams, model/tool call surfaces. |
| setup | Store runner paths, graph refs, and benchmark scaffold decisions in memory. |
| build | Query before editing shared modules, UI surfaces, exports, persistence, or agent runtime code. |
| adapter | Query for official scorer seams, export paths, run IDs, selectors, and backend mutations before wiring. |
| iterate | After code edits, run the graph update command before selecting the next fix. |
| verify | Bind DOM signals, screenshots, exported bytes, scorer output, and run IDs back to graph refs and ledger rows. |

## Query-first rule

Before architecture, adapter, UI, benchmark, or mutation work:

```bash
graphify query "what connects the agent composer to exported artifacts and scorer inputs?"
```

Use the answer to choose files/symbols, then read only the cited files needed for the edit. If Graphify
is unavailable, produce the same receipt with another code graph tool or explicitly mark the phase
blocked; do not silently fall back to full-repo guessing.

## Memory separation

Store graph receipts and query results as `project_fact`, `architecture_rule`, or `tool_result`
memories with `benchmarkSafety: "safe"`. Never store held-out task contents in graph or memory. If the
graph includes generated benchmark artifacts, add ignore rules or rebuild the graph without them.

## Copyable implementation

- `templates/context/graphContext.ts` - receipt inspector and query-plan helper.
- `templates/context/README.md` - minimal wiring contract.
- `templates/control/controlPlane.ts` - refuses post-discover phases without a ready graph receipt.
