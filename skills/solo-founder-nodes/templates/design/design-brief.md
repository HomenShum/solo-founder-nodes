# Design Brief — &lt;surface name&gt;

> Fill this **before** touching a design tool or writing UI code. The brief is the contract;
> the design output and the implementation follow from it. No "make it pretty" / "redesign the app".

## User job
What real user action this surface supports (one sentence).

## Missing surface
What the app cannot do today / what is broken about the current UI.

## Required components
- &lt;component&gt; — &lt;purpose&gt;
- &lt;component&gt; — &lt;purpose&gt;

## Design system
- tokens (colors, radii, elevation) — name the existing ones, do not invent
- spacing scale
- typography scale
- dark / light mode
- accessibility constraints (contrast, focus order, hit targets, reduced motion)

## Design skills / references
- selected skills: &lt;ids from `npm run sfn -- design recommend ...`&gt;
- runtime: &lt;codex / claude-code / cursor / windsurf / generic-agent&gt;
- style preset: &lt;none / minimalist / industrial-brutalist / premium&gt;
- target platform: &lt;web / ios / android / cross-platform&gt;
- visual-content lane: &lt;none / Higgsfield image / Higgsfield video / product shots&gt;
- how each skill is used: &lt;direction / components / dashboard / animation / mobile&gt;
- portability note: if a source is Claude-labeled, copy only the design guidance into this brief; do not require Claude Code to implement it

## Current UI
- screenshot(s) of the current state: &lt;path&gt;
- the exact code surfaces to change: &lt;files&gt;

## Implementation target
- files to modify
- existing components to reuse (avoid one-off CSS drift)
- data / props needed

## Verification (hand to the browser-verify step)
- screenshot states: &lt;empty / loading / populated / error&gt;
- DOM selectors that must exist
- keyboard path
- mobile breakpoint
- design-token usage (no hardcoded colors)
