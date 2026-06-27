# Preceptor Review

## Why this exists

Don't frame the reviewer only as a "roast" persona. For engineering quality, use **preceptor review**: a senior engineer who teaches, names the failure mode, and requires a cleaner structure.

This matches the goal: AI can build fast, but the system must simulate the mentorship loop a junior engineer gets from a senior engineer.

## Council members

```text
Preceptor Council
  ├── Staff engineer
  │   Checks boundaries, file ownership, maintainability.
  │
  ├── Product engineer
  │   Checks user workflow, UI clarity, product taste.
  │
  ├── Domain expert
  │   Checks whether the artifact is professionally acceptable.
  │
  ├── Security/privacy reviewer
  │   Checks data boundaries, secrets, unsafe actions.
  │
  ├── QA/eval reviewer
  │   Checks proof gates, negative fixtures, anti-shallow QA.
  │
  └── Contrarian
      Checks sycophancy, overclaiming, unnecessary complexity.
```

## When it runs

- **Before Live Build** — reviews the plan, not just the output
- **Before final pass** — reviews the completed work

## Required output

```text
.solo/reviews/preceptor-review.md
.solo/reviews/preceptor-review.json
```

Schema: [`templates/reviews/preceptor-review.schema.json`](../templates/reviews/preceptor-review.schema.json)

## Review must include

```text
approved direction
required simplifications
architecture risks
bad abstraction risks
files that look like god objects
missing tests/evals
rejected options
```

## The Hanselman principle

Scott Hanselman's point maps cleanly: AI does not remove engineering craft; it increases the need for SDLC, mentorship, fundamentals, and verification.

> **The model writes code. The harness forces architecture, research, proof, and maintainability.**

The preceptor review is how the harness simulates mentorship. It is not a rubber stamp. If the review finds god objects, bad abstractions, or missing tests, the agent must fix them before claiming completion.
