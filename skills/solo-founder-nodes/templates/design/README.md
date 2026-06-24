# Design Skill Bridge

The design bridge is agent-agnostic. It can consume Claude-origin skills, shadcn skills, GSAP skills,
Expo skills, or plain `DESIGN.md` files, but the solo-founder loop treats them as portable design
instructions with explicit runtime metadata.

Use from `templates/`:

```bash
npm run sfn -- design registry
npm run sfn -- design recommend --surface dashboard --stack "Next.js shadcn" --runtime codex
npm run sfn -- design recommend --surface mobile-app --stack "Expo React Native" --runtime codex
npm run sfn -- design recommend --surface marketing-site --style premium --visuals --animation --runtime codex
npm run sfn -- design recommend --surface mobile-app --platform ios --stack SwiftUI --runtime codex
npm run sfn -- design flow --surface 3d-app --category "3D asset generation" --style premium --visuals --animation --shadcn-mcp --runtime codex
npm run sfn -- design flow --surface dashboard --category analytics --stack "Next.js shadcn" --shadcn-mcp --runtime codex
npm run sfn -- design gate --surface 3d-app --skill frontend-design,ui-ux-pro-max,shadcn-ui,premium-frontend-ui,gsap-skills --completed surface-classification,distinctive-direction,industry-fit,component-system,state-matrix,responsive-proof,visual-screenshot-proof,interaction-proof,accessibility-check,anti-generic-review --desktop docs/proof/playwright-results/fresh-founder-flow-chromium/fresh-founder-flow.png --mobile docs/proof/playwright-results/fresh-founder-flow-mobile/fresh-founder-flow.png --brief docs/proof/design-flow.json --contract docs/decisions/implementation-receipts.md --interaction docs/proof/playwright-report/index.html --a11y docs/proof/scorecard.md --primary workspace-console --verdict pass --quality shipping
npm run sfn -- chat-ux plan --goal "3D asset agent workspace" --surface 3d-asset-workspace --category "3D asset generation" --model-compare --deployment
npm run sfn -- chat-ux verify --receipt docs/proof/agent-chat-ux-receipt.json
```

The short recommendation order remains:

`design-brief -> design-skill-selection -> component-contract -> implementation -> browser-verify`

The full transcript flow is stricter:

`surface-classification -> break-default-direction/function-system -> component-registry -> dashboard-information-architecture -> industry-fit-engine -> taste-preset -> motion-plan -> visual-content -> mobile-native-rules -> implementation-proof`

No design skill is allowed to replace product truth, user evidence, app code inspection, or in-app
verification.

`design gate` is the hard UI quality seal. Use it after implementation and browser/device proof. It
fails when the UI is still an internal harness, lacks desktop/mobile screenshots, skips
industry-fit/component-system decisions, omits interaction/a11y proof, or claims a 3D app with a small
framed preview instead of a full-bleed viewer/workspace surface.

`chat-ux plan` / `chat-ux verify` is the hard agent-workspace seal. Use it for every UI-facing agent
app so the chat surface is not just a generic composer: it must expose artifacts, tool/job status,
cost/latency, approvals, analytics, provenance, traces, and memory/taste export. The sources are the
VisualLabs production-line repo and the Harness4Visuals taste-memory repo; the gate consumes them as
portable design/product patterns, not as runtime dependencies.

Selection rules:

- `--style minimalist|industrial-brutalist|all-rounder|premium` picks one taste lane.
- `--visuals` adds Higgsfield-style image/video generation and requires auth/spend/proof gates.
- `--shadcn-mcp` means use registry/MCP lookup, then verify components exist in the project.
- `--platform ios|android|cross-platform|web` selects SwiftUI, Material 3, or Expo lanes when needed.
- `--category <industry>` makes UI UX Pro Max-style palette/font/layout decisions industry-fit before code.
