#!/usr/bin/env python3
"""build_html.py — render a VALIDATED deck_plan.json into a self-contained HTML deck.

Why HTML from a structured plan (not free-form): the deck plan is the source of
truth. Source-tracing + the honesty gate (evidence_pass.py) run once on the plan,
so the HTML inherits only validated facts and cannot introduce new claims. The
HTML is the previewable + comment-editable artifact; pptx/PDF are exports.

Output is ONE self-contained file: inline CSS/JS, zero dependencies, fixed 16:9,
arrow-key navigation. Every slide and every claim carries a STABLE ID
(slide-N / s{N}c{M}) and data-* attributes so a bbox/pin comment can target an
exact slice for scoped re-generation (the Parity / Open-CoDesign comment-edit
flow). Verified claims render a hoverable source citation; needs_review claims
render an amber marker; an auto "To verify" slide is appended.

Usage:
    python build_html.py deck_plan.json deck/index.html
"""

import argparse
import html
import json
import os
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

DEFAULT_THEME = {
    "primary": "B85042",
    "bg_dark": "1E2024",
    "bg_light": "F7F4EF",
    "text_dark": "20232A",
    "text_light": "F7F4EF",
    "accent": "C8772E",
    "warn": "C9892F",
    "muted": "8A8A82",
}


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def source_label(plan, source):
    if not source:
        return ""
    for s in plan.get("sources", []) or []:
        if s.get("id") == source:
            return s.get("label") or s.get("url") or source
    return source


def claim_span(plan, claim, cid):
    """Render one claim as an annotated, comment-targetable span."""
    text = esc(claim.get("text", ""))
    status = claim.get("status", "manual")
    src = source_label(plan, claim.get("source"))
    src_attr = f' data-source="{esc(src)}" title="Source: {esc(src)}"' if src else ""
    marker = ""
    if status == "needs_review":
        marker = '<span class="marker marker--review">⚠ needs review</span>'
    elif status == "manual":
        marker = '<span class="marker marker--manual">your note</span>'
    elif status == "verified" and src:
        marker = f'<sup class="cite" title="Source: {esc(src)}">▣</sup>'
    return (
        f'<span class="claim" id="{cid}" data-claim data-status="{esc(status)}"{src_attr}>'
        f'{text}{marker}</span>'
    )


def render_slide(plan, idx, s):
    layout = s.get("layout", "content")
    sid = f"slide-{idx}"
    parts = [f'<section class="slide slide--{esc(layout)}" id="{sid}" data-slide="{idx}" data-layout="{esc(layout)}">',
             '<div class="stage">']

    if layout == "title":
        parts.append(f'<h1 class="title">{esc(s.get("title",""))}</h1>')
        if s.get("subtitle"):
            parts.append(f'<p class="subtitle">{esc(s["subtitle"])}</p>')

    elif layout == "closing":
        parts.append(f'<h1 class="title">{esc(s.get("title",""))}</h1>')
        if s.get("subtitle"):
            parts.append(f'<p class="subtitle">{esc(s["subtitle"])}</p>')

    elif layout == "stat":
        stat = s.get("stat", {}) or {}
        review = stat.get("status") == "needs_review"
        parts.append(f'<h2 class="heading">{esc(s.get("title",""))}</h2>')
        cls = "stat-value stat-value--review" if review else "stat-value"
        cid = f"s{idx}c1"
        src = source_label(plan, stat.get("source"))
        src_attr = f' data-source="{esc(src)}" title="Source: {esc(src)}"' if src else ""
        parts.append(f'<div class="{cls}" id="{cid}" data-claim data-status="{esc(stat.get("status","manual"))}"{src_attr}>{esc(stat.get("value",""))}</div>')
        parts.append(f'<div class="stat-label">{esc(stat.get("label",""))}</div>')
        if review:
            parts.append('<div class="marker marker--review">⚠ needs review</div>')
        elif stat.get("status") == "verified" and src:
            parts.append(f'<div class="footer">Source: {esc(src)}</div>')

    else:  # content
        parts.append(f'<h2 class="heading">{esc(s.get("title",""))}</h2>')
        parts.append('<ul class="bullets">')
        used_sources = []
        for j, b in enumerate(s.get("bullets", []) or [], start=1):
            parts.append(f'<li>{claim_span(plan, b, f"s{idx}c{j}")}</li>')
            if b.get("status") == "verified":
                lbl = source_label(plan, b.get("source"))
                if lbl:
                    used_sources.append(lbl)
        parts.append('</ul>')
        if used_sources:
            uniq = " · ".join(dict.fromkeys(used_sources))
            parts.append(f'<div class="footer">Sources: {esc(uniq)}</div>')

    parts.append('</div></section>')
    return "\n".join(parts)


def render_to_verify(idx, items):
    parts = [f'<section class="slide slide--review" id="slide-{idx}" data-slide="{idx}" data-layout="to_verify">',
             '<div class="stage">',
             '<h2 class="heading heading--warn">To verify before presenting</h2>']
    if not items:
        parts.append('<p class="ok">Nothing outstanding — every claim is verified or owned by you. ✅</p>')
    else:
        parts.append('<ul class="bullets">')
        for sidx, text in items:
            parts.append(f'<li><span class="marker marker--review">⚠</span> '
                         f'<span class="muted">(slide {sidx})</span> {esc(text)}</li>')
        parts.append('</ul>')
    parts.append('</div></section>')
    return "\n".join(parts)


