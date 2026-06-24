# Research Spine

The research spine is the executable version of "research-backed implementation." It prevents a coding
agent from turning a founder's vague domain request into unsupported product claims.

Every major decision must connect these links:

`user need -> inspiration/reference -> research source -> implementation decision -> eval metric -> proof artifact`

## Required artifacts

- `research-spine.json` - machine-readable requirements, sources, implementation decisions, claims, eval metrics, and proof artifacts.
- `proof-manifest.json` - proof-run manifest for a fresh-user or emulated-user session.
- `proof-verdict.json` - final gate result, produced only after required proof artifacts have paths.

The template implementation lives in [`../templates/research/`](../templates/research/). The local CLI
wraps it:

```bash
npm run sfn -- research init --goal "build a 3D model app from pictures" --domain 3d-generation
npm run sfn -- research verify research-spine.json
npm run sfn -- proof init --goal "fresh-user 3D app proof" --domain 3d-generation
npm run sfn -- compare top3d
```

## Gate rules

- A source must be typed as `paper`, `benchmark`, `dataset`, `official-doc`, or `product`, and must
  carry a verified date.
- A major implementation decision must cite at least one research source (`paper`, `benchmark`, or
  `dataset`), at least one practical/inspiration source (`official-doc` or `product`), and at least
  one eval metric.
- A supported major capability or result claim must cite sources and proof artifacts.
- A stale or missing source fails the gate.
- An unsupported stretch claim may remain only when explicitly labeled `unsupported_assumption` or
  `rejected`; it must not be described as a proven capability.

## 3D-agent default

For the screenshot-only 3D-agent app request, the seeded default is:

- v1: first-party reference-media intake, rights/provenance gate, first-principles component
  breakdown/originality delta, single-image/text-to-3D or reconstruction lane, GLB/USDZ export,
  Three.js viewer, deployed URL, object storage, persistence, and real UI proof.
- comparator: Meshy, Tripo, Rodin/Hyper3D, and Luma, scored on asset validity, visual alignment,
  component originality, editability/export, real UI completion, cost/latency, and provenance.
- rights: educational purpose is recorded as context but does not bypass the gate. The agent may
  proceed from protected reference media only by generating an original design from abstracted
  functional/geometric components, or by receiving rights proof.
- stretch: multi-photo COLMAP/3DGS, Depth Anything fallback, CAD-native/AutoCAD workflows, humanoid
  rigging, and motion tracking. These cannot be claimed as done until a separate proof lane passes.

## Relationship to the honest lane

The honest lane protects benchmark scores from answer-keys. The research spine protects product and
architecture claims from unsupported vibes. Both are required: a benchmark score without research can
optimize the wrong target, and research without proof can turn into a polished but untested narrative.
