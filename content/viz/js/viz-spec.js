/* viz-spec：投机解码加速比曲线（B 类，双滑杆）
 * S(γ) = (1-α^(γ+1)) / ((1-α)(γc+1))
 * 单峰：分子饱和于 1/(1-α)，分母线性增长。
 */
(function () {
  var root = document.getElementById("viz-spec");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#spc-static");
  var animG = root.querySelector("#spc-anim");

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

  var G_MAX = 12;
  var S_MIN = 1, S_MAX = 8;
  var X0 = 70, X1 = 610, Y0 = 350, Y1 = 60;
  function px(g) { return X0 + (g - 1) / (G_MAX - 1) * (X1 - X0); }
  function py(s) { return Y0 - (Math.min(s, S_MAX) - S_MIN) / (S_MAX - S_MIN) * (Y0 - Y1); }

  function S(alpha, c, g) {
    return (1 - Math.pow(alpha, g + 1)) / ((1 - alpha) * (g * c + 1));
  }

  function drawAxes() {
    staticG.appendChild(el("rect", { x: X0, y: Y1, width: X1 - X0, height: Y0 - Y1, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    for (var g = 1; g <= G_MAX; g++) {
      var x = px(g);
      staticG.appendChild(el("line", { x1: x, y1: Y0, x2: x, y2: Y0 + 4, stroke: "var(--text-soft)", "stroke-width": 0.8 }));
      staticG.appendChild(text(x, Y0 + 17, String(g), { "font-size": 9, "text-anchor": "middle", fill: "var(--text-soft)" }));
    }
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (s) {
      var y = py(s);
      staticG.appendChild(el("line", { x1: X0 - 4, y1: y, x2: X0, y2: y, stroke: "var(--text-soft)", "stroke-width": 0.8 }));
      staticG.appendChild(text(X0 - 9, y + 3, String(s) + "×", { "font-size": 8.5, "text-anchor": "end", fill: "var(--text-soft)" }));
    });
    /* S=1 盈亏平衡线 */
    staticG.appendChild(el("line", { x1: X0, y1: py(1), x2: X1, y2: py(1), stroke: "var(--viz-danger)", "stroke-width": 1.2, "stroke-dasharray": "5 3" }));
    staticG.appendChild(text(X1 - 6, py(1) - 7, "S=1 盈亏平衡（低于此线不如不猜）", { "font-size": 9, "text-anchor": "end", fill: "var(--viz-danger)" }));
    staticG.appendChild(text((X0 + X1) / 2, Y0 + 34, "草稿长度 γ（一次猜几个 token）", { "font-size": 10, "text-anchor": "middle", fill: "var(--text)" }));
    staticG.appendChild(text(16, (Y0 + Y1) / 2, "加速比 S", { "font-size": 10, "text-anchor": "middle", fill: "var(--text)", transform: "rotate(-90 16 " + ((Y0 + Y1) / 2) + ")" }));
  }

  function draw(alpha, c) {
    animG.innerHTML = "";
    /* 天花板 1/(1-α) */
    var ceil = 1 / (1 - alpha);
    if (ceil <= S_MAX) {
      animG.appendChild(el("line", { x1: X0, y1: py(ceil), x2: X1, y2: py(ceil), stroke: "var(--text-soft)", "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.7 }));
      animG.appendChild(text(X0 + 6, py(ceil) - 6, "分子天花板 1/(1−α) = " + ceil.toFixed(2), { "font-size": 8.5, fill: "var(--text-soft)" }));
    }

    /* 曲线 */
    var pts = [], best = null, bg = 1;
    for (var g = 1; g <= G_MAX; g++) {
      var s = S(alpha, c, g);
      pts.push(px(g) + "," + py(s));
      if (!best || s > best) { best = s; bg = g; }
    }
    animG.appendChild(el("polyline", { points: pts.join(" "), fill: "none", stroke: "var(--viz-c)", "stroke-width": 2.4 }));

    for (var g2 = 1; g2 <= G_MAX; g2++) {
      var s2 = S(alpha, c, g2);
      var isBest = g2 === bg;
      animG.appendChild(el("circle", { cx: px(g2), cy: py(s2), r: isBest ? 6 : 3.4, fill: isBest ? "var(--viz-b)" : "var(--viz-c)", opacity: isBest ? 1 : 0.85 }));
      if (isBest) {
        animG.appendChild(el("circle", { cx: px(g2), cy: py(s2), r: 11, fill: "none", stroke: "var(--viz-b)", "stroke-width": 1.2, opacity: 0.55 }));
        animG.appendChild(text(px(g2), py(s2) - 18, "γ*=" + g2, { "font-size": 10, "font-weight": "bold", "text-anchor": "middle", fill: "var(--viz-b)" }));
        animG.appendChild(text(px(g2), py(s2) - 7, best.toFixed(2) + "×", { "font-size": 9, "text-anchor": "middle", fill: "var(--viz-b)" }));
      }
    }

    /* 读数面板 */
    var rx = 88, ry = 68;
    animG.appendChild(el("rect", { x: rx, y: ry, width: 214, height: 76, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9, opacity: 0.96 }));
    animG.appendChild(text(rx + 10, ry + 19, "α = " + alpha.toFixed(2) + "   c = " + c.toFixed(2), { "font-size": 10, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(text(rx + 10, ry + 36, "最优草稿长度 γ* = " + bg, { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(rx + 10, ry + 51, "最优加速比 = " + best.toFixed(2) + " ×", { "font-size": 9.5, "font-weight": "bold", fill: "var(--viz-b)" }));
    animG.appendChild(text(rx + 10, ry + 66, "期望产出 = " + ((1 - Math.pow(alpha, bg + 1)) / (1 - alpha)).toFixed(2) + " tokens/迭代", { "font-size": 9, fill: "var(--text-soft)" }));

    var concl;
    if (best < 1.05) {
      concl = "结论：这个配置下投机解码几乎不划算（草稿太贵或太不准）——先提升 α 或换更便宜的草稿，别调 γ。";
    } else if (bg <= 2) {
      concl = "结论：草稿成本 c=" + c.toFixed(2) + " 偏贵，最优点被压到 γ*=" + bg + "——贵草稿只能少猜，否则验证成本吃光收益。";
    } else {
      concl = "结论：最优点 γ*=" + bg + "（加速 " + best.toFixed(2) + "×）。再增大 γ 反而变慢：分子已饱和在 " + Math.min(ceil, 99).toFixed(2) + "，分母却还在线性涨。";
    }
    animG.appendChild(text(20, 400, concl, { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(20, 418, "提示：把 c 从 0.3 拉到 0.05，观察曲线整体抬高且 γ* 右移——便宜草稿可以「多猜几次」弥补猜不准。", { "font-size": 9, fill: "var(--text-soft)" }));
    animG.appendChild(text(20, 432, "另注：以上是延迟视角。GPU 满载时，被拒绝的草稿 token 是纯浪费，吞吐未必提升（见练习 6）。", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var aEl = root.querySelector("#spc-a"), cEl = root.querySelector("#spc-c");
  var aVal = root.querySelector("#spc-a-val"), cVal = root.querySelector("#spc-c-val");
  function update() {
    var alpha = +aEl.value / 100, c = +cEl.value / 100;
    aVal.textContent = alpha.toFixed(2);
    cVal.textContent = c.toFixed(2);
    draw(alpha, c);
  }
  drawAxes();
  [aEl, cEl].forEach(function (e) { e.addEventListener("input", update); });
  update();
})();
