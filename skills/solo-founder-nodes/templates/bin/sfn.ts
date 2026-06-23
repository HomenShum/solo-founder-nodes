// sfn — Solo Founder Nodes local CLI. Run via:  npm run sfn -- <cmd>
// A thin, shell-only wrapper over the SAME code the smoke proves — no new dependencies, no service.
// It is just a convenience surface; every coding agent can run it because it is a shell command.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SoloLedger } from "../ledger/ledger";

const here = dirname(fileURLToPath(import.meta.url)); // templates/bin
const templates = join(here, "..");                   // templates
const skill = join(templates, "..");                  // skills/solo-founder-nodes
const conformanceMjs = join(skill, "conformance", "conformance.mjs");

const jbig = (_k: string, v: unknown) => (typeof v === "bigint" ? Number(v) : v);
// shell:true only for npm (npm.cmd on Windows); shell:false for node so spaced paths pass as array args.
const sh = (cmd: string, args: string[], cwd: string, shell = false) =>
  spawnSync(cmd, args, { cwd, stdio: "inherit", shell }).status ?? 1;

const HELP = `sfn — Solo Founder Nodes local CLI   (run via: npm run sfn -- <cmd>)

  doctor                      check node + deps readiness
  smoke                       run the substrate proof (expect: 17 passed, 0 failed)
  conformance                 run the cross-agent portability probe (PASS + receipt)
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
      // Python lane (optional): the SpreadsheetBench adapter (run/spreadsheetbench.py) hard-requires
      // openpyxl + openai. Report it RED-when-broken instead of staying silent-green — a missing
      // Python lane is the cold gap that surfaces as ModuleNotFoundError mid-run. WARNING, not a gate:
      // founders on the Node-only smoke/conformance lane shouldn't be blocked by absent Python.
      const pyProbe = ["-c", "import openpyxl, openai"];
      const tryPy = (bin: string) => spawnSync(bin, pyProbe, { stdio: "ignore" });
      let pyRes = tryPy("python3");
      if (pyRes.error) pyRes = tryPy("python"); // python3 not on PATH (common on Windows) → fall back
      if (pyRes.error) {
        console.log("python lane: WARNING — no python3/python on PATH (needed for run/spreadsheetbench.py; install: pip install -r run/requirements.txt)");
      } else if (pyRes.status === 0) {
        console.log("python lane: ok (openpyxl + openai importable)");
      } else {
        console.log("python lane: WARNING — python found but openpyxl/openai NOT importable; run: pip install -r run/requirements.txt");
      }
      process.exit(nodeOk && deps ? 0 : 1);
    }
    case "smoke":
      process.exit(sh("npm", ["run", "smoke"], templates, true));
    case "conformance":
      process.exit(sh(process.execPath, [conformanceMjs, ...rest], skill, false));
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
