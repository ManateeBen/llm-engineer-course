/* viz-mflo：训练时长计算器（B 类，三档 MFU 对比）
 * t = 6ND / (MFU * P_MAX * cards)，承 8-0 §2。
 */
(function () {
  var root = document.getElementById("viz-mflo");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mf-static");
  var animG = root.querySelector("#mf-anim");

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

  var P_MAX = 2.2e15; // BF16 稠密峰值 FLOP/s
  var N_OPTS = [1e9, 4e9, 7e9, 1.3e10, 7e10, 1.7e11];
  var N_LABEL = ["1B", "4B", "7B", "13B", "70B", "170B"];
  var D_OPTS = [1e11, 5e11, 1e12, 4e12, 1.5e13];
  var D_LABEL = ["100B", "500B", "1T", "4T", "15T"];
  var C_OPTS = [64, 128, 512, 1024, 4096];
  var MFUS = [0.30, 0.45, 0.60];

  var iN = root.querySelector("#mf-n");
  var iD = root.querySelector("#mf-d");
  var iC = root.querySelector("#mf-c");
  var vN = root.querySelector("#mf-n-val");
  var vD = root.querySelector("#mf-d-val");
  var vC = root.querySelector("#mf-c-val");

  var X0 = 90, Y0 = 330, Y1 = 60, W = 420;

  function drawStatic() {
    textLayer = staticG;
    var ax = el("line", { x1: X0, y1: Y0, x2: X0 + W + 20, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 });
    var ay = el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 15, stroke: "var(--fg)", "stroke-width": 1 });
    staticG.appendChild(ax); staticG.appendChild(ay);
    staticG.appendChild(text(X0 + W / 2 - 30, Y0 + 28, "训练墙钟时间（天，对数）", { "font-size": 12, fill: "var(--muted)" }));
    staticG.appendChild(text(X0 - 55, Y1 + 20, "天", { "font-size": 11, fill: "var(--muted)" }));
  }

  function fmtDays(d) {
    if (d >= 365) return (d / 365).toFixed(1) + " 年";
    if (d >= 1) return d.toFixed(1);
    return (d * 24).toFixed(1) + " h";
  }

  function draw() {
    textLayer = animG;
    var N = N_OPTS[+iN.value], D = D_OPTS[+iD.value], cards = C_OPTS[+iC.value];
    vN.textContent = N_LABEL[+iN.value];
    vD.textContent = D_LABEL[+iD.value];
    vC.textContent = cards;
    var C = 6 * N * D;
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var days = MFUS.map(function (m) { return C / (m * P_MAX * cards) / 86400; });
    var logs = days.map(function (d) { return Math.log10(d); });
    var lo = Math.min.apply(null, logs) - 0.2, hi = Math.max.apply(null, logs) + 0.2;
    function py(d) { return Y0 - (Math.log10(d) - lo) / (hi - lo) * (Y0 - Y1); }

    var bw = 90, gap = (W - 3 * bw) / 2;
    var labels = ["MFU 30%", "MFU 45%", "MFU 60%"];
    var colors = ["var(--warn, #c90)", "var(--accent, #47a)", "var(--ok, #2a2)"];
    for (var i = 0; i < 3; i++) {
      var x = X0 + 30 + i * (bw + gap);
      var y = py(days[i]);
      animG.appendChild(el("rect", { x: x, y: y, width: bw, height: Y0 - y, fill: colors[i], opacity: 0.75, rx: 3 }));
      animG.appendChild(text(x + bw / 2, y - 8, fmtDays(days[i]), { "font-size": 12, "text-anchor": "middle", fill: "var(--fg)", "font-weight": "bold" }));
      animG.appendChild(text(x + bw / 2, Y0 + 16, labels[i], { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" }));
    }
    animG.appendChild(text(X0 + W + 26, Y0 - 10, "C=" + (C / 1e21).toFixed(1) + "e21 FLOPs", { "font-size": 11, fill: "var(--muted)" }));
  }

  drawStatic();
  draw();
  iN.addEventListener("input", draw);
  iD.addEventListener("input", draw);
  iC.addEventListener("input", draw);
})();
