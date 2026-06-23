# Autonomous benchmark runner — REFERENCE ADAPTER (shape only)

## Which `--mode` to use

> ⚠️ **CRITICAL HONESTY GATE:** `--mode api` evaluates **the upstream LLM** (e.g. gpt-4.1-mini) inside the harness — **not your agent**. Quoting an api-mode score as your agent's performance is the exact misrepresentation this skill is built to prevent. Use `--mode agent` to evaluate **your** agent against the same harness.

| Mode | What it evaluates | Use when |
|---|---|---|
| `--mode api` | The upstream LLM (via OpenRouter / OpenAI-compatible) inside the harness — requires `OPENAI_API_KEY`. The runner calls a chat model once per test case for a JSON answer-map, then value-fills the answer-position cells. | You're sanity-checking the harness itself, or comparing **models** against the benchmark — **not** when reporting your agent's score. |
| `--mode agent` | **Your agent** — reads attempts from `<attempts-dir>/<id>.json` produced by your coding agent and applies the same value-fill path as `api`, but with no API call. | You're evaluating **the founder's agent** (the skill's primary purpose) on cell-level tasks. |
| `--mode code-exec` | Your agent through a code-execution attempt: the model writes ONE openpyxl Python script per task (`argv[1]=input`, `argv[2]=output`), the harness runs it in an isolated tempdir under `--code-timeout`, and the grader scores the output. Anti-cheat: script must contain `openpyxl` and `argv`. | Sheet-level tasks (new sheets, multi-sheet filters, large-span formulas) where single-shot value-fill is insufficient. |
| `--mode tool-loop` | `code-exec` PLUS a critique-and-retry loop (`--max-loop-iters`, hard cap at 3). Diff of `output.xlsx` vs `input.xlsx` is fed back as structured critique for v2/v3. The grader scores the **FINAL** attempt only — no best-of-N cherry-pick. Honest gate: all iters produced real scripts, no timeouts, no two consecutive scripts identical. | Sheet-level tasks where `code-exec` stalls (e.g. 0 hard / 0.33 soft); honest because the FINAL attempt is graded, not the best one. |

**This is not "what the skill does."** The skill is end-to-end for **your app**: it discovers what
your app does, then **picks or builds the right test for *that* app**. SpreadsheetBench is one
adapter — useful only if your app is spreadsheet-shaped. For any other app the agent should write a
sibling adapter (in-app real-task set, BankerToolBench, SWE-bench, your own held-out set, …) using
this file's *shape*.

What the shape is — the loop's **iterate/verify** phase as runnable code: clone the benchmark from
the autonomy allowlist → **seal a held-out slice** → attempt each held-out task with the **model in
the loop** → grade with the **benchmark's OWN grader** (or your own deterministic grader for an
in-app eval set) → write an **honest headline**. The harness contains no per-task answers; a row
counts only as a clean held-out probe. Mirrors `references/autonomy.md` + `references/honest-lane.md`.

## Reference adapter: SpreadsheetBench (`spreadsheetbench.py`)
Wraps the real benchmark faithfully — it imports SpreadsheetBench's official `evaluation.compare_workbooks`
(OJ-style: a task passes `hard` only if **all** its test cases match at `answer_position`). It does NOT
reimplement or soften the grader.

