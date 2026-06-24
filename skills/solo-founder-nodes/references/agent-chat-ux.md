# Agent chat UX gate

Agent chat in this skill is a production workspace, not a generic chatbot panel.

The inspiration patterns are:

- VisualLabs (`https://github.com/HomenShum/AWS-Hackathon`): chat drives one observable production
  line: import/intake -> remix workspace -> tool calls -> image/video/artifact generation -> costs
  and model comparison -> publish/deploy handoff -> analytics -> training export.
- Harness4Visuals (`https://github.com/HomenShum/harness4visuals-etl-followup`): long creative chat
  becomes a provenance-backed learning layer: chat history -> normalize -> preference signals -> taste
  profile -> prompt records -> SLM JSONL -> evaluator.

## Hard gate

For any UI-facing agent app, a passing design-quality receipt is not enough. The build and verify
phases also require an `agent-chat-ux` receipt from `templates/design/agentChatUxGate.ts`.

Run from `templates/`:

```bash
npm run sfn -- chat-ux sources
npm run sfn -- chat-ux plan \
  --goal "3D asset agent workspace from screenshots and reference media" \
  --surface 3d-asset-workspace \
  --category "3D asset generation" \
  --model-compare \
  --deployment
npm run sfn -- chat-ux verify --receipt docs/proof/agent-chat-ux-receipt.json
```

## Required workspace surfaces

- `agent-composer`: the real user input path, not a hidden harness prompt.
- `artifact-rail`: generated assets, previews, exports, and review states.
- `tool-status-timeline`: visible tool calls, async jobs, retries, failures, and recoveries.
- `cost-latency-ledger`: model/provider costs, latency, token usage, and spend boundaries.
- `memory-insights`: preference signals, taste profile, prompt records, and learning export.
- `approval-console`: dry-run/approval-gated publish, deploy, marketplace, or mutation actions.
- `analytics-panel`: results and usage data looped back into the chat workspace.
- `trace-export-panel`: trace/video/proof links the verifier can inspect.

## Required proof

The receipt must include desktop and mobile screenshots, interaction proof, Playwright/browser trace,
DOM test ids for the required surfaces, generated artifacts, cost/latency receipts, memory/taste
export receipts, approval/dry-run receipts, analytics receipts, provenance receipts, and the linked
design-quality receipt.

If the product claim compares providers/models, include a model comparison receipt. If the product
claim includes deployment, marketplace listing, publishing, or customer-facing handoff, include the
publish/deploy handoff receipt.

## Failure modes

Reject the UI if it is only a chat box, hides the job runner, omits artifacts, has no cost/latency
ledger, cannot show provenance, treats memory as raw transcript storage, lacks approval receipts for
mutations, or has no browser proof that the surfaces render in the real app.
