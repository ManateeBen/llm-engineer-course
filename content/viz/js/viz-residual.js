/* viz-residual：残差连接对逐层梯度的影响（A 类）
 * 无残差：g_l = γ^(L−l)，指数衰减；有残差：Jacobian 为 I+γ·J，
 * 连乘展开必含全取 I 的项 → 梯度下界为 1（恒等旁路），扰动项量级 ~γ^(L−l)
 * log 刻度柱状图 + 逐层揭示动画
 */
(function () {
  var root = document.getElementById("viz-residual");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 360, PAD = { l: 56, r: 16, t: 30, b: 40 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var LO = -6, HI = 0.5; /* log10 范围：1e-6 ~ 3.2 */

  function sx(i, L) { return X0 + (i + 0.5) / L * (X1 - X0); }
  function sy(v) { /* v 已取 log10 */
    return Y0 - (Math.max(v, LO) - LO) / (HI - LO) * (Y0 - Y1);
  }
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

  /* 静态层：坐标轴 + log 刻度 */
  var staticG = root.querySelector("#viz-residual-static");
  var ticks = [-6, -4, -2, -1, 0];
  ticks.forEach(function (tv) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(tv), x2: X1, y2: sy(tv), stroke: "var(--border)", "stroke-width": 0.6 }));
    var lab = tv === 0 ? "1" : (tv === -1 ? "0.1" : "1e" + tv);
    staticG.appendChild(text(X0 - 8, sy(tv) + 4, lab, { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 10, "层号 l（从输出层往输入层数）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(14, (Y0 + Y1) / 2, "回传到该层的梯度相对大小（对数）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));
  /* 图例 */
  staticG.appendChild(el("rect", { x: X1 - 252, y: Y1 + 2, width: 12, height: 12, fill: "var(--bad)", opacity: 0.75 }));
  staticG.appendChild(text(X1 - 234, Y1 + 13, "无残差：γ^(L−l)", { "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(el("rect", { x: X1 - 130, y: Y1 + 2, width: 12, height: 12, fill: "var(--ok)", opacity: 0.75 }));
  staticG.appendChild(text(X1 - 112, Y1 + 13, "有残差：≥1", { "font-size": 12, fill: "var(--text-soft)" }));

  var animG = root.querySelector("#viz-residual-anim");
  var layers = root.querySelector("#viz-residual-layers");
  var gamma = root.querySelector("#viz-residual-gamma");
  var lval = root.querySelector("#viz-residual-lval");
  var gval = root.querySelector("#viz-residual-gval");

  var revealed = -1, timer = null, L = 24, g = 0.85;

  function gradPlain(l) { return Math.pow(g, L - 1 - l); }            /* 输出层=1，逐层乘 γ */
  function gradResidual(l) { return 1 + gradPlain(l); }               /* 全 I 项 + 扰动项 */

  function draw() {
    L = parseInt(layers.value, 10);
    g = parseFloat(gamma.value);
    lval.textContent = String(L);
    gval.textContent = g.toFixed(2);
    animG.textContent = "";
    var upto = revealed < 0 ? L : Math.min(revealed + 1, L);
    var bw = Math.max(2, (X1 - X0) / L * 0.38);
    for (var l = 0; l < upto; l++) {
      var x = sx(l, L);
      var plain = Math.max(gradPlain(l), 1e-7);
      var res = Math.max(gradResidual(l), 1e-7);
      animG.appendChild(el("rect", {
        x: x - bw, y: sy(Math.log10(plain)), width: bw * 0.9, height: Y0 - sy(Math.log10(plain)),
        fill: "var(--bad)", opacity: 0.75
      }));
      animG.appendChild(el("rect", {
        x: x + bw * 0.1, y: sy(Math.log10(res)), width: bw * 0.9, height: Y0 - sy(Math.log10(res)),
        fill: "var(--ok)", opacity: 0.85
      }));
    }
    var firstPlain = gradPlain(0);
    animG.appendChild(text(X0 + 6, Y1 + 26,
      "第 1 层梯度：无残差 ≈ " + firstPlain.toExponential(1) + "，有残差 ≥ 1",
      { "font-size": 12, fill: "var(--text)" }));
  }

  function play() {
    if (timer) {
      clearInterval(timer); timer = null;
      root.querySelector("#viz-residual-play").textContent = "▶ 逐层揭示";
      revealed = -1; draw(); return;
    }
    revealed = 0;
    root.querySelector("#viz-residual-play").textContent = "⏸ 停止";
    draw();
    timer = setInterval(function () {
      revealed++;
      if (revealed >= L - 1) {
        clearInterval(timer); timer = null;
        root.querySelector("#viz-residual-play").textContent = "▶ 逐层揭示";
        revealed = -1; draw(); return;
      }
      draw();
    }, Math.max(30, 900 / L));
  }

  layers.addEventListener("input", draw);
  gamma.addEventListener("input", draw);
  root.querySelector("#viz-residual-play").addEventListener("click", play);
  draw();
})();
