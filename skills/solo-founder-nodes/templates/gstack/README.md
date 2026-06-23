# gstack bridge

This folder makes `garrytan/gstack` usable as a portable operating model inside Solo Founder Nodes.
It does not vendor or require gstack at runtime. The bridge converts the useful gstack idea, a
virtual startup team of specialist reviews, into deterministic role selection, required receipts, and
fail-closed verification.

Use:

```bash
npm run sfn -- gstack registry
npm run sfn -- gstack recommend --phase build --goal "3D agent app" --ui --security
npm run sfn -- gstack recommend --phase verify --goal "fresh-user proof" --ui --deploy --security
```

The output is a JSON plan with:

- selected upstream-inspired roles such as `office-hours`, `plan-eng-review`, `review`, `qa-only`,
  `cso`, `land-and-deploy`, and `canary`
- a phase sequence such as problem framing, plan review, implementation, code review, live QA, release
  verification, and learning receipt
- required receipts each coding agent must leave behind before it can claim progress

The verifier blocks common solo-founder failures:

- UI verification without live browser QA evidence
- deployment claims without release and canary receipts
- security-sensitive changes without a threat-model receipt
- UI builds without a design review before implementation
- high-risk edits without a guard receipt

The upstream project is the inspiration source. This repo owns the portable gate so Codex, Claude Code,
Cursor, Windsurf, OpenCode, or any other coding agent can run the same loop.
