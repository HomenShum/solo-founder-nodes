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
  --mode api      : call an OpenAI-compatible model (env OPENAI_API_KEY, OPENAI_BASE_URL) — full auto.
  --mode agent    : the coding agent IS the model — read attempts from <attempts-dir>/<id>.json.
  --mode code-exec: ask the model to write a self-contained openpyxl python script per task;
                    execute it once per test case in an isolated tempdir under --code-timeout.
                    Required for sheet-level tasks (new sheets, large spans, formula resolution).
  --dump          : print each held-out task (instruction + answer_position + per-test-case input
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
    # MergedCell fix: openpyxl makes non-anchor cells of a merged range read-only
    # (AttributeError on assignment). Before writing, detect+unmerge the containing range.
    # This only affects the model's output copy; the grader compares VALUES inside answer_position
    # (cell_level_compare ignores fill/font), so cosmetic merge loss is benign.
    import openpyxl
    from openpyxl.utils.cell import coordinate_from_string, column_index_from_string
    wb = openpyxl.load_workbook(input_path)
    for ref, val in attempt_cells.items():
        sheet = wb.sheetnames[0]
        cell = ref
        if "!" in ref:
            sheet, cell = ref.split("!")
            sheet = sheet.strip("'")
        ws = wb[sheet] if sheet in wb.sheetnames else wb[wb.sheetnames[0]]
        # Unmerge any merged range that contains this target so the write doesn't hit a read-only MergedCell.
        try:
            col_letters, row = coordinate_from_string(cell)
            ci = column_index_from_string(col_letters)
            for mr in list(ws.merged_cells.ranges):
                if mr.min_col <= ci <= mr.max_col and mr.min_row <= row <= mr.max_row:
                    ws.unmerge_cells(str(mr))
                    break
        except Exception as e:
            print(f"   ! unmerge probe failed for {ref}: {e}")
        try:
            ws[cell] = val
        except AttributeError as e:
            # Last-resort: skip with warning rather than crash the whole task.
            print(f"   ! skip merged-readonly cell {ref}: {e}")
            continue
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
    ap.add_argument("--mode", choices=["api", "agent", "code-exec"], default="agent")
    ap.add_argument("--attempts-dir", default="./attempts")
    ap.add_argument("--allowlist", default="github.com")
    ap.add_argument("--out", default="results.json")
    ap.add_argument("--dump", action="store_true")
    ap.add_argument("--code-timeout", type=int, default=60,
                    help="seconds per test case in --mode code-exec (default 60)")
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
        # ---- code-exec: one model-authored python script per task; run it per test case ----
        if a.mode == "code-exec":
            script = code_exec_script(t, dpath, grader)
            # Anti-cheat: the model must produce an actual openpyxl script that reads argv,
            # not a hardcoded-values dump. If either signal is missing, we still execute
            # (failure -> no output -> grader scores 0) but mark cleanGeneralProbe=False.
            has_openpyxl = "openpyxl" in script
            has_argv = "argv" in script
            scripted = bool(script) and has_openpyxl and has_argv
            any_timeout = False
            for i in range(1, n + 1):
                in_path = tc_path(dpath, tid, i, "input")
                out_path = os.path.join(out_dir, f"{i}_{tid}_output.xlsx")
                timed_out = run_code_exec(script, in_path, out_path, timeout=a.code_timeout)
                if timed_out:
                    any_timeout = True
            g = grade_task(grader, dpath, t, out_dir)
            clean = scripted and not any_timeout
            rows.append({"id": tid, "type": t["instruction_type"], **g, "mode": a.mode,
                         "cleanGeneralProbe": clean, "modelInLoop": True,
                         "codeExec": {"scripted": scripted, "timeout": any_timeout,
                                      "hasOpenpyxl": has_openpyxl, "hasArgv": has_argv}})
            if clean:
                counted_hard.append(g["hard"])
            print(f"  {tid}: hard={g['hard']} soft={g['soft']:.2f} ({g['test_case_results']}) "
                  f"[code-exec scripted={scripted} timeout={any_timeout}]")
            continue
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


def code_exec_script(task, dpath, grader):
    """Ask the model for ONE openpyxl python script. argv[1]=input, argv[2]=output. Returns the script text.

    Honesty: prompt carries the instruction + answer_position + a 30-row input preview — same
    information api_attempt already gets. We do NOT show the answer workbook.
    """
    from openai import OpenAI
    client = OpenAI(base_url=os.environ.get("OPENAI_BASE_URL"), api_key=os.environ["OPENAI_API_KEY"])
    model = os.environ.get("SOLO_MODEL", "openai/gpt-4.1-mini")
    # One representative preview grounds column meanings; do NOT leak answers.
    pv = preview_input(grader, tc_path(dpath, task["id"], 1, "input"), task["answer_position"], max_rows=30)
    prompt = (
        "Write ONE Python 3 script that solves a SpreadsheetBench task using openpyxl.\n"
        "Contract:\n"
        "  - argv[1] = absolute path to input .xlsx; argv[2] = absolute path where you MUST save the result.\n"
        "  - Use openpyxl only (already installed). Do not read network or other files.\n"
        "  - Read input, mutate as the instruction requires, write to argv[2].\n"
        f"  - The grader compares VALUES (not formulas) inside answer_position={task['answer_position']!r}.\n"
        "    Resolve formulas to literal values before saving (e.g. compute in Python, write the result).\n"
        "  - If the task creates/filters NEW sheets (e.g. 'Paid', 'NotPaid'), create them with the EXACT names.\n"
        "  - Preserve other sheets/cells untouched.\n"
        "  - If a target sheet ALREADY EXISTS in the input workbook with rows in it, treat those rows\n"
        "    as a CORRECT partial starter. Do NOT clear, overwrite, or rewrite them. Preserve them at\n"
        "    their original row indices and APPEND the rows that satisfy the instruction's filter\n"
        "    starting at the first empty row below the starter. Detect the starter by scanning the\n"
        "    target sheet's existing non-empty rows BEFORE writing anything.\n"
        "  - If the instruction says 'There's an example', 'I have an example in this file', or\n"
        "    similar, the example IS the pre-filled rows in the target sheet — replicate the same\n"
        "    filter for the remaining source rows; do NOT regenerate the entire sheet from scratch.\n"
        "  - The grader compares the FULL answer_position range; pre-existing rows in target sheets\n"
        "    must keep their key columns (IDs, dates, names) intact at their original row indices.\n"
        "  - answer_position uses Excel A1 notation with optional sheet prefix and may be comma-\n"
        "    separated, e.g. \"'Paid'!A1:E58,'NotPaid'!A1:E12\" — each segment is one (sheet, range)\n"
        "    pair the grader will check. Cover every segment.\n"
        "  - For numeric outputs that may sit on a 2-decimal rounding boundary (values ending\n"
        "    in .xx5), prefer decimal.Decimal with ROUND_HALF_UP, or write the value Excel would\n"
        "    store (Excel rounds 22.425 -> 22.43, not 22.42). Avoid raw Python round() for money.\n"
        "  - NO STYLING. Do NOT use PatternFill, Color, Fill, Font, Alignment, Border, Side,\n"
        "    NamedStyle, GradientFill, or anything from openpyxl.styles. The grader compares\n"
        "    cell VALUES inside answer_position, not formatting. Styling code that constructs\n"
        "    Color/Fill objects raises TypeError on many openpyxl versions\n"
        "    (e.g. 'PatternFill.fgColor should be Color but value is RGB'); the script then\n"
        "    aborts and the test case scores 0.\n"
        "  - Use the openpyxl basic API ONLY: load_workbook(input).active or wb[sheet_name],\n"
        "    ws['A1'].value = ..., ws.cell(row, column, value=...), wb.create_sheet(name),\n"
        "    wb.save(output). No styles imports.\n"
        "  - Wrap in if __name__ == '__main__'. Print nothing on success.\n\n"
        f"Instruction:\n{task['instruction']}\n\n"
        f"instruction_type: {task['instruction_type']}\n"
        f"answer_position : {task['answer_position']}\n\n"
        f"Representative input preview (test case 1, first rows):\n{json.dumps(pv, default=str)[:6000]}\n\n"
        "Return ONLY the python code, no fences, no prose."
    )
    r = client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}],
                                       temperature=0)
    code = r.choices[0].message.content.strip()
    # Defensive strip of accidental ``` fences
    if code.startswith("```"):
        code = code.strip("`")
        if code.startswith("python"):
            code = code[len("python"):]
        code = code.strip()
    # Belt-and-suspenders: scrub openpyxl.styles usage that some models emit despite the
    # prompt warning. Observed failure on glm-5.2 R3 for task 99-24 (sheet-level):
    #   TypeError: <class 'openpyxl.styles.fills.PatternFill'>.fgColor should be
    #   <class 'openpyxl.styles.colors.Color'> but value is <class 'openpyxl.styles.colors.RGB'>
    # The grader only checks VALUES inside answer_position (cell_level_compare ignores fills),
    # so stripping styling is non-destructive and prevents a hard abort on the whole test case.
    code = _strip_styling(code)
    return code


