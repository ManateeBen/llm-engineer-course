/* viz-sig：配对差值的置信区间（B 类）承 7-2 §1-2 */
(function () {
  var root = document.getElementById("viz-sig");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#sig-static");
  var animG = root.querySelector("#sig-anim");
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

  var NSV = [200, 500, 1000, 4000, 8000];
  var DSV = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 6.0, 8.0];
  var ASV = [0.0, 0.80, 0.90, 0.94]; // 一致率决定配对差值方差
  var X0 = 90, X1 = 580, Y0 = 150, Y1 = 300, DMAX = 10;

  function sx(d) { return X0 + (d + DMAX) / (2 * DMAX) * (X1 - X0); }
  function syRow(y) { return y; }

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--fg)", "stroke-width": 1 }));
    text(X0, Y0 - 8, "0", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(sx(0), Y1 + 18, "0", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(sx(4), Y1 + 18, "+4", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(sx(-4), Y1 + 18, "-4", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text((X0 + X1) / 2, Y1 + 34, "A − B 差值（百分点）", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(X0 - 10, Y0 - 8, "差值", { "font-size": 10, "text-anchor": "end", fill: "var(--muted)" });
  }

  var iN = root.querySelector("#sig-n");
  var iD = root.querySelector("#sig-d");
  var iA = root.querySelector("#sig-a");

  function draw() {
    textLayer = animG;
    animG.innerHTML = "";
    var n = NSV[+iN.value];
    var d = DSV[+iD.value];
    var agree = ASV[+iA.value];
    var delta = d / 100;
    if (delta > 1 - agree + 1e-10) {
      text(30, 220, "参数不可能：差值不能超过不一致比例。请降低差值或一致率。", { fill: "var(--bad)", "font-size": 12 });
      return;
    }
    var se = Math.sqrt(Math.max(0, 1 - agree - delta * delta) / n) * 100;
    var half = 1.96 * se;
    var y = 225;

    // 点估计
    animG.appendChild(el("circle", { cx: sx(d), cy: y, r: 5, fill: "#36c" }));
    // CI
    var lo = Math.max(-DMAX, d - half), hi = Math.min(DMAX, d + half);
    animG.appendChild(el("line", { x1: sx(lo), y1: y, x2: sx(hi), y2: y, stroke: "#36c", "stroke-width": 3 }));
    animG.appendChild(el("line", { x1: sx(lo), y1: y - 6, x2: sx(lo), y2: y + 6, stroke: "#36c", "stroke-width": 2 }));
    animG.appendChild(el("line", { x1: sx(hi), y1: y - 6, x2: sx(hi), y2: y + 6, stroke: "#36c", "stroke-width": 2 }));
    // 零线
    animG.appendChild(el("line", { x1: sx(0), y1: Y0, x2: sx(0), y2: Y1, stroke: "#c33", "stroke-width": 1, "stroke-dasharray": "4 3" }));
    var sig = (lo > 0 || hi < 0);
    text(sx(0), Y0 + 14, sig ? "CI 不含 0 ⇒ 显著" : "CI 含 0 ⇒ 不显著", { "font-size": 11, "text-anchor": "middle", fill: sig ? "#3a7" : "#c33", "font-weight": 700 });

    // 参数面板
    var lines = [
      "n = " + n + " 题，一致率 " + (agree * 100).toFixed(0) + "%（正态近似演示）",
      "SE = 100√((1−一致率−差值²)/n) ≈ " + se.toFixed(2) + " 点，95% CI = [" + (d - half).toFixed(2) + ", " + (d + half).toFixed(2) + "]",
      sig ? "近似区间排除零；仍需检查抽样条件" : "证据不足不等于证明无效；按预先计划复测"
    ];
    for (var i = 0; i < lines.length; i++)
      text(30, 330 + i * 17, lines[i], { "font-size": 11, fill: i === 2 ? (sig ? "#3a7" : "#c33") : "var(--fg)" });
  }

  drawStatic();
  iN.oninput = function () { root.querySelector("#sig-n-val").textContent = NSV[+iN.value]; draw(); };
  iD.oninput = function () { root.querySelector("#sig-d-val").textContent = DSV[+iD.value].toFixed(1) + " 点"; draw(); };
  iA.oninput = function () { root.querySelector("#sig-a-val").textContent = (ASV[+iA.value] * 100).toFixed(0) + "%"; draw(); };
  iN.oninput(); iD.oninput(); iA.oninput();
})();
