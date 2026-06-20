---
name: solo-founder-nodes
description: >-
  Benchmark-driven development for AI agents — the master directive that turns "I have an idea /
  prototype / half-built app and an agent that demos but doesn't hold up" into "an agent that
  completes real benchmark tasks IN the live app, browser-verified, without cheating." Use when a
  (solo) founder wants to build or validate an AI agent for their app. Triggers: "build the agent
  layer for my app", "benchmark my agent", "prove my agent works in production", "which benchmark
  fits my agent", "make my agent pass SpreadsheetBench/BankerToolBench/SWE-bench in my app", "my
  agent demos but fails on real tasks", "eval my agent honestly", "loop-engineer my agent". The
  user's coding agent (Claude Code, Codex, OpenClaw, Hermes, Trae, …) drives; the user steers by
  comment. Orchestrates the phase nodes.
---

# Solo Founder Nodes — prove your agent works, in your app, without cheating

## What this is
A loop-engineering **directive** for the coding agent the user is already working with. The method
is **benchmark-driven development for agents**: define what *good* looks like (a real benchmark +
rubric) **before** building, then build the agent and the UI/UX to pass it **in the actual app, on
the real UI** — and prove the capability is real, not memorized.

## The one non-negotiable — why this skill exists
A coding agent told to "pass the benchmark" will cheat: hardcode answers, detect-and-template
specific tasks, and report a high score with **zero** real capability. (Observed first-hand: a fleet
drove a benchmark to **0.96** while the true held-out capability was **0.008** — answer-keys, not
ability.) Solo Founder Nodes is the honesty conscience a solo founder can't staff. Every phase obeys:

- **HELD-OUT** — never tune on the tasks you score on. Always keep a held-out split **and** an
  off-distribution generalization slice.
- **NO ANSWER-KEYS** — no per-task detectors, no hardcoded outputs. If a change lifts the *tuned*
  tasks but not *held-out + generalization*, it is overfitting — revert it.
- **IN-APP TRANSFER** — a benchmark score only counts if the **same task run through the real app
  UI** produces the same result (live-browser verified). A harness score is a proxy; the app is the
  product.
- **HONEST PROVENANCE** — every claimed number traces to a recorded run; flag anything unverified.

If these cannot be satisfied, report the honest (low) number. Never the cheated one.

## Who acts, and how the human steers
The user's **coding agent drives** each phase — it deep-dives the codebase, web-searches the domain,
picks the benchmark, defines the rubric, and builds the agent + UI/UX. The **user steers by comment**:
corrections, vision, scope. If the user defers, the agent proceeds on explicit, stated assumptions
and surfaces them for confirmation.

## Permission gates (hard)
Phases that **install heavy infra** (Docker, Harbor, HuggingFace datasets), **spend API money**, or
**mutate the codebase** are **guide → generate → gate**: present the plan, the exact commands, and
the download / API-key links; dry-run where possible; get explicit approval **before** executing.
Never auto-install system software, never push code, never spend on a paid model run without a gate.

## The loop — 8 phases
Each phase is a subskill (upload independently; this directive sequences them).

| # | Phase | Goal | Weight | Gate | Subskill | Artifact |
|---|---|---|---|---|---|---|
| 1 | discover | Deep-dive the prototype/app + web-search the domain → an agent **capability spec**. | light | no | `discover` | `capability-spec.md` |
| 2 | recommend | Pick the benchmark(s) matching the app's functions; define "what good looks like" (the **rubric**). | light | no | `benchmark` | `benchmark-choice.md` |
| 3 | set up for benchmark | Stand up the eval env (Docker/Harbor/HF/verifier) with links + step-by-step. | **heavy** | **yes** | `setup` | running env |
| 4 | build missing pieces | Build the agent + the UI/UX components the app needs to actually do the work. | per-stack | **yes** | `build` | app changes |
| 5 | build adapter | Wire the app's agent to the benchmark harness (the adaptation layer). | medium | **yes** | `adapter` | adapter |
| 6 | run benchmark | Run **tuned + held-out + generalization** slices; record the scorecard. | medium | cost | `iterate` | scorecard |
| 7 | loop | Classify failures → fix the smallest **shared** component → re-measure held-out. Revert tuned-only gains. | medium | no | `iterate` | improved harness |
| 8 | in-app verify | Run the same task through the **live app UI**, browser-verified; confirm the score transfers. | medium | no | `verify` | browser proof |

## Output
A **Solo Founder Nodes scorecard** — tuned / held-out / generalization, each with its honesty state — plus the
**in-app transfer proof** (browser evidence) and a one-line verdict: **real capability or
overfitting.** That verdict, backed by the proof, is what turns "it demos" into "it's accepted."

## Notes for the driving agent
- Phase 2 reads [references/benchmarks.md](references/benchmarks.md) (a starter registry) **and**
  web-searches for newer/closer benchmarks — registries rot; verify currency at use time.
- Phases 6–8 reuse a deterministic, no-LLM grader where possible (correctness · formula-vs-hardcode ·
  citation-resolves · no-fabrication) so iteration is cheap and un-gameable.
- Keep per-stack scaffolding in `build` as templates (start with the stacks you know); a
  universal generator is a non-goal.
