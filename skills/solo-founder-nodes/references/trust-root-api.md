# Trust-root API — the out-of-process tier (spec, not a running service)

The local substrate (`templates/`) is honest but **in-reach**: the agent runs locally, so the salt,
the sealed-gold corpus, and the gate all live in a process the agent can touch. A local gate is the
*right shape* but can't be the final trust root. This spec is how you move the un-spoofable parts
**out of the agent's process** to close S12/S16 + the residual backstop. It is a **design**, not
something we stood up — wrap the existing `SoloLedger` behind HTTP and hold the secrets in the service.

## What must live out-of-process (and why)
| Held by the API, never the agent | Closes |
|---|---|
| The **HMAC salt** + the sealed **held-out manifest** | S12 — the agent cannot forge held-out membership or re-seal a tuned task |
| The **sealed-gold corpus** for the content gate | S13/S14 — the agent cannot test-tune around the leak detector |
| The **gate derivation** (recompute `cleanGeneralProbe` from evidence) | S9 — the verdict is computed where the agent can't override it |
| The **independent verifier** run (different model/lens) | S15 — refutation happens on a machine the agent doesn't control |
| The **immutable ledger + hash-chain anchor** | S16 — the chain head is notarized off the agent's box |

## Endpoints (sketch — all wrap `SoloLedger`/`SoloMemory` semantics)
- `POST /seal` — **admin/CI token only.** Body: `{ taskIds[] }`. Server seals with its secret salt, returns the manifest hash. *The agent never gets this token or the salt.*
- `POST /runs` / `POST /runs/:id/tasks` — **agent ingest token.** The agent posts **evidence** (`writerReceipt`, `transportReceipt` + the run nonce, `deliverableHash`, recalled-memory ids) — **never** a `cleanGeneralProbe` boolean. The server derives the gate, checks split membership against the sealed manifest, runs the content/leak fingerprint against the sealed gold, and records the hash-chained row.
- `POST /runs/:id/finish` — server runs the independent verifier on a sample, computes the headline over derived-clean rows, returns `{ headlineMean, headlineN, chainHead }`.
- `GET /runs/:id` / `GET /runs/:id/verify` — read + re-verify the chain.

## The trust boundary
The agent holds **only the ingest token** → it can submit evidence and read results. It does **not**
hold the salt, the sealed gold, the seal token, or the verifier model → it **cannot** fake held-out
membership, launder gold, self-set the gate, or suppress refutation. That is derive-don't-accept
enforced at a boundary the agent cannot cross — the difference between "expensive to cheat" (local)
and "must compromise a separate service" (hosted).

## Local ↔ API parity
Same `SoloLedger` logic; the API only **relocates** the salt + sealed gold + verifier out-of-process.
Run local for dev/offline (honest, in-reach); point at the API for team/serious evaluation (un-spoofable).
The conformance probe should gain an optional row that proves the API path derives the gate identically.

## Honest residual even with the API
The signing/sealing service is now the trust root — it must be **operated by someone other than the
evaluated agent**. And the deepest residual is unchanged: a fixed held-out pool decays to fully-observed,
so a **continuously-refreshed, family-disjoint held-out stream + a human/CI audit of a sampled clean row
per published headline** remain non-negotiable. The API hardens the mechanism; it does not make cheating
*impossible* — nothing does. See [`honest-lane.md`](honest-lane.md) § *Irreducible residual*.

## Status
**Spec only.** To build: HTTP-wrap `templates/ledger/SoloLedger` (e.g. an action/route), store
`salt` + sealed-gold + the verifier credentials in the service's secrets, gate `/seal` behind an admin
token and the ingest routes behind a per-agent token. No service is running today.
