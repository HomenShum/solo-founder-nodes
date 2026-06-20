# Cited Sources — box the exact source behind every claim

**Prove a claim against its document by pointing at the exact text — and refuse to cite what isn't there.**

A correct number is worthless until you can show *where it came from*. This skill is the source trail: for each claim, you supply the **verbatim quote** you believe backs it, and the skill **verifies that quote actually exists in the document**, then returns the precise locator — and, for PDFs, a page render with the supporting text **boxed in red**. If the quote isn't in the document, the claim is flagged `unsupported`. A paraphrase or a hallucinated citation **cannot pass.**

## Why it matters

On [BankerToolBench](https://arxiv.org/abs/2604.11304) — a benchmark built with 502 investment bankers — the best frontier model had **0% of its outputs rated client-ready**, and a top failure mode was **fabricating figures it couldn't find**. This skill catches exactly that: it makes the model point at real text, or admit it can't.

## Works across the real artifact types

| Format | Precise locator | Dependency |
|---|---|---|
| **PDF** | page + bounding box + **red-boxed page render** | `pdfplumber` + `pypdfium2` + `pillow` |
| **XLSX** | exact cell reference (`Sheet1!B12`) | `openpyxl` |
| **PPTX** | slide # + shape (+ normalized bbox) | `python-pptx` |
| **DOCX** | paragraph / table cell | `python-docx` |

Only the dependency for *your* file type is needed. The honesty gate (verbatim quote must be found) is identical across all four.

**Verified on real data:** run against literal BankerToolBench input files (a real `.pdf` and `.xlsx` from the dataset) and a real 16-page financial PDF — it boxed the genuine content and flagged a fabricated claim every time.

## Quickstart

```bash
pip install pdfplumber pypdfium2 pillow   # (or openpyxl / python-pptx / python-docx for that format)

# 1. (the agent) reads the source and writes claims.json: {id, claim, quote (verbatim), page?}
#    See references/claims-schema.md
# 2. verify + locate (exit 1 if any claim's quote isn't in the document):
python scripts/cite.py --doc source.pdf --claims claims.json --out citations/
```

Outputs: `citations/citations.json` (per-claim status + locator + bbox), `citations/CITATIONS.md` (human report), and `citations/boxes/*.png` (red-boxed pages, PDF).

Try it on the bundled samples:
```bash
python assets/examples/make_sample.py    # generates sample.pdf + claims.json
python scripts/cite.py --doc assets/examples/sample.pdf --claims assets/examples/claims.json --out citations/
# → 2 supported (boxed) · 1 unsupported (the fabricated claim, caught)
python assets/examples/make_samples.py   # generates sample.xlsx/.pptx/.docx + claims_office.json
```

## What it never does
- Emit a page/cell/slide/paragraph it didn't find in the document.
- Mark a claim `supported` on a paraphrase — the verbatim quote must be present.
- Call a set "sourced" while any claim is `unsupported`.

## Evaluate this skill
Run it on your own document + claims, then post a field note about what it caught:
```
Use the "cited-sources" skill: here is a document and a list of claims with the quotes I think support them.
Verify each against the document and tell me which are boxed/located vs. which quotes aren't actually in it.
```

## Requirements
Python 3.8+ and the libraries for your file type (`pdfplumber`+`pypdfium2`+`pillow` for PDF, or `openpyxl` / `python-pptx` / `python-docx`) — all permissively licensed (MIT/BSD/Apache). No network, no backend. Scanned PDFs need a text layer (OCR first).

## License

**MIT** (see `LICENSE`) — free to use, modify, and embed in commercial or closed-source products. Every runtime dependency is permissive too — `pdfplumber` (MIT) · `pypdfium2` (BSD/Apache) · `Pillow` · `openpyxl` / `python-pptx` / `python-docx` (MIT). **No copyleft / AGPL**, so a SaaS backend can build on it without source-disclosure obligations.
