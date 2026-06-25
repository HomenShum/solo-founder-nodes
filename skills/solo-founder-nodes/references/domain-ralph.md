# Domain RALPH

Domain RALPH proves that the artifact is useful for the intended professional workflow, not just
that a generic loop ran.

Hierarchy:

```text
Direction RALPH
  -> Domain RALPH
    -> Component RALPH
      -> Assembly / Interface RALPH
        -> Operation RALPH
          -> Proof Registry
```

Domain RALPH stages:

- R: classify the user's real domain and workflow, run self-research, and synthesize the domain pack.
- A: compile the pack into proof gates, child RALPH targets, negative fixtures, and an acceptance-bar receipt.
- L: build the domain-specific app/editor/viewer/export path only after R and A receipts exist.
- P: run the workflow and validate domain gates.
- H: turn failures and user reports into regression fixtures.

For 3D workflows, do not treat every request as generic asset generation. Classify the first wedge:

- construction mockups,
- manufacturing/product parts,
- onboarding/docs,
- avatar/Vtuber,
- film/VFX,
- game assets.

The recommended first wedge for the screenshot scenario is construction/product mockup editing:
brush a region, change or generate the relevant 3D surface/part, prove before/after, export/reopen,
and explain the artifact.

Run:

```bash
npm run sfn -- domain research --goal "<goal>" --project .
npm run sfn -- domain synthesize --goal "<goal>" --project .
npm run sfn -- acceptance compile --project . --no-files
npm run sfn -- judge current --project . --on-stop
```

Rule: **Generic asset proof is not enough for a domain claim. No self-researched domain pack, no
build. No proof gate registry, no build. No domain proof, no domain claim.**
