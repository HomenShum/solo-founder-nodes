# Acceptance Compiler

The Acceptance Compiler turns a self-researched Domain RALPH Pack into the proof contract that blocks
Live Build claims until the domain's blocker invariants have executable gates.

Doctrine:

```text
No self-researched domain pack, no build.
No proof gate registry, no build.
No domain proof, no domain claim.
```

The compiler is the `A` milestone for domain-specific work:

- read `.solo/domain/domain-pack.json`,
- copy child RALPH targets into the parent acceptance receipt,
- compile proof gates into `.solo/receipts/A/proof-registry.json`,
- require negative fixtures for blocker invariants,
- emit `.solo/receipts/A/acceptance-bar.json`.

Run:

```bash
npm run sfn -- domain synthesize --goal "<goal>" --domain <domain|auto> --project .
npm run sfn -- acceptance compile --project . --no-files
npm run sfn -- judge current --project . --on-stop
```

Use `--no-files` at compile time because the contract is created before the build/proof receipts exist.
Later proof and verify phases must produce the required receipt files and pass the same registry.

The fresh-context judge blocks parent `L/P/H` claims when the acceptance compiler receipt is missing or
incomplete. This prevents agents from jumping from a nice research summary into code without first
stating the proof obligations that would make the domain claim true.
