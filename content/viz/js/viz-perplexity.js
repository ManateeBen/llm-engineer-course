/* viz-perplexity：困惑度 vs 下游任务对比（C 类，静态 + 悬停） */
(function () {
  var root = document.getElementById("viz-perplexity");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function text(x, y, str, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    return t;
  }

  var g = root.querySelector("#viz-ppl-static");
  /* 示意数据 */
  var models = [
    { name: "模型 A（通用预训练）", ppl: 18, task: 61, note: "测试集与训练同分布，PPL 漂亮" },
    { name: "模型 B（+监督微调）", ppl: 27, task: 79, note: "概率摊到多格式，但任务远胜" }
  ];

  /* 两栏：左 PPL（越低越好），右任务分（越高越好） */
  var baseY = 250, topY = 70;
  var colW = 130, gap = 90;
  var x0 = 150;

  /* 表头 */
  g.appendChild(text(x0 + colW / 2, topY - 18, "困惑度 PPL ↓", { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--text)" }));
  g.appendChild(text(x0 + colW + gap + colW / 2, topY - 18, "问答准确率 % ↑", { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--text)" }));
  /* 轴线 */
  g.appendChild(el("line", { x1: x0 - 20, y1: baseY, x2: x0 + 2 * colW + gap + 20, y2: baseY, stroke: "var(--text-soft)", "stroke-width": 1.2 }));

  models.forEach(function (m, i) {
    var yBase = baseY - i * 90;
    /* PPL 条：满刻度 30 → 反比例高度 */
    var pplH = (1 - m.ppl / 30) * 140;
    var taskH = m.task / 100 * 140;
    var px = x0, tx = x0 + colW + gap;
    /* PPL 条（蓝） */
    var b1 = el("rect", { x: px, y: yBase - pplH, width: colW, height: pplH, rx: 6, fill: "var(--accent)", opacity: 0.88, stroke: "var(--border)" });
    g.appendChild(b1);
    g.appendChild(text(px + colW / 2, yBase - pplH - 10, String(m.ppl), { "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--accent)" }));
    /* 任务条（绿） */
    var b2 = el("rect", { x: tx, y: yBase - taskH, width: colW, height: taskH, rx: 6, fill: "var(--viz-b)", opacity: 0.88, stroke: "var(--border)" });
    g.appendChild(b2);
    g.appendChild(text(tx + colW / 2, yBase - taskH - 10, m.task + "%", { "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--viz-b)" }));
    /* 模型名 */
    g.appendChild(text(x0 - 24, yBase - 60, m.name.split("（")[0], { "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: "var(--text)" }));
    g.appendChild(text(x0 - 24, yBase - 44, m.name.split("（")[1] ? "（" + m.name.split("（")[1] : "", { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
    g.appendChild(text(x0 - 24, yBase - 28, m.note, { "text-anchor": "end", "font-size": 10.5, fill: "var(--text-soft)" }));
    /* 悬停高亮 */
    [b1, b2].forEach(function (b) {
      b.addEventListener("mouseenter", function () { b.setAttribute("opacity", "1"); b.setAttribute("stroke", "var(--accent)"); });
      b.addEventListener("mouseleave", function () { b.setAttribute("opacity", "0.88"); b.setAttribute("stroke", "var(--border)"); });
    });
  });

  /* 结论条 */
  g.appendChild(el("rect", { x: 90, y: 288, width: 520, height: 30, rx: 6, fill: "var(--warn-soft)", stroke: "var(--warn)" }));
  g.appendChild(text(100, 308, "结论：PPL 低 ≠ 任务好。选型看任务指标；跨模型比 PPL 需同测试集、同 tokenizer、同口径（7-0）。", { "font-size": 11.5, fill: "var(--text)" }));
})();
