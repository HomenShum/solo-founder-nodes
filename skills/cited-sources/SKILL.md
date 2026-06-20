---
name: cited-sources
description: "Prove a claim against its source by BOXING the exact supporting text on the exact page. Use whenever someone needs to cite, verify, or back a statement with a document — 'where did this number come from?', 'show me the source for this', 'cite this against the PDF', 'highlight the exact line that supports this', 'fact-check these claims against the filing/deck/report', 'add evidence boxes'. The honest citation skill: the agent must supply the VERBATIM quote it believes supports each claim; this skill verifies that quote actually exists in the document and returns the page number, a normalized bounding box, and a rendered image with the supporting text boxed. If the quote is NOT in the document, the claim is flagged `unsupported` — a paraphrase or a hallucinated citation cannot pass. This is the source trail that turns 'correct' into 'accepted'."
license: MIT
---

# Cited Sources — box the exact source behind every claim

## What this skill is for

In finance, law, research, and diligence, a correct number is worthless until you can show **where it came from** — the exact page, the exact line of text. A citation you can't point to is not a citation. This skill produces the proof: for each claim, it boxes the supporting text on the source page and hands back a normalized bounding box + a highlighted image. And it is **un-foolable by paraphrase** — because it verifies a *verbatim quote* against the document, not a vibe.

> The cardinal rule: **a citation must point at real text in the real document.** If the quote you supply isn't found verbatim in the source, the claim is `unsupported` — never invent a page or a box.

## The model (the heart of the skill)

For each claim, you (the agent) supply the **exact quote** from the source that supports it. The skill assigns a status:

| Status | Meaning |
|---|---|
| `supported` | The verbatim quote was found in the document → returns page, bounding box(es), and a boxed render. |
| `partial` | A close (whitespace/case-normalized) match was found, but not verbatim → returns the box, flagged for a human to confirm wording. |
| `unsupported` | The quote was **not** found anywhere in the document → no box, flagged. This is how a hallucinated or paraphrased citation gets caught. |

You never hand-write a page number or a box. The skill derives them from the document, or refuses.

## Workflow

### 1. Read the source, find the real quote
Open the document and, for each claim you want to cite, copy the **verbatim** supporting text — the exact words as they appear (numbers, units, punctuation). Do not paraphrase; the verifier matches against the document. If you cannot find supporting text, mark the claim's quote empty — it will surface as `unsupported`, which is the honest outcome.

### 2. Assemble `claims.json`
A list of `{ id, claim, quote, page? }` — see [references/claims-schema.md](references/claims-schema.md). `claim` is the assertion; `quote` is the verbatim source text; `page` (optional, 1-based) hints where to look and speeds matching.

### 3. Run the citation pass (this is what makes it proof, not a guess)
```bash
python scripts/cite.py --doc source.pdf --claims claims.json --out citations/
```
Requires `pdfplumber` + `pypdfium2` + `pillow` for PDF (or `openpyxl` / `python-pptx` / `python-docx` for the office formats). For each claim it searches the document for the verbatim quote, and:
- writes `citations/citations.json` — `{ status, page, bbox_norm, bbox_pts, quote, match }` per claim,
- renders `citations/boxes/<id>-p<page>.png` — the page with the supporting text **boxed in red** (the visual proof),
- writes `citations/CITATIONS.md` — a human report: how many `supported` / `partial` / `unsupported`, with the exact list to fix.

### 4. Read the verdict honestly
Report the counts plainly. For every `unsupported` claim, tell the user the quote was **not found in the document** — either the wording is off (fix the quote and re-run) or the document doesn't actually support the claim (the claim is the problem). Do not present an `unsupported` claim as cited. Do not describe the set as "fully sourced" while any `unsupported` remain.

### 5. Deliver
Hand back the boxed images + `citations.json` + `CITATIONS.md`. The boxed page image is the artifact a reviewer trusts: they can see the exact line, on the exact page, that backs the number.

## Inputs
- **Source:** PDF, Excel (`.xlsx`), PowerPoint (`.pptx`), or Word (`.docx`) — the BankerToolBench artifact types. Each returns its **native precise locator**: PDF → page + bounding box + a red-boxed page render; XLSX → cell reference (`Sheet1!B12`); PPTX → slide # + shape (+ normalized bbox); DOCX → paragraph / table cell. (Only the dependency for your file type is needed — `pdfplumber`+`pypdfium2`+`pillow` / `openpyxl` / `python-pptx` / `python-docx`.) Scanned PDFs need a text layer (OCR first). Visual red-box rendering is PDF-native; office formats give the exact cell/slide/paragraph locator (visual office boxing is an optional add-on where LibreOffice is available).
- **Claims:** `claims.json` (claim + verbatim quote, optional page hint).

## What this skill must never do
- Emit a page number or bounding box that wasn't derived from the document.
- Mark a claim `supported` when the quote was not found verbatim.
- Accept a paraphrase as a citation — the verifier matches the real text or flags it.
- Call a set "sourced" while any claim is `unsupported`.

This is the primitive the rest trust: a deck, a spreadsheet, or a memo can mark a claim `verified` only when `cited-sources` returns a real box for it.
