# Research Spine

The research spine turns domain research into an executable gate.

Every major agent-building decision should trace:

`user need -> inspiration/reference -> research source -> implementation decision -> eval metric -> proof artifact`

Use the CLI from `templates/`:

```bash
npm run sfn -- research init --goal "build a 3D model app from pictures" --domain 3d-generation
npm run sfn -- research verify research-spine.json
npm run sfn -- proof init --goal "fresh-user 3D app proof" --domain 3d-generation
npm run sfn -- compare top3d
npm run sfn -- 3d make-asset --goal "personal research 3D scaffold" --project-id kestrel-seat --out-dir proof/assets
npm run sfn -- engineering plan --goal "urgent safety-critical redesign from previous models" --risk safety_critical --urgency emergency
npm run sfn -- engineering deconstruct-init --goal "clean-room deconstruct prior model" --project-id kestrel-seat
```

The validator fails closed for missing sources, stale sources, unsupported major claims, and implementation decisions with no research/eval backing. It warns, but does not fail, when a claim is explicitly labeled as an unsupported assumption or rejected stretch lane.

For safety-critical invention requests, the research spine requires the engineering harness: exact
previous models stay in a non-exportable study sandbox, while deployable outputs require hazard
analysis, simulation or bench-test evidence, qualified engineering review, and export eligibility.
