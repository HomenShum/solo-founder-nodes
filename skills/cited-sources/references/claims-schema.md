# claims.json schema

A JSON array of claim objects. Each pairs an assertion with the **verbatim** source text you
believe supports it. `cite.py` verifies the quote against the document — you never write the
page number or the box yourself.

```jsonc
[
  {
    "id": "c1",                 // optional; auto-assigned (c1, c2, …) if omitted
    "claim": "FY2025 revenue was $4.2M",                       // the assertion being cited
    "quote": "Total revenue for fiscal year 2025 was $4.2 million",  // VERBATIM text from the source
    "page": 1                   // optional 1-based page hint (speeds matching; not required)
  }
]
```

## Field rules
- **`quote` is verbatim, load-bearing.** Copy the exact words from the document — numbers, units, punctuation, capitalization. The verifier searches the document for this text. A paraphrase will not match (it becomes `partial` at best, `unsupported` at worst — which is the honest signal that you don't actually have the source).
- **No `quote` → `unsupported`.** If you can't find supporting text in the document, leave `quote` empty or omit the claim. Never invent a quote to force a citation.
- **`page` is a hint only.** The verifier still searches the whole document; the hint just orders the search.

## What cite.py returns (`citations.json`)
```jsonc
{
  "id": "c1",
  "claim": "FY2025 revenue was $4.2M",
  "quote": "Total revenue for fiscal year 2025 was $4.2 million",
  "status": "supported",        // supported | partial | unsupported
  "match": "verbatim",          // verbatim | normalized | anchor | none
  "page": 1,                    // 1-based, derived from the doc (null if unsupported)
  "bbox_norm": [0.10, 0.18, 0.74, 0.21],   // [x0,y0,x1,y1] as fractions of page size (0..1)
  "bbox_pts": [72.0, 130.4, 533.0, 145.2], // same box in PDF points
  "image": "boxes/c1-p1.png"    // rendered page with the supporting text boxed in red (null if unsupported)
}
```
`bbox_norm` is page-size-independent (the same percentage-based convention used for overlay rendering), so a box found at 150 DPI lines up at any zoom.
