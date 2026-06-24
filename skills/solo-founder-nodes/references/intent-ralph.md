# Intent RALPH

Solo Founder Agent Builder is not a 3D-only skill. The generic unit is a user intent: any request from
a founder should be decomposed into workstreams/capabilities that each carry a nested `R/A/L/P/H`
receipt before the loop claims the job is complete.

Use this for any domain:

- agent product,
- SaaS workflow,
- dashboard,
- internal automation,
- mobile app,
- marketplace app,
- data pipeline,
- deployment,
- hardware/engineering study, or
- 3D asset workflow.

## Required Loop

For every major workstream:

- `R` - research: cite sources, product references, constraints, and non-claims.
- `A` - alignment: declare dependencies, handoff contracts, user approvals, and external setup gates.
- `L` - live build: specify the artifact/code/UI/API/tool contract to build.
- `P` - proof: name the actual UI/environment/test/trace/verdict evidence that proves it.
- `H` - hardening: label unsupported claims and route verified failures back to the earliest broken
  phase.

Domain-specific adapters add stricter requirements. They do not replace the generic loop.

## CLI

```bash
npm run sfn -- intent ralph-plan --goal "build a hiring operations agent" --domain workflow-ops-agent --out intent-ralph.json
npm run sfn -- intent ralph-verify --receipt intent-ralph.json --base docs/proof
```

Pass `--workstreams <file>` when discover already produced a workstream/component list. Pass
`--completed` only when each evidence file exists.

## Why This Exists

Without this layer, the skill can accidentally overfit to a demonstration domain. The 3D proof run
needed per-part research because a generated shape can be nonsensical. The same problem appears in
other domains:

- a SaaS app can have screens without a user workflow,
- an agent can have tools without recovery contracts,
- a benchmark can have scores without live UI transfer,
- a deployment can have a URL without persistence or observability,
- an engineering study can have a model without hazard and approval receipts.

The generic intent RALPH gate makes the skill ask the same question everywhere: what are the
workstreams, what research supports them, how do they connect, what was built, what proves it, and
what claims are still blocked?

Implementation: [`../templates/intent/intentRalph.ts`](../templates/intent/intentRalph.ts).
