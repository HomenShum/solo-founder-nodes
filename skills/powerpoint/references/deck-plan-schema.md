# Deck plan schema

The deck plan is a single JSON file. Both `evidence_pass.py` and `build_pptx.py` read it. Keep it the source of truth — render and govern from the same file so they never drift.

## Top-level shape

```json
{
  "title": "CardioNova — Investor Update",
  "subtitle": "Seed diligence summary · prepared June 2026",
  "theme": {
    "primary":    "B85042",
    "bg_dark":    "1E2024",
    "bg_light":   "F7F4EF",
    "text_dark":  "20232A",
    "text_light": "F7F4EF",
    "accent":     "C8772E",
    "warn":       "C9892F"
  },
  "slides": [ ... ],
  "sources": [
    { "id": "s1", "label": "CardioNova website", "url": "https://cardionova.example" },
    { "id": "s2", "label": "Founder call notes 6/18", "url": "" }
  ]
}
```

- `theme` is optional — omit it to use the built-in terracotta/cream default. All colors are 6-digit hex **without** a leading `#`.
- `sources` is an optional registry. A claim's `source` may be free text (a quote) or a `source.id` from this list; the renderer shows whichever it's given.

## Slide objects

Every slide has a `layout`. Supported layouts:

### `title`
Opening slide. Dark background.
```json
{ "layout": "title", "title": "CardioNova", "subtitle": "AI triage for hospitals", "notes": "..." }
```

### `content`
Standard bulleted slide. Light background. Each bullet is a **claim object**.
```json
{
  "layout": "content",
  "title": "Traction",
  "bullets": [
    { "text": "3 hospital pilots signed in Q1", "status": "verified", "source": "s2" },
    { "text": "Possible Series B in progress", "status": "needs_review", "source": "user note: 'Maya said maybe raising' — amount/stage unconfirmed" },
    { "text": "Team of 8, ex-Epic founders", "status": "manual", "source": "" }
  ],
  "notes": "Lead with the pilots — that's the verified proof point."
}
```

### `stat`
A single large callout number. Light background. The `stat` is a claim object with `value` + `label`.
```json
{
  "layout": "stat",
  "title": "Why now",
  "stat": { "value": "[TK: verify ARR]", "label": "Annual recurring revenue", "status": "needs_review", "source": "not in notes" }
}
```

### `closing`
Final call-to-action / contact slide. Dark background.
```json
{ "layout": "closing", "title": "Let's talk", "subtitle": "maya@cardionova.example", "notes": "..." }
```

> You do **not** need to add a "To Verify" slide yourself — `build_pptx.py` appends one automatically from every `needs_review` claim across the deck. Adding your own would duplicate it.

## Claim object

The atomic unit the honesty model operates on. Used for `bullets[]` and `stat`.

| Field | Required | Notes |
|---|---|---|
| `text` | for bullets | The claim as it appears on the slide. |
| `value` / `label` | for `stat` | Big number + its caption. |
| `status` | **yes** | One of `verified`, `manual`, `needs_review`. |
| `source` | required when `status` is `verified` | A short quote, a URL, or a `sources[].id`. Empty string allowed for `manual`/`needs_review`. |

### Status decision guide
- Backed by something the user actually supplied? → `verified` (record the source).
- The user's own assertion, no external backing, but theirs to make? → `manual`.
- Missing, inferred, uncertain, or you'd have to guess a value? → `needs_review` with a `[TK: ...]` placeholder. **Never** invent the value to make it look `verified`.

## Worked example (minimal, valid)

```json
{
  "title": "CardioNova — Investor Update",
  "subtitle": "Seed diligence summary",
  "slides": [
    { "layout": "title", "title": "CardioNova", "subtitle": "AI triage for hospitals" },
    { "layout": "content", "title": "What they do", "bullets": [
      { "text": "Routes ER intake by acuity using vitals + history", "status": "verified", "source": "s1" },
      { "text": "Sells to mid-size hospital systems", "status": "manual", "source": "" }
    ]},
    { "layout": "content", "title": "Traction", "bullets": [
      { "text": "3 hospital pilots signed in Q1", "status": "verified", "source": "Founder call notes 6/18" },
      { "text": "Series B — stage and amount unconfirmed", "status": "needs_review", "source": "user note: 'maybe raising'" }
    ]},
    { "layout": "stat", "title": "Runway", "stat": {
      "value": "[TK: verify months of runway]", "label": "Months of runway", "status": "needs_review", "source": "not in notes" } },
    { "layout": "closing", "title": "Follow up", "subtitle": "Ask Maya about burn + pilots" }
  ],
  "sources": [
    { "id": "s1", "label": "CardioNova website", "url": "https://cardionova.example" }
  ]
}
```

Running `evidence_pass.py` on this passes (every `verified` claim has a source) and emits a `NEEDS_REVIEW.md` listing the Series B stage/amount and the runway figure. `build_pptx.py` renders 5 authored slides + 1 auto "To Verify" slide = 6 slides.
