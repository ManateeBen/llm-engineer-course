#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — 把 content/ 编译成单文件离线 llm-course.html

用法：
    python3 build/build.py            # 构建
    python3 build/build.py --check    # 只解析内容、不写产物（快速自检）

内容与呈现分离（规格 §2）：
    content/<单元id>.md   每个学习单元一个源文件（frontmatter + 四个正文章节）
    content/gates/*.md    阶段 gate 大测
    content/viz/*.html    可视化 HTML 片段（内联 SVG）
    content/viz/js/*.js   可视化交互 JS（原生 JS，禁 CDN）
    build/app.js          课程前端逻辑
    build/style.css       课程样式（CSS 变量，支持深色主题）
    build/template.html   单文件 HTML 模板
    build/katex/          KaTeX dist（构建时 base64 内联，保证离线）
"""

import base64
import html as html_lib
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import markdown as md_lib

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fm import split_frontmatter

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
BUILD = ROOT / "build"
KATEX = BUILD / "katex"
OUT = ROOT / "llm-course.html"

# 阶段编号 -> 显示名（与规格 §3.5 一致）
STAGE_NAMES = {
    0: "阶段 0 · 零起点地基",
    1: "阶段 1 · 数学地基",
    2: "阶段 2 · 深度学习原理",
    3: "阶段 3 · 架构与模型设计",
    4: "阶段 4 · 数据工程",
    5: "阶段 5 · 训练方法论",
    6: "阶段 6 · 后训练与对齐",
    7: "阶段 7 · 评测与实验方法",
    8: "阶段 8 · 系统与工程",
    9: "阶段 9 · 多模态",
    10: "阶段 10 · 应用与 Agent",
    11: "阶段 11 · 国产化适配与生态",
    12: "阶段 12 · 整合实践",
}

UNIT_FILE = re.compile(r"^(\d+)-(\d+)\.md$")
VIZ_TOKEN = re.compile(r"\[\[VIZ:([A-Za-z0-9_\-]+)\]\]")
# display \[ ... \] 与 inline \( ... \)
EQ_PATTERN = re.compile(r"\\\[(.+?)\\\]|\\\((.+?)\\\)", re.S)


# ---------------------------------------------------------------- 基础工具

def md_to_html(text):
    """Markdown -> HTML。公式（\\( \\) / \\[ \\]）先提取保护，转换后原样恢复，
    避免 markdown 把公式里的 _ * [ ] 等当语法处理。"""
    eqs = []

    def protect(m):
        eqs.append(m.group(0))
        return "\x00EQ%d\x00" % (len(eqs) - 1)

    text = EQ_PATTERN.sub(protect, text)
    html = md_lib.markdown(text, extensions=["tables", "fenced_code"])
    for i, eq in enumerate(eqs):
        # 还原时必须转义：公式里的 < （如 w_{<t_i}）若不转义会被浏览器
        # 当成标签起始，把公式所在文本节点切断，KaTeX auto-render 就匹配不到
        # 完整公式、整条公式会以 LaTeX 源码形式漏出来。
        html = html.replace("\x00EQ%d\x00" % i, html_lib.escape(eq, quote=False))
    return html


def read_unit(path):
    """解析单元源文件：frontmatter + 四个正文章节（why/body/ex/exit）。"""
    text = path.read_text(encoding="utf-8")
    meta, body = split_frontmatter(text)
    sections = {"why": "", "body": "", "ex": "", "exit": ""}
    cur = None
    for ln in body.splitlines():
        h = re.match(r"^##\s+(why|body|ex|exit)\s*$", ln, re.I)
        if h:
            cur = h.group(1).lower()
            continue
        if cur:
            sections[cur] += ln + "\n"
    return meta, sections


def parse_exercises(section_text):
    """保留标题同行题干；兼容 %%% 和旧版参考答案标题。"""
    blocks, cur = [], None
    for ln in section_text.splitlines():
        if re.match(r"^\*\*练习\s*\d+", ln.strip()):
            if cur:
                blocks.append(cur)
            cur = [ln]
        elif cur is not None:
            cur.append(ln)
    if cur:
        blocks.append(cur)
    out = []
    for b in blocks:
        head = re.match(r"^\*\*(.+?)\*\*(.*)$", b[0].strip())
        if not head:
            raise ValueError("练习标题缺少闭合的 **：" + b[0])
        title = head.group(1)
        rest = [head.group(2).strip()] + b[1:]
        separators = [i for i, line in enumerate(rest) if line.strip() == "%%%"]
        answers = [i for i, line in enumerate(rest)
                   if re.match(r"^\s*\*\*(?:参考答案|答案|解答)\s*[:：]?\*\*", line)]
        if separators:
            idx = separators[0]
            q_lines, a_lines = rest[:idx], rest[idx + 1:]
        elif answers:
            idx = answers[0]
            q_lines, a_lines = rest[:idx], rest[idx:]
        else:
            q_lines, a_lines = rest, []
        out.append({"title": title, "question": "\n".join(q_lines).strip(),
                    "answer": "\n".join(a_lines).strip()})
    return out


def parse_exits(text):
    return [m.group(1).strip() for line in text.splitlines()
            if (m := re.match(r"^\s*(?:[-*]|\d+[.)])\s+(.+)$", line))]


def render_ex(section_text):
    out = []
    for exercise in parse_exercises(section_text):
        title = html_lib.escape(exercise["title"])
        q_html = md_to_html(exercise["question"])
        a_html = md_to_html(exercise["answer"])
        if not exercise["question"] or not exercise["answer"]:
            raise ValueError("练习题干或答案为空：" + exercise["title"])
        out.append(
            '<div class="ex-q">'
            '<div class="ex-title">%s</div>'
            '<div class="ex-body">%s</div>'
            '<details class="ex-answer"><summary>参考答案（先自己做完再看）</summary>'
            '<div class="ex-ans-body">%s</div></details>'
            '</div>' % (title, q_html, a_html)
        )
    return "\n".join(out)


def render_viz(vid, missing):
    """[[VIZ:id]] -> 内联 SVG/JS 片段。"""
    html_file = CONTENT / "viz" / (vid + ".html")
    js_file = CONTENT / "viz" / "js" / (vid + ".js")
    if not html_file.exists():
        missing.append(vid)
        return f'<div class="viz-missing">[缺可视化 {vid}]</div>'
    frag = html_file.read_text(encoding="utf-8")
    if js_file.exists():
        js = js_file.read_text(encoding="utf-8")
        frag += "\n<script>(function(){\n%s\n})();</script>" % js
    return frag


def katex_assets():
    """读取 KaTeX dist：CSS 的字体 url 改写为 base64 data URI，实现完全离线。"""
    css = (KATEX / "katex.min.css").read_text(encoding="utf-8")
    for f in sorted((KATEX / "fonts").glob("*.woff2")):
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        css = css.replace("url(fonts/%s)" % f.name,
                          "url(data:font/woff2;base64,%s)" % b64)
    js = (KATEX / "katex.min.js").read_text(encoding="utf-8")
    ar = (KATEX / "auto-render.min.js").read_text(encoding="utf-8")
    return css, js, ar


# ---------------------------------------------------------------- gate 解析

def parse_gate(path):
    """gates/stage-N.md -> 结构化数据。
    题目格式：
        ## Q1 [0-3]
        题干（可多行，可含公式）
        - A. 选项
        - B. 选项
        答案：B
        解析：...
    """
    text = path.read_text(encoding="utf-8")
    meta, body = split_frontmatter(text)
    questions = []
    qblocks = re.split(r"(?=^##\s*Q\d+)", body, flags=re.M)
    for qb in qblocks:
        qb = qb.strip()
        if not qb.startswith("##"):
            continue
        head = re.match(r"^##\s*Q(\d+)\s*(?:\[([^\]]+)\])?", qb)
        rest = qb[head.end():].strip()
        lines = rest.splitlines()
        opt_lines, stem_lines = [], []
        ans, why = "", ""
        i = 0
        while i < len(lines):
            ln = lines[i]
            if re.match(r"^-\s*[A-D]\.", ln.strip()):
                opt_lines.append(ln.strip())
            elif re.match(r"^答案\s*[:：]", ln.strip()):
                ans = re.sub(r"^答案\s*[:：]\s*", "", ln.strip())
            elif re.match(r"^解析\s*[:：]", ln.strip()):
                why = re.sub(r"^解析\s*[:：]\s*", "", ln.strip())
                why += "\n" + "\n".join(lines[i + 1:]).strip()
                break
            else:
                stem_lines.append(ln)
            i += 1
        options = []
        for ol in opt_lines:
            om = re.match(r"^-\s*([A-D])\.\s*(.*)$", ol)
            if om:
                options.append({"k": om.group(1), "t": om.group(2)})
        questions.append({
            "n": int(head.group(1)),
            "unit": head.group(2) or "",
            "stem": md_to_html("\n".join(stem_lines).strip()),
            "options": options,
            "answer": ans.strip().upper(),
            "why": md_to_html(why.strip()),
        })
    return {
        "stage": int(meta.get("stage", path.stem.split("-")[-1])),
        "title": meta.get("title", "阶段大测"),
        "pass": float(meta.get("pass", 0.8)),
        "questions": questions,
    }


# ---------------------------------------------------------------- 主构建

def build(write=True):
    unit_files = sorted(
        (p for p in CONTENT.glob("*.md") if UNIT_FILE.match(p.name)),
        key=lambda p: (int(p.stem.split("-")[0]), int(p.stem.split("-")[1])),
    )
    if not unit_files:
        print("错误：content/ 下没有单元文件")
        return 1

    missing_viz = []
    units_meta, units_html = [], []
    for unit_index, p in enumerate(unit_files):
        uid = p.stem
        meta, sec = read_unit(p)
        viz = str(meta.get("viz", "none")).strip()
        exits = parse_exits(sec["exit"])
        pre_html = re.sub(r"\b\d+-\d+\b", lambda m:
                          '<a href="#/%s">%s</a>' % (m[0], m[0]),
                          html_lib.escape(str(meta.get("pre", "无"))))
        neighbors = []
        for offset, label in [(-1, "上一节"), (1, "下一节")]:
            index = unit_index + offset
            if 0 <= index < len(unit_files):
                other = unit_files[index].stem
                neighbors.append(f'<a href="#/{other}">{label} · {other}</a>')
        refs = meta.get("refs") or []
        if isinstance(refs, str):
            refs = [r.strip() for r in refs.split("|") if r.strip()]
        refs_html = "".join("<li>%s</li>" % md_to_html(r) for r in refs)

        body_html = md_to_html(sec["body"].strip())
        body_html = VIZ_TOKEN.sub(lambda m: render_viz(m.group(1), missing_viz),
                                  body_html)
        ex_html = render_ex(sec["ex"])
        why_html = md_to_html(sec["why"].strip())

        unit_html = f"""
<section class="unit" id="unit-{uid}" data-stage="{meta.get('stage', 0)}">
  <header class="unit-head">
    <div class="unit-crumbs">{STAGE_NAMES.get(int(meta.get('stage', 0)), '')} · 单元 {uid}</div>
    <h1 class="unit-title">{md_to_html(str(meta.get('t', uid)))}</h1>
    <p class="unit-sub">{md_to_html(str(meta.get('s', '')))}</p>
    <div class="unit-meta">
      <span class="meta-item">前置依赖：{pre_html}</span>
      <span class="meta-item">可视化：<b class="viz-{viz.lower()}">{viz}</b></span>
      <button class="done-btn" data-unit="{uid}">标记为已学完</button>
    </div>
  </header>
  <div class="unit-why"><h2>为什么学这个</h2>{why_html}</div>
  <div class="unit-body">{body_html}</div>
  <div class="unit-ex"><h2>练习</h2><p class="ex-note">练习覆盖本单元的退出标准；先做，再折叠对照。</p>{ex_html}</div>
  <div class="unit-exit"><h2>退出标准（可逐项勾选）</h2><ul class="exit-list">{''.join('<li data-exit="%s-%d">%s</li>' % (uid, i + 1, md_to_html(e)) for i, e in enumerate(exits))}</ul></div>
  <div class="unit-refs"><h2>原始文献</h2><ol>{refs_html}</ol></div>
  <nav class="unit-neighbors" aria-label="章节导航">{' · '.join(neighbors)}</nav>
</section>"""
        units_html.append(unit_html)
        units_meta.append({
            "id": uid, "t": str(meta.get("t", "")), "s": str(meta.get("s", "")),
            "stage": int(meta.get("stage", 0)),
            "pre": str(meta.get("pre", "无")), "viz": viz,
            "nEx": len(exits),
        })

    gates = []
    for g in sorted((CONTENT / "gates").glob("stage-*.md")):
        gates.append(parse_gate(g))
    gates.sort(key=lambda gate: gate["stage"])

    katex_css, katex_js, autorender_js = katex_assets()
    app_js = (BUILD / "app.js").read_text(encoding="utf-8")
    style_css = (BUILD / "style.css").read_text(encoding="utf-8")
    template = (BUILD / "template.html").read_text(encoding="utf-8")

    now = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M GMT+8")
    html = (template
            .replace("{{KATEX_CSS}}", katex_css)
            .replace("{{KATEX_JS}}", katex_js)
            .replace("{{AUTORENDER_JS}}", autorender_js)
            .replace("{{APP_JS}}", app_js)
            .replace("{{STYLE_CSS}}", style_css)
            .replace("{{UNITS_HTML}}", "\n".join(units_html))
            .replace("{{UNITS_META}}", json.dumps(units_meta, ensure_ascii=False))
            .replace("{{STAGE_NAMES}}", json.dumps(STAGE_NAMES, ensure_ascii=False))
            .replace("{{GATES}}", json.dumps(gates, ensure_ascii=False))
            .replace("{{GENERATED_AT}}", now)
            .replace("{{TOTAL_UNITS}}", str(len(units_meta))))

    if missing_viz:
        raise ValueError("缺失可视化文件：" + ", ".join(sorted(set(missing_viz))))

    notices = "\n\n".join((ROOT / p).read_text(encoding="utf-8") for p in
                          ["LICENSE", "LICENSE-CONTENT.md", "THIRD_PARTY_NOTICES.md",
                           "build/katex/LICENSE", "build/katex/fonts/LICENSE"])
    html = html.replace("</main>", '<section class="license-notices"><details><summary>版权与许可 / Licenses</summary><pre>'
                        + html_lib.escape(notices) + '</pre></details></section></main>')

    if write:
        OUT.write_text(html, encoding="utf-8")
        size = OUT.stat().st_size
        print(f"构建完成：{OUT}")
        print(f"单元数：{len(units_meta)}；gate 数：{len(gates)}；产物大小：{size/1024:.0f} KB")
        if missing_viz:
            print(f"警告：缺失可视化文件：{sorted(set(missing_viz))}")
    else:
        print(f"解析自检通过：{len(units_meta)} 个单元，{len(gates)} 个 gate")
    return 0


if __name__ == "__main__":
    sys.exit(build(write=("--check" not in sys.argv)))
