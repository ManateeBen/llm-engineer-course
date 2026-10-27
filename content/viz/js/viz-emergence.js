/* viz-emergence：涌现是指标现象还是相变（B 类）
 * 底层 per-token 正确率 p 随规模平滑爬升（logistic）；exact match = p^k
 * k=1 两线重合；k 越大，p^k 把平滑底层"掰"出视觉阶跃（Schaeffer 2023 论点）
 */
(function () {
  var root = document.getElementById("viz-emergence");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 380, PAD = { l: 56, r: 16, t: 30, b: 64 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var LX0 = 8, LX1 = 12; /* log10 参数量 */

  function sx(x) { return X0 + (x - LX0) / (LX1 - LX0) * (X1 - X0); }
  function sy(v) { return Y0 - v * (Y0 - Y1); }
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
  var P0 = 0.25, P1 = 0.90, XC = 10.4;
  function pAt(x, s) { return P0 + (P1 - P0) / (1 + Math.exp(-s * (x - XC))); }

  var staticG = root.querySelector("#viz-emergence-static");
  var animG = root.querySelector("#viz-emergence-anim");
  var sk = root.querySelector("#viz-emergence-k");
  var st = root.querySelector("#viz-emergence-t");
  var vk = root.querySelector("#viz-emergence-kval");
  var vt = root.querySelector("#viz-emergence-tval");

  /* 静态：坐标轴 */
  var gx, gy;
  for (gx = LX0; gx <= LX1; gx++) {
    staticG.appendChild(el("line", { x1: sx(gx), y1: Y0, x2: sx(gx), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(gx), Y0 + 16, "1e" + gx, { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (gy = 0; gy <= 1.001; gy += 0.2) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(gy) + 4, gy.toFixed(1), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, Y0 + 34, "模型规模（参数量，对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(14, (Y0 + Y1) / 2, "任务正确率", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));
  /* 随机基线 */
  staticG.appendChild(el("line", { x1: X0, y1: sy(P0), x2: X1, y2: sy(P0), stroke: "var(--text-soft)", "stroke-width": 1, "stroke-dasharray": "5 4", opacity: 0.7 }));
  staticG.appendChild(text(X1 - 6, sy(P0) - 6, "随机水平 0.25", { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));

  function draw() {
    var k = parseInt(sk.value, 10);
    var s = parseFloat(st.value) / 2;
    vk.textContent = String(k);
    vt.textContent = parseFloat(st.value).toFixed(1);
    animG.textContent = "";

    function path(fn) {
      var d = "";
      for (var x = LX0; x <= LX1 + 1e-9; x += 0.02) {
        d += (d ? " L" : "M") + sx(x).toFixed(1) + " " + sy(Math.min(1, fn(x))).toFixed(1);
      }
      return d;
    }
    /* 连续指标（底层 p）细线；离散指标（p^k）粗线 */
    animG.appendChild(el("path", { d: path(function (x) { return pAt(x, s); }), fill: "none", stroke: "var(--accent)", "stroke-width": 1.6, opacity: 0.9 }));
    animG.appendChild(el("path", { d: path(function (x) { return Math.pow(pAt(x, s), k); }), fill: "none", stroke: "var(--bad)", "stroke-width": 3 }));

    /* exact match 过半点：p^k = 0.5 → p = 0.5^{1/k} */
    var target = Math.pow(0.5, 1 / k);
    var sigma = (target - P0) / (P1 - P0);
    if (sigma > 0 && sigma < 1) {
      var xs = XC + Math.log(sigma / (1 - sigma)) / s;
      if (xs > LX0 && xs < LX1) {
        animG.appendChild(el("line", { x1: sx(xs), y1: Y0, x2: sx(xs), y2: sy(0.5), stroke: "var(--warn)", "stroke-width": 1.2, "stroke-dasharray": "4 3" }));
        animG.appendChild(el("circle", { cx: sx(xs), cy: sy(0.5), r: 4.5, fill: "var(--warn)", stroke: "var(--bg)", "stroke-width": 1.5 }));
        animG.appendChild(text(sx(xs), sy(0.5) - 10, "exact match 过半", { "text-anchor": "middle", "font-size": 11, fill: "var(--warn)" }));
      }
    }
    /* 图例与注解 */
    animG.appendChild(el("line", { x1: X0 + 8, y1: Y1 + 2, x2: X0 + 34, y2: Y1 + 2, stroke: "var(--accent)", "stroke-width": 1.6 }));
    animG.appendChild(text(X0 + 40, Y1 + 6, "底层 p（连续指标，平滑）", { "font-size": 11, fill: "var(--text-soft)" }));
    animG.appendChild(el("line", { x1: X0 + 218, y1: Y1 + 2, x2: X0 + 244, y2: Y1 + 2, stroke: "var(--bad)", "stroke-width": 3 }));
    animG.appendChild(text(X0 + 250, Y1 + 6, "p^" + k + "（exact match，离散指标）", { "font-size": 11, fill: "var(--text-soft)" }));
    /* 动态数字：在中点两侧各取一点展示放大效应 */
    var xa = 10.0, xb = 10.8;
    var pa = pAt(xa, s), pb = pAt(xb, s);
    var note = "k=" + k + "：底层 p 从 " + pa.toFixed(2) + " 到 " + pb.toFixed(2) +
      "（+" + (100 * (pb - pa) / pa).toFixed(0) + "%），p^" + k + " 从 " + Math.pow(pa, k).toFixed(3) + " 到 " + Math.pow(pb, k).toFixed(3) +
      "（×" + (Math.pow(pb, k) / Math.pow(pa, k)).toFixed(1) + "）——视觉阶跃诞生";
    animG.appendChild(text(X0, H - 26, note, { "font-size": 12, fill: "var(--text)" }));
    if (k === 1) {
      animG.appendChild(text(X0, H - 10, "k=1 时两线完全重合：没有复合步骤，就没有阶跃假象", { "font-size": 11, fill: "var(--viz-b)" }));
    }
  }

  sk.addEventListener("input", draw);
  st.addEventListener("input", draw);
  draw();
})();
