/* viz-rlhf：PPO clipped surrogate 曲线（B 类）
 * L(r) = min(r*A, clip(r, 1±eps)*A)，承 6-0 §4。
 */
(function () {
  var root = document.getElementById("viz-rlhf");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#rl-static");
  var animG = root.querySelector("#rl-anim");

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var textLayer = staticG;
  function text(x, y, str, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    textLayer.appendChild(t);
    return t;
  }

  var A_OPTS = [0.5, -0.5];
  var EPS = [0.1, 0.2, 0.3];
  var X0 = 90, X1 = 560, Y0 = 320, Y1 = 60;
  var RMIN = 0.5, RMAX = 1.5;

  function sx(r) { return X0 + (r - RMIN) / (RMAX - RMIN) * (X1 - X0); }
  function sy(v) { return Y0 - (v + 0.6) / 1.2 * (Y0 - Y1); }

  var iA = root.querySelector("#rl-a");
  var iE = root.querySelector("#rl-e");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1 + 20, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 15, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(text(X0 - 20, Y0 + 22, "0", { "font-size": 11, fill: "var(--muted)" }));
    staticG.appendChild(text(sx(1) - 8, Y0 + 22, "1", { "font-size": 11, fill: "var(--muted)" }));
    staticG.appendChild(text(X1 + 14, Y0 + 22, "r_t", { "font-size": 12, fill: "var(--muted)" }));
    staticG.appendChild(text(X0 - 55, Y1 + 5, "surrogate", { "font-size": 11, fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var A = A_OPTS[+iA.value];
    var eps = EPS[+iE.value];
    root.querySelector("#rl-a-val").textContent = A > 0 ? "+0.5" : "−0.5";
    root.querySelector("#rl-e-val").textContent = eps.toFixed(1);
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var N = 60, un = [], cl = [];
    for (var i = 0; i <= N; i++) {
      var r = RMIN + (RMAX - RMIN) * i / N;
      var raw = r * A;
      var clipped = Math.min(r, 1 + eps), floored = Math.max(1 - eps, clipped);
      un.push([r, raw]);
      cl.push([r, Math.min(r * A, floored * A)]);
    }
    function path(pts, dash, color, w) {
      var d = pts.map(function (p, i) { return (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1); }).join("");
      animG.appendChild(el("path", { d: d, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": dash || "" }));
    }
    path(un, "5,4", "var(--muted)", 1.5);
    path(cl, "", "#4a7dbd", 2.5);

    // 信任盒阴影
    animG.appendChild(el("rect", { x: sx(1 - eps), y: Y1, width: sx(1 + eps) - sx(1 - eps), height: Y0 - Y1, fill: "#4a7dbd", opacity: 0.08 }));
    animG.appendChild(text(sx(1 - eps), Y0 + 36, (1 - eps).toFixed(2), { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
    animG.appendChild(text(sx(1 + eps), Y0 + 36, (1 + eps).toFixed(2), { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));

    var msg = A > 0
      ? "A>0（好动作）：r_t 超过 1+ε 后梯度=0，鼓励有上限；盒内正常上升"
      : "A<0（坏动作）：r_t 跌破 1−ε 后梯度=0，惩罚有下限；盒内正常下降";
    text(40, 380, msg, { "font-size": 12, fill: A > 0 ? "#3B6D11" : "#993C1D" });
    text(40, 40, A > 0 ? "鼓励区间" : "压制区间", { "font-size": 12, fill: "var(--muted)" });
  }

  drawStatic();
  draw();
  iA.addEventListener("input", draw);
  iE.addEventListener("input", draw);
})();
