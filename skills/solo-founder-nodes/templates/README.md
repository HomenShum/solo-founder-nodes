# Solo Founder Nodes — local substrate (turnkey)

Runnable, local-first reference of the substrates the loop needs. **One command, no cloud, no API
keys, no Convex:**

```
npm i && npm run smoke
```

The smoke runs pass/fail assertions that *prove* each anti-cheat/control-plane/design/research/gstack
mechanism (and the chain detecting a tamper) — not a claim, a passing run.

## CLI (`sfn`) — the universal shell entry
A thin wrapper over the **same code the smoke proves** — pure shell, no new deps. It's the
agent-agnostic surface: every coding agent can run it.

```
npm run sfn -- doctor                       # node + deps readiness
npm run sfn -- smoke                        # the substrate proof (expect all assertions to pass)
npm run sfn -- conformance                  # the cross-agent portability probe (PASS + receipt)
npm run sfn -- context inspect <app-root>   # inspect Graphify-style graph context readiness
npm run sfn -- control start --project <p> --goal <g> --budget 5 --root <app-root>
npm run sfn -- control status <loopId>      # resume summary: phase, approvals, traces, improvements
npm run sfn -- research init --goal <g> --domain 3d-generation
npm run sfn -- run --project <path> --goal <g> --out loop-run.json
npm run sfn -- run verify --receipt loop-run.json
npm run sfn -- agent-api verify --contract agent-api-contract.json
npm run sfn -- fresh-room verify --receipt docs/eval/fresh-room/<case-id>/latest.json
npm run sfn -- rework verify --ledger rework-ledger.json
npm run sfn -- agents openrouter-audit --out openrouter-model-audit.json
npm run sfn -- agents openrouter-plan --audit openrouter-model-audit.json --out agent-host-setup
npm run sfn -- design recommend --surface saas-app --runtime codex
npm run sfn -- design flow --surface 3d-app --category "3D asset generation" --visuals --animation --runtime codex
npm run sfn -- gstack recommend --phase verify --goal <g> --ui --deploy --security
npm run sfn -- seal --salt <s> <taskId...>  # seal a held-out manifest (HMAC) — keep the salt OUT of the agent's reach
npm run sfn -- ledger list                  # list recorded eval runs
npm run sfn -- ledger verify <runId>        # re-verify a run's hash-chain (tamper check)
```

## What's here
- **`ledger/` — `SoloLedger`**: the honest-lane eval ledger that **DERIVES the gate, never accepts it**.
  - Enforced fully + locally: **S9** derive-the-gate + quarantine-on-disagreement · **S12** split
    sealing + immutable split-ledger (rejects tuned-reuse / off-manifest) · **S14** memory-leak taint ·
    **S16** hash-chain (detects out-of-band tampering).
  - Wired as hooks — the harness supplies a receipt, the ledger *checks* it: **S10** writer-provenance
    receipt tied to the deliverable bytes · **S11** signed transport ledger (per-run nonce) · **S15**
    independent refute-by-default verifier.
- **`memory/` — `SoloMemory`**: local-first SQLite + FTS5 recall + the **S13** content gate
  (rejects held-out gold regardless of the caller's self-declared `benchmarkSafety` label).
- **`context/` - `GraphContext`**: Graphify-style receipt inspector. Post-discover phases fail closed
  unless the app has a ready graph report + graph JSON, forcing query-first orientation.
- **`control/` - `SoloControlPlane`**: durable loop state for triggers, checkpoints, approvals, budget
  stops, trace spans, worktree leases, and trace-sourced improvement candidates.
- **`research/` - Research Spine**: research-backed decision receipts, claim gates, proof artifacts,
  and 3D-agent comparison rubric.
- **`loop/` - Loop Runner**: executable phase receipts for discover -> benchmark -> setup -> build ->
  adapter -> iterate -> verify, with proof-verdict enforcement.
- **`agentApi/` - Agent-ready API gate**: semantic tool contracts, provider-schema parity, and
  structured failure/recovery checks.
- **`proof/` - Fresh-room proof receipts**: live browser proof receipts with trace/video/screenshots,
  official scorer results, exported/reopened artifacts, costs, latency, and token usage.
- **`rework/` - Build-to-delete ledger**: records replaced/deleted approaches, failure receipts,
  surviving proof, and lessons.
- **`design/`**: the design-bridge templates (brief / component contract / visual-regression checklist).
- **`gstack/` - gstack Bridge**: portable CEO/eng/design/QA/security/release operating-review lanes.
- **`setup/openrouterAgentHosts.ts` - Optional agent hosts**: OpenRouter/OpenClaw/Hermes setup pack
  generator with cheap current model policy, secret hygiene, and conformance commands. The core skill
  does not require these hosts.
- **`smoke.ts`**: the proof.

## What runs vs. what you wire
- **Runs out of the box (generic, local):** the gate / split-sealing / memory-leak taint / hash-chain,
  the memory engine + content gate, graph-context receipt checks, durable control plane, loop runner,
  agent-ready API gate, fresh-room receipt verifier, rework ledger verifier, design/research/gstack
  gates, and OpenRouter setup policy. (The deterministic grader is at
  `../../../docs/eval/nonbtb/grade.py`.)
- **You wire (app-coupled — by design, because they touch *your* harness):**
  - **S10/S11 receipts** must be produced by your harness — instrument your materializer to log the
    call-stack-leaf per deliverable, and your planner to write the signed transport row. The contract is
    the `WriterReceipt` / `TransportReceipt` types in `ledger/ledger.ts`.
  - **S15 verifier** is a function you pass to `finishRun({ verifier })` — plug your second model/lens.
  - The **sealed-gold corpus** (for S13) and the **HMAC salt** (for S12) must live **out of the agent's
    reach** (CI / a signing service), never in the agent's own process.

## The honest boundary
This makes cheating **detectable and expensive — not impossible.** The irreducible residuals
(input-corpus laundering, family-shape priors over a fixed pool, the signing process as the trust root)
require a continuously-refreshed family-disjoint held-out stream + a human/CI backstop. See the full
doctrine in [`../references/honest-lane.md`](../references/honest-lane.md) and the literature in
[`../references/research.md`](../references/research.md).
