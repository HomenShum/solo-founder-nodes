#!/usr/bin/env python3
"""evidence_pass.py — the honesty gate for the PowerPoint skill.

Reads a deck_plan.json, checks every claim's provenance, and refuses to let a
fabrication through. Specifically it FAILS (exit 1) when a claim is marked
`verified` but carries no source — because a "verified" fact with nothing
backing it is exactly the kind of confident invention this skill exists to stop.

It also writes NEEDS_REVIEW.md: the short, honest list of everything the user
must confirm before presenting. No third-party dependencies — standard library
only, so it runs in any agent with Python.

Usage:
    python evidence_pass.py deck_plan.json [--out NEEDS_REVIEW.md]
"""

import argparse
import json
import os
import re
import sys

# Emit UTF-8 to the console so provenance glyphs render instead of garbling on
# Windows' default code page. Generated files are written UTF-8 regardless.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

VALID_STATUS = {"verified", "manual", "needs_review"}

# Looks like a claim a reviewer would challenge: money, %, multiples, years, counts.
QUANT = re.compile(
    r"(\$\s?\d|\d+\s?%|\b\d[\d,]*\.?\d*\s?(?:k|m|bn|b|x|million|billion)\b|\b(?:19|20)\d{2}\b|\b\d{2,}\b)",
    re.IGNORECASE,
)
TK = re.compile(r"\[TK[:\]]", re.IGNORECASE)


def iter_claims(plan):
    """Yield (slide_index, slide_title, claim_dict) for every claim in the deck."""
    for i, slide in enumerate(plan.get("slides", [])):
        title = slide.get("title", f"(slide {i + 1})")
        for b in slide.get("bullets", []) or []:
            yield i + 1, title, b
        stat = slide.get("stat")
        if isinstance(stat, dict):
            # Normalize a stat into a claim with `text` so checks are uniform.
            text = f"{stat.get('value', '')} — {stat.get('label', '')}".strip(" —")
            merged = dict(stat)
            merged.setdefault("text", text)
            yield i + 1, title, merged


def claim_text(claim):
    if claim.get("text"):
        return claim["text"]
    return f"{claim.get('value', '')} — {claim.get('label', '')}".strip(" —")


def main():
    ap = argparse.ArgumentParser(description="Provenance/honesty gate for a deck plan.")
    ap.add_argument("deck_plan", help="Path to deck_plan.json")
    ap.add_argument("--out", default=None, help="Path for the NEEDS_REVIEW.md report")
    args = ap.parse_args()

    try:
        with open(args.deck_plan, "r", encoding="utf-8") as f:
            plan = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: deck plan not found: {args.deck_plan}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as e:
        print(f"ERROR: deck plan is not valid JSON: {e}", file=sys.stderr)
        return 2

    errors = []
    warnings = []
    needs_review = []
    counts = {"verified": 0, "manual": 0, "needs_review": 0}

    for sidx, stitle, claim in iter_claims(plan):
        text = claim_text(claim)
        status = claim.get("status")
        source = (claim.get("source") or "").strip()
        where = f"slide {sidx} ({stitle!r}): {text!r}"

        if status not in VALID_STATUS:
            errors.append(f"{where} — invalid/missing status {status!r} (use verified|manual|needs_review)")
            continue
        counts[status] += 1

        if status == "verified":
            if not source:
                errors.append(f"{where} — marked 'verified' but has NO source. A verified claim must cite where it came from.")
            elif TK.search(source):
                errors.append(f"{where} — marked 'verified' but its source is a [TK] placeholder. That's not verified yet.")
            if TK.search(text):
                errors.append(f"{where} — marked 'verified' but the text still contains a [TK] placeholder.")

        if status == "needs_review":
            needs_review.append((sidx, stitle, text, source or "(no note on what's missing)"))
            if QUANT.search(text) and not TK.search(text):
                warnings.append(f"{where} — needs_review with a concrete-looking number but no [TK] placeholder; make sure that figure isn't an accidental invention.")

        if status == "manual" and QUANT.search(text):
            warnings.append(f"{where} — a quantitative claim asserted from memory ('manual'). Fine to present, but consider finding a source or downgrading to needs_review.")

    total = sum(counts.values())

    # Write the honest to-verify report.
    out_path = args.out or os.path.join(os.path.dirname(os.path.abspath(args.deck_plan)) or ".", "NEEDS_REVIEW.md")
    lines = ["# To verify before presenting", ""]
    lines.append(f"_Deck: {plan.get('title', '(untitled)')}_  ")
    lines.append(f"_Claims: {counts['verified']} verified · {counts['manual']} manual · {counts['needs_review']} needs review (of {total} total)_")
    lines.append("")
    if needs_review:
        lines.append("These claims are NOT confirmed by your source material. Confirm or correct each before you present:")
        lines.append("")
        for sidx, stitle, text, note in needs_review:
            lines.append(f"- **Slide {sidx} — {stitle}:** {text}")
            lines.append(f"  - _Why flagged:_ {note}")
        lines.append("")
    else:
        lines.append("No `needs_review` claims — every statement is either verified or owned by you as a manual claim. ✅")
        lines.append("")
    if warnings:
        lines.append("## Soft warnings")
        lines.append("")
        for w in warnings:
            lines.append(f"- {w}")
        lines.append("")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Console summary.
    print(f"Evidence pass: {counts['verified']} verified · {counts['manual']} manual · {counts['needs_review']} needs_review (of {total}).")
    print(f"Report written to: {out_path}")
    if warnings:
        print(f"{len(warnings)} soft warning(s) — see report.")
    if errors:
        print(f"\n{len(errors)} BLOCKING error(s) — fix before rendering:", file=sys.stderr)
        for e in errors:
            print(f"  ✗ {e}", file=sys.stderr)
        return 1
    print("No fabrication risks found. Safe to render.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
