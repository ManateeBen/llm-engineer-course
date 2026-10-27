#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
build/pdf.py — 把 llm-course.html 转成可打印的 A4 电子书 PDF。

流程：
  1) 读 content/*.md 解析 frontmatter，构建 阶段 → 单元 目录树
  2) 读 llm-course.html，注入
       - 打印样式（A4、隐藏侧栏与交互控件、每单元分页、防跨页断裂、字号紧凑）
       - 封面页 + 目录页
       - 收尾脚本（强制亮色 + 展开全部单元/gate）
     输出 build/pdf-src.html
  3) 调用本机 Chrome/Edge 无头模式 --print-to-pdf 输出 PDF

用法：
  python build/pdf.py                     # 生成 PDF（默认 A4）
  python build/pdf.py --chrome <路径>     # 指定浏览器
  python build/pdf.py --no-outline        # 跳过书签写入
"""
import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(ROOT, "llm-course.html")
PDF_SRC = os.path.join(ROOT, "build", "pdf-src.html")
OUT_PDF = os.path.join(ROOT, "llm-course.pdf")

# 阶段标题（与 spec §3.5 一致；顺序即目录顺序）
STAGES = [
    (0, "零起点地基"),
    (1, "数学地基"),
    (2, "深度学习原理"),
    (3, "架构与模型设计"),
    (4, "数据工程"),
    (5, "训练方法论"),
    (6, "后训练与对齐"),
    (7, "评测与实验方法"),
    (8, "系统与工程"),
    (9, "多模态"),
    (10, "应用与 Agent"),
    (11, "国产化适配与生态"),
    (12, "整合实践"),
]

PRINT_CSS = """
/* ============================================================
   打印/电子书样式（由 build/pdf.py 注入）
   ============================================================ */
@page {
  size: A4;
  margin: 15mm 13mm 16mm;
}
@media print {
  html, body, .unit, .gate, .viz, .card {
    background: #fff !important;
    color: #1f2328 !important;
  }
}

/* 强制亮色：app 可能按系统偏好落到暗色主题，白纸黑字必须锁死 */
:root[data-theme="dark"] {
  --bg: #ffffff;
  --bg-soft: #f6f7f9;
  --bg-side: #fafbfc;
  --text: #1f2328;
  --text-soft: #57606a;
  --border: #d8dee4;
  --accent: #0969da;
  --accent-soft: #ddf4ff;
  --card: #ffffff;
}

