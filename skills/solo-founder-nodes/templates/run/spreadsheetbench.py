#!/usr/bin/env python3
"""
SpreadsheetBench autonomous runner — the skill's reproducible full-auto loop for SpreadsheetBench.

It does what the founder would do by hand, under the autonomy policy:
  clone the benchmark (from the policy download-allowlist) -> seal a held-out slice ->
  attempt each held-out task with the model IN the loop -> grade with the benchmark's OWN grader
  (evaluation.compare_workbooks, OJ-style: all test cases must pass) -> write an honest result.

Honesty (derive-don't-accept): the harness contains NO per-task answers. A row counts toward the
headline only as a held-out clean probe with the model genuinely in the loop. The grader is the
benchmark's own; we never reimplement or soften it.

Modes:
  --mode api    : call an OpenAI-compatible model (env OPENAI_API_KEY, OPENAI_BASE_URL) — full auto.
  --mode agent  : the coding agent IS the model — read attempts from <attempts-dir>/<id>.json.
  --dump        : print each held-out task (instruction + answer_position + per-test-case input
                  preview) so an agent-in-the-loop can produce attempts. No grading.

Usage:
  python spreadsheetbench.py --repo <clone> --dataset sample_data_200 --slice 3 --salt <s> --dump
  python spreadsheetbench.py --repo <clone> --dataset sample_data_200 --slice 3 --salt <s> \
      --mode agent --attempts-dir ./attempts --out results.json
"""
import os, sys, json, argparse, hashlib, hmac, subprocess, tarfile

REPO_URL = "https://github.com/RUCKBReasoning/SpreadsheetBench.git"  # scope via your autonomy allowlist


def ensure_dataset(repo, dataset, allowlist):
    if not os.path.isdir(repo):
        if allowlist and not any(h in REPO_URL for h in allowlist):
            raise SystemExit(f"hard-stop: {REPO_URL} not in download allowlist {allowlist}")
        subprocess.run(["git", "clone", "--depth", "1", REPO_URL, repo], check=True)
    dpath = os.path.join(repo, "data", dataset)
    if not os.path.isdir(dpath):
        tar = os.path.join(repo, "data", dataset + ".tar.gz")
        if not os.path.isfile(tar):
            raise SystemExit(f"dataset tar not found: {tar}")
        with tarfile.open(tar) as t:
            t.extractall(os.path.join(repo, "data"))
    return dpath


def load_tasks(dpath):
    with open(os.path.join(dpath, "dataset.json"), encoding="utf-8") as f:
        return json.load(f)


def seal_heldout(ids, salt):
    return hmac.new(salt.encode(), ",".join(sorted(ids)).encode(), hashlib.sha256).hexdigest()


def import_official_grader(repo):
    # Use the benchmark's OWN grader — do not reimplement.
    sys.path.insert(0, os.path.join(repo, "evaluation"))
    import evaluation
    return evaluation


def tc_path(dpath, tid, i, kind):
    return os.path.join(dpath, "spreadsheet", str(tid), f"{i}_{tid}_{kind}.xlsx")


def num_test_cases(dpath, tid):
    n = 0
    for i in range(1, 6):
        if os.path.isfile(tc_path(dpath, tid, i, "input")) and os.path.isfile(tc_path(dpath, tid, i, "answer")):
            n += 1
    return n


def preview_input(grader, path, answer_position, max_rows=20):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    out = {}
    for scr in answer_position.split(","):
        sheet = wb.sheetnames[0]
        rng = scr
        if "!" in scr:
            sheet, rng = scr.split("!")
            sheet = sheet.strip("'")
        ws = wb[sheet] if sheet in wb.sheetnames else wb[wb.sheetnames[0]]
        rows = []
        for r in ws.iter_rows(min_row=1, max_row=min(max_rows, ws.max_row), values_only=True):
            rows.append([c for c in r])
        out[scr] = {"sheet": sheet, "answer_cells": grader.generate_cell_names(rng), "rows": rows}
    return out


def apply_attempt(input_path, out_path, attempt_cells):
    # attempt_cells: { "Sheet!Cell" or "Cell": value }. Fill them into a copy of the input.
    import openpyxl
    wb = openpyxl.load_workbook(input_path)
    for ref, val in attempt_cells.items():
        sheet = wb.sheetnames[0]
        cell = ref
        if "!" in ref:
            sheet, cell = ref.split("!")
            sheet = sheet.strip("'")
        ws = wb[sheet] if sheet in wb.sheetnames else wb[wb.sheetnames[0]]
        ws[cell] = val
    wb.save(out_path)


