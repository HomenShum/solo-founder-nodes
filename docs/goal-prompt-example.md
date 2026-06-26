# /goal Prompt Example

Use this as the one prompt you paste into a /goal Cup style event. Replace the goal section with your actual target. This version is intentionally self-contained and event-ready.

```text
/goal

Fetch and follow the Solo Founder Agent Builder from:

https://github.com/HomenShum/solo-founder-agent-builder

Use:
skills/solo-founder-nodes/SKILL.md
then:
skills/solo-founder-nodes/MASTER_SKILL.md

Work inside THIS repository.

GOAL:
Build a proof-backed autonomous agent product feature that can be run, inspected, and verified through the real application UI. Choose the strongest feasible wedge for this repository after inspecting it. The result should be useful to a real user, not just a demo. If the repo already contains an app, improve the app and its agent workflow. If the repo is empty or scaffolded, build the smallest complete product surface that proves the agent loop.

This is a one-prompt autonomous run for a /goal Cup style event. I will not provide follow-up instructions after submitting this message.

Do not wait for clarification. Make safe reversible assumptions, record them, and continue.

AUTONOMY ENVELOPE

You are authorized to:
- inspect and modify this repository;
- install ordinary local development dependencies;
- create local branches and isolated worktrees;
- run local servers, browsers, tests, benchmarks, and evaluators;
- use existing configured credentials without displaying them;
- choose free/local providers or existing approved providers;
- research current official documentation, examples, benchmarks, papers, and relevant product references;
- spawn bounded subagents for research, implementation, verification, security, product critique, visual review, and repair;
- retry and repair failed work autonomously;
- commit completed local work.

You are not authorized to:
- delete user data or unrelated files;
- publish publicly or merge to production without an existing explicit policy;
- incur new paid spend beyond the configured budget;
- purchase services;
- expose secrets;
- weaken security, privacy, held-out, or proof requirements;
- hardcode benchmark answers.

PROCESS REQUIREMENTS

1. Inspect the repo and summarize the current state.
2. Initialize durable RALPH state.
3. Identify:
   - target user;
   - workflow;
   - domain;
   - product surface;
   - agent task;
   - proof path.
4. Generate a domain pack:
   - ontology;
   - professional invariants;
   - proof gates;
   - negative fixtures.
5. If the goal or repo references an existing product, tutorial, UI style, SDK pattern, or inspiration, generate a Reference RALPH pack before implementation.
6. Run a critique council:
   - contrarian;
   - buyer;
   - product/taste reviewer;
   - security/privacy reviewer;
   - maintainability reviewer;
   - domain professional.
7. Compile acceptance criteria into executable proof gates.
8. Build both:
   - the app/user-facing workflow;
   - the agent/harness/tool/context layer needed to perform the workflow.
9. Run the real workflow in a browser.
10. Capture:
   - screenshots;
   - video;
   - trace;
   - exported artifacts;
   - reopened artifacts when applicable;
   - scorer/verifier results when applicable;
   - cost, latency, model, and tool-call telemetry.
11. If anything fails:
   - capture the failure evidence;
   - classify the root cause;
   - patch the smallest systemic layer;
   - add a regression fixture;
   - re-run the same user path;
   - preserve first-attempt failures as reliability evidence.
12. Run a fresh-context completion judge.
13. Return PASS only if the proof verdict passes.

ANTI-SHALLOW QA POLICY

You may not claim QA passed from unit tests, DOM inspection, or successful commands alone.

For every changed user-facing feature:
- run the real user path in a browser;
- capture screenshot or video;
- check console errors;
- verify pixels, not only DOM;
- verify domain invariants;
- verify reload/reopen/export where applicable;
- create before/after evidence for UX fixes;
- save receipts.

If the DOM looks right but the screenshot looks confusing, QA failed.
If the output exists but cannot be reopened or professionally used, QA failed.
If the agent says done but proof receipts are missing, the task is not done.

PREFERRED OUTPUT

Create:
- .solo/GOAL_RESULT.md
- .solo/goal-result.json
- .solo/proof-verdict.json
- docs/proof or docs/eval receipts where appropriate
- screenshots/video/trace artifacts where appropriate

FINAL RESPONSE FORMAT

Return:

GOAL RESULT

Verdict:
PASS / PARTIAL / BLOCKED

Original goal:
<repeat goal>

What was built:
<concise summary>

How to run:
<command or URL>

Proof:
- screenshots:
- video:
- trace:
- exported artifacts:
- reopened artifacts:
- scorer/verifier:
- visual judge:

Tests:
<commands and results>

Model / cost / runtime:
<model, token usage if known, cost if known, wall-clock time, tool calls>

Commit:
<sha if committed>

Known limitations:
<honest limitations>

Next action:
<only if PARTIAL or BLOCKED>

Do not say "done" if the proof is not done.
```

## Concrete goal suggestions

### Visual / product showcase

```text
Build a proof-backed one-prompt agent workflow that turns a product/reference image plus a business goal into an interactive ScrollStory landing page, with Reference RALPH, domain proof, browser screenshots, mobile screenshot, scroll-state proof, and a final GOAL_RESULT.
```

### NodeRoom dogfood QA

```text
Build a proof-backed NodeRoom dogfood QA agent that opens a fresh room, identifies one real UX failure, fixes the smallest surface, re-runs the same user path, and returns before/after screenshot receipts.
```