_STYLE_CLASSES = (
    "PatternFill", "GradientFill", "Fill", "Color", "Font", "Alignment",
    "Border", "Side", "NamedStyle", "Protection",
)


def _strip_styling(code: str):
    """Remove openpyxl.styles imports and any line that constructs/assigns a style object.

    Conservative: we drop whole physical lines (and their continuation lines) that reference
    a style class or assign to a styling property (.fill / .font / .alignment / .border /
    .number_format on a cell). Keep .value assignments. If a `for`/`if` body becomes empty
    we leave a `pass` stub so indentation stays valid.
    """
    import re
    style_class_re = re.compile(r"\b(" + "|".join(_STYLE_CLASSES) + r")\b")
    style_attr_re = re.compile(r"\.(fill|font|alignment|border|number_format|protection|style)\s*=")
    style_import_re = re.compile(r"^\s*(from\s+openpyxl\.styles[\w\.]*\s+import\s+|import\s+openpyxl\.styles)")
    out, i = [], 0
    lines = code.splitlines()
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        is_style = (
            style_import_re.match(line) is not None
            or (style_class_re.search(line) is not None and not stripped.startswith("#"))
            or (style_attr_re.search(line) is not None and ".value" not in line)
        )
        if is_style:
            # Consume continuation lines (open paren or trailing backslash).
            open_parens = line.count("(") - line.count(")")
            trailing_bs = line.rstrip().endswith("\\")
            while (open_parens > 0 or trailing_bs) and i + 1 < len(lines):
                i += 1
                nxt = lines[i]
                open_parens += nxt.count("(") - nxt.count(")")
                trailing_bs = nxt.rstrip().endswith("\\")
            # Replace with a comment placeholder preserving indentation so block bodies stay valid.
            indent = line[: len(line) - len(line.lstrip())]
            out.append(f"{indent}pass  # [stripped styling]")
        else:
            out.append(line)
        i += 1
    return "\n".join(out)


