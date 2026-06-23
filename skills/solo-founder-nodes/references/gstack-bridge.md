# gstack bridge

`garrytan/gstack` is useful here as an operating model: a solo builder should not let one coding agent
invent product scope, architecture, design, QA, security, release, and retrospectives from a blank prompt.
The bridge turns that model into portable review lanes that any coding agent can execute.

This repo does not require a Claude Code install or a gstack runtime. The upstream commands are treated
as inspiration sources. Solo Founder Nodes owns the receipts and gates:

- founder/product review: `office-hours`, `plan-ceo-review`, `spec`
- architecture review: `plan-eng-review`, `autoplan`
- design review: `plan-design-review`, `design-review`, `design-consultation`
- developer experience review: `plan-devex-review`, `devex-review`
- code review: `review`, `codex`
- live proof: `qa`, `qa-only`, `browse`
- security review: `cso`
- release proof: `setup-deploy`, `ship`, `land-and-deploy`, `canary`
- learning loop: `investigate`, `retro`, `learn`
- safety boundary: `guard`, `freeze`, `careful`
- docs/eval: `benchmark`, `document-generate`, `document-release`

Use the bridge before making or accepting high-impact work:

```bash
cd skills/solo-founder-nodes/templates
npm run sfn -- gstack registry
npm run sfn -- gstack recommend --phase discover --goal "3D model app from vague screenshots"
npm run sfn -- gstack recommend --phase build --goal "3D model app" --ui --security --risk high
npm run sfn -- gstack recommend --phase verify --goal "fresh-user proof" --ui --deploy --security --devex
```

## Required gates

The verifier blocks these claims:

- `discover` without `office-hours` and `plan-ceo-review`
- `benchmark` without product review and benchmark/rubric review
- `setup`, `build`, or `adapter` without `plan-eng-review`
- UI `build` without `plan-design-review`
- `build` without staff-engineer `review`
- UI `verify` without `design-review` and live `qa` or `qa-only`
- deployed `verify` without `land-and-deploy` and `canary`
- deployment `setup` without `setup-deploy`
- security-boundary work without `cso`
- high-risk work without `guard`

Each selected lane must leave a receipt. Examples:

- CEO receipt: strategy verdict, scope mode, recommended wedge, risks
- engineering receipt: architecture diagram, data flow, edge cases, test matrix
- design receipt: design score, taste decision, component implications, screenshots
- security receipt: threat model, exploit scenarios, risk ratings, mitigations
- QA receipt: browser transcript, screenshots, bugs, regression tests, re-verification proof
- release receipt: CI result, deployment URL, production health check, rollback note
- retro receipt: what shipped, what failed, next improvement, memory updates

## 3D-agent scenario

For the screenshot-only founder request, the bridge should usually produce:

- `discover`: `office-hours`, `plan-ceo-review`, `spec`
- `build --ui --security --risk high`: `plan-eng-review`, `plan-design-review`, `review`, `cso`, `guard`
- `verify --ui --deploy --security --devex`: `design-review`, `devex-review`, `qa-only`, `browse`,
  `cso`, `ship`, `land-and-deploy`, `canary`, `document-release`, `benchmark`, `retro`

That gives the coding agent the missing team functions: product reframing, architecture, design taste,
security, live UI proof, production deployment proof, and learning. It complements the research spine:
research says why an implementation choice is defensible; gstack lanes say which specialist review and
proof receipts must exist before the founder can trust the result.
