/* viz-proxy：代理实验阶梯与指标可信度（C 类）
 * 左：四级验证阶梯（显微镜→小规模消融→规模梯度→全规模）。
 * 右：小规模差异 vs 大规模结局散点；loss 类代理贴对角线，
 * 单点 benchmark 在噪声带里乱序（含符号翻转案例）。
 */
(function () {
  var root = document.getElementById("viz-proxy");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#px-static");
  var animG = root.querySelector("#px-anim");

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

  var STEPS = [
    { name: "① 显微镜", desc: "数据统计量前后对比", cost: "小时级 · 近零算力", info: 0.25 },
    { name: "② 小规模消融", desc: "A/B 两臂 × 3 seed，看 loss + 探针", cost: "天级 · 数十卡时", info: 0.5 },
    { name: "③ 规模梯度", desc: "2~3 个规模重复，确认效应不随规模衰减", cost: "周级 · 数千卡时", info: 0.75 },
    { name: "④ 全规模", desc: "评审通过才动主训练，留回滚点", cost: "月级 · 数十万卡时", info: 1.0 }
  ];
  var BLUE = "#3b82f6", ORANGE = "#f59e0b";
  var LOSS_PTS = [[2.1, 1.8], [-1.5, -1.3], [3.4, 3.0], [-2.8, -2.6], [1.2, 1.1], [4.0, 3.7]];
  var BENCH_PTS = [[2.0, 0.3], [-1.8, -0.2], [3.0, 2.4], [-2.5, -1.9], [1.5, 0.7], [3.8, 0.4], [-3.2, -2.8], [0.9, -0.5], [-1.0, 0.6]];

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(20, 26, "四级验证阶梯（算力 ↑，可信度 ↑）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var LX = 24, LY = 44, LW = 268, LH = 78, LG = 14;
  STEPS.forEach(function (s, i) {
    var y = LY + i * (LH + LG);
    staticG.appendChild(el("rect", { x: LX, y: y, width: LW, height: LH, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(el("rect", { x: LX, y: y, width: 4, height: LH, rx: 2, fill: i === 3 ? "var(--accent)" : "var(--viz-b)" }));
    staticG.appendChild(text(LX + 14, y + 20, s.name, { "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
    staticG.appendChild(text(LX + 14, y + 36, s.desc, { "font-size": 9.5, fill: "var(--text-soft)" }));
    staticG.appendChild(text(LX + 14, y + 52, s.cost, { "font-size": 9.5, fill: "var(--text-soft)" }));
    /* 信息量条 */
    staticG.appendChild(el("rect", { x: LX + LW - 96, y: y + 16, width: 80, height: 8, rx: 3, fill: "var(--border)", opacity: 0.5 }));
    staticG.appendChild(el("rect", { x: LX + LW - 96, y: y + 16, width: 80 * s.info, height: 8, rx: 3, fill: i === 3 ? "var(--accent)" : "var(--viz-b)" }));
    staticG.appendChild(text(LX + LW - 96, y + 34, "信息量", { "font-size": 8, fill: "var(--text-soft)" }));
    if (i < STEPS.length - 1) {
      staticG.appendChild(el("path", { d: "M" + (LX + LW / 2) + "," + (y + LH) + " l0," + (LG - 2) + " m-4,-4 l4,4 l4,-4", fill: "none", stroke: "var(--text-soft)", "stroke-width": 1.2 }));
    }
  });

  /* 散点面板 */
  var SX = 352, SY = 60, SW = 250, SH = 250;
  staticG.appendChild(text(SX, SY - 10, "小规模差异 vs 大规模结局（百分点）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: SX, y: SY, width: SW, height: SH, fill: "none", stroke: "var(--border)", "stroke-width": 0.9 }));
  /* 坐标范围 -4..4 */
  function px(v) { return SX + (v + 4) / 8 * SW; }
  function py(v) { return SY + SH - (v + 4) / 8 * SH; }
  [-4, -2, 0, 2, 4].forEach(function (v) {
    staticG.appendChild(el("line", { x1: SX, y1: py(v), x2: SX + SW, y2: py(v), stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "3 3" }));
    staticG.appendChild(el("line", { x1: px(v), y1: SY, x2: px(v), y2: SY + SH, stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "3 3" }));
    staticG.appendChild(text(px(v), SY + SH + 12, String(v), { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text-soft)" }));
    staticG.appendChild(text(SX - 6, py(v) + 3.5, String(v), { "text-anchor": "end", "font-size": 8.5, fill: "var(--text-soft)" }));
  });
  /* 噪声带：沿对角线的 ±2% 平行四边形 */
  animG.appendChild(el("path", {
    d: "M" + px(-4) + "," + py(-2) + " L" + px(2) + "," + py(4) + " L" + px(4) + "," + py(2) + " L" + px(-2) + "," + py(-4) + " Z",
    fill: "var(--text-soft)", opacity: 0.08
  }));
  animG.appendChild(el("path", { d: "M" + px(-4) + "," + py(-4) + " L" + px(4) + "," + py(4), stroke: "var(--text-soft)", "stroke-width": 1, "stroke-dasharray": "5 4" }));
  animG.appendChild(text(px(3.1), py(3.55), "对角线：小规模差异 = 大规模结局", { "font-size": 8.5, fill: "var(--text-soft)" }));
  animG.appendChild(text(px(-3.9), py(2.35), "±2% 噪声带（seed 噪声）", { "font-size": 8.5, fill: "var(--text-soft)" }));
  /* 点 */
  function dot(pt, color, label, flip) {
    var c = el("circle", { cx: px(pt[0]), cy: py(pt[1]), r: 4, fill: color, opacity: 0.9, stroke: "var(--text)", "stroke-width": 0.6 });
    var ttl = el("title", {});
    ttl.textContent = label + "：小规模 " + (pt[0] > 0 ? "+" : "") + pt[0].toFixed(1) + "% → 大规模 " + (pt[1] > 0 ? "+" : "") + pt[1].toFixed(1) + "%";
    c.appendChild(ttl);
    animG.appendChild(c);
    if (flip) {
      animG.appendChild(el("circle", { cx: px(pt[0]), cy: py(pt[1]), r: 8, fill: "none", stroke: "var(--accent)", "stroke-width": 1.4, "stroke-dasharray": "2 2" }));
    }
  }
  LOSS_PTS.forEach(function (p) { dot(p, BLUE, "验证 loss 类代理"); });
  BENCH_PTS.forEach(function (p, i) { dot(p, ORANGE, "单点 benchmark", i === 7 || i === 8); });
  /* 图例 */
  animG.appendChild(el("circle", { cx: SX + 10, cy: SY + SH + 26, r: 4, fill: BLUE }));
  animG.appendChild(text(SX + 20, SY + SH + 29, "loss 类代理：贴对角线，可外推", { "font-size": 9.5, fill: "var(--text)" }));
  animG.appendChild(el("circle", { cx: SX + 10, cy: SY + SH + 42, r: 4, fill: ORANGE }));
  animG.appendChild(text(SX + 20, SY + SH + 45, "单点 benchmark：噪声带里乱序", { "font-size": 9.5, fill: "var(--text)" }));
  animG.appendChild(el("circle", { cx: SX + 176, cy: SY + SH + 26, r: 8, fill: "none", stroke: "var(--accent)", "stroke-width": 1.2, "stroke-dasharray": "2 2" }));
  animG.appendChild(text(SX + 188, SY + SH + 29, "符号翻转案例", { "font-size": 9.5, fill: "var(--text)" }));
  /* 底部结论 */
  animG.appendChild(text(20, 428, "结论：小规模上「更好」若只是单点 benchmark 的 1~2 分，先跑 3 个 seed 估噪声底；", { "font-size": 10, fill: "var(--text)" }));
  animG.appendChild(text(20, 444, "loss 曲线与多规模一致性都点头，才配进入全规模评审。", { "font-size": 10, fill: "var(--text)" }));
})();
