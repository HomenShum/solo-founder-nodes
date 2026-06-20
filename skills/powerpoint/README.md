# PowerPoint — the honest deck builder

**Turn your messy notes into a real `.pptx` — without inventing a single number.**

Most AI deck tools will happily fill the gaps in your notes with a plausible-looking funding figure, growth rate, or date. For a solo founder walking into an investor meeting, a fabricated number is worse than a blank slide. This skill is the opposite: it builds the deck from *your* material and **flags every fact it can't back up** instead of making one up.

## The OPC scenario

You're a one-person company. You met three people at a mixer, took scribbled notes, skimmed two websites. Now you need an investor update or a follow-up deck — fast. You don't have time to format slides, and you *can't* afford to present a number you can't defend.

Paste your notes. Get back:
1. a clean `.pptx`, and
2. a short **"To Verify Before Presenting"** list of everything that wasn't actually in your source material.

## How it stays honest

Every claim on every slide is tagged with exactly one provenance status:

| Status | Meaning |
|---|---|
| **verified** | Backed by a source you supplied. Renders with a small source footer. |
| **manual** | Your own assertion, no external source. Renders with a quiet "(your note)". |
| **needs_review** | Not in your material — flagged with `⚠ needs review`, never invented. Missing numbers show as `[TK: ...]`, never a fake figure. |

A built-in gate (`evidence_pass.py`) **refuses to render** if any claim is marked "verified" without a source — so a confident fabrication can't slip through. The deck also gets an auto-generated closing slide listing everything you still need to confirm.

## Quickstart

```bash
# 1. (the agent) drafts deck_plan.json from your notes — the STRUCTURED source of truth.
#    See references/deck-plan-schema.md
# 2. honesty gate — fails (exit 1) if anything is fabricated:
python scripts/evidence_pass.py deck_plan.json
# 3. generate the HTML deck (no dependencies) — open deck/index.html in a browser:
python scripts/build_html.py deck_plan.json deck/index.html
# 4. (optional) native-editable .pptx export:
pip install python-pptx
python scripts/build_pptx.py deck_plan.json deck.pptx
```

Why structured-plan-first → HTML: source-tracing and the gate run **once on the plan**, so the HTML inherits only validated facts and can't hallucinate new claims. The HTML is also the preview + comment-edit surface (every slide/claim has a stable id for pinned, scoped edits).

Try it on a bundled example — a real founder-notes run:

```bash
# Loomwork: messy demo-day notes → honest investor update
python scripts/evidence_pass.py assets/examples/loomwork/deck_plan.json                                   # → 1 verified · 4 manual · 4 needs_review
python scripts/build_html.py    assets/examples/loomwork/deck_plan.json assets/examples/loomwork/deck/index.html   # → 8-slide HTML deck
```

**What it caught:** the founder's *"we can cut idle labor ~20%"* renders as a **projection, not a measured result** (`needs_review`) — not laundered into a headline stat — and the missing seed amount, ARR, and runway land on a "To verify before presenting" slide. Raw input: `assets/examples/loomwork/notes.md`. (A second example, `assets/examples/deck_plan.json` (CardioNova), and a deliberate fabrication fixture, `assets/examples/bad_deck_plan.json`, which the gate **blocks** with exit 1, are also bundled.)

## Why install this over a generic deck generator

Because you can hand the output to someone who will challenge it. The deck tells you what's solid and what isn't — so you present the verified parts with confidence and verify the rest first. That's the difference between a demo and a tool you'd put your name on.

## Requirements

- Python 3.8+ — the honesty gate and HTML generation use the **standard library only**
- Optional: `python-pptx` (`pip install python-pptx`) for native-editable `.pptx` export
- Optional: a headless browser (e.g. Playwright) for PDF export
- No network calls, no backend, no other skills required. Runs fully offline in any agent with Python.

## Evaluate this skill

Run it on your *own* messy notes, then post a field note about what it caught. Copy-paste prompt for your agent:

```
Install and use the "powerpoint" skill on my real notes below. Draft a deck plan,
run the evidence gate, render the .pptx, and then tell me: how many claims came out
verified vs. manual vs. needs_review, and what specifically I need to verify before
I present this. Notes:
<paste your messy notes here>
```
