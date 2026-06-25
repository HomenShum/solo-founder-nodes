# Video Remix Domain Pack

Ontology:

- source video, transcript, speaker, shot boundary, clip, hook, face track, crop box, caption, safe zone, audio, brand template, export

Blocking invariants:

- clips start and end at semantic boundaries,
- captions align to audio and avoid faces/platform safe zones,
- moving subjects remain intentionally framed across sampled frames,
- loudness, clipping, duration, codec, aspect ratio, and platform target pass.

Typical gates:

- `docs/proof/clip-boundary-receipt.json`
- `docs/proof/caption-safe-zone-receipt.json`
- `docs/proof/reframe-tracking-receipt.json`
- `docs/proof/video-export-spec-receipt.json`

User report example:

> The crop loses the person when they move.

Permanent gate:

`reframe-tracking-proof` must fail until sampled frames keep the subject inside the target crop.
