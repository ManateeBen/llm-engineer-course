/* viz-safety：Pareto 张力 + 三层防御（C 类，静态）
 * 承 6-5 §2/§4。
 */
(function () {
  var root = document.getElementById("viz-safety");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var G = root.querySelector("#sf-static");

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

  // 左：Pareto 前沿
  var X0 = 70, Y0 = 300, X1 = 320, Y1 = 60;
  G.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
  G.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: "var(--fg)", "stroke-width": 1 }));
  text(X1, Y0 + 20, "helpfulness", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
  text(X0 - 30, Y1 - 2, "harmlessness", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });

  // Pareto 前沿曲线（凹）
  var d = "";
  for (var i = 0; i <= 30; i++) {
    var u = i / 30;
    var h = Math.pow(1 - u, 1.6) * 0.95 + 0.03;
    var x = X0 + u * (X1 - X0);
    var y = Y0 - h * (Y0 - Y1);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  G.appendChild(el("path", { d: d, fill: "none", stroke: "#4a7dbd", "stroke-width": 2 }));

  var pts = [
    { u: 0.08, h: 0.88, t: "原始 SFT", c: "#888780" },
    { u: 0.55, h: 0.62, t: "产品选点(国内)", c: "#A32D2D" },
    { u: 0.85, h: 0.25, t: "过度对齐", c: "#BA7517" }
  ];
  pts.forEach(function (p) {
    var x = X0 + p.u * (X1 - X0), y = Y0 - p.h * (Y0 - Y1);
    G.appendChild(el("circle", { cx: x, cy: y, r: 5, fill: p.c, stroke: "#fff", "stroke-width": 1.5 }));
    G.appendChild(text(x + 8, y + 4, p.t, { "font-size": 10, fill: p.c }));
  });
  G.appendChild(text(X0 - 10, Y0 - 8, "无前沿点：被支配", { "font-size": 10, fill: "var(--muted)" }));

  // 右：三层防御同心圆
  var cx = 490, cy = 175;
  var layers = [
    { r: 130, c: "#E6F1FB", s: "#378ADD", t: "运营层：监控 + 红队循环 + 事件响应" },
    { r: 95, c: "#E1F5EE", s: "#1D9E75", t: "系统层：输入/输出过滤 + 沙箱 + 权限" },
    { r: 60, c: "#FAEEDA", s: "#BA7517", t: "训练层：拒答 RL + 对抗训练" }
  ];
  layers.forEach(function (L) {
    G.appendChild(el("circle", { cx: cx, cy: cy, r: L.r, fill: L.c, stroke: L.s, "stroke-width": 1.5, opacity: 0.75 }));
  });
  G.appendChild(el("circle", { cx: cx, cy: cy, r: 26, fill: "#4a7dbd" }));
  text(cx, cy + 4, "模型", { "font-size": 11, "text-anchor": "middle", fill: "#fff", "font-weight": "bold" });
  text(cx, cy - 150, "穿透代价逐层升高", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
  text(cx, cy - 135, "响应周期 < 扩散周期", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });

  text(30, 350, "左：Pareto 前沿上的选点是业务决策（国内合规场景偏 harmlessness）；过度拒绝率是第二个 benchmark", { "font-size": 11, fill: "var(--muted)" });
  text(30, 368, "右：GCG 类优化攻击可迁移（开源搜后缀→闭源也中招），单层静态墙必被穿透", { "font-size": 11, fill: "var(--muted)" });
})();
