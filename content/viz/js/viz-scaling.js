/* viz-scaling：缩放律（B 类）
 * Chinchilla 参数化拟合 L(N,D)=E+A/N^α+B/D^β，E=1.69, A=406.4, B=410.7, α=0.34, β=0.28
 * 约束 C≈6ND 下数值最优：N_opt=G(C/6)^{β/(α+β)}, D_opt=C/(6N_opt), G=(αA/βB)^{1/(α+β)}
 * 参照：Chinchilla 实测 70B/1.4T、Gopher 280B/300B（C≈5.76e23）
 */
(function () {
  var root = document.getElementById("viz-scaling");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 380, PAD = { l: 66, r: 14, t: 34, b: 118 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var LC0 = 18, LC1 = 25;   /* log10 C */
  var LV0 = 7, LV1 = 15;    /* log10 (N 或 D) */
  var E = 1.69, A = 406.4, B = 410.7, AL = 0.34, BE = 0.28;
  var G = Math.pow((AL * A) / (BE * B), 1 / (AL + BE));

  function sx(lc) { return X0 + (lc - LC0) / (LC1 - LC0) * (X1 - X0); }
  function sy(lv) { return Y0 - (lv - LV0) / (LV1 - LV0) * (Y0 - Y1); }
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
  function L(N, D) { return E + A / Math.pow(N, AL) + B / Math.pow(D, BE); }
  function nOpt(lc) { return G * Math.pow(Math.pow(10, lc) / 6, BE / (AL + BE)); }
  function dOpt(lc) { return Math.pow(10, lc) / (6 * nOpt(lc)); }
  function n20(lc) { return Math.sqrt(Math.pow(10, lc) / 120); }
  function fmt(v) {
    if (v >= 1e12) return (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(0) + "M";
    return v.toExponential(1);
  }

  /* 静态层：坐标轴 + 曲线 */
  var staticG = root.querySelector("#viz-scaling-static");
  var lc, lv;
  for (lc = LC0; lc <= LC1; lc++) {
    staticG.appendChild(el("line", { x1: sx(lc), y1: Y0, x2: sx(lc), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(lc), Y0 + 16, "1e" + lc, { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (lv = LV0; lv <= LV1; lv += 2) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(lv), x2: X1, y2: sy(lv), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(lv) + 4, "1e" + lv, { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, Y0 + 34, "训练算力预算 C（FLOPs，对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(16, (Y0 + Y1) / 2, "参数量 N / 训练 token 数 D（对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 16 " + (Y0 + Y1) / 2 + ")" }));

  function pathOf(fn) {
    var d = "";
    for (var c = LC0; c <= LC1 + 1e-9; c += 0.05) {
      var v = fn(c);
      if (v < Math.pow(10, LV0) || v > Math.pow(10, LV1)) continue;
      d += (d ? " L" : "M") + sx(c).toFixed(1) + " " + sy(Math.log10(v)).toFixed(1);
    }
    return d;
  }
  staticG.appendChild(el("path", { d: pathOf(n20), fill: "none", stroke: "var(--ok)", "stroke-width": 1.2, "stroke-dasharray": "6 4", opacity: 0.8 }));
  staticG.appendChild(el("path", { d: pathOf(function (c) { return 20 * n20(c); }), fill: "none", stroke: "var(--ok)", "stroke-width": 1.2, "stroke-dasharray": "6 4", opacity: 0.8 }));
  staticG.appendChild(el("path", { d: pathOf(nOpt), fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 }));
  staticG.appendChild(el("path", { d: pathOf(dOpt), fill: "none", stroke: "var(--bad)", "stroke-width": 2.2 }));

  /* 图例 */
  staticG.appendChild(el("rect", { x: X1 - 236, y: Y1 - 26, width: 14, height: 4, fill: "var(--accent)" }));
  staticG.appendChild(text(X1 - 216, Y1 - 19, "最优参数 N_opt(C)", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(el("rect", { x: X1 - 116, y: Y1 - 26, width: 14, height: 4, fill: "var(--bad)" }));
  staticG.appendChild(text(X1 - 96, Y1 - 19, "最优数据 D_opt(C)", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(el("rect", { x: X1 - 236, y: Y1 - 8, width: 14, height: 4, fill: "none", stroke: "var(--ok)", "stroke-width": 2, "stroke-dasharray": "3 2" }));
  staticG.appendChild(text(X1 - 216, Y1 - 1, "20 token/参数（取整规则）", { "font-size": 11, fill: "var(--text-soft)" }));

  /* 实测参照点：Gopher 与 Chinchilla（C≈5.76e23） */
  var refs = [
    { c: Math.log10(5.76e23), v: 2.8e11, label: "Gopher 280B 参数", dy: -8 },
    { c: Math.log10(5.76e23), v: 3.0e11, label: "Gopher 300B token", dy: 14 },
    { c: Math.log10(5.76e23), v: 7.0e10, label: "Chinchilla 70B 参数", dy: 16 },
    { c: Math.log10(5.76e23), v: 1.4e12, label: "Chinchilla 1.4T token", dy: -10 }
  ];
  refs.forEach(function (r) {
    staticG.appendChild(el("circle", { cx: sx(r.c), cy: sy(Math.log10(r.v)), r: 4.5, fill: "var(--text-soft)", stroke: "var(--bg)", "stroke-width": 1.5 }));
    staticG.appendChild(text(sx(r.c) - 10, sy(Math.log10(r.v)) + r.dy, r.label, { "text-anchor": "end", "font-size": 10, fill: "var(--text-soft)" }));
  });

  var animG = root.querySelector("#viz-scaling-anim");
  var slider = root.querySelector("#viz-scaling-c");
  var cval = root.querySelector("#viz-scaling-cval");

  function draw() {
    var lc2 = parseFloat(slider.value);
    cval.textContent = "10^" + lc2.toFixed(2) + " FLOPs";
    animG.textContent = "";
    var C = Math.pow(10, lc2);
    var N = nOpt(lc2), D = dOpt(lc2), N2 = n20(lc2), D2 = 20 * N2;
    /* 当前预算竖线 */
    animG.appendChild(el("line", { x1: sx(lc2), y1: Y0, x2: sx(lc2), y2: Y1, stroke: "var(--warn)", "stroke-width": 1.4, "stroke-dasharray": "4 3" }));
    /* 最优点 + 20:1 点 */
    animG.appendChild(el("circle", { cx: sx(lc2), cy: sy(Math.log10(N)), r: 6, fill: "var(--accent)", stroke: "var(--bg)", "stroke-width": 2 }));
    animG.appendChild(el("circle", { cx: sx(lc2), cy: sy(Math.log10(D)), r: 6, fill: "var(--bad)", stroke: "var(--bg)", "stroke-width": 2 }));
    animG.appendChild(el("circle", { cx: sx(lc2), cy: sy(Math.log10(N2)), r: 4, fill: "none", stroke: "var(--ok)", "stroke-width": 2 }));
    animG.appendChild(el("circle", { cx: sx(lc2), cy: sy(Math.log10(D2)), r: 4, fill: "none", stroke: "var(--ok)", "stroke-width": 2 }));
    /* 读数面板 */
    var lOpt = L(N, D), l20 = L(N2, D2), lGopher = L(2.8e11, 3.0e11);
    var lines = [
      "C = 10^" + lc2.toFixed(2) + " = " + C.toExponential(1) + " FLOPs",
      "最优分配：N = " + fmt(N) + "（约 " + (N / 1e9).toFixed(1) + "B 参数），D = " + fmt(D) + " token，配比 D/N ≈ " + (D / N).toFixed(0),
      "估算 loss：L_opt = " + lOpt.toFixed(3) + "；按 20:1 配（N=" + fmt(N2) + ", D=" + fmt(D2) + "）L = " + l20.toFixed(3) + "，仅差 " + (l20 - lOpt).toFixed(3),
      "同算力下 Gopher 式配置（280B/300B）L = " + lGopher.toFixed(3) + "，比最优差 " + (lGopher - lOpt).toFixed(3) + " nats/token"
    ];
    lines.forEach(function (s, i) {
      animG.appendChild(text(X0, Y0 + 52 + i * 18, s, { "font-size": 12, fill: i === 3 ? "var(--warn)" : "var(--text)" }));
    });
  }

  slider.addEventListener("input", draw);
  draw();
})();
