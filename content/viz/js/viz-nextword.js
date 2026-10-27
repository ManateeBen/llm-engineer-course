/* viz-nextword：下一词概率分布柱状图（C 类，静态 + 悬停） */
(function () {
  var root = document.getElementById("viz-nextword");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 330, PAD = { l: 54, r: 30, t: 30, b: 60 };
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

  /* 示意分布（教学用构造值） */
  var words = [
    { w: "好", p: 0.52 },
    { w: "热", p: 0.16 },
    { w: "冷", p: 0.13 },
    { w: "蓝", p: 0.08 },
    { w: "糟", p: 0.06 },
    { w: "其他…", p: 0.05 }
  ];

  var staticG = root.querySelector("#viz-nw-static");
  var slotW = (X1 - X0) / words.length;
  var barW = slotW * 0.56;

  /* 坐标轴 */
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  [0.25, 0.5, 0.75, 1].forEach(function (g) {
    var y = Y0 - g * (Y0 - Y1);
    staticG.appendChild(el("line", { x1: X0, y1: y, x2: X1, y2: y, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, y + 4, String(g), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(text((X0 + X1) / 2, H - 12, "上下文「今天天气真___」→ 候选词（按概率降序）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));

  words.forEach(function (d, i) {
    var cx = X0 + i * slotW + (slotW - barW) / 2;
    var h = d.p * (Y0 - Y1);
    var y = Y0 - h;
    var color = i === 0 ? "var(--accent)" : "var(--viz-b)";
    var bar = el("rect", {
      x: cx, y: y, width: barW, height: h, rx: 4,
      fill: color, opacity: 0.85, stroke: "var(--border)", "stroke-width": 0.5
    });
    staticG.appendChild(bar);
    staticG.appendChild(text(cx + barW / 2, y - 8, d.p.toFixed(2), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
    staticG.appendChild(text(cx + barW / 2, Y0 + 20, d.w, { "text-anchor": "middle", "font-size": 13, fill: "var(--text)" }));
    /* 悬停效果 */
    bar.addEventListener("mouseenter", function () {
      bar.setAttribute("opacity", "1");
      bar.setAttribute("stroke", "var(--accent)");
    });
    bar.addEventListener("mouseleave", function () {
      bar.setAttribute("opacity", "0.85");
      bar.setAttribute("stroke", "var(--border)");
    });
  });

  /* 注释：和为 1 */
  var sum = words.reduce(function (s, d) { return s + d.p; }, 0);
  staticG.appendChild(text(X1 - 4, Y1 + 10, "概率和 = " + sum.toFixed(2), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)", "font-style": "italic" }));
})();
