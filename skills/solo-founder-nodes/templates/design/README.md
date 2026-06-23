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
```

The strict order remains:

`design-brief -> design-skill-selection -> component-contract -> implementation -> browser-verify`

No design skill is allowed to replace product truth, user evidence, app code inspection, or in-app
verification.

Selection rules:

- `--style minimalist|industrial-brutalist|premium` picks Taste/Premium constraints.
- `--visuals` adds Higgsfield-style image/video generation and requires auth/spend/proof gates.
- `--shadcn-mcp` means use registry/MCP lookup, then verify components exist in the project.
- `--platform ios|android|cross-platform|web` selects SwiftUI, Material 3, or Expo lanes when needed.
