# Idea Tweaks

Founder requests are rarely frozen. Screenshots, texts, competitor links, sponsor constraints, roadmap
bullets, and "also..." comments are normal input. Treat them as structured deltas, not as vibes and not
as permission to silently widen scope.

Use Idea Tweaks whenever the user adds materially new information after the loop has started:

- new source/input workflows such as brush crop, upload, video, voice, or camera,
- storage, inventory, deployment, provider, or cost preferences,
- design references such as Spline, Framer, Lovart, Bruno Simon, or a competitor UI,
- rights, safety, commercial, physical-use, or personal-research boundaries,
- new benchmark/proof expectations,
- roadmap bullets that change the product workflow.

## Commands

```bash
npm run sfn -- tweak intake --goal "build a 3D asset app" --domain 3d-generation --input new-founder-notes.txt --out idea-tweaks.json
npm run sfn -- tweak verify --receipt idea-tweaks.json
```

`--input` accepts either raw text or a file path. The output names:

- the extracted deltas,
- the earliest phase to revisit,
- affected phases,
- required receipts,
- proof obligations,
- whether Intent RALPH, Component RALPH, design flow, setup matrix, agent chat UX, docs, and live proof
  must be updated,
- unsupported claims that remain blocked.

## Doctrine

```text
When new founder context arrives:
  parse it into Idea Tweaks
  verify the tweak receipt
  reroute to the earliest affected phase
  update the relevant RALPH receipts and proof artifacts
  rerun the fresh-context judge before claiming done
```

No silent scope creep. Every tweak is either implemented with proof, explicitly deferred, or blocked
with a receipt-backed reason.

## Relationship To Other Loops

Idea Tweaks do not replace Intent RALPH or Component RALPH. They decide what needs to be revisited.

- Intent RALPH answers: what user workstreams exist?
- Component RALPH answers: which production-critical parts must be proven?
- Phase RALPH answers: which phase is broken or incomplete?
- Idea Tweaks answer: what changed since the last receipt, and which proof obligations did that create?

Implementation: [`../templates/tweaks/ideaTweak.ts`](../templates/tweaks/ideaTweak.ts).
