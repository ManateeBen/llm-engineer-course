/* viz-surprise：-log2(p) 曲线 + p 滑杆 */
(function () {
  var root = document.getElementById("viz-surprise");
  if (!root) return;
  var svg = root.querySelector("svg");
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 340, PAD = { l: 54, r: 40, t: 24, b: 44 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  // p 用对数横轴更直观
  var pMin = 0.001, pMax = 1;
  var yMax = 10;

  function sp(p) { return X0 + (Math.log(p) - Math.log(pMin)) / (Math.log(pMax) - Math.log(pMin)) * (X1 - X0); }
  function sy(y) { return Y0 - y / yMax * (Y0 - Y1); }
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
  function f(p) { return -Math.log2(p); }

  /* 网格：横轴按 p 的常用值 */
  var grid = root.querySelector("#viz-sur-grid");
  var marks = [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 1];
  marks.forEach(function (p) {
    grid.appendChild(el("line", { x1: sp(p), y1: Y0, x2: sp(p), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    grid.appendChild(text(sp(p), Y0 + 18, String(p), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  });
  for (var gy = 0; gy <= yMax; gy += 2) {
    grid.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.5 }));
    grid.appendChild(text(X0 - 8, sy(gy) + 4, String(gy), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  grid.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  grid.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  grid.appendChild(text((X0 + X1) / 2, H - 8, "模型给「正确词」的概率 p（对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  grid.appendChild(text(14, (Y0 + Y1) / 2, "惊讶程度（比特）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));

  /* 曲线 */
  var curves = root.querySelector("#viz-sur-curves");
  var d = "";
  for (var p = pMin; p <= 1.0000001; p *= 1.01) {
    d += (d ? " L" : "M") + sp(p).toFixed(1) + " " + sy(Math.min(yMax, f(p))).toFixed(1);
  }
  curves.appendChild(el("path", { d: d, fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 }));
  /* 参考点 */
  [[0.5, 1], [0.25, 2], [0.001, 9.97]].forEach(function (pt) {
    curves.appendChild(el("circle", { cx: sp(pt[0]), cy: sy(pt[1]), r: 3.5, fill: "var(--warn)" }));
    curves.appendChild(text(sp(pt[0]) + 6, sy(pt[1]) - 4, "p=" + pt[0] + " → " + pt[1], { "font-size": 11, fill: "var(--warn)" }));
  });

  /* 光标 */
  var cursorG = root.querySelector("#viz-sur-cursor");
  var dot = el("circle", { r: 5, fill: "var(--accent)", stroke: "var(--bg)", "stroke-width": 2 });
  var vline = el("line", { stroke: "var(--accent)", "stroke-width": 1, "stroke-dasharray": "3 3" });
  var label = text(0, 0, "", { "font-size": 12, fill: "var(--accent)", "font-weight": 700 });
  cursorG.appendChild(vline); cursorG.appendChild(dot); cursorG.appendChild(label);

  var slider = root.querySelector("#viz-sur-p");
  var pval = root.querySelector("#viz-sur-pval");
  var readout = root.querySelector("#viz-sur-readout");

  function update() {
    var p = parseFloat(slider.value);
    pval.textContent = p.toFixed(3);
    var v = f(p);
    vline.setAttribute("x1", sp(p)); vline.setAttribute("x2", sp(p));
    vline.setAttribute("y1", Y0); vline.setAttribute("y2", sy(Math.min(yMax, v)));
    dot.setAttribute("cx", sp(p)); dot.setAttribute("cy", sy(Math.min(yMax, v)));
    label.setAttribute("x", Math.min(X1 - 90, sp(p) + 8));
    label.setAttribute("y", sy(Math.min(yMax, v)) - 8);
    label.textContent = "−log₂ " + p.toFixed(3) + " = " + v.toFixed(2) + " 比特";
    readout.textContent = "≈ 模型平均在 2^" + v.toFixed(2) + " ≈ " + Math.pow(2, v).toFixed(1) + " 个等可能选项里猜";
  }
  slider.addEventListener("input", update);
  update();
})();
