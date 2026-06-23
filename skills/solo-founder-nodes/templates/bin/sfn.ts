// sfn — Solo Founder Nodes local CLI. Run via:  npm run sfn -- <cmd>
// A thin, shell-only wrapper over the SAME code the smoke proves — no new dependencies, no service.
// It is just a convenience surface; every coding agent can run it because it is a shell command.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SoloLedger } from "../ledger/ledger";
import { inspectGraphContext } from "../context/graphContext";
import { SoloControlPlane } from "../control/controlPlane";

const here = dirname(fileURLToPath(import.meta.url)); // templates/bin
const templates = join(here, "..");                   // templates
const skill = join(templates, "..");                  // skills/solo-founder-nodes
const conformanceMjs = join(skill, "conformance", "conformance.mjs");

const jbig = (_k: string, v: unknown) => (typeof v === "bigint" ? Number(v) : v);
// shell:true only for npm (npm.cmd on Windows); shell:false for node so spaced paths pass as array args.
const sh = (cmd: string, args: string[], cwd: string, shell = false) =>
  spawnSync(cmd, args, { cwd, stdio: "inherit", shell }).status ?? 1;

function flag(args: string[], name: string, fallback?: string) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const HELP = `sfn — Solo Founder Nodes local CLI   (run via: npm run sfn -- <cmd>)

  doctor                      check node + deps readiness
  smoke                       run the substrate proof (expect all assertions to pass)
  conformance                 run the cross-agent portability probe (PASS + receipt)
  context inspect [root]      inspect Graphify-style graph context receipt
  control start --project <p> --goal <g> [--budget <n>] [--root <path>]
  control status <loopId>     print durable loop status/resume summary
  control trigger --source <s> --key <k> --project <p> --goal <g> [--budget <n>]
  seal --salt <s> <id...>     seal a held-out manifest (HMAC) — keep the salt OUT of the agent's reach
  ledger list                 list recorded eval runs
  ledger verify <runId>       re-verify a run's hash-chain (tamper check)

Every command wraps the same code the smoke proves; no new dependencies, shell-only.`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "doctor": {
      const nodeOk = Number(process.versions.node.split(".")[0]) >= 18;
      const deps = existsSync(join(templates, "node_modules"));
      console.log(`node ${process.versions.node} — ${nodeOk ? "ok" : "TOO OLD (need >= 18)"}`);
      console.log(`deps installed: ${deps ? "yes" : "no — run: npm i"}`);
      console.log(`conformance probe present: ${existsSync(conformanceMjs) ? "yes" : "no"}`);
      // Python lane (optional): run/spreadsheetbench.py hard-requires openpyxl + openai; the BTB
      // deliverable writers in run/deliverables.py also need python-pptx (imports as `pptx`),
      // python-docx (imports as `docx`), and reportlab. Probe ALL five so the lane can't report
      // "ok" while 3 of 4 BTB writers silently no-op (they lazy-import and degrade gracefully).
      // Report RED-when-broken instead of silent-green — a missing import is the cold gap that
      // surfaces as a vanished deliverable. WARNING, not a gate: founders on the Node-only
      // smoke/conformance lane shouldn't be blocked by absent Python.
      const pyProbe = ["-c", "import openpyxl, openai, pptx, docx, reportlab"];
      const tryPy = (bin: string) => spawnSync(bin, pyProbe, { stdio: "ignore" });
      let pyRes = tryPy("python3");
      if (pyRes.error) pyRes = tryPy("python"); // python3 not on PATH (common on Windows) → fall back
      if (pyRes.error) {
        console.log("python lane: WARNING — no python3/python on PATH (needed for run/spreadsheetbench.py + run/bankertoolbench.py; install: pip install -r run/requirements.txt)");
      } else if (pyRes.status === 0) {
        console.log("python lane: ok (openpyxl + openai + pptx + docx + reportlab importable)");
      } else {
        console.log("python lane: WARNING — python found but one of {openpyxl, openai, pptx, docx, reportlab} NOT importable; run: pip install -r run/requirements.txt  (BTB writers silently no-op without pptx/docx/reportlab)");
      }
      process.exit(nodeOk && deps ? 0 : 1);
    }
    case "smoke":
      process.exit(sh("npm", ["run", "smoke"], templates, true));
    case "conformance":
      process.exit(sh(process.execPath, [conformanceMjs, ...rest], skill, false));
    case "context": {
      if (rest[0] !== "inspect") {
        console.error("context: inspect [root]");
        process.exit(2);
      }
      const root = rest[1] ?? process.cwd();
      const receipt = inspectGraphContext({ projectRoot: root });
      console.log(JSON.stringify(receipt, jbig, 2));
      process.exit(receipt.status === "ready" ? 0 : 1);
    }
    case "control": {
      const sub = rest[0];
      const control = new SoloControlPlane();
      await control.init();
      if (sub === "start") {
        const projectId = flag(rest, "--project");
        const goal = flag(rest, "--goal");
        const budgetUsd = Number(flag(rest, "--budget", "5"));
        const root = flag(rest, "--root");
        if (!projectId || !goal) {
          console.error("control start --project <p> --goal <g> [--budget <n>] [--root <path>]");
          process.exit(2);
        }
        const context = root ? inspectGraphContext({ projectRoot: root }) : undefined;
        const started = await control.startLoop({ projectId, goal, budgetUsd, context });
        console.log(JSON.stringify(started, jbig, 2));
        process.exit(0);
      }
      if (sub === "status") {
        const loopId = rest[1];
        if (!loopId) {
          console.error("control status <loopId>");
          process.exit(2);
        }
        console.log(JSON.stringify(await control.resumeSummary(loopId), jbig, 2));
        process.exit(0);
      }
      if (sub === "trigger") {
        const source = flag(rest, "--source");
        const idempotencyKey = flag(rest, "--key");
        const projectId = flag(rest, "--project");
        const goal = flag(rest, "--goal");
        const budgetUsd = Number(flag(rest, "--budget", "5"));
        if (!source || !idempotencyKey || !projectId || !goal) {
          console.error("control trigger --source <s> --key <k> --project <p> --goal <g> [--budget <n>]");
          process.exit(2);
        }
        const result = await control.ingestTrigger({ source, idempotencyKey, projectId, goal, budgetUsd });
        console.log(JSON.stringify(result, jbig, 2));
        process.exit(0);
      }
      console.error("control: start | status <loopId> | trigger");
      process.exit(2);
    }
    case "seal": {
      const saltIdx = rest.indexOf("--salt");
      const salt = saltIdx >= 0 ? rest[saltIdx + 1] : process.env.SOLO_LEDGER_SALT;
      const ids = rest.filter((a, i) => !a.startsWith("--") && i !== saltIdx + 1);
      if (!salt) {
        console.error("seal: provide --salt <salt> (or SOLO_LEDGER_SALT). The salt must live OUT of the agent's reach (CI / a secret).");
        process.exit(2);
      }
      if (ids.length === 0) {
        console.error("seal: provide held-out task ids — e.g. sfn seal --salt <s> t1 t2 t3");
        process.exit(2);
      }
      const ledger = new SoloLedger({ salt });
      await ledger.init();
      const hash = await ledger.sealHeldOut(ids);
      console.log(`sealed ${ids.length} held-out task(s) · manifest HMAC ${hash}`);
      process.exit(0);
    }
    case "ledger": {
      const sub = rest[0];
      const ledger = new SoloLedger({ salt: process.env.SOLO_LEDGER_SALT ?? "dev-salt-change-me" });
      await ledger.init();
      if (sub === "list") {
        console.log(JSON.stringify(await ledger.listRuns(), jbig, 2));
        process.exit(0);
      }
      if (sub === "verify") {
        if (!rest[1]) { console.error("ledger verify <runId>"); process.exit(2); }
        const v = await ledger.verifyChain(rest[1]);
        console.log(JSON.stringify(v, jbig));
        process.exit(v.ok ? 0 : 1);
      }
      console.error("ledger: list | verify <runId>");
      process.exit(2);
    }
    default:
      console.log(HELP);
      process.exit(cmd && cmd !== "help" ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
