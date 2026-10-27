/* viz-contam：污染三武器 + 剂量模型 + 流水线（C 类）承 7-1 */
(function () {
  var root = document.getElementById("viz-contam");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#contam-static");
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

  // 剂量公式
  g.appendChild(el("rect", { x: 30, y: 15, width: 580, height: 40, rx: 6, fill: "#38a", opacity: 0.08 }));
  text(40, 33, "剂量模型：s_obs = s_true + p·Δ", { "font-size": 13, "font-weight": 700, fill: "#36c" });
  text(40, 48, "p=1%,Δ=50 ⇒ 虚高 0.5 点（可忽略）；p=8%,Δ=40 ⇒ 虚高 3.2 点（足以颠倒排名）", { "font-size": 10.5, fill: "var(--fg)" });

  // 三武器
  var arms = [
    { t: "① Min-K% Prob", c: "#3a7", lines: ["白盒：取 bottom-K% token 的 logprob 均值", "见过 ⇒ 连低概率位置都偏高", "WikiMIA AUC 0.7+；paraphrase 无效"] },
    { t: "② 时间旅行", c: "#a5a", lines: ["用训练截止后的事件构造测试集", "t(题目) > t_cut ⇒ P(污染)=0", "唯一零污染保证；只能测截止后知识"] },
    { t: "③ 黑盒置换检验", c: "#c73", lines: ["测试集 vs 留出集表现同分布？", "置换 B 次算尾部 p 值", "需 API 权限；近邻污染不敏感"] }
  ];
  var x = 30;
  arms.forEach(function (a) {
    g.appendChild(el("rect", { x: x, y: 70, width: 185, height: 100, rx: 8, fill: a.c, opacity: 0.10 }));
    g.appendChild(el("rect", { x: x, y: 70, width: 185, height: 100, rx: 8, fill: "none", stroke: a.c, "stroke-width": 1.5 }));
    text(x + 92, 90, a.t, { "font-size": 12, "font-weight": 700, "text-anchor": "middle", fill: a.c });
    for (var i = 0; i < a.lines.length; i++)
      text(x + 10, 108 + i * 19, a.lines[i], { "font-size": 10, fill: "var(--fg)" });
    x += 197;
  });

  // 流水线
  text(30, 195, "四阶段反污染流水线", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var stages = [
    ["建题元数据", "记录来源 URL / 抓取时间", "拦：时间不明的题"],
    ["入库扫描", "13-gram 重合检索 + MinHash", "拦：原文重合"],
    ["训练中 blocklist", "新数据入库先查哈希名单", "拦：重复入库"],
    ["出榜双轨审计", "Min-K% + 免疫集重测", "拦：带病发布"]
  ];
  var sx = 30, sw = 140, gap = 10;
  stages.forEach(function (s, i) {
    g.appendChild(el("rect", { x: sx, y: 210, width: sw, height: 85, rx: 6, fill: "#38a", opacity: 0.10 }));
    g.appendChild(el("rect", { x: sx, y: 210, width: sw, height: 85, rx: 6, fill: "none", stroke: "#38a", "stroke-width": 1 }));
    text(sx + sw / 2, 230, s[0], { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: "#36c" });
    text(sx + sw / 2, 248, s[1], { "font-size": 9.5, "text-anchor": "middle", fill: "var(--fg)" });
    text(sx + sw / 2, 268, s[2], { "font-size": 9.5, "text-anchor": "middle", fill: "#c33" });
    text(sx + sw / 2, 285, s[3], { "font-size": 9, "text-anchor": "middle", fill: "#3a7" });
    if (i < 3)
      g.appendChild(el("path", { d: "M" + (sx + sw + 1) + " 252 L" + (sx + sw + gap - 1) + " 252", stroke: "#38a", "stroke-width": 1.5, "marker-end": "url(#arrC)" }));
    sx += sw + gap;
  });
  g.appendChild(el("defs", {})).appendChild(el("marker", { id: "arrC", markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: "auto" })).appendChild(el("path", { d: "M0,0 L6,3 L0,6 z", fill: "#38a" }));

  // worked example 条
  g.appendChild(el("rect", { x: 30, y: 310, width: 580, height: 55, rx: 6, fill: "#c73", opacity: 0.08 }));
  text(40, 328, "审计实例：200 题数学集，A 84% vs B 79%", { "font-size": 11, "font-weight": 700, fill: "#c73" });
  text(40, 344, "13-gram 发现 7 题重合（重合题 A 全对、非重合 82.6%）⇒ 免疫集重测：A 76% < B 78% ⇒ 排名反转", { "font-size": 10.5, fill: "var(--fg)" });
  text(40, 358, "审计成本半天；不审计的代价 = 整整一代模型的技术选型错误", { "font-size": 10.5, "font-style": "italic", fill: "var(--muted)" });
})();
