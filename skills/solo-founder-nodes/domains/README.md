# Domain Pack Catalog

These are readable seeds for Domain RALPH. The runnable implementation lives in
`templates/domain-pack/domainJudge.ts`; use
`npm run sfn -- domain research --goal "<goal>" --project .`,
`npm run sfn -- domain synthesize --goal "<goal>" --project .`, and
`npm run sfn -- acceptance compile --project . --no-files` to materialize the self-research brief,
`.solo/domain/domain-pack.json`, and the pre-build proof registry in a target repo. `domain init` is
a compatibility shortcut, not the enforced loop.

Domain packs are not benchmark answer keys. They are professional invariant contracts:

- what entities matter,
- which relationships can fail,
- which proof gates block the parent claim,
- which negative fixtures prove blocker gates catch bad outputs,
- which child RALPH targets must be proven before parent claims,
- which user-reported failures must become regression fixtures.

Start here when a founder prompt enters a known domain:

- `3d-assets/`
- `construction-mockups/`
- `manufacturing-parts/`
- `onboarding-docs/`
- `avatar-vtuber/`
- `film-vfx/`
- `game-assets/`
- `finance-nodeagent/`
- `video-remix/`
- `image-editing/`
