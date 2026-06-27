# System Impact Brief

## Why this exists

Before the agent writes code, it must understand what it is about to touch. The System Impact Brief forces the agent to read the architecture graph, identify affected nodes, and declare what will change.

Without this, the agent invents architecture instead of extending it.

## When it runs

During the **R — Reality** phase, before any code is written.

## Required content

```text
1. Goal statement
2. Repo kind (vite-react-app, nextjs, node-cli, etc.)
3. Current architecture graph hash
4. Affected graph nodes (agents, tools, UI surfaces, databases, APIs)
5. Files inspected (with paths)
6. Existing patterns to reuse
7. Anti-patterns to avoid
8. Research required? (if SDK/agent/hook/MCP/eval/UI change)
```

## Example

```json
{
  "goal": "Build a photo-to-3D visual mock workflow",
  "repoKind": "vite-react-app",
  "currentArchitectureGraphHash": "sha256:...",
  "affectedNodes": ["ui-shell", "agent-runtime", "model-import", "proof-runner"],
  "filesInspected": [
    "src/App.tsx",
    "src/scrollStory/referenceRalph.ts",
    "docs/system-map.graph.json"
  ],
  "existingPatternsToReuse": [
    "right agent chat panel",
    "left inventory rail",
    "center artifact viewer"
  ],
  "antiPatternsToAvoid": [
    "proof console as default UX",
    "one App.tsx god object",
    "provider-specific hardcoding",
    "DOM-only visual QA"
  ]
}
```

## Architecture graph node fields

Each node in `docs/system-map.graph.json` should include system-thinking fields:

```json
{
  "id": "agent-harness",
  "kind": "runtime",
  "summary": "Instructions, tools, routing, subagents, guardrails, traces, evals.",
  "files": ["src/nodeagent/core", "src/nodeagent/tools", "tests/nodeagent"],
  "system_questions": [
    "Should this be a tool, subagent, hook, MCP server, or plain function?",
    "What trace proves it worked?",
    "What downstream UI or database state changes?"
  ],
  "invariants": [
    "Harness changes must include tests or evals.",
    "Tool surfaces must be narrow and typed.",
    "Agent outputs must produce receipts."
  ],
  "failure_modes": [
    "God object orchestrator",
    "Unclear agent responsibility",
    "No trace/eval loop",
    "Sycophantic approval without critique"
  ],
  "research_tracks": ["agent-scaffold", "tests-evals", "sdk"]
}
```

## MCP tools for the graph

The MCP server should stay narrow:

```text
read_architecture_context
find_implementations
upsert_node
add_edge
validate_architecture_map
```

It should **not** become a general shell runner or arbitrary file editor.

## Research Governor as design critic

Research must critique the design, not just cite sources. Every research brief should answer:

```text
1. Does the proposed design violate current SDK guidance?
2. Is there a simpler official pattern?
3. Should this be a hook, MCP server, subagent, tool, queue, or plain function?
4. What trace should prove it worked?
5. What eval catches the likely failure mode?
6. Which architecture graph node changes?
7. Which seductive idea are we rejecting?
```

Good systems thinking includes rejected options, not just chosen ones.
