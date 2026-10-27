/* viz-comm：环形 all-reduce 对比（B 类）
 * ring:   T = 2(N-1)/N * S/B + 2(N-1)α
 * naive:  T = 2(N-1) * S/B + 2α
 * tree:   T = 2*log2(N) * S/B + 2*log2(N)α
 */
(function () {
  var root = document.getElementById("viz-comm");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#cm-static");
  var animG = root.querySelector("#cm-anim");

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

  var N_OPTS = [2, 4, 8, 16, 32, 64];
  var S_OPTS = [0.1, 0.5, 2, 8, 26];
  var BW = 400e9, ALPHA = 10e-6;

  var iN = root.querySelector("#cm-n");
  var iS = root.querySelector("#cm-s");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 20, "环形 RS+AG 示意（每步传 S/N 的块）", { "font-size": 12, fill: "var(--muted)" }));
  }

  function drawRing(n, phase) {
    var cx = 150, cy = 150, R = 70;
    var step = 2 * Math.PI / n;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * step;
      var x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      animG.appendChild(el("circle", { cx: x, cy: y, r: 13, fill: "#4a7dbd", opacity: 0.85 }));
      if (n <= 16) animG.appendChild(text(x, y + 4, String(i), { "font-size": 10, "text-anchor": "middle", fill: "#fff" }));
      var a2 = -Math.PI / 2 + (i + 1) * step;
      var x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
      var mx1 = cx + (R + 7) * Math.cos(a + step / 2), my1 = cy + (R + 7) * Math.sin(a + step / 2);
      var mx2 = cx + (R + 7) * Math.cos(a2 - (phase % 1 + 0.5) * step), my2 = cy + (R + 7) * Math.sin(a2 - (phase % 1 + 0.5) * step);
      animG.appendChild(el("line", { x1: x + 13 * Math.cos(a + step / 2), y1: y + 13 * Math.sin(a + step / 2), x2: x2 - 13 * Math.cos(a + step / 2), y2: y2 - 13 * Math.sin(a + step / 2), stroke: "#d0873a", "stroke-width": 2 }));
    }
  }

  function fmt(ms) {
    if (ms >= 1000) return (ms / 1000).toFixed(2) + " s";
    if (ms >= 1) return ms.toFixed(0) + " ms";
    return (ms * 1000).toFixed(0) + " µs";
  }

  function draw() {
    textLayer = animG;
    var n = N_OPTS[+iN.value], Sgb = S_OPTS[+iS.value];
    root.querySelector("#cm-n-val").textContent = n;
    root.querySelector("#cm-s-val").textContent = Sgb;
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    drawRing(Math.min(n, 16), 0);

    var S = Sgb * 1e9;
    var tRing = 2 * (n - 1) / n * S / BW * 1000 + 2 * (n - 1) * ALPHA * 1000;
    var tNaive = 2 * (n - 1) * S / BW * 1000 + 2 * ALPHA * 1000;
    var lh = n > 1 ? Math.log2(n) : 1;
    var tTree = 2 * lh * S / BW * 1000 + 2 * lh * ALPHA * 1000;

    var bx0 = 300, bx1 = 600, by = 90;
    var rows = [["朴素", tNaive, "#c33"], ["环形", tRing, "#3a9d8f"], ["树形", tTree, "#4a7dbd"]];
    var mx = Math.max(tNaive, tRing, tTree);
    animG.appendChild(text(bx0, by - 24, "all-reduce 时间（S=" + Sgb + " GB，B=400 GB/s，α=10µs）", { "font-size": 12, fill: "var(--muted)" }));
    for (var i = 0; i < rows.length; i++) {
      var y = by + i * 34;
      animG.appendChild(text(bx0, y + 12, rows[i][0], { "font-size": 11, fill: "var(--fg)" }));
      animG.appendChild(el("rect", { x: bx0 + 44, y: y, width: Math.max((bx1 - bx0 - 100) * rows[i][1] / mx, 2), height: 16, fill: rows[i][2], opacity: 0.85, rx: 3 }));
      animG.appendChild(text(bx1 - 50, y + 12, fmt(rows[i][1]), { "font-size": 11, fill: "var(--fg)" }));
    }
    animG.appendChild(text(bx0, by + 128, "系数：朴素 2(N-1)　环形 2(N-1)/N　树形 2log₂N", { "font-size": 11, fill: "var(--muted)" }));
    animG.appendChild(text(bx0, by + 148, "延迟项：朴素 2α　环形 2(N-1)α　树形 2log₂N·α", { "font-size": 11, fill: "var(--muted)" }));
  }

  drawStatic();
  draw();
  iN.addEventListener("input", draw);
  iS.addEventListener("input", draw);
})();
