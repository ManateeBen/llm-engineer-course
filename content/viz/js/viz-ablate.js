/* viz-ablate：尺度律外推 + 迁移分级 + 交互效应（C 类）承 7-3 */
(function () {
  var root = document.getElementById("viz-ablate");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#ablate-static");
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

  // 左：外推曲线
  var X0 = 70, X1 = 320, Y0 = 300, Y1 = 60;
  var pts = [ // [log10 N(M), delta pts]
    [1.0, 1.9], [1.48, 1.7], [2.0, 1.6], [2.48, 1.4]
  ];
  function sx(l) { return X0 + (l - 0.8) / 4.0 * (X1 - X0); }
  function sy(v) { return Y0 - (v - 0.8) / 1.6 * (Y0 - Y1); }
  g.appendChild(el("line", { x1: X0, y1: Y0, x2: X1 + 10, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
  g.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: "var(--fg)", "stroke-width": 1 }));
  text(X0 - 8, sy(1.6) + 4, "2.0", { "font-size": 10, "text-anchor": "end", fill: "var(--muted)" });
  text(X0 - 8, sy(1.2) + 4, "1.2", { "font-size": 10, "text-anchor": "end", fill: "var(--muted)" });
  text(X0 - 8, sy(0.8) + 4, "0.8", { "font-size": 10, "text-anchor": "end", fill: "var(--muted)" });
  text(sx(3.85), Y0 + 18, "7B", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });
  text(sx(2.48), Y0 + 18, "300M", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });
  text(X0 + 100, Y0 + 32, "模型规模 N（log）", { "font-size": 10.5, "text-anchor": "middle", fill: "var(--muted)" });
  text(30, 45, "PE* − RoPE 差值随规模递减", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });

  // 拟合点 + 线
  pts.forEach(function (p) {
    g.appendChild(el("circle", { cx: sx(p[0]), cy: sy(p[1]), r: 4, fill: "#36c" }));
  });
  // 幂律拟合线：1.4*(N/300)^(-0.11)
  var path = "M";
  for (var l = 0.9; l <= 3.85; l += 0.1) {
    var v = 1.9 * Math.pow(Math.pow(10, l - 1.0), -0.11);
    path += (l === 0.9 ? "" : " L") + sx(l).toFixed(1) + "," + sy(Math.max(0.8, v)).toFixed(1);
  }
  g.appendChild(el("path", { d: path, stroke: "#36c", "stroke-width": 2, fill: "none" }));
  // 外推段（虚线）
  var path2 = "M";
  for (var l2 = 2.48; l2 <= 3.85; l2 += 0.1) {
    var v2 = 1.9 * Math.pow(Math.pow(10, l2 - 1.0), -0.11);
    path2 += (l2 === 2.48 ? "" : " L") + sx(l2).toFixed(1) + "," + sy(v2).toFixed(1);
  }
  g.appendChild(el("path", { d: path2, stroke: "#36c", "stroke-width": 2, fill: "none", "stroke-dasharray": "5 4" }));
  text(sx(3.2), sy(1.15), "外推 7B ≈ 1.1 点", { "font-size": 10, fill: "#36c" });
  text(sx(1.0) + 4, sy(1.9) - 8, "10M", { "font-size": 9, fill: "var(--muted)" });
  // 有效区间标注
  g.appendChild(el("rect", { x: sx(2.48) - 4, y: Y1 - 12, width: 1.5, height: Y0 - Y1 + 12, fill: "#c33", opacity: 0.5 }));
  text(sx(2.48), Y1 - 16, "拟合上界", { "font-size": 9, "text-anchor": "middle", fill: "#c33" });

  // 右：迁移分级表
  text(370, 45, "敏感性迁移分级", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
  var rows = [
    ["数据配比/质量", "强", "分布效应，尺度不变", "#3a7"],
    ["学习率（µP 后）", "强", "宽度参数化，零样本迁移", "#3a7"],
    ["学习率（原始）", "中", "最优值随宽度漂移", "#a86"],
    ["架构组件", "弱~中", "重要性随容量变化", "#a86"],
    ["正则/dropout", "弱", "过参数化 regime 需求降", "#c33"],
    ["对齐方法", "中", "基座能力改变交互项", "#a86"]
  ];
  var y = 62;
  rows.forEach(function (r) {
    g.appendChild(el("rect", { x: 370, y: y, width: 240, height: 30, rx: 4, fill: r[3], opacity: 0.08 }));
    text(380, y + 13, r[0], { "font-size": 10.5, fill: "var(--fg)" });
    text(380, y + 25, r[2], { "font-size": 9, fill: "var(--muted)" });
    text(600, y + 19, r[1], { "font-size": 10.5, "font-weight": 700, "text-anchor": "end", fill: r[3] });
    y += 34;
  });

  // 底部：交互效应
  g.appendChild(el("rect", { x: 30, y: 340, width: 580, height: 48, rx: 6, fill: "#a5a", opacity: 0.08 }));
  text(40, 357, "交互效应：A 单独 -1.0、B 单独 -1.0、同时 -5.5 ⇒ 交互项 = -5.5-(-1.0)-(-1.0) = -3.5 点", { "font-size": 10.5, fill: "var(--fg)" });
  text(40, 374, "单变量消融会误判“A 无用”——A 的收益依赖 B；对疑似协同模块必须跑全因子 2^k 设计", { "font-size": 10.5, "font-style": "italic", fill: "var(--muted)" });
})();
