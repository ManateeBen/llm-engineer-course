/* viz-schedule：学习率调度对比（B 类，可交互）
 * linear / cosine / WSD 三条曲线；调 WSD 衰减占比、warmup 占比、退出点。
 * 演示 WSD 稳定期中途退出 + 短 decay ≈ 全程最优。
 */
(function () {
  var root = document.getElementById("viz-schedule");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#sch-static");
  var animG = root.querySelector("#sch-anim");

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

  var ETA_MAX = 1.0, ETA_MIN = 0.0;
  var X0 = 70, Y0 = 60, W = 470, H = 300;
  function px(t) { return X0 + t * W; }
  function py(v) { return Y0 + H - v * H; }

  function linear(t) { return ETA_MAX * (1 - t) + ETA_MIN * t; }
  function cosine(t) { return ETA_MIN + 0.5 * ETA_MAX * (1 + Math.cos(Math.PI * t)); }
  function wsd(t, tw, td) {
    if (t < tw) return ETA_MAX * (tw === 0 ? t : t / tw);
    if (t < 1 - td) return ETA_MAX;
    var r = (t - (1 - td)) / td; // 0..1
    return ETA_MAX * (1 - r) + ETA_MIN * r;
  }

  function curve(fn, color, tw, td, dash) {
    var d = "";
    for (var i = 0; i <= 120; i++) {
      var t = i / 120;
      var x = px(t), y = py(fn(t, tw, td));
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
    animG.appendChild(el("path", { d: d, fill: "none", stroke: color, "stroke-width": 2, "stroke-dasharray": dash || "none" }));
  }

  function draw(tw, td, exitT) {
    animG.innerHTML = "";
    // 坐标轴
    staticG.innerHTML = "";
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y0 + H, stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(el("line", { x1: X0, y1: Y0 + H, x2: X0 + W, y2: Y0 + H, stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(text(X0 - 8, Y0 - 8, "η", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
    staticG.appendChild(text(X0 + W - 4, Y0 + H + 24, "训练进度 t", { "font-size": 10, fill: "var(--text-soft)" }));
    [0, 0.25, 0.5, 0.75, 1].forEach(function (s) {
      staticG.appendChild(text(px(s) - 3, Y0 + H + 14, String(s), { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    staticG.appendChild(text(72, 340, "linear", { "font-size": 10, fill: "var(--viz-b)" }));
    staticG.appendChild(text(180, 200, "cosine", { "font-size": 10, fill: "var(--accent)" }));
    staticG.appendChild(text(360, 70, "WSD", { "font-size": 10, fill: "#22c55e" }));

    curve(linear, "var(--viz-b)", 0, 0, "none");
    curve(cosine, "var(--accent)", 0, 0, "none");
    curve(wsd, "#22c55e", tw / 100, td / 100, "none");

    // WSD 稳定期区间高亮
    var twN = tw / 100, tdN = td / 100;
    animG.appendChild(el("rect", { x: px(twN), y: Y0, width: px(1 - tdN) - px(twN), height: H, fill: "#22c55e", opacity: 0.06 }));
    // 退出点竖线
    if (exitT / 100 > twN && exitT / 100 < 1 - tdN) {
      var ex = px(exitT / 100);
      animG.appendChild(el("line", { x1: ex, y1: Y0, x2: ex, y2: Y0 + H, stroke: "var(--accent)", "stroke-width": 1.3, "stroke-dasharray": "4 3" }));
      animG.appendChild(el("circle", { cx: ex, cy: py(ETA_MAX), r: 4, fill: "var(--accent)" }));
      animG.appendChild(text(ex + 4, Y0 + 16, "退出点", { "font-size": 9, fill: "var(--accent)" }));
      // 注解
      animG.appendChild(el("rect", { x: 360, y: 360, width: 268, height: 56, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
      animG.appendChild(text(372, 380, "WSD 中途退出优势", { "font-size": 10, "font-weight": "bold", fill: "var(--text)" }));
      animG.appendChild(text(372, 396, "稳定期此点存 checkpoint，接一段短", { "font-size": 9, fill: "var(--text-soft)" }));
      animG.appendChild(text(372, 410, "decay ≈ 全程衰减的 loss。随时可停。", { "font-size": 9, fill: "var(--text-soft)" }));
    }
    // 说明：WSD decay 段占比
    animG.appendChild(text(X0, 24, "三条曲线峰值相同；右侧可调 WSD 衰减段与退出点", { "font-size": 10, fill: "var(--text-soft)" }));
  }

  var decayEl = root.querySelector("#sch-decay");
  var warmEl = root.querySelector("#sch-warm");
  var exitEl = root.querySelector("#sch-exit");
  var decayVal = root.querySelector("#sch-decay-val");
  var warmVal = root.querySelector("#sch-warm-val");
  var exitVal = root.querySelector("#sch-exit-val");

  function update() {
    var td = +decayEl.value, tw = +warmEl.value, ex = +exitEl.value;
    decayVal.textContent = td + "%";
    warmVal.textContent = tw + "%";
    exitVal.textContent = ex + "%";
    draw(tw, td, ex);
  }
  decayEl.addEventListener("input", update);
  warmEl.addEventListener("input", update);
  exitEl.addEventListener("input", update);
  update();
})();