**Step 0 — install the Python deps (once, before any `--mode` invocation):**
```bash
pip install -r requirements.txt   # openpyxl + openai; see requirements.txt
```
Skip this and `spreadsheetbench.py` fails with `ModuleNotFoundError: openpyxl` (or `openai`)
the moment a task is graded or `--mode api` runs. The local CLI reports the Python lane status so
you find this before a run, not during one — invoke it from the templates root (the `sfn` binary
is **not** on PATH; it's an npm script):

```bash
cd skills/solo-founder-nodes/templates && npm install && npm run sfn -- doctor
```

Or, for a Python-lane preflight without the CLI:

```bash
python -c "import openpyxl, openai, pptx, docx, reportlab" && echo 'python lane ok' || echo 'python lane missing libs — run: pip install -r run/requirements.txt'
```

**Step 1 — invoke the runner** (pick the mode that matches who's running the model):
```bash
# full auto — a dev with a model key gets the whole run unattended:
OPENAI_API_KEY=...  python spreadsheetbench.py --slice 10 --mode api --salt "$SOLO_LEDGER_SALT"

# agent-in-the-loop — the coding agent IS the model (write attempts/<id>.json, then grade):
python spreadsheetbench.py --repo <clone> --slice 3 --mode agent --attempts-dir ./attempts --salt <s>

# inspect held-out tasks so an agent can attempt them:
python spreadsheetbench.py --repo <clone> --slice 3 --dump
```

> **Using OpenRouter** (recommended for cheap open-source models like `z-ai/glm-5.2` or `deepseek/deepseek-v4-pro`)? Set:
>
> ```bash
> export OPENAI_API_KEY=$OPENROUTER_API_KEY
> export OPENAI_BASE_URL=https://openrouter.ai/api/v1
> export SOLO_MODEL=z-ai/glm-5.2     # any OpenRouter slug; the openai SDK calls it transparently
> ```

It clones `RUCKBReasoning/SpreadsheetBench` (scope it via the policy `downloadAllowlist`), extracts the
dataset, seals the slice (HMAC), attempts, grades with the official grader, and prints
`HEADLINE … hard@all = <mean> over n=<n>` plus a `results.json`.

## Proven (this is a real run, not a claim)
A 2-task held-out demo (agent-in-the-loop, sample_data_200, official grader):
- `59196` (cell-level): **hard=1** (all 3 test cases) — genuinely solved.
- `99-24` (sheet-level): **hard=0** — honestly failed (value-fill can't reconstruct multi-sheet filters).
- **Headline: hard@all = 0.5, n=2.** Low n, honest number.

## Honest boundaries
- `--mode agent` value-fill handles **cell-level** tasks; **sheet-level** tasks need the code-exec
  attempt (model writes openpyxl code, run in the repo's `code_exec_docker`) — wire that as the
  api-mode `attempt` for full coverage. The grader is unchanged either way.
- The **referee stays out of the agent's reach**: the seal salt is the founder's/CI's
  (`SOLO_LEDGER_SALT`), and grading uses the benchmark's own code — the agent runs the loop but cannot
  forge the verdict. See `references/autonomy.md`.

## Add another benchmark
Copy this file's shape: `ensure_dataset` (clone from allowlist) · `seal_heldout` · `attempt` (api/agent)
· `grade` (call the benchmark's OWN grader) · honest headline. Same contract, any benchmark — that's how
every dev gets the same full-auto experience.

## Live-browser UI lane — `liveBrowserRoom.ts` (the second adapter shape)

The python adapter above proves the agent passes the **harness**. The TypeScript sibling
[`liveBrowserRoom.ts`](./liveBrowserRoom.ts) proves the agent passes the **live app** — the
in-app transfer non-negotiable from `nodes/7-verify.md`, made executable. A founder runs both
lanes; only the live-browser lane can flip a row's `live_browser_room_passed` ledger bit, and
only `clean && live_browser_room_passed` rows count toward the headline mean.

**Why a second adapter shape?** The python harness can be cheated by a code path that detects
the task id and emits a canned package — the score lights up while the live UI does something
else (or nothing at all, behind a Suspense/SSR blank shell). The live-browser lane drives the
real composer, the real upload button, the real export button, and feeds the EXPORTED bytes
into the benchmark's own official scorer. The two lanes have to agree, on the same task ids,
on the same answers, or the row is non-transferring.

**The 7 steps the adapter executes (per task, in order, with receipts):**
1. `ensureFreshRoom` — launch a brand-new room URL; empty work surface at t=0; one room per task.
2. `importHeldOut` — drive the real upload path with the sealed held-out task artifact.
3. `askAgent` — type the literal task prompt into the real composer (no template wrapper).
4. `waitForArtifact` — wait on a DOM testid + Convex run id (NEVER `sleep(N)` poll).
5. `exportArtifact` — click the real export button; read the bytes from the file the user gets.
6. `gradeWithOfficial` — invoke the benchmark's OWN official scorer on those bytes, unchanged.
7. `writeLedgerRow` — `SoloLedger.recordTask` with `live_browser_room_passed` DERIVED (not
   accepted) from the six receipts.

**Status: shape only.** `liveBrowserRoom.ts` ships signatures, receipt types, and the
honest-lane comment block — **not** a default implementation. Each app writes its own concrete
sibling (`liveBrowserRoom.spreadsheetbench.ts`, `liveBrowserRoom.bankertoolbench.ts`, …)
because the Playwright selectors, Convex schema, and export buttons differ per app, but the
contract is invariant.

**Coverage report.** Adapters also emit a [`../ledger/uiCoverage.ts`](../ledger/uiCoverage.ts)
record per track — `liveBrowserRoomCases`, `allOfficialTasksLiveBrowserVerified`, the
per-deliverable-type breakdown, and a top-level `strictUiCoverageReady` summary flag. **All
deliverable types are required**: if a benchmark spans `xlsx-cell`, `xlsx-sheet`, `chart`,
and `json`, every shape must have at least one passing live-browser row before
`allOfficialTasksLiveBrowserVerified` flips true.

**Dogfood reference.** NodeRoom is implementing this contract for its SpreadsheetBench +
BankerToolBench + multi-user-conflict tracks in `src/eval/officialBenchmarkUiCoverage.ts`
(sibling to `src/eval/officialBenchmarkTaskCoverage.ts`). That file is the worked example —
the skill stays portable, the noderoom file stays in the noderoom repo.
