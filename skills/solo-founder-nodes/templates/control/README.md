# Control plane

The control plane is the durable shell around the seven-phase loop. It is intentionally local-first,
copyable, and small enough for a coding agent to run in any app repo.

It records:

- event triggers with idempotency keys
- loop status and current phase
- phase attempts and checkpoints
- approval requests and decisions
- token/cost/latency trace spans
- budget stops
- worktree leases for parallel agents
- improvement candidates sourced from traces/evals

`SoloLedger` remains the benchmark referee. `SoloControlPlane` is the runner state and operating log.

## Required gates

- No post-discover phase starts without a ready graph-context receipt.
- Spend over `budgetUsd` pauses the loop.
- Human approval decisions are durable and resumable.
- Trace spans become improvement candidates; the agent does not rely on chat memory to remember why
  it should change the harness.

Run `npm run smoke` from the templates root to prove the local control plane.
