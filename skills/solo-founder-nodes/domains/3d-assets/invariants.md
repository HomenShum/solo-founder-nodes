# 3D Assets Domain Pack

Ontology:

- source reference, brush/mask, component, subassembly, interface, mesh, material, export, viewer proof

Blocking invariants:

- required parts attach, contain, align, mirror, or support each other,
- canonical front/side/top/three-quarter views expose failures,
- exported OBJ/GLB reopens as the same component graph,
- claim tier is explicit: scaffold, web-ready, game-ready, CAD-ready, or production.

Typical gates:

- `.solo/ledgers/assembly-coherence.json`
- `docs/proof/canonical-views.json`
- `docs/proof/export-reopen.json`
- `docs/proof/asset-quality-receipt.json`

User report example:

> The temple arms are floating.

Permanent gate:

`assembly-coherence` must fail until hinge-to-temple interfaces pass.