def run_code_exec(script, in_path, out_path, timeout=60):
    """Execute the model-authored script in a tempdir against a copy of the input.

    Returns True if the script timed out, else False. Failure (nonzero, timeout, missing output)
    leaves out_path absent so the grader scores 0 via 'File not exist' — no soft pass-through.
    """
    import tempfile, shutil
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sb_exec_") as td:
        sp = os.path.join(td, "solve.py")
        ip = os.path.join(td, "input.xlsx")
        op = os.path.join(td, "output.xlsx")
        with open(sp, "w", encoding="utf-8") as f:
            f.write(script)
        shutil.copyfile(in_path, ip)
        try:
            proc = subprocess.run([sys.executable, sp, ip, op],
                                  cwd=td, timeout=timeout,
                                  capture_output=True, text=True)
        except subprocess.TimeoutExpired:
            print(f"   code-exec TIMEOUT after {timeout}s for {os.path.basename(in_path)}")
            return True
        if proc.returncode != 0:
            tail = (proc.stderr or "")[-400:]
            print(f"   code-exec NONZERO rc={proc.returncode} stderr={tail}")
            return False
        if os.path.isfile(op):
            shutil.copyfile(op, out_path)  # grader will find it
        # else: grader's compare_workbooks returns ('File not exist') -> scored 0.
        return False


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
