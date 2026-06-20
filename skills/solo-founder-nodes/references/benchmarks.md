# Benchmark registry (starter set)

The `recommend` phase maps the app's agent functions (from `capability-spec.md`) to the closest
benchmark. **This list rots** — agent benchmarks ship monthly. Always also **web-search for newer
or closer benchmarks** at use time, and confirm the chosen one still exists + its harness runs.
Prefer a benchmark whose *deliverable shape* matches the app's real output (spreadsheet → spreadsheet
benchmark, web UI → browser benchmark), because that is what makes in-app transfer (phase 8) meaningful.

| Benchmark | Tests which agent functions | Deliverable shape | Infra weight | Recommend when the app… |
|---|---|---|---|---|
| **BankerToolBench** (arXiv:2604.11304) | long-horizon IB diligence: multi-data-room tool use, SEC/VDR extraction, multi-tab Excel models, decks, memos | xlsx / pptx / docx / pdf | heavy (Docker + Harbor + HF + Gandalf/Gemini verifier) | …does finance/analyst document generation, diligence, or prospecting |
| **SpreadsheetBench** | real spreadsheet manipulation: formulas, multi-sheet edits, data ops | xlsx | medium | …generates or edits spreadsheets / financial models / data tables |
| **SWE-bench** (+ Verified / Pro) | software engineering: resolve real GitHub issues with a working patch | code patch / PR | medium–heavy (repo envs) | …writes or fixes code (coding-agent products) |
| **WebArena / VisualWebArena / BrowserGym** | web navigation: complete tasks across realistic web UIs | browser actions / end state | heavy (hosted sites / browser env) | …navigates web apps, fills forms, drives a browser UI |
| **GAIA** | general assistant: multi-step reasoning + tool use + retrieval | short answers w/ evidence | light–medium | …is a general assistant / research copilot |
| **τ-bench (tau-bench)** | tool-agent in customer-facing domains (retail/airline): policy-following + tool calls over a conversation | API calls / final state | light–medium | …is a customer-facing tool/support agent |
| **OSWorld** | computer-use: real desktop apps across OS | GUI actions / file state | heavy (VM/desktop env) | …is a computer-use / desktop-automation agent |

## How to choose (the recommend rubric)
1. **Match the deliverable shape first** — the benchmark output should resemble what the app produces,
   or phase-8 in-app transfer won't be meaningful.
2. **Match the function** — the dominant agent capability (document-gen, code, web-nav, tool-use).
3. **Weigh infra vs. value** — heavy benchmarks (BTB, SWE-bench, WebArena, OSWorld) need a gated
   setup phase; if the founder wants a fast first signal, start with the lightest benchmark that still
   matches the deliverable shape, then graduate.
4. **Define "what good looks like"** — extract/author the rubric (correctness, formula-vs-hardcode,
   citation-resolves, no-fabrication) so the loop has an un-gameable target and a held-out split.

## Honesty note
The point of choosing a benchmark is **not** to win it — it's to define a real, external standard the
app's agent must meet *and* to expose overfitting. Always carry a held-out split + an off-distribution
generalization slice (see the Solo Founder Nodes master directive). A benchmark you can only pass by hardcoding is
the wrong benchmark, or it's being used dishonestly.
