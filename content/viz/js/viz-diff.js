/* viz-diff：差商误差随 h 先降后升（C 类，静态 + 悬停读数）
 * 模型：相对误差 ≈ 截断项 h·|f''|/(2|f'|) + 舍入项 ε·|f|/(h·|f'|)
 * f(x)=x², x=3, f'=6, f''=2, f=9
 */
(function () {
  var root = document.getElementById("viz-diff");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 320, PAD = { l: 56, r: 30, t: 30, b: 50 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;

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

  var EPS = 2.22e-16;
  function truncErr(h) { return h * 2 / (2 * 6); }        // h·f''/(2f')
  function roundErr(h) { return EPS * 9 / (h * 6); }       // ε·f/(h·f')
  function totalErr(h) { return truncErr(h) + roundErr(h); }

  var hMin = 1e-12, hMax = 1;
  function sx(h) { return X0 + (Math.log10(h) - Math.log10(hMin)) / (Math.log10(hMax) - Math.log10(hMin)) * (X1 - X0); }
  var eMin = 1e-13, eMax = 1e-1;
  function sy(e) {
    var y = Y0 - (Math.log10(e) - Math.log10(eMin)) / (Math.log10(eMax) - Math.log10(eMin)) * (Y0 - Y1);
    return Math.max(Y1, Math.min(Y0, y));
  }

  var staticG = root.querySelector("#viz-df-static");
  /* 网格：log h 轴 */
  [1e-12, 1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1].forEach(function (h) {
    staticG.appendChild(el("line", { x1: sx(h), y1: Y0, x2: sx(h), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(h), Y0 + 18, "1e" + Math.log10(h), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  });
  [1e-13, 1e-11, 1e-9, 1e-7, 1e-5, 1e-3, 1e-1].forEach(function (e) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(e), x2: X1, y2: sy(e), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(e) + 4, "1e" + Math.log10(e), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 10, "步长 h（对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(14, (Y0 + Y1) / 2, "相对误差（对数轴）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));

  function curve(f, color, dash) {
    var d = "";
    for (var h = hMin; h <= hMax; h *= 1.15) {
      d += (d ? " L" : "M") + sx(h).toFixed(1) + " " + sy(f(h)).toFixed(1);
    }
    staticG.appendChild(el("path", { d: d, fill: "none", stroke: color, "stroke-width": 1.8, "stroke-dasharray": dash || "" }));
  }
  curve(truncErr, "var(--viz-b)", "5 4");
  curve(roundErr, "var(--viz-c)", "5 4");
  curve(totalErr, "var(--accent)");
  staticG.appendChild(text(X1 - 6, sy(1e-2) + 16, "截断误差 ∝ h", { "text-anchor": "end", "font-size": 11, fill: "var(--viz-b)" }));
  staticG.appendChild(text(X1 - 6, sy(1e-10) - 6, "舍入误差 ∝ 1/h", { "text-anchor": "end", "font-size": 11, fill: "var(--viz-c)" }));
  staticG.appendChild(text(X1 - 6, sy(1e-6) + 16, "总误差（U 形）", { "text-anchor": "end", "font-size": 11, fill: "var(--accent)", "font-weight": 700 }));
  /* 最优点标注：最优 h ≈ sqrt(ε·f·2 / (f'·f''))，本例约 1e-5 */
  var hOpt = Math.sqrt(EPS * 9 * 2 / (6 * 2));
  staticG.appendChild(el("line", { x1: sx(hOpt), y1: Y1, x2: sx(hOpt), y2: Y0, stroke: "var(--warn)", "stroke-width": 1, "stroke-dasharray": "3 3" }));
  staticG.appendChild(text(sx(hOpt), Y1 - 8, "最优 h≈1e-5", { "text-anchor": "middle", "font-size": 11, fill: "var(--warn)", "font-weight": 700 }));

  /* 悬停读数 */
  var hoverG = root.querySelector("#viz-df-hover");
  var vline = el("line", { y1: Y1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 0.8, "stroke-dasharray": "2 3", visibility: "hidden" });
  var vdot = el("circle", { r: 4, fill: "var(--accent)", visibility: "hidden" });
  var vlabel = text(0, 0, "", { "font-size": 11, fill: "var(--text)", visibility: "hidden" });
  hoverG.appendChild(vline); hoverG.appendChild(vdot); hoverG.appendChild(vlabel);

  var svg = root.querySelector("svg");
  svg.addEventListener("mousemove", function (ev) {
    var pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    var frac = (loc.x - X0) / (X1 - X0);
    if (frac < 0 || frac > 1) {
      vline.setAttribute("visibility", "hidden");
      vdot.setAttribute("visibility", "hidden");
      vlabel.setAttribute("visibility", "hidden");
      return;
    }
    var h = Math.pow(10, Math.log10(hMin) + frac * (Math.log10(hMax) - Math.log10(hMin)));
    vline.setAttribute("x1", sx(h)); vline.setAttribute("x2", sx(h));
    vline.setAttribute("visibility", "visible");
    vdot.setAttribute("cx", sx(h)); vdot.setAttribute("cy", sy(totalErr(h)));
    vdot.setAttribute("visibility", "visible");
    vlabel.setAttribute("x", Math.min(X1 - 150, sx(h) + 8));
    vlabel.setAttribute("y", Y1 + 16);
    vlabel.textContent = "h=" + h.toExponential(1) + "，总误差≈" + totalErr(h).toExponential(1);
    vlabel.setAttribute("visibility", "visible");
  });
  svg.addEventListener("mouseleave", function () {
    vline.setAttribute("visibility", "hidden");
    vdot.setAttribute("visibility", "hidden");
    vlabel.setAttribute("visibility", "hidden");
  });
})();
