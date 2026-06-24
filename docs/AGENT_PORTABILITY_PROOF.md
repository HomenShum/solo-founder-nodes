# Agent Portability Proof

This file records local receipts for the claim that Solo Founder Nodes can be driven by coding
agents other than Claude Code or Codex. It proves conformance portability only: the agent can ingest
the skill instructions, run the conformance probe, and report the PASS receipt. It does not prove a
fresh-user 3D app build, live UI completion, production deployment, or customer-readiness by itself.

## 2026-06-24 UTC OpenRouter Cheap-Model Run

Setup:

- Host directory: `D:\ai-agent-hosts`
- Target repo: `D:\VSCode Projects\solo-founder-nodes`
- Provider: OpenRouter
- OpenClaw model: `deepseek/deepseek-v4-flash`
- Hermes model: `qwen/qwen3-coder-next`
- Optional free code model: `cohere/north-mini-code:free`
- Optional multimodal UI model: `google/gemini-3.1-flash-lite`
- OpenRouter key source: NodeBench/Convex local env, loaded into process env only
- Command under test: `node skills/solo-founder-nodes/conformance/conformance.mjs --run-smoke`

Receipts:

| Agent | Result | Receipt | Proof artifact | SHA-256 |
|---|---:|---|---|---|
| OpenRouter smoke | PASS | `openrouter-ok` | `D:\ai-agent-hosts\proof\openrouter-smoke.json` | `1AB0D01EE8E5163BB5D3D465F8187D3DACDF304A2D0F489BEEC8737E418FD2EB` |
| OpenClaw | PASS | `169e0c5a8fd79bad` | `D:\ai-agent-hosts\proof\openclaw-conformance.txt` | `C5F2A08ABBA00B238B373B7FE4A312D31A735951F4FE2F50DBF9C386954D9138` |
| Hermes | PASS | `169e0c5a8fd79bad` | `D:\ai-agent-hosts\proof\hermes-conformance.txt` | `F528F174B4D300A13E33B54246DA719D9536998802C054326E528627D0AFE9C8` |
| Model audit smoke | PASS | selected routes | `D:\ai-agent-hosts\proof\openrouter-model-smoke.json` | `28D48F768B28087B5C1AF173E59B2633B1C35F1D52561E82A11708D43C48A5E2` |

Observed outputs:

- OpenClaw returned: `PASS · 17/17 · receipt 169e0c5a8fd79bad`; model `deepseek/deepseek-v4-flash`; resolved workspace `D:\ai-agent-hosts\openclaw-workspace`.
- Hermes returned: `PASS · 17/17 · receipt 169e0c5a8fd79bad`; model `qwen/qwen3-coder-next`; substrate smoke `70 passed, 0 failed`.
- DeepSeek V4 Flash is kept as OpenClaw's cheap paid default; Qwen3 Coder Next is kept as Hermes'
  coding fallback because one Hermes run on DeepSeek returned `15/16`.

Important caveats:

- OpenClaw's JSON includes `replayInvalid: true`; treat this as an agent-run conformance receipt, not
  a replay-sealed transcript.
- These receipts do not cover Trae, Cursor, Windsurf, OpenCode, Kilo Code, or other agents until
  those tools run the same probe and record their own PASS artifacts.
- These receipts do not cover the broader product proof target: fresh-user emulation, video, real UI
  trace, generated 3D assets, provider cost/latency receipts, deployment URL, and comparison scorecard.

## Reproduce

From a PowerShell process with access to the NodeBench/Convex env:

```powershell
. D:\ai-agent-hosts\scripts\Set-AgentEnv.ps1
D:\ai-agent-hosts\scripts\Load-NodeBenchOpenRouterKey.ps1
D:\ai-agent-hosts\scripts\Verify-OpenRouter.ps1
D:\ai-agent-hosts\scripts\Run-OpenClawConformance.ps1
D:\ai-agent-hosts\scripts\Run-HermesConformance.ps1
```

Do not paste or persist the OpenRouter key in repo files. The scripts load it into process env and
write only non-secret receipts.
