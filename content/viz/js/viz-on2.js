/* viz-on2：n、n log n、n² 增长曲线（C 类，静态） */
(function () {
  var root = document.getElementById("viz-on2");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 330, PAD = { l: 60, r: 110, t: 30, b: 48 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var nMax = 1000, yMax = 1e6;

  function sx(n) { return X0 + n / nMax * (X1 - X0); }
  function sy(y) { return Y0 - Math.log10(y) / Math.log10(yMax) * (Y0 - Y1); }
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

  var staticG = root.querySelector("#viz-o2-static");
  /* 网格 */
  [1, 100, 250, 500, 750, 1000].forEach(function (n) {
    staticG.appendChild(el("line", { x1: sx(n), y1: Y0, x2: sx(n), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(n), Y0 + 18, String(n), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  });
  [1, 10, 100, 1000, 10000, 100000, 1000000].forEach(function (y) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(y), x2: X1, y2: sy(y), stroke: "var(--border)", "stroke-width": 0.5 }));
    var lbl = y >= 1000 ? (y / 1000) + "K" : String(y);
    staticG.appendChild(text(X0 - 8, sy(y) + 4, lbl, { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 10, "序列长度 n（词数）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(16, (Y0 + Y1) / 2, "开销（对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 16 " + (Y0 + Y1) / 2 + ")" }));

  function curve(f, color, dash) {
    var d = "";
    for (var n = 1; n <= nMax; n += 2) {
      d += (d ? " L" : "M") + sx(n).toFixed(1) + " " + sy(Math.max(1, Math.min(yMax, f(n)))).toFixed(1);
    }
    staticG.appendChild(el("path", { d: d, fill: "none", stroke: color, "stroke-width": 2, "stroke-dasharray": dash || "" }));
  }
  curve(function (n) { return n; }, "var(--viz-b)");
  curve(function (n) { return n * Math.log2(Math.max(2, n)); }, "var(--viz-c)", "6 4");
  curve(function (n) { return n * n; }, "var(--viz-a)");

  staticG.appendChild(text(X1 + 8, sy(nMax) + 4, "O(n)", { "font-size": 12, fill: "var(--viz-b)", "font-weight": 700 }));
  staticG.appendChild(text(X1 + 8, sy(nMax * Math.log2(nMax)) + 4, "O(n log n)", { "font-size": 12, fill: "var(--viz-c)", "font-weight": 700 }));
  staticG.appendChild(text(X1 + 8, sy(nMax * nMax) + 4, "O(n²)", { "font-size": 12, fill: "var(--viz-a)", "font-weight": 700 }));

  /* n=1000 处的垂直参考线 */
  staticG.appendChild(el("line", { x1: sx(1000), y1: Y1, x2: sx(1000), y2: Y0, stroke: "var(--text-soft)", "stroke-width": 0.8, "stroke-dasharray": "3 3" }));
  staticG.appendChild(text(sx(1000) - 4, Y1 + 14, "n=1000：1K vs 1M", { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
})();
