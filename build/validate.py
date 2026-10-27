#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate.py — 课程质量自动校验（规格 §9）

六项检查：
  1. 依赖环校验     pre 字段无环、无断链
  2. 术语一致性     GLOSSARY.md 单一事实来源，正文禁用误写
  3. 公式自测       所有 LaTeX 公式过 KaTeX 渲染（throwOnError）
  4. 引用/链接检查  「见 X-Y」式内部单元引用必须存在
  5. 语法检查       node --check（app.js / viz js）
  6. 内容结构       题干/答案/退出标准、可视化与测验覆盖

用法：python3 build/validate.py
"""

import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fm import split_frontmatter

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
BUILD = ROOT / "build"
KATEX_JS = BUILD / "katex" / "katex.min.js"

UNIT_FILE = re.compile(r"^(\d+)-(\d+)\.md$")
EQ_PATTERN = re.compile(r"\\\[(.+?)\\\]|\\\((.+?)\\\)", re.S)
REF_PATTERN = re.compile(r"(?:见|参见|回到|见单元|单元)\s*(\d{1,2}-\d{1,2})")
GATE_Q_PATTERN = re.compile(r"^##\s*Q\d+\s*(?:\[([^\]]+)\])?", re.M)

fails, warns = [], []


def fail(msg):
    fails.append(msg)


def warn(msg):
    warns.append(msg)


def load_units():
    units = {}
    for p in sorted(CONTENT.glob("*.md")):
        if not UNIT_FILE.match(p.name):
            continue
        text = p.read_text(encoding="utf-8")
        meta, body = split_frontmatter(text)
        units[p.stem] = {"meta": meta, "body": body, "path": p}
    return units


# ---------------------------------------------------------------- 1. 依赖环

def check_deps(units):
    ids = set(units)
    graph = {}
    for uid, u in units.items():
        pre_raw = str(u["meta"].get("pre", "无")).strip()
        deps = []
        if pre_raw not in ("无", "none", "None", ""):
            for d in re.split(r"[,，、]", pre_raw):
                d = d.strip()
                if not d:
                    continue
                if d not in ids:
                    fail(f"[依赖断链] {uid} 的前置 {d} 不存在")
                else:
                    deps.append(d)
        graph[uid] = deps
    # 拓扑排序判环
    color = {n: 0 for n in graph}  # 0 白 1 灰 2 黑
    stack = []

    def dfs(n):
        color[n] = 1
        stack.append(n)
        for d in graph.get(n, []):
            if color.get(d) == 1:
                fail(f"[依赖环] {' -> '.join(stack[stack.index(d):] + [d])}")
                return
            if color.get(d) == 0:
                dfs(d)
        stack.pop()
        color[n] = 2

    for n in graph:
        if color[n] == 0:
            dfs(n)
    return graph


# ---------------------------------------------------------------- 2. 术语

def check_terms(units):
    gl = CONTENT / "GLOSSARY.md"
    if not gl.exists():
        warn("[术语] 缺少 GLOSSARY.md，跳过")
        return
    pairs = []  # (正写, [误写])
    for ln in gl.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        if "|" not in ln:
            continue
        good, bad = ln.split("|", 1)
        bads = [b.strip() for b in re.split(r"[,，]", bad) if b.strip()]
        if bads:
            pairs.append((good.strip(), bads))
    for uid, u in units.items():
        body = u["body"]
        for good, bads in pairs:
            for b in bads:
                # 英文误写按大小写敏感匹配（正写「LayerNorm」不应被误写「layernorm」误伤）；
                # 纯中文误写无大小写，直接子串匹配
                if b in body:
                    fail(f"[术语] {uid} 出现误写「{b}」，应统一为「{good}」")
    return pairs


# ---------------------------------------------------------------- 3. 公式

def check_formulas(units):
    eqs = []  # (uid, tex, display)
    for uid, u in units.items():
        for m in EQ_PATTERN.finditer(u["body"]):
            tex = m.group(1) if m.group(1) is not None else m.group(2)
            eqs.append((uid, tex, m.group(1) is not None))
    for g in sorted((CONTENT / "gates").glob("stage-*.md")):
        for m in EQ_PATTERN.finditer(g.read_text(encoding="utf-8")):
            tex = m.group(1) if m.group(1) is not None else m.group(2)
            eqs.append((g.stem, tex, m.group(1) is not None))
    if not eqs:
        warn("[公式] 未发现任何公式")
        return 0
    # 生成 node 自测脚本
    lines = [
        "const katex = require(%s);" % json.dumps(str(KATEX_JS)),
        "let n = 0;",
    ]
    for i, (uid, tex, display) in enumerate(eqs):
        lines.append(
            "try { katex.renderToString(%s, {throwOnError: true, displayMode: %s, strict: false}); n++; }"
            " catch (e) { console.log('EQ_FAIL\\t%s\\t' + e.message); }"
            % (json.dumps(tex), "true" if display else "false", uid.replace("\\", "\\\\"))
        )
    lines.append("console.log('EQ_DONE ' + n + '/' + %d);" % len(eqs))
    script = BUILD / ".eq_check.js"
    script.write_text("\n".join(lines), encoding="utf-8")
    r = subprocess.run(["node", str(script)], capture_output=True, encoding="utf-8", timeout=300)
    bad = [l for l in r.stdout.splitlines() if l.startswith("EQ_FAIL")]
    done = [l for l in r.stdout.splitlines() if l.startswith("EQ_DONE")]
    for b in bad:
        parts = b.split("\t", 2)
        fail(f"[公式] {parts[1]} 渲染失败：{parts[2] if len(parts) > 2 else ''}")
    if r.returncode != 0:
        fail(f"[公式] node 自测脚本异常：{r.stderr.strip()[:200]}")
    elif not bad and done:
        print(f"  公式自测：{done[0].split(' ', 1)[1]} 条全部渲染通过")
    script.unlink(missing_ok=True)
    return len(eqs)


# ---------------------------------------------------------------- 4. 引用

def check_refs(units):
    ids = set(units)
    planned = set()
    pj = BUILD / "planned.json"
    if pj.exists():
        planned = set(json.loads(pj.read_text(encoding="utf-8")).get("units", []))
    forward = []  # 前瞻引用：规划中、尚未创建
    for uid, u in units.items():
        for m in REF_PATTERN.finditer(u["body"]):
            ref = m.group(1)
            if ref in ids:
                continue
            if ref in planned:
                forward.append((uid, ref))
            else:
                fail(f"[引用] {uid} 引用了不存在的单元 {ref}")
    for g in sorted((CONTENT / "gates").glob("stage-*.md")):
        text = g.read_text(encoding="utf-8")
        for m in REF_PATTERN.finditer(text):
            if m.group(1) not in ids:
                fail(f"[引用] {g.stem} 引用了不存在的单元 {m.group(1)}")
        # gate 题目的 [unit] 标注
        for m in GATE_Q_PATTERN.finditer(text):
            for uid in (m.group(1) or "").split("+"):
                if uid.strip() and uid.strip() not in ids:
                    fail(f"[引用] {g.stem} Q 标注的单元 {uid} 不存在")
    if forward:
        seen = sorted(set(forward))
        print(f"  引用检查：{len(seen)} 处前瞻引用（指向规划中、尚未创建的单元，随建设自动转正）")


# ---------------------------------------------------------------- 5. 语法

def check_syntax():
    js_files = [BUILD / "app.js"] + sorted((CONTENT / "viz" / "js").glob("*.js"))
    if not js_files:
        return
    for f in js_files:
        r = subprocess.run(["node", "--check", str(f)], capture_output=True, encoding="utf-8")
        if r.returncode != 0:
            fail(f"[语法] {f.name} node --check 失败：{r.stderr.strip()[:200]}")
        else:
            print(f"  语法检查：{f.name} OK")
    # Python 语法
    for f in [BUILD / "build.py", BUILD / "validate.py"]:
        r = subprocess.run([sys.executable, "-m", "py_compile", str(f)], capture_output=True, text=True)
        if r.returncode != 0:
            fail(f"[语法] {f.name} py_compile 失败：{r.stderr.strip()[:200]}")


# ---------------------------------------------------------------- 6. 内容结构（不修改git状态）

def check_structure(units):
    from build import read_unit, parse_exercises, parse_exits, parse_gate, VIZ_TOKEN
    planned = set(json.loads((BUILD / "planned.json").read_text(encoding="utf-8"))["units"])
    for uid in sorted(planned - set(units)):
        fail(f"[完整性] 规划单元 {uid} 尚未建成")
    for uid in sorted(set(units) - planned):
        fail(f"[完整性] 单元 {uid} 未登记到planned.json")
    for uid, unit in units.items():
        meta, sections = read_unit(unit["path"])
        for key in ("t", "s", "stage", "pre", "viz", "refs"):
            if key not in meta or not str(meta[key]).strip():
                fail(f"[字段] {uid} 缺少 {key}")
        if str(meta.get("stage")) != uid.split("-")[0]:
            fail(f"[阶段] {uid} 的stage与编号不一致")
        if not isinstance(meta.get("refs"), list) or len(meta["refs"]) < 3:
            fail(f"[文献] {uid} 应有至少3条出处")
        for key, text in sections.items():
            if not text.strip():
                fail(f"[章节] {uid} 的 {key} 为空")
        exercises = parse_exercises(sections["ex"])
        if len(exercises) < 4:
            fail(f"[练习] {uid} 少于4道")
        for exercise in exercises:
            if not exercise["question"] or not exercise["answer"]:
                fail(f"[练习] {uid} {exercise['title']} 缺题干或答案")
        if not parse_exits(sections["exit"]):
            fail(f"[退出标准] {uid} 未解析到任何动作")
        visualizations = VIZ_TOKEN.findall(sections["body"])
        if meta.get("viz") != "none" and not visualizations:
            fail(f"[可视化] {uid} 标注了等级但没有嵌入图")
        for vid in visualizations:
            if not (CONTENT / "viz" / (vid + ".html")).exists():
                fail(f"[可视化] {uid} 引用的 {vid} 不存在")
    stages = {int(u["meta"]["stage"]) for u in units.values()}
    for stage in stages:
        path = CONTENT / "gates" / f"stage-{stage}.md"
        if not path.exists():
            fail(f"[测验] 阶段 {stage} 缺少测验")
            continue
        gate = parse_gate(path)
        covered, numbers = set(), set()
        if not 0 < gate["pass"] <= 1:
            fail(f"[测验] {path.stem} 通过阈值无效")
        for q in gate["questions"]:
            covered.update(x.strip() for x in q["unit"].split("+"))
            options = {o["k"] for o in q["options"]}
            if (q["n"] in numbers or len(options) != len(q["options"]) or len(options) < 2
                    or q["answer"] not in options or not q["stem"] or not q["why"]
                    or any(not o["t"].strip() for o in q["options"])):
                fail(f"[测验] {path.stem} Q{q['n']} 编号/题干/选项/答案/解析无效")
            numbers.add(q["n"])
        expected = {uid for uid in units if uid.split("-")[0] == str(stage)}
        for uid in sorted(expected - covered):
            fail(f"[覆盖] {path.stem} 没有关联到单元 {uid}")
    print("  结构检查：字段、练习、退出标准、可视化、规划与测验覆盖已核对")


# ---------------------------------------------------------------- main

def main():
    print("== 课程质量校验 ==")
    units = load_units()
    print(f"  单元数：{len(units)}")
    check_deps(units)
    check_terms(units)
    check_formulas(units)
    check_refs(units)
    check_syntax()
    check_structure(units)
    for w in warns:
        print("警告：" + w)
    if fails:
        print(f"\n校验未通过（{len(fails)} 项）：")
        for f in fails:
            print("  ✗ " + f)
        return 1
    print("\n六项检查全部通过 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
