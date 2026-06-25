# Image Editing Domain Pack

Ontology:

- source image, mask, subject, background, lighting, shadow, text layer, style reference, generated region, final composite, export

Blocking invariants:

- mask or brush target matches the intended subject,
- requested subject/product shape stays stable when required,
- generated regions match scene lighting and contact shadows,
- unrelated regions remain unchanged unless requested.

Typical gates:

- `docs/proof/mask-boundary-receipt.json`
- `docs/proof/subject-preservation-receipt.json`
- `docs/proof/lighting-shadow-receipt.json`
- `docs/proof/before-after-diff-receipt.json`

User report example:

> The brush crop grabbed the wrong object.

Permanent gate:

`mask-boundary-proof` must fail until before/mask/after/diff evidence shows the selected object only.
