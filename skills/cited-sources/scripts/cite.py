#!/usr/bin/env python3
"""cite.py — verify each claim's verbatim quote against a source document and locate it precisely.

Multi-format, native locators (no LibreOffice needed):
  PDF  → page + bounding box + a red-boxed page render   (pdfplumber + pypdfium2 + Pillow)
  XLSX → exact cell reference, e.g. Sheet1!B12           (openpyxl)
  PPTX → slide # + shape + normalized bbox               (python-pptx)
  DOCX → paragraph / table-cell locator                  (python-docx)

The honesty gate is identical across formats: the agent supplies the VERBATIM quote it
believes supports a claim, and this script confirms that quote actually exists in the file.
A quote that isn't found → `unsupported` — a hallucinated or paraphrased citation cannot pass.

Only the dependency for your file type is needed (e.g. `pip install pdfplumber pypdfium2 pillow` for PDF).
Usage: python cite.py --doc source.{pdf,xlsx,pptx,docx} --claims claims.json --out citations/
Exit: 0 if every claim is supported/partial; 1 if any is unsupported; 2 on bad input.
"""

import argparse
import json
import os
import re
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass


def norm_ws(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def anchor_candidates(quote):
    nq = norm_ws(quote)
    cands = []
    m = re.search(r"((?:\S+\s+){0,3}\S*\d[\d,\.%xkmbn]*\S*(?:\s+\S+){0,3})", nq, re.I)
    if m:
        cands.append(m.group(1).strip())
    words = nq.split()
    if len(words) >= 6:
        cands.append(" ".join(words[:8]))
    return [c for c in dict.fromkeys(cands) if len(c) >= 8]


def _need(mod, dep):
    try:
        return __import__(mod)
    except ImportError:
        print(f"ERROR: this file type needs `{dep}`. Run: pip install {dep}", file=sys.stderr)
        sys.exit(2)


# ---------- PDF (page + bbox + red-boxed render) — permissive stack: pdfplumber + pypdfium2 + Pillow ----------
def _pdf_render_box(path, page_index, bbox_pts, out_dir, cid, dpi=150):
    """Render the page (pypdfium2) and draw a red box at bbox_pts (PDF points, top-origin)."""
    import pypdfium2 as pdfium
    from PIL import ImageDraw
    pdf = pdfium.PdfDocument(path)
    try:
        scale = dpi / 72.0
        pil = pdf[page_index].render(scale=scale).to_pil().convert("RGB")
        x0, top, x1, bottom = bbox_pts
        ImageDraw.Draw(pil).rectangle(
            [x0 * scale - 2, top * scale - 2, x1 * scale + 2, bottom * scale + 2],
            outline=(255, 0, 0), width=2)
        rel = os.path.join("boxes", f"{cid}-p{page_index + 1}.png")
        os.makedirs(os.path.join(out_dir, "boxes"), exist_ok=True)
        pil.save(os.path.join(out_dir, rel))
        return rel.replace("\\", "/")
    finally:
        pdf.close()


def locate_pdf(path, quote, page_hint, out_dir, cid):
    pdfplumber = _need("pdfplumber", "pdfplumber")
    nq = norm_ws(quote)
    if not nq:
        return {"status": "unsupported", "match": "none"}
    # verbatim (reading-order) first, then distinctive anchors → partial
    needles = [("verbatim", nq)] + [("anchor", a) for a in anchor_candidates(quote)]
    with pdfplumber.open(path) as pdf:
        n = len(pdf.pages)
        order = ([page_hint - 1] if page_hint and 1 <= page_hint <= n else [])
        order += [i for i in range(n) if i not in order]
        for i in order:
            page = pdf.pages[i]
            words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
            if not words:
                continue
            joined, bounds = "", []  # bounds[k] = (start,end) char range of words[k] in joined
            for w in words:
                if joined:
                    joined += " "
                start = len(joined)
                joined += w["text"]
                bounds.append((start, len(joined)))
            low = joined.lower()
            for kind, needle in needles:
                pos = low.find(needle.lower())
                if pos < 0:
                    continue
                end = pos + len(needle)
                hit = [w for (s, e), w in zip(bounds, words) if not (e <= pos or s >= end)]
                if not hit:
                    continue
                x0 = min(w["x0"] for w in hit); x1 = max(w["x1"] for w in hit)
                top = min(w["top"] for w in hit); bottom = max(w["bottom"] for w in hit)
                pw, ph = float(page.width), float(page.height)
                img_rel = _pdf_render_box(path, i, (x0, top, x1, bottom), out_dir, cid)
                return {"status": "supported" if kind == "verbatim" else "partial", "match": kind,
                        "locator": f"p{i + 1}", "page": i + 1,
                        "bbox_pts": [round(x0, 1), round(top, 1), round(x1, 1), round(bottom, 1)],
                        "bbox_norm": [round(x0 / pw, 4), round(top / ph, 4), round(x1 / pw, 4), round(bottom / ph, 4)],
                        "image": img_rel}
    return {"status": "unsupported", "match": "none"}


# ---------- XLSX (cell reference) ----------
def locate_xlsx(path, quote, *_):
    openpyxl = _need("openpyxl", "openpyxl")
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    nq = norm_ws(quote).lower()
    if not nq:
        return {"status": "unsupported", "match": "none"}
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.value is None:
                    continue
                cv = norm_ws(str(cell.value)).lower()
                if not cv:
                    continue
                if nq == cv or nq in cv:
                    return {"status": "supported", "match": "verbatim" if nq == cv else "substring",
                            "locator": f"{ws.title}!{cell.coordinate}", "sheet": ws.title,
                            "cell": cell.coordinate, "cell_value": str(cell.value)}
    return {"status": "unsupported", "match": "none"}


# ---------- PPTX (slide + shape + bbox) ----------
def locate_pptx(path, quote, *_):
    pptx = _need("pptx", "python-pptx")
    prs = pptx.Presentation(path)
    nq = norm_ws(quote)
    if not nq:
        return {"status": "unsupported", "match": "none"}
    sw, sh = prs.slide_width, prs.slide_height
    for si, slide in enumerate(prs.slides, 1):
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            txt = norm_ws(shape.text_frame.text)
            if nq == txt or nq in txt:
                rec = {"status": "supported", "match": "verbatim" if nq == txt else "substring",
                       "locator": f"slide {si} / {shape.name}", "slide": si, "shape": shape.name}
                if None not in (shape.left, shape.top, shape.width, shape.height) and sw and sh:
                    rec["bbox_norm"] = [round(shape.left / sw, 4), round(shape.top / sh, 4),
                                         round((shape.left + shape.width) / sw, 4),
                                         round((shape.top + shape.height) / sh, 4)]
                return rec
    return {"status": "unsupported", "match": "none"}


# ---------- DOCX (paragraph / table cell) ----------
def locate_docx(path, quote, *_):
    docx = _need("docx", "python-docx")
    d = docx.Document(path)
    nq = norm_ws(quote)
    if not nq:
        return {"status": "unsupported", "match": "none"}
    for pi, p in enumerate(d.paragraphs, 1):
        t = norm_ws(p.text)
        if t and (nq == t or nq in t):
            return {"status": "supported", "match": "verbatim" if nq == t else "substring",
                    "locator": f"paragraph {pi}", "paragraph": pi, "text": p.text[:200]}
    for ti, tbl in enumerate(d.tables, 1):
        for ri, row in enumerate(tbl.rows, 1):
            for ci, cell in enumerate(row.cells, 1):
                t = norm_ws(cell.text)
                if t and (nq == t or nq in t):
                    return {"status": "supported", "match": "substring",
                            "locator": f"table {ti} r{ri}c{ci}", "text": cell.text[:200]}
    return {"status": "unsupported", "match": "none"}


DISPATCH = {".pdf": locate_pdf, ".xlsx": locate_xlsx, ".pptx": locate_pptx, ".docx": locate_docx}


def main():
    ap = argparse.ArgumentParser(description="Locate + box the source behind each claim (multi-format honest citation).")
    ap.add_argument("--doc", required=True)
    ap.add_argument("--claims", required=True)
    ap.add_argument("--out", default="citations")
    args = ap.parse_args()

    ext = os.path.splitext(args.doc)[1].lower()
    locator = DISPATCH.get(ext)
    if not locator:
        print(f"ERROR: unsupported file type '{ext}'. Supported: {', '.join(DISPATCH)}", file=sys.stderr)
        return 2
    try:
        with open(args.claims, "r", encoding="utf-8") as f:
            claims = json.load(f)
        assert isinstance(claims, list)
    except (FileNotFoundError, json.JSONDecodeError, AssertionError) as e:
        print(f"ERROR: claims.json must be a JSON array: {e}", file=sys.stderr)
        return 2

    os.makedirs(args.out, exist_ok=True)
    fmt = ext.lstrip(".")
    results, counts = [], {"supported": 0, "partial": 0, "unsupported": 0}
    for idx, c in enumerate(claims, 1):
        cid = str(c.get("id") or f"c{idx}")
        loc = locator(args.doc, c.get("quote", ""), c.get("page"), args.out, cid)
        rec = {"id": cid, "claim": c.get("claim", ""), "quote": c.get("quote", ""),
               "format": fmt, "status": loc.get("status", "unsupported"), "match": loc.get("match", "none")}
        rec.update({k: v for k, v in loc.items() if k not in ("status", "match")})
        counts[rec["status"]] += 1
        results.append(rec)

    with open(os.path.join(args.out, "citations.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    lines = ["# Citations", "",
             f"_{counts['supported']} supported · {counts['partial']} partial · {counts['unsupported']} unsupported (of {len(results)}) — source: {os.path.basename(args.doc)} ({fmt})_", ""]
    if counts["unsupported"]:
        lines += ["## ⚠ Unsupported — the quote was NOT found in the document", ""]
        for r in results:
            if r["status"] == "unsupported":
                lines += [f"- **{r['id']}** — {r['claim']}",
                          f"  - quote not in document: {r['quote'] or '(no quote supplied)'} — fix the wording or drop the claim."]
        lines.append("")
    lines += ["## Located citations", ""]
    for r in results:
        if r["status"] in ("supported", "partial"):
            where = r.get("locator", "?")
            extra = f" → `{r['image']}`" if r.get("image") else ""
            tag = "" if r["status"] == "supported" else " _(partial — confirm wording)_"
            lines.append(f"- **{r['id']}** ({where}, {r['match']}){tag}: {r['claim']}{extra}")
    with open(os.path.join(args.out, "CITATIONS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"[{fmt}] {counts['supported']} supported · {counts['partial']} partial · {counts['unsupported']} unsupported (of {len(results)}). → {args.out}/")
    if counts["unsupported"]:
        print(f"⚠ {counts['unsupported']} claim(s) have NO source in the document — see CITATIONS.md.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
