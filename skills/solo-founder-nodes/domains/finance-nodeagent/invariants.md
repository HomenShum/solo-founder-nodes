# Finance NodeAgent Domain Pack

Ontology:

- room, user, agent job, spreadsheet, cell, formula, source capture, evidence fact, proposal, trace step, privacy lane, export

Blocking invariants:

- no silent clobber of human-authored or formula cells,
- material finance claims need source evidence and citation provenance,
- similarly named entities must be disambiguated before enrichment,
- private notes, PII, and uploads cannot leak into public output,
- benchmark claims require live UI execution, trace, video, export, and scorer receipts.

Typical gates:

- `docs/proof/no-clobber-receipt.json`
- `docs/proof/evidence-coverage-receipt.json`
- `docs/proof/entity-disambiguation-receipt.json`
- `docs/proof/privacy-boundary-receipt.json`
- `docs/proof/live-ui-receipt.json`

User report example:

> The agent enriched CardioNova with facts from CardioNova Labs.

Permanent gate:

`entity-disambiguation-proof` must fail until identity agreement and needs-review behavior are proven.
