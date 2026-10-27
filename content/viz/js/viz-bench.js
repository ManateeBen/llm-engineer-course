/* viz-bench：benchmark 三要素与坏法反制（C 类）承 7-0 §1-3 */
(function () {
  var root = document.getElementById("viz-bench");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#bench-static");
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
  function box(x, y, w, h, title, lines, color) {
    g.appendChild(el("rect", { x: x, y: y, width: w, height: h, rx: 8, fill: color, opacity: 0.12 }));
    g.appendChild(el("rect", { x: x, y: y, width: w, height: h, rx: 8, fill: "none", stroke: color, "stroke-width": 1.5 }));
    text(x + w / 2, y + 20, title, { "font-size": 12, "font-weight": 700, "text-anchor": "middle", fill: color });
    for (var i = 0; i < lines.length; i++)
      text(x + 12, y + 40 + i * 17, lines[i], { "font-size": 10.5, fill: "var(--fg)" });
  }

  // 三要素
  box(30, 50, 185, 110, "① 题目分布 D", ["从哪个能力空间抽样", "MMLU=57 学科知识", "HumanEval=短程序合成", "GSM8K=多步算术", "分布是唯一性问题"], "#3a7");
  box(228, 50, 185, 110, "② 指标 M", ["单题得分如何聚合", "单标量掩盖失效模式", "长度是最大 hack 通道", "宏/微平均 = 不同排序", "先定场景权重再选聚合"], "#38a");
  box(426, 50, 185, 110, "③ 报告 R", ["数字的可信度包装", "n + 聚合值 + CI", "bootstrap 95% CI", "已知失效模式清单", "无误差棒的数字不要看"], "#a5a");

  // 连接
  g.appendChild(el("line", { x1: 215, y1: 105, x2: 228, y2: 105, stroke: "var(--muted)", "stroke-width": 1.5 }));
  g.appendChild(el("line", { x1: 413, y1: 105, x2: 426, y2: 105, stroke: "var(--muted)", "stroke-width": 1.5 }));

  // 坏法表
  text(30, 195, "四类坏法与反制", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var rows = [
    ["泄漏", "题目进了预训练语料", "污染检测 + blocklist"],
    ["歧义", "多个正确答案只认一个", "双人标注 + κ 仲裁"],
    ["捷径", "不靠目标能力也能答对", "对抗性对照组"],
    ["饱和", "模型全对失去区分度", "轮换私有集 + 报分布"]
  ];
  var y = 215;
  rows.forEach(function (r) {
    g.appendChild(el("rect", { x: 30, y: y, width: 580, height: 28, rx: 4, fill: "var(--fg)", opacity: 0.04 }));
    text(45, y + 18, r[0], { "font-size": 11, "font-weight": 700, fill: "#c33" });
    text(105, y + 18, r[1], { "font-size": 11, fill: "var(--fg)" });
    text(360, y + 18, r[2], { "font-size": 11, fill: "#3a7" });
    y += 32;
  });

  // 自检
  g.appendChild(el("rect", { x: 30, y: 352, width: 580, height: 0, fill: "none" }));
  text(30, 340, "自检：打乱题目顺序或换同分布新题重测，排名变化 ≤ CI 宽度吗？", { "font-size": 11, "font-style": "italic", fill: "var(--muted)" });
})();
