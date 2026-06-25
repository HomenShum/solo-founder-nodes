# Host Hooks + Fresh-Context Judge

The loop cannot rely on the model remembering where it left off. Host hooks should create a durable
save file and the fresh-context judge should decide whether the agent is allowed to claim completion
from disk state alone.

## Save file contract

Every target repo should converge on these local files:

- `.solo/loop-state.json` - RALPH loop id, current milestone, status, budgets, blockers.
- `.solo/events.jsonl` - normalized `SoloEvent` stream from host hooks and CLI commands.
- `.solo/memory.db` - safe project memory and recall, never held-out gold.
- `.solo/receipts/` - milestone receipts.
- `.solo/direction/` and `.solo/receipts/R/direction-change-receipt.json` - direction-changing
  inspiration classification, decision, impact, and reroute receipt.
- `.solo/ledgers/component-ralph.json` - nested component receipts for compositional products.
- `.solo/ledgers/assembly-coherence.json` - subassembly/interface proof for compositional products.
- `.solo/receipts/R/domain-research-brief.md` - self-research brief that produced the domain pack.
- `.solo/domain/domain-pack.json` - domain ontology, source tiers, professional invariants, proof
  gates, child RALPH targets, negative fixtures, visual checks, and user-reported regression fixtures.
- `.solo/receipts/A/acceptance-bar.json` and `.solo/receipts/A/proof-registry.json` - compiled
  domain proof obligations before Live Build.
- `.solo/operation/operation-ralph.json` - proof that edit/export workflow actions actually work.
- `.solo/prometheus/current-run.json` and `.solo/prometheus/runs/<run>/run.json` - versioned
  engineering loop state, per-version proof gates, comparison, and improvement plans.
- `.solo/proof-verdict.json` - the proof pass/fail boundary.
- `.solo/rework-ledger.md` - what was replaced, why, and what evidence survived.

## P0 host adapters

Use:

```bash
npm run sfn -- hooks install --target pi --project . --dry-run
npm run sfn -- hooks install --target hermes --project . --dry-run
npm run sfn -- hooks install --target openclaw --project . --dry-run
npm run sfn -- hooks install --target trae --mode generic-until-verified --project . --dry-run
```

The installer emits these shared scripts:

- `.solo/bin/sfn-pre-tool-policy.js` records pre-tool events and blocks destructive/publish commands
  until explicitly approved. It also blocks ordinary code writes when direction-changing input is
  present in `.solo/events.jsonl` but no direction-change receipt exists.
- `.solo/bin/sfn-post-tool-receipt.js` records post-tool and receipt events.
- `.solo/bin/sfn-session-idle-judge.js` records idle events and calls `sfn judge current --on-stop`.
- `.solo/bin/sfn-final-answer-guard.js` calls the same judge before final-answer claims.
- `.solo/bin/sfn-inject-loop-context.js` prints dashboard and judge context for a fresh session.
- `.solo/bin/sfn-hook.js` is the generic wrapper entrypoint.
- `.solo/bin/record-event` is the portable event append-only recorder.

## Native where available, generic when not

- Pi/Flue: YAML hook pack under `.pi/hook/hooks.yaml` or `.flue/hook/hooks.yaml`.
- Hermes: `.hermes/hooks.yaml` plus `.hermes/plugins/solo_founder/plugin.py`.
- OpenClaw: `.openclaw/hooks/solo-session-memory/` plus plugin scaffold.
- Trae: rules plus generic wrappers until a native hook surface has its own conformance receipt.

Native hook telemetry is still not proof. It becomes useful only after the host adapter itself has a
conformance receipt and the loop still produces proof artifacts.

## Fresh-context judge

Run:

```bash
npm run sfn -- judge current --project .
npm run sfn -- judge current --project . --on-stop
```

The judge reads only durable evidence: loop state, RALPH required receipts, recent events,
direction-change receipts, system-map/research-brief state, component-ledger status for compositional
outputs, assembly/interface coherence status for composed artifacts, domain-pack proof gates for
professional correctness, acceptance-compiler proof registry status before Live Build, Operation RALPH
status for edit/export workflows, Prometheus version state, and proof-verdict state. It returns:

- `done` only when the whole RALPH loop is complete.
- `needs_research` when discover/research receipts are missing.
- `needs_research` when direction-changing input requires Direction RALPH, Research Governor, and
  Architecture Governor receipts.
- `needs_verification` when proof receipts or `proof-verdict.json` are missing/failing.
- `not_done` when a milestone is locally satisfied but the whole loop has not completed, or when a
  compositional parent `L/P/H` claim is missing Component RALPH proofs, missing Assembly Coherence
  interface proofs, missing a self-researched Domain RALPH pack, missing the Acceptance Compiler proof
  registry, missing Operation RALPH proof for workflow actions, or when an active Prometheus run's
  latest version has not passed.
- `blocked` when there is no loop save file or an explicit blocker exists.

Final-answer hooks should block when `blockClaim: true`. That is how the skill forces a coding agent
to continue discover -> benchmark -> setup -> build -> adapter -> verify -> iterate instead of
ending at a plausible transcript.

For compositional products, run:

```bash
npm run sfn -- component proof --all --project .
npm run sfn -- assembly verify --receipt .solo/ledgers/assembly-coherence.json --base .
npm run sfn -- domain synthesize --goal "<goal>" --project .
npm run sfn -- domain verify --project .
npm run sfn -- acceptance compile --project . --no-files
npm run sfn -- acceptance verify --project . --no-files
npm run sfn -- operation verify --project .
```

The clean rule is: no component proof, no assembly/interface proof, no self-researched domain pack, no
acceptance proof registry, no operation proof, no parent claim.
