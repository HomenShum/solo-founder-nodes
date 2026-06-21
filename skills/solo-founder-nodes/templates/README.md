# Solo Founder Nodes — local substrate (turnkey)

Runnable, local-first reference of the substrates the loop needs. **One command, no cloud, no API
keys, no Convex:**

```
npm i && npm run smoke
```

The smoke runs **17 assertions** that *prove* each anti-cheat mechanism (and the chain detecting a
tamper) — not a claim, a passing run.

## CLI (`sfn`) — the universal shell entry
A thin wrapper over the **same code the smoke proves** — pure shell, no new deps. It's the
agent-agnostic surface: every coding agent can run it.

```
npm run sfn -- doctor                       # node + deps readiness
npm run sfn -- smoke                        # the substrate proof (expect 17 passed, 0 failed)
npm run sfn -- conformance                  # the cross-agent portability probe (PASS + receipt)
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
- **`design/`**: the design-bridge templates (brief / component contract / visual-regression checklist).
- **`smoke.ts`**: the proof.

## What runs vs. what you wire
- **Runs out of the box (generic, local):** the gate / split-sealing / memory-leak taint / hash-chain,
  the memory engine + content gate. (The deterministic grader is at `../../../docs/eval/nonbtb/grade.py`.)
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