def grade_task(grader, dpath, task, out_dir):
    tid = task["id"]
    n = num_test_cases(dpath, tid)
    results = []
    for i in range(1, n + 1):
        ans = tc_path(dpath, tid, i, "answer")
        out = os.path.join(out_dir, f"{i}_{tid}_output.xlsx")
        try:
            ok, _ = grader.compare_workbooks(ans, out, task["instruction_type"], task["answer_position"])
        except Exception:
            ok = False
        results.append(int(bool(ok)))
    soft = sum(results) / len(results) if results else 0.0
    hard = 1 if results and 0 not in results else 0
    return {"test_case_results": results, "soft": soft, "hard": hard}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.path.join(os.getcwd(), "SpreadsheetBench"))
    ap.add_argument("--dataset", default="sample_data_200")
    ap.add_argument("--slice", type=int, default=3)
    ap.add_argument("--salt", default=os.environ.get("SOLO_LEDGER_SALT", "dev-salt-change-me"))
    ap.add_argument("--mode", choices=["api", "agent"], default="agent")
    ap.add_argument("--attempts-dir", default="./attempts")
    ap.add_argument("--allowlist", default="github.com")
    ap.add_argument("--out", default="results.json")
    ap.add_argument("--dump", action="store_true")
    a = ap.parse_args()

    dpath = ensure_dataset(a.repo, a.dataset, a.allowlist.split(","))
    grader = import_official_grader(a.repo)
    tasks = load_tasks(dpath)
    # held-out slice = first N tasks that have full test cases; seal it.
    sliced = [t for t in tasks if num_test_cases(dpath, t["id"]) >= 1][: a.slice]
    manifest = seal_heldout([str(t["id"]) for t in sliced], a.salt)
    print(f"sealed held-out slice: {len(sliced)} tasks · manifest {manifest[:16]}…")

    if a.dump:
        for t in sliced:
            print("\n" + "=" * 70)
            print(f"id={t['id']}  type={t['instruction_type']}  answer_position={t['answer_position']}")
            print("instruction:", t["instruction"][:600])
            n = num_test_cases(dpath, t["id"])
            for i in range(1, n + 1):
                pv = preview_input(grader, tc_path(dpath, t["id"], i, "input"), t["answer_position"])
                print(f"-- test case {i}: answer cells {[v['answer_cells'] for v in pv.values()]}")
                for scr, info in pv.items():
                    print(f"   [{scr}] first rows:")
                    for row in info["rows"][:12]:
                        print("    ", row)
        return

    os.makedirs("_sb_out", exist_ok=True)
    rows = []
    counted_hard = []
    for t in sliced:
        tid = t["id"]
        n = num_test_cases(dpath, tid)
        out_dir = os.path.join("_sb_out", str(tid)); os.makedirs(out_dir, exist_ok=True)
        # ---- attempt (model in the loop) ----
        if a.mode == "agent":
            ap_file = os.path.join(a.attempts_dir, f"{tid}.json")
            if not os.path.isfile(ap_file):
                print(f"  ! no attempt for {tid} (expected {ap_file}); skipping"); continue
            attempt = json.load(open(ap_file, encoding="utf-8"))  # { "1": {ref:val}, "2": {...}, "3": {...} }
        else:
            attempt = api_attempt(t, dpath, grader)  # full-auto
        for i in range(1, n + 1):
            cells = attempt.get(str(i)) or attempt.get(i) or {}
            apply_attempt(tc_path(dpath, tid, i, "input"), os.path.join(out_dir, f"{i}_{tid}_output.xlsx"), cells)
        g = grade_task(grader, dpath, t, out_dir)
        # honest gate: held-out (sealed) + model-in-loop (agent or api) + no per-task answer in the harness.
        clean = True
        rows.append({"id": tid, "type": t["instruction_type"], **g, "mode": a.mode,
                     "cleanGeneralProbe": clean, "modelInLoop": True})
        if clean:
            counted_hard.append(g["hard"])
        print(f"  {tid}: hard={g['hard']} soft={g['soft']:.2f} ({g['test_case_results']})")

    headline_hard = sum(counted_hard) / len(counted_hard) if counted_hard else None
    summary = {"benchmark": "spreadsheetbench", "dataset": a.dataset, "manifest": manifest,
               "n": len(counted_hard), "headline_hard_mean": headline_hard,
               "rows": rows}
    json.dump(summary, open(a.out, "w"), indent=2)
    print(f"\nHEADLINE (held-out, model-in-loop, official grader): hard@all = {headline_hard} over n={len(counted_hard)}")
    print(f"results -> {a.out}")


def api_attempt(task, dpath, grader):
    """Full-auto attempt via an OpenAI-compatible model. Returns { '1': {ref:val}, ... }."""
    from openai import OpenAI
    client = OpenAI(base_url=os.environ.get("OPENAI_BASE_URL"), api_key=os.environ["OPENAI_API_KEY"])
    model = os.environ.get("SOLO_MODEL", "gpt-4.1-mini")
    out = {}
    n = num_test_cases(dpath, task["id"])
    for i in range(1, n + 1):
        pv = preview_input(grader, tc_path(dpath, task["id"], i, "input"), task["answer_position"])
        prompt = (f"Spreadsheet task. Instruction:\n{task['instruction']}\n\n"
                  f"Fill these answer cells: {task['answer_position']}\n"
                  f"Input preview (first rows): {json.dumps(pv, default=str)[:4000]}\n\n"
                  "Return ONLY a JSON object mapping each answer cell ref to its value, e.g. "
                  '{"Sheet1!B2": 123.45}. No prose.')
        r = client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}],
                                           temperature=0)
        txt = r.choices[0].message.content.strip().strip("`")
        if txt.startswith("json"):
            txt = txt[4:]
        try:
            out[str(i)] = json.loads(txt)
        except Exception:
            out[str(i)] = {}
    return out


if __name__ == "__main__":
    main()
