/* viz-activations：ReLU / GELU / SiLU 曲线 + x 滑杆 */
(function () {
  var root = document.getElementById("viz-activations");
  if (!root) return;
  var svg = root.querySelector("svg");
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 340, PAD = { l: 54, r: 130, t: 24, b: 44 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var xMin = -4, xMax = 4, yMin = -1, yMax = 4;

  function sx(x) { return X0 + (x - xMin) / (xMax - xMin) * (X1 - X0); }
  function sy(y) { return Y0 - (y - yMin) / (yMax - yMin) * (Y0 - Y1); }
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

  /* 函数定义 */
  function relu(x) { return Math.max(0, x); }
  function gelu(x) { // tanh 近似
    return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
  }
  function silu(x) { return x / (1 + Math.exp(-x)); }

  var series = [
    { name: "ReLU", f: relu, color: "var(--viz-a)", dash: "" },
    { name: "GELU", f: gelu, color: "var(--viz-b)", dash: "" },
    { name: "SiLU", f: silu, color: "var(--viz-c)", dash: "5 4" }
  ];

  /* 网格与坐标轴 */
  var grid = root.querySelector("#viz-act-grid");
  for (var gx = xMin; gx <= xMax; gx += 2) {
    grid.appendChild(el("line", { x1: sx(gx), y1: Y0, x2: sx(gx), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    grid.appendChild(text(sx(gx), Y0 + 18, String(gx), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (var gy = yMin; gy <= yMax; gy += 1) {
    grid.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.5 }));
    grid.appendChild(text(X0 - 8, sy(gy) + 4, String(gy), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  grid.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  grid.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  grid.appendChild(text((X0 + X1) / 2, H - 8, "输入 x", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  grid.appendChild(text(14, (Y0 + Y1) / 2, "激活(x)", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));

  /* 曲线 */
  var curves = root.querySelector("#viz-act-curves");
  series.forEach(function (s) {
    var d = "";
    for (var px = xMin; px <= xMax + 1e-9; px += 0.05) {
      d += (d ? " L" : "M") + sx(px).toFixed(1) + " " + sy(Math.max(yMin, Math.min(yMax, s.f(px)))).toFixed(1);
    }
    curves.appendChild(el("path", { d: d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-dasharray": s.dash }));
    curves.appendChild(text(X1 + 8, sy(s.f(xMax)) + 4, s.name, { "font-size": 12, fill: s.color, "font-weight": 700 }));
  });

  /* 滑杆光标 */
  var cursorG = root.querySelector("#viz-act-cursor");
  var vline = el("line", { stroke: "var(--accent)", "stroke-width": 1, "stroke-dasharray": "3 3" });
  var dots = series.map(function (s) {
    return el("circle", { r: 4, fill: s.color, stroke: "var(--bg)", "stroke-width": 1.5 });
  });
  var labels = series.map(function (s) {
    return text(0, 0, "", { "font-size": 11, fill: s.color, "font-weight": 700 });
  });
  cursorG.appendChild(vline);
  dots.forEach(function (d) { cursorG.appendChild(d); });
  labels.forEach(function (l) { cursorG.appendChild(l); });

  var slider = root.querySelector("#viz-act-x");
  var xval = root.querySelector("#viz-act-xval");
  var readout = root.querySelector("#viz-act-readout");

  function update() {
    var x = parseFloat(slider.value);
    xval.textContent = x.toFixed(2);
    vline.setAttribute("x1", sx(x)); vline.setAttribute("x2", sx(x));
    vline.setAttribute("y1", Y0); vline.setAttribute("y2", Y1);
    var parts = [];
    series.forEach(function (s, i) {
      var v = s.f(x);
      dots[i].setAttribute("cx", sx(x)); dots[i].setAttribute("cy", sy(Math.max(yMin, Math.min(yMax, v))));
      labels[i].setAttribute("x", sx(x) + 8);
      labels[i].setAttribute("y", sy(Math.max(yMin, Math.min(yMax, v))) - 6);
      labels[i].textContent = s.name + "=" + v.toFixed(2);
      parts.push(s.name + " " + v.toFixed(2));
    });
    readout.textContent = parts.join("   ");
  }
  slider.addEventListener("input", update);
  update();
})();