/* --- 隐藏交互外壳 --- */
#home, .unit-neighbors, .done-btn, .gate-actions, #sidebar, #menu-toggle, .side-foot, .side-tools,
.viz-ctrl, .viz-ctrl-row, #progress-wrap, .progress-wrap,
#search-input, #theme-btn, #clear-btn, #home-link-wrap,
.no-print, .toast, #toast,
.viz button, .viz-play, button.viz-btn {
  display: none !important;
}
#app { display: block !important; }
#content {
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* --- 全部展开：覆盖 SPA 的 .visible 路由 --- */
.unit, .gate {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* --- 排版紧凑化（A4 适配） --- */
html, body {
  font-size: 10.2pt !important;
  line-height: 1.62 !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 19pt !important; margin: 0 0 8pt !important; }
h2 { font-size: 14.5pt !important; margin: 16pt 0 8pt !important; }
h3 { font-size: 12pt !important; margin: 12pt 0 6pt !important; }
h4 { font-size: 10.8pt !important; margin: 10pt 0 5pt !important; }
p  { margin: 0 0 7pt !important; orphans: 3; widows: 3; }
li { margin: 0 0 3pt !important; }

/* --- 防跨页断裂 --- */
svg, table, pre, blockquote, .viz, .viz-cap, .katex-display {
  break-inside: avoid;
  page-break-inside: avoid;
}
h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
tr, thead { break-inside: avoid; }
.ex-q, .gate-q { break-inside: avoid; }

/* --- 页面起止 --- */
.pdf-cover, .pdf-toc, .unit, .gate {
  break-before: page;
  page-break-before: always;
}
.unit:first-of-type, .gate:first-of-type { break-before: auto; }
/* 阶段首单元另起一页由 .unit 规则统一处理 */

/* --- 宽度与溢出 --- */
svg { max-width: 100% !important; height: auto !important; display: block; margin: 6pt auto; }
.viz { overflow: visible !important; }
pre, code, .katex { white-space: pre-wrap !important; word-break: break-word !important; }
pre {
  font-size: 8.6pt !important;
  line-height: 1.45 !important;
  padding: 7pt 9pt !important;
  border-radius: 4pt !important;
}
table { width: 100%; font-size: 9.2pt !important; border-collapse: collapse; }
th, td { padding: 3.5pt 6pt !important; }
img { max-width: 100% !important; }

 .license-notices { break-before: page; }
 .license-notices pre { break-inside: auto; }
/* --- 封面 --- */
.pdf-cover {
  height: 245mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  border-bottom: 0;
}
.pdf-cover .cv-kicker {
  font-size: 10pt; letter-spacing: .28em; color: #57606a;
  text-transform: uppercase; margin-bottom: 10mm;
}
.pdf-cover .cv-title {
  font-size: 34pt; font-weight: 800; line-height: 1.18;
  margin: 0 0 6mm; letter-spacing: -.01em;
}
.pdf-cover .cv-sub {
  font-size: 13pt; color: #57606a; margin: 0 0 14mm; line-height: 1.6;
}
.pdf-cover .cv-rule {
  width: 44mm; height: 2.5pt; background: var(--accent, #0969da);
  margin: 0 auto 12mm;
}
.pdf-cover .cv-meta { font-size: 10pt; color: #57606a; line-height: 1.9; }
.pdf-cover .cv-meta b { color: #1f2328; }

/* --- 目录 --- */
.pdf-toc { break-after: page; page-break-after: always; }
.pdf-toc h1 { font-size: 22pt; margin-bottom: 10mm; }
.toc-stage { margin-bottom: 7mm; break-inside: avoid; }
.toc-stage-name {
  font-size: 11.5pt; font-weight: 700; margin-bottom: 2.5mm;
  border-bottom: .8pt solid #d8dee4; padding-bottom: 1.5mm;
}
.toc-items { columns: 2; column-gap: 8mm; }
.toc-item {
  font-size: 9.2pt; line-height: 1.5; margin-bottom: 1.2mm;
  break-inside: avoid; display: flex; gap: 2.5mm;
}
.toc-item .ti-id {
  color: #0969da; font-family: var(--mono); font-weight: 700;
  flex-shrink: 0; min-width: 12mm;
}
.toc-item .ti-t { color: #1f2328; }
.toc-note {
  font-size: 9pt; color: #57606a; margin-top: 6mm;
  border-top: .8pt solid #d8dee4; padding-top: 3mm;
}

/* 目录里的 home 单元不单独列 */
"""

TAIL_SCRIPT = r"""
<script>
/* 电子书化：强制亮色 + 展开全部单元 + 保证公式已渲染 */
(function () {
  // 注意：这里绝不 remove DOM 元素——app 的 init() 会在 DOMContentLoaded 访问
  // #sidebar，移除它会让 init 抛异常并跳过 KaTeX 渲染（公式会漏出 LaTeX 源码）。
  // 隐藏交互外壳交给 PRINT_CSS 的 display:none。
  try { document.documentElement.removeAttribute("data-theme"); } catch (e) {}
  document.documentElement.style.colorScheme = "light";

  document.querySelectorAll("details").forEach(function (d) { d.open = true; });
  var all = document.querySelectorAll(".unit, .gate");
  for (var i = 0; i < all.length; i++) all[i].classList.add("visible");

  // 同步渲染一次（本脚本位于 katex 库之后，renderMathInElement 已就绪），
  // 排版前完成；随后 app 的 init 会再扫一次，已渲染部分幂等无副作用。
  function renderKatex() {
    if (!window.renderMathInElement) { return; }
    try {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
      });
    } catch (e) {}
  }
  renderKatex();
  window.addEventListener("load", function () {
    (window.__GATES__ || []).forEach(function (g) {
      g.questions.forEach(function (q) {
        var box = document.querySelector('.gate-q[data-q="' + g.stage + '-' + q.n + '"]');
        if (box) {
          box.classList.add('graded');
          box.querySelector('.gq-verdict').textContent = '参考答案：' + q.answer;
        }
      });
    });
    var notices = document.querySelector('.license-notices');
    if (notices) document.querySelector('#content').appendChild(notices);
    renderKatex();
  });
  setTimeout(renderKatex, 0);
})();
</script>
"""


def parse_front_matter(path):
    """返回 (uid, stage, title) 或 None"""
    with open(path, encoding="utf-8") as f:
        head = f.read(4000)
    if not head.startswith("---"):
        return None
    end = head.find("\n---", 3)
    if end < 0:
        return None
    fm = head[3:end]
    def field(name):
        m = re.search(r"^%s:\s*(.+)$" % name, fm, re.M)
        if not m:
            return None
        v = m.group(1).strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        return v
    uid = os.path.basename(path)[:-3]
    stage = field("stage")
    title = field("t") or uid
    try:
        stage = int(stage)
    except (TypeError, ValueError):
        stage = -1
    return uid, stage, title


def build_toc(units, n_units, n_gates, n_viz):
    """units: [(stage, [(uid, title), ...])]"""
    parts = ['<section class="unit pdf-toc">', '<h1>目录</h1>']
    for stage_no, stage_name in STAGES:
        rows = [u[1] for u in units if u[0] == stage_no]
        if not rows:
            continue
        rows.sort(key=lambda x: x[0])
        parts.append('<div class="toc-stage">')
        parts.append('<div class="toc-stage-name">阶段 %d · %s</div>' % (stage_no, stage_name))
        parts.append('<div class="toc-items">')
        for uid, title in rows:
            parts.append(
                '<div class="toc-item"><span class="ti-id">%s</span>'
                '<span class="ti-t">%s</span></div>' % (uid, esc(title))
            )
        parts.append("</div></div>")
    # 不在阶段列表里的单元（保险）
    others = [u[1] for u in units if u[0] not in [s[0] for s in STAGES]]
    if others:
        others.sort(key=lambda x: x[0])
        parts.append('<div class="toc-stage"><div class="toc-stage-name">其他</div><div class="toc-items">')
        for uid, title in others:
            parts.append(
                '<div class="toc-item"><span class="ti-id">%s</span>'
                '<span class="ti-t">%s</span></div>' % (uid, esc(title))
            )
        parts.append("</div></div>")
    parts.append(
        '<div class="toc-note">共 %d 个单元 · %d 套阶段大测 · %d 张可视化<br>'
        "构建于 %s · 单文件离线课程（HTML 交互版含滑杆动画与进度追踪）</div>"
        % (n_units, n_gates, n_viz, time.strftime("%Y-%m-%d %H:%M"))
    )
    parts.append("</section>")
    return "\n".join(parts)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_cover(n_units, n_gates, n_viz):
    return """<section class="unit pdf-cover">
  <div class="cv-kicker">LLM Engineer Track</div>
  <div class="cv-title">LLM 工程师养成系统</div>
  <div class="cv-rule"></div>
  <div class="cv-sub">从零基础到可求职 · 一套讲透「为什么」的完整路径<br>
    知识学得懂 · 能力练得出 · 证据拿得出手</div>
  <div class="cv-meta">
    <b>%d</b> 个单元 &nbsp;·&nbsp; <b>%d</b> 套阶段大测 &nbsp;·&nbsp; <b>%d</b> 张可视化<br>
    12 个知识阶段，覆盖数学地基 / 架构 / 数据 / 训练 / 后训练对齐 / 评测 /<br>
    系统与工程 / 多模态 / 应用 Agent / 国产化生态<br><br>
    构建于 %s
  </div>
</section>""" % (n_units, n_gates, n_viz, time.strftime("%Y-%m-%d"))


def find_browser(explicit=None):
    if explicit:
        return explicit if os.path.exists(explicit) else None
    cands = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in cands:
        if os.path.exists(c):
            return c
    return shutil.which("chrome") or shutil.which("msedge") or shutil.which("chromium")


def add_outline(pdf_path, stage_units):
    """用 pypdf 给 PDF 加书签：先扫描每页文本定位单元起始页。"""
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        sys.stderr.write("  [warn] 未安装 pypdf，跳过书签（pip install pypdf 后可补）\n")
        return False
    try:
        reader = PdfReader(pdf_path)
        n = len(reader.pages)
        # 逐页提取文本，建立 文本 → 页码 索引
        page_text = []
        for i in range(n):
            try:
                page_text.append(reader.pages[i].extract_text() or "")
            except Exception:
                page_text.append("")
        writer = PdfWriter(clone_from=pdf_path)
        added = 0
        # 顶层首位：目录
        pg_toc = locate_page(page_text, "目录")
        if pg_toc is not None:
            writer.add_outline_item("目录", pg_toc)
            added += 1
        # 顶层：单元书签（按阶段分组）。
        # 定位用正文页眉「单元 {uid}」（目录页只有裸 uid，不会误命中）。
        parent_of_stage = {}
        for stage_no, stage_name in STAGES:
            rows = sorted([u[1] for u in stage_units if u[0] == stage_no], key=lambda x: x[0])
            if not rows:
                continue
            stage_pg = None
            parent = None
            for uid, title in rows:
                pg = locate_page(page_text, r"单元\s+" + re.escape(uid))
                if pg is None:
                    continue
                if parent is None:
                    parent = writer.add_outline_item(
                        "阶段 %d · %s" % (stage_no, stage_name), pg)
                    parent_of_stage[stage_no] = parent
                    stage_pg = pg
                bm_title = title if title.startswith(uid) else "%s %s" % (uid, title)
                writer.add_outline_item(bm_title, pg, parent=parent)
                added += 1
            if parent is None:
                writer.add_outline_item("阶段 %d · %s" % (stage_no, stage_name), 0)
        writer.add_metadata({
            "/Title": "LLM 工程师养成系统 · 从零到可求职",
            "/Author": "LLM 工程师养成系统",
            "/Subject": "LLM 全栈路径：数学 / 架构 / 数据 / 训练 / 对齐 / 评测 / 系统 / 多模态 / Agent / 国产化",
            "/Creator": "build/pdf.py",
        })
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return added
    except Exception as e:
        sys.stderr.write("  [warn] 书签写入失败：%s\n" % e)
        return False


def locate_page(page_text, pattern, head=80):
    """按正则在页面文本里找首次出现的页码（0-based）；找不到返回 None。
    pypdf 的 extract_text 会把空格抽出双份，必须用 \\s+ 容错。
    head: 只在页首 N 字符内匹配——单元页眉「· 单元 uid」是页面第一行，
    正文交叉引用（如「单元 0-6 里讲过」）在页中，不会误命中。"""
    rx = re.compile(pattern)
    for i, t in enumerate(page_text):
        if rx.search(t[:head]):
            return i
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default=None, help="浏览器可执行文件路径")
    ap.add_argument("--no-outline", action="store_true", help="跳过 PDF 书签写入")
    ap.add_argument("--keep-src", action="store_true", help="保留中间 HTML")
    args = ap.parse_args()

    if not os.path.exists(SRC_HTML):
        sys.stderr.write("缺少 %s，请先运行 build/build.py\n" % SRC_HTML)
        return 1

    # 1) 单元清单：[(uid, stage, title)]
    units = []
    for p in sorted(glob.glob(os.path.join(ROOT, "content", "[0-9]*.md"))):
        r = parse_front_matter(p)
        if r:
            units.append(r)
    stage_units = [(st, (uid, ti)) for uid, st, ti in units]
    n_units = len(units)
    n_gates = len(glob.glob(os.path.join(ROOT, "content", "gates", "stage-*.md")))
    n_viz = len(glob.glob(os.path.join(ROOT, "content", "viz", "*.html")))
    print("单元 %d · gate %d · 可视化 %d" % (n_units, n_gates, n_viz))

    # 2) 读 HTML 并注入
    with open(SRC_HTML, encoding="utf-8") as f:
        html = f.read()

    # 打印 CSS 注入到最后一个 </style> 前
    idx = html.rfind("</style>")
    html = html[:idx] + PRINT_CSS + "\n" + html[idx:]

    # 封面 + 目录：插到 <main id="content"> 之后
    m = re.search(r'(<main id="content">)', html)
    cover = build_cover(n_units, n_gates, n_viz)
    toc = build_toc(stage_units, n_units, n_gates, n_viz)
    html = html[:m.end()] + "\n" + cover + "\n" + toc + "\n" + html[m.end():]

    # 收尾脚本
    idx = html.rfind("</body>")
    html = html[:idx] + TAIL_SCRIPT + "\n" + html[idx:]

    os.makedirs(os.path.dirname(PDF_SRC), exist_ok=True)
    with open(PDF_SRC, "w", encoding="utf-8") as f:
        f.write(html)
    print("打印源：%s（%.1f MB）" % (PDF_SRC, os.path.getsize(PDF_SRC) / 1e6))

    # 3) 无头打印
    browser = find_browser(args.chrome)
    if not browser:
        sys.stderr.write("未找到 Chrome/Edge，无法生成 PDF\n")
        return 2
    url = "file:///" + PDF_SRC.replace("\\", "/")
    temporary_pdf = os.path.join(ROOT, "build", "pdf-raw.pdf")
    if os.path.exists(temporary_pdf):
        os.remove(temporary_pdf)
    cmd = [
        browser, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--no-pdf-header-footer",
        "--print-to-pdf=" + temporary_pdf.replace("\\", "/"),
        url,
    ]
    print("打印中（无头 %s）…" % os.path.basename(browser))
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, timeout=600)
    if r.returncode != 0 or not os.path.exists(temporary_pdf) or os.path.getsize(temporary_pdf) == 0:
        sys.stderr.write("打印失败：%s\n%s\n" % (r.returncode, r.stderr.decode("utf-8", "ignore")[:800]))
        return 3
    os.replace(temporary_pdf, OUT_PDF)
    print("PDF 生成：%s（%.1f MB，用时 %.0fs）"
          % (OUT_PDF, os.path.getsize(OUT_PDF) / 1e6, time.time() - t0))

    # 4) 书签
    if not args.no_outline:
        n = add_outline(OUT_PDF, stage_units)
        if n:
            print("书签写入：%d 条" % n)

    if not args.keep_src:
        try:
            os.remove(PDF_SRC)
        except OSError:
            pass
    print("完成 → %s" % OUT_PDF)
    return 0


if __name__ == "__main__":
    sys.exit(main())