CSS = """
:root{--primary:#%(primary)s;--bg-dark:#%(bg_dark)s;--bg-light:#%(bg_light)s;
--text-dark:#%(text_dark)s;--text-light:#%(text_light)s;--accent:#%(accent)s;
--warn:#%(warn)s;--muted:#%(muted)s;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%%;background:#0c0d0f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text-dark)}
.slide{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:4vh 4vw}
.slide.active{display:flex}
.stage{width:100%%;max-width:1180px;aspect-ratio:16/9;border-radius:14px;padding:6%% 7%%;
display:flex;flex-direction:column;justify-content:center;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.slide--title .stage,.slide--closing .stage,.slide--review .stage{background:var(--bg-dark);color:var(--text-light)}
.slide--content .stage,.slide--stat .stage{background:var(--bg-light);color:var(--text-dark)}
.title{font-size:clamp(28px,5vw,58px);font-weight:800;line-height:1.05}
.subtitle{margin-top:.6em;font-size:clamp(15px,2.2vw,24px);color:var(--accent)}
.heading{font-size:clamp(22px,3.4vw,38px);font-weight:800;color:var(--primary);margin-bottom:.7em}
.heading--warn{color:var(--warn)}
.bullets{list-style:none}
.bullets li{position:relative;padding-left:1.1em;margin:.55em 0;font-size:clamp(14px,1.9vw,21px);line-height:1.4}
.bullets li::before{content:"•";position:absolute;left:0;color:var(--primary);font-weight:800}
.slide--review .bullets li::before{content:""}
.claim{position:relative}
.claim[data-status="verified"]{cursor:help}
.cite{color:var(--accent);font-size:.7em;margin-left:.25em;cursor:help}
.marker{font-size:.62em;font-weight:700;margin-left:.5em;padding:.12em .5em;border-radius:999px;vertical-align:middle;white-space:nowrap}
.marker--review{color:#fff;background:var(--warn)}
.marker--manual{color:var(--muted);background:transparent;font-style:italic;font-weight:500}
.stat-value{font-size:clamp(48px,11vw,120px);font-weight:800;text-align:center;line-height:1}
.stat-value--review{color:var(--warn)}
.stat-label{text-align:center;color:var(--muted);font-size:clamp(14px,2vw,22px);margin-top:.4em}
.footer{margin-top:auto;padding-top:1.2em;color:var(--muted);font-size:clamp(10px,1.1vw,13px);font-style:italic}
.muted{color:var(--muted)}
.ok{font-size:clamp(16px,2.2vw,24px)}
.hud{position:fixed;bottom:14px;right:18px;color:#777;font-size:13px;font-variant-numeric:tabular-nums;z-index:10}
/* hover citation tooltip for verified/needs_review claims */
.claim[data-source]:hover::after{content:attr(data-source);position:absolute;left:0;top:115%%;
background:#111;color:#eee;font-size:12px;font-style:normal;padding:6px 9px;border-radius:6px;white-space:nowrap;z-index:20;box-shadow:0 6px 18px rgba(0,0,0,.4)}
@media print{
  html,body{background:#fff}
  .hud{display:none}
  .slide{position:relative;display:flex;break-after:page;height:100vh}
}
"""

JS = """
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var i=0, hud=document.getElementById('hud');
  function show(n){i=Math.max(0,Math.min(slides.length-1,n));
    slides.forEach(function(s,k){s.classList.toggle('active',k===i)});
    if(hud)hud.textContent=(i+1)+' / '+slides.length;
    history.replaceState(null,'','#'+(i+1));}
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')show(i+1);
    else if(e.key==='ArrowLeft'||e.key==='PageUp')show(i-1);
    else if(e.key==='Home')show(0);else if(e.key==='End')show(slides.length-1);});
  document.addEventListener('click',function(e){if(e.target.closest('.claim'))return;show(i+1);});
  var start=parseInt((location.hash||'#1').slice(1),10);show(isNaN(start)?0:start-1);
  // expose structured handles for the comment-edit flow
  window.__deck={count:slides.length,go:show};
})();
"""


def main():
    ap = argparse.ArgumentParser(description="Render a validated deck plan to a self-contained HTML deck.")
    ap.add_argument("deck_plan")
    ap.add_argument("out_html")
    args = ap.parse_args()

    with open(args.deck_plan, "r", encoding="utf-8") as f:
        plan = json.load(f)

    theme = dict(DEFAULT_THEME)
    theme.update(plan.get("theme", {}) or {})

    slides_html = []
    review_items = []
    for n, s in enumerate(plan.get("slides", []), start=1):
        slides_html.append(render_slide(plan, n, s))
        for b in s.get("bullets", []) or []:
            if b.get("status") == "needs_review":
                review_items.append((n, b.get("text", "")))
        stat = s.get("stat")
        if isinstance(stat, dict) and stat.get("status") == "needs_review":
            review_items.append((n, f'{stat.get("value","")} — {stat.get("label","")}'.strip(" —")))
    slides_html.append(render_to_verify(len(plan.get("slides", [])) + 1, review_items))

    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(plan.get("title","Deck"))}</title>
<style>{CSS % theme}</style>
</head>
<body>
{''.join(slides_html)}
<div class="hud" id="hud"></div>
<script>{JS}</script>
</body>
</html>
"""

    out_dir = os.path.dirname(os.path.abspath(args.out_html))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out_html, "w", encoding="utf-8") as f:
        f.write(doc)

    print(f"Wrote {args.out_html} — {len(plan.get('slides', [])) + 1} slides "
          f"({len(review_items)} need review). Open in a browser; arrow keys to navigate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
