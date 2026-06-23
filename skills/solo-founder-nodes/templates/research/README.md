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
```

The validator fails closed for missing sources, stale sources, unsupported major claims, and implementation decisions with no research/eval backing. It warns, but does not fail, when a claim is explicitly labeled as an unsupported assumption or rejected stretch lane.
