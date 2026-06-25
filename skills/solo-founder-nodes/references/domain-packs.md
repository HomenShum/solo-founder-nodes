# Domain RALPH Packs

Generic RALPH proves that the agent followed the loop. A Domain RALPH Pack proves that the
work satisfies the professional invariants of the user intent.

The doctrine:

```text
Generic proof says the agent worked.
Domain proof says the work is actually good.
```

Every domain pack must define:

- ontology: the important entities and relationships for the domain,
- source tiers: which research strata were consulted before the pack was synthesized,
- self-research receipt: the domain brief and research questions that produced the pack,
- invariants: professional rules that separate acceptable work from demo-shaped output,
- proof gates: commands and receipts that prove each invariant,
- child RALPH targets: components, assemblies, operations, and exports that need nested proof,
- negative fixtures: examples that must fail blocker gates,
- visual checks when the domain has visual or temporal output,
- regression fixtures for user-reported failures.

Run:

```bash
npm run sfn -- domain research --goal "<goal>" --project .
npm run sfn -- domain synthesize --goal "<goal>" --project .
npm run sfn -- domain verify --project .
npm run sfn -- acceptance compile --project . --no-files
npm run sfn -- acceptance verify --project . --no-files
```

`domain init` remains a compatibility shortcut, but the required loop is research -> synthesize ->
verify -> acceptance compile. A build that skips the self-research brief or acceptance compiler has no
valid domain claim.

When a user reports a failure, do not only fix the bug. Convert the report into a permanent
gate:

```bash
npm run sfn -- domain classify-report --file user-report.md
npm run sfn -- domain add-regression --file user-report.md --project .
npm run sfn -- domain verify --project .
```

## Required Behavior

The fresh-context judge blocks parent `L/P/H` claims when a domain pack is required but missing
or when a blocker proof gate is not passing. It also blocks `L/P/H` when the acceptance compiler has
not turned the pack into `.solo/receipts/A/acceptance-bar.json` and
`.solo/receipts/A/proof-registry.json`.

Examples:

- 3D assets: assembly/interface coherence, canonical views, export/reopen equivalence, target quality tier.
- Finance NodeAgent: no silent clobber, evidence coverage, entity disambiguation, privacy boundary, live UI proof.
- Video remix: clip boundaries, hook quality, caption safe zones, reframe tracking, audio/export quality.
- Image editing: mask alignment, subject preservation, lighting/shadows, no unintended edits.
- Web app UI: live workflow proof, responsive/accessibility states, design quality.

## Bug-To-Gate Protocol

```text
user report
  -> capture screenshot/trace/export/transcript
  -> classify domain
  -> identify missing invariant
  -> create regression fixture
  -> add or update proof gate
  -> verify
  -> block parent claim until the gate passes
```

The rule:

**No self-researched domain pack, no build. No proof gate registry, no build. Every user-reported
domain failure becomes a permanent proof gate.**
