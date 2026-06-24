# CLI Command Center

The clean visualization is the CLI command center. Static diagrams can explain the architecture, but
`sfn dashboard` is the operating surface a founder or coding agent should use while the loop is
running.

Binding rule:

> Hooks observe the agent. Receipts prove the work. The CLI makes the whole loop visible.

## What the dashboard shows

`npm run sfn -- dashboard --project <path>` renders:

- active RALPH loop id, goal, status, current milestone, and blockers;
- R/A/L/P/H milestone receipt counts;
- proof verdict state;
- recent normalized events from `.solo/events.jsonl`;
- agent host matrix summary;
- local artifacts such as loop state, event log, memory db, receipts, proof verdict, and rework ledger;
- runtime facts needed to reproduce the local run.

Use `--json` when another tool needs a machine-readable snapshot.

## Universal event bus

Agent hosts normalize native hook output into `SoloEvent` rows in `.solo/events.jsonl`.

Event vocabulary:

```text
session.start
session.stop
phase.start
phase.stop
prompt.submit
tool.pre
tool.post
tool.error
file.read.pre
file.write.pre
file.write.post
command.run.pre
command.run.post
browser.proof.start
browser.proof.stop
receipt.write
memory.write
eval.start
eval.stop
rework.recorded
```

The event bus is observability, not a grader. A `tool.post` or `session.stop` event never proves the
capability shipped. Receipts and proof verdicts decide pass/fail.

## Agent host matrix

Use:

```bash
npm run sfn -- agent matrix
npm run sfn -- agent install-hooks --target codex --project . --dry-run
npm run sfn -- agent collect --project .
```

Hook-native hosts can emit richer telemetry. Generic/no-hooks hosts are still supported, but only as
external proof lanes: browser proof, terminal transcript, fresh-room receipt, and proof verdict.
Generic hosts cannot self-report completion.

The hook installer writes or previews:

- `.solo/bin/record-event`
- `AGENTS.md`
- host-specific hook or rules files such as `.codex/config.toml`, `.codex/hooks.json`,
  `.claude/settings.json`, `.windsurf/hooks.json`, `.devin/rules/...`, and generic rules files.

Host-specific files are adapter templates. After installation, run the host's actual conformance or
proof flow before treating native hook events as complete coverage.

## NodeRoom handoff

Use:

```bash
npm run sfn -- noderoom run-fresh-room --case FR-010 --base-url <url> --headed --record-video --trace on --focus-mode on --model-mode top_paid --budget benchmark_completion
```

This produces a handoff receipt and records an eval event. It is not a pass. The pass requires the
NodeRoom run to export trace/video/fresh-room receipts, reopen generated artifacts, run the official
scorer where applicable, visually verify the recording, and produce a passing proof verdict.

## Failure modes this prevents

- A coding agent claims "done" after a chat transcript but before live UI proof.
- A benchmark score is reported without trace/video/scorer receipts.
- A founder cannot tell which phase is blocked or what command resumes it.
- A no-hooks agent is treated as if its own completion message is proof.
- Memory, rework, and proof artifacts exist but are invisible unless someone opens the filesystem.
