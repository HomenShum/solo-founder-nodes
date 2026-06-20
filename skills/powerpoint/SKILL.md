---
name: powerpoint
description: "Turn messy notes, meeting recaps, research dumps, or a spreadsheet into a real .pptx slide deck WHERE EVERY CLAIM IS TAGGED for provenance (verified / manual / needs_review) and NOTHING is fabricated. Use this skill whenever someone wants to build a deck FROM their own material — 'make slides from my notes', 'turn this call recap into an investor update', 'I met three founders at a conference, build a pitch summary', 'draft a board deck from these numbers'. Especially use it for solo founders / one-person companies who need a presentable deck fast but cannot afford to walk into a meeting with a made-up number. Triggers on: pitch deck, investor update, board deck, sales deck, 'slides from notes', 'deck from research'. This is the honest deck builder: if a fact isn't in the source material, it gets flagged for review instead of invented."
license: MIT
---

# PowerPoint — the honest deck builder

## What this skill is for

Solo founders and one-person companies live in messy notes: call recaps, conference scribbles, research tabs, a half-finished spreadsheet. Turning that into a presentable deck is slow — and the real danger is that a generative tool will *smooth over the gaps with invented numbers*. A made-up funding figure or fabricated metric in an investor deck is worse than a blank.

This skill produces a real `.pptx` from the user's own material, and enforces one rule above all:

> **If a fact is not in the source material, do not invent it. Tag it `needs_review` and surface it for the user to verify.**

Every claim on every slide carries a provenance status. The user leaves with a deck *and* a short "To Verify" list — so they know exactly what is solid and what they must confirm before presenting.

## The provenance model (the heart of the skill)

Classify every factual claim — especially quantitative ones (money, %, dates, metrics, names, titles, relationships) — into exactly one status:

| Status | Meaning | Rule |
|---|---|---|
| `verified` | Directly supported by a source the user supplied (a document, a quote, the content of a URL they pasted). | **Must** record the `source`. Never mark `verified` without one. |
| `manual` | The user asserted it from their own knowledge/notes; no external source, but they own the statement. | Include it, labeled. This is fine — it's their claim to make. |
| `needs_review` | Not present in the material, inferred, uncertain, or a number you would otherwise have to guess. | **Never fabricate a value.** Use a `[TK: ...]` placeholder describing what's missing. |

The cardinal rule, restated because it is the whole point: **you don't have it, you don't make it up — you flag it.** A reviewer trusts the deck *because* it admits what it doesn't know.

## Pipeline

```
deck_plan.json   (structured source of truth — also what OpenUI / integrations read)
   → evidence_pass.py   honesty gate: source-trace + refuse fabrication (run ONCE here)
   → build_html.py      PRIMARY artifact: previewable + comment-editable 16:9 HTML
   → optional export    PDF to share · build_pptx.py for a natively-editable .pptx
```

The structured plan is the source of truth. Because source-tracing and the honesty gate
run once on the plan, the HTML (and any export) inherits only validated facts and cannot
introduce new claims — which is exactly why generating HTML *from the gated plan* is safer
than free-handing slides. The HTML is also the surface for the comment-edit loop.

## Workflow

### 1. Intake — use only what the user gave you
Gather every piece of raw material: pasted notes, attached files, and any URLs whose content the user provided. Do **not** go research the open web to fill gaps unless the user explicitly asks — unsourced web facts become `needs_review`, not silent `verified`. The honesty guarantee depends on a closed input set.

### 2. Extract claims
Pull out every factual assertion. Be most careful with quantitative and named claims (funding stage/amount, revenue, growth %, dates, headcount, people's names and titles, who-knows-whom). These are the claims a reviewer will challenge.

### 3. Tag provenance
Assign each claim a `status` and, for `verified`, a `source` (a short quote or the URL/file it came from). When a slide *needs* a number the material doesn't contain, insert a `needs_review` claim with a `[TK: ...]` placeholder — never a plausible-looking invented figure.

### 4. Build the deck plan
Write a `deck_plan.json` following [references/deck-plan-schema.md](references/deck-plan-schema.md). Read that file for the exact shape, the available slide layouts, and a worked example. Keep it tight — a focused 6–12 slide arc beats a padded one.

### 5. Run the evidence pass (required — this is what makes the skill honest, not cosmetic)
```bash
python scripts/evidence_pass.py deck_plan.json
```
This writes `NEEDS_REVIEW.md`, prints a summary, and **exits non-zero if any claim is marked `verified` without a source** (a fabrication risk) or if a status is invalid. Fix every error before rendering. Treat a clean pass as the gate, not a formality.

### 6. Generate the HTML deck (the primary artifact)
```bash
python scripts/build_html.py deck_plan.json deck/index.html
```
Renders the *validated* plan into ONE self-contained 16:9 HTML file (inline CSS/JS, zero deps). It carries:
- hoverable **source citations** on `verified` claims,
- inline `⚠ needs review` markers on `needs_review` claims,
- an auto-appended **"To verify before presenting"** slide,
- **stable IDs** (`slide-N`, `s{N}c{M}`) on every slide and claim, so a pin/bbox comment can target an exact slice for scoped re-generation (the comment-edit loop).

Open it in a browser (arrow keys to navigate). This is the preview + edit surface. To revise, edit the **deck plan** and re-run the gate + this script — don't hand-edit generated HTML, or provenance and the plan drift apart.

### 7. Export (optional, downstream)
- **PDF** (portable share for email/Slack/Notion): print `deck/index.html` to PDF, or screenshot each slide at 1920×1080 with headless Chromium/Playwright and combine. The HTML's `@media print` rule already lays out one slide per page.
- **Native-editable `.pptx`** (only when the recipient must edit in PowerPoint):
  ```bash
  python scripts/build_pptx.py deck_plan.json deck.pptx   # needs: pip install python-pptx
  ```
  Same plan, same provenance rendering. (`build_pptx.py` is self-contained — no other skills required.)

### 8. QA
Open the HTML and check slide count, order, and that no `[TK: ...]` placeholder reads as a real value (it should render in amber as a `needs_review` marker, which is the honest behavior). For a `.pptx` export, verify with `python -m markitdown deck.pptx` if available. If the richer `pptx` skill is present, you may delegate image-based visual QA to it — an optional enhancement, never a dependency.

### 9. Deliver — close the loop honestly
Hand back `deck/index.html` (plus any export) and `NEEDS_REVIEW.md`. In your summary, state plainly: how many claims are `verified`, how many `manual`, and the exact list of `needs_review` items the user must confirm before presenting. Do not describe the deck as "done" or "ready to send" while `needs_review` items remain — describe it as "ready to review."

## Design

Don't ship boring slides. `build_html.py` applies a tasteful default (dark title/closing slides, light content slides, one accent color, hoverable citations) and you can override colors per deck via the `theme` block in the deck plan — pick a palette that fits the topic rather than defaulting to corporate blue. The HTML-first approach exists *because the agent's frontend skills are the strength here* (this mirrors the `frontend-slides` skill's "self-contained 16:9 HTML, anti-AI-slop" conventions). For richer layouts (charts, image-bleed, grids), extend the generated HTML's CSS or evolve `build_html.py`; if the `frontend-slides` or `pptx` skills are present, you may borrow their style systems — optional, never a dependency.

## What this skill must never do
- Invent a number, date, name, or fact not in the source material.
- Mark a claim `verified` without a recorded source.
- Present a `needs_review` placeholder as if it were confirmed.
- Call the deck "ready to present" while unverified claims remain.

These aren't style preferences — they're the reason a user (and a reviewer) can trust the output, and the reason this skill is worth installing over a generic deck generator.
