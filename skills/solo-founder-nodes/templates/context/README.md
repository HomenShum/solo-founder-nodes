# Context substrate

Solo Founder Nodes needs two different memory surfaces:

- **Graph context**: what the app/codebase is. Recommended producer: Graphify.
- **SoloMemory**: what the loop decided, approved, measured, rejected, or proved.

Do not mix them. The graph is queryable structure; memory is audit history.

## Contract

A context producer is ready when it writes:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`

`graphContext.ts` inspects those files and emits a receipt. Later phases must fail closed when the
receipt is missing or stale. The agent should query first:

```bash
graphify query "what connects the chat composer to exported artifacts?"
```

Then it reads only the cited files needed for the task.

## Per-phase rule

- `discover`: build or refresh graph context.
- `benchmark`: use the graph to identify real app capabilities and UI/backend seams.
- `build` / `adapter`: query before editing shared architecture or live UI paths.
- `iterate`: update the graph after code changes before choosing the next fix.
- `verify`: use graph refs to bind DOM selectors, exported bytes, run IDs, and scorers.

The smoke test proves missing graph context blocks post-discover phases.
