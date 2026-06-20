#!/usr/bin/env python3
"""Generate a self-contained sample source PDF + claims.json to dogfood cite.py.
Permissive deps only (reportlab, BSD). Run: python make_sample.py  → sample.pdf + claims.json here.
"""
import json
import os
import sys

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
except ImportError:
    print("ERROR: pip install reportlab", file=sys.stderr)
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
TITLE = "Sample Co - FY2025 Financial Summary"
LINES = [
    "Total revenue for fiscal year 2025 was $4.2 million, up 38% year over year.",
    "The company operates two enterprise pilot programs as of Q4 2025.",
    "Cash on hand at year end was $1.1 million.",
    "Headcount grew to 12 full-time employees during the year.",
    "This document is a fictional sample used only to test citation boxing.",
]

c = canvas.Canvas(os.path.join(HERE, "sample.pdf"), pagesize=letter)
width, height = letter
c.setFont("Helvetica-Bold", 18)
c.drawString(72, height - 80, TITLE)
c.setFont("Helvetica", 12)
y = height - 130
for line in LINES:
    c.drawString(72, y, line)
    y -= 28
c.save()

claims = [
    {"id": "c1", "claim": "FY2025 revenue was $4.2M",
     "quote": "Total revenue for fiscal year 2025 was $4.2 million", "page": 1},
    {"id": "c2", "claim": "The company runs two pilots",
     "quote": "operates two enterprise pilot programs", "page": 1},
    {"id": "c3", "claim": "The company was profitable in 2025",
     "quote": "net income was positive in 2025", "page": 1},
]
with open(os.path.join(HERE, "claims.json"), "w", encoding="utf-8") as f:
    json.dump(claims, f, indent=2)

print("wrote sample.pdf and claims.json")
print("c1 = verbatim supported, c2 = substring supported, c3 = NOT in doc (unsupported)")
