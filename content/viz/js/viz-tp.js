/* viz-tp：Megatron MLP 切分步进动画（A 类）
 * 6 步：0 复制 X → 1 列切 GEMM → 2 GELU → 3 行切 GEMM(部分和)
 * → 4 all-reduce → 5 输出 Z。承 8-3 §2。
 */
(function () {
  var root = document.getElementById("viz-tp");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#tp-static");
  var animG = root.querySelector("#tp-anim");

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

  var STEPS = [
    "输入 X 复制到两卡",
    "列切 W1：各卡算 Y_i = X·W1_i",
    "GELU 逐元素：切分封闭，无需通信",
    "行切 W2：各卡得部分和 Z_i",
    "ALL-REDUCE：Z = Z_1 + Z_2（唯一前向通信）",
    "输出完整 Z，进入下一层"
  ];

  var step = root.querySelector("#tp-step");
  var play = root.querySelector("#tp-play");
  var timer = null;

  function drawStatic() {
    textLayer = staticG;
    // 两卡底板
    staticG.appendChild(el("rect", { x: 60, y: 60, width: 240, height: 300, rx: 8, fill: "rgba(74,125,189,0.07)", stroke: "#4a7dbd", "stroke-width": 1 }));
    staticG.appendChild(el("rect", { x: 340, y: 60, width: 240, height: 300, rx: 8, fill: "rgba(58,157,143,0.07)", stroke: "#3a9d8f", "stroke-width": 1 }));
    staticG.appendChild(text(180, 50, "卡 1", { "font-size": 12, "text-anchor": "middle", fill: "#4a7dbd", "font-weight": "bold" }));
    staticG.appendChild(text(460, 50, "卡 2", { "font-size": 12, "text-anchor": "middle", fill: "#3a9d8f", "font-weight": "bold" }));
    staticG.appendChild(text(320, 392, "W1 ∈ R^{d×4d} 按列切　W2 ∈ R^{4d×d} 按行切", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" }));
  }

  function box(x, y, w, h, label, color, visible) {
    if (!visible) return;
    animG.appendChild(el("rect", { x: x, y: y, width: w, height: h, rx: 5, fill: color, opacity: 0.85 }));
    animG.appendChild(text(x + w / 2, y + h / 2 + 4, label, { "font-size": 11, "text-anchor": "middle", fill: "#fff" }));
  }
  function arrow(x1, y1, x2, y2, color) {
    animG.appendChild(el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, "stroke-width": 2, "marker-end": "url(#tp-arrow)" }));
  }

  function draw() {
    textLayer = animG;
    var s = +step.value;
    root.querySelector("#tp-step-val").textContent = s + " / 5";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    // 步骤说明
    animG.appendChild(text(320, 26, STEPS[s], { "font-size": 13, "text-anchor": "middle", fill: "var(--fg)", "font-weight": "bold" }));

    var show = function (n) { return s >= n; };
    // X
    box(80, 90, 90, 30, "X", "#555", show(0));
    box(440, 90, 90, 30, "X", "#555", show(0));
    // Y_i
    box(80, 160, 120, 30, "Y₁=X·W1₁", "#4a7dbd", show(1));
    box(360, 160, 120, 30, "Y₂=X·W1₂", "#3a9d8f", show(1));
    // GELU
    box(80, 220, 120, 28, "GELU", "#4a7dbd", show(2));
    box(360, 220, 120, 28, "GELU", "#3a9d8f", show(2));
    // partial
    box(80, 280, 120, 30, "Z₁ = G₁·W2₁", "#4a7dbd", show(3));
    box(360, 280, 120, 30, "Z₂ = G₂·W2₂", "#3a9d8f", show(3));

    if (show(1)) { arrow(140, 122, 140, 158, "#4a7dbd"); arrow(470, 122, 470, 158, "#3a9d8f"); }
    if (show(2)) { arrow(140, 192, 140, 218, "#4a7dbd"); arrow(470, 192, 470, 218, "#3a9d8f"); }
    if (show(3)) { arrow(140, 250, 140, 278, "#4a7dbd"); arrow(470, 250, 470, 278, "#3a9d8f"); }

    if (show(4)) {
      // all-reduce 双向箭头 + 闪光
      var flash = s === 4;
      animG.appendChild(el("line", { x1: 205, y1: 295, x2: 355, y2: 295, stroke: flash ? "#e33" : "#888", "stroke-width": flash ? 4 : 2, "stroke-dasharray": "6,4" }));
      animG.appendChild(el("line", { x1: 355, y1: 305, x2: 205, y2: 305, stroke: flash ? "#e33" : "#888", "stroke-width": flash ? 4 : 2, "stroke-dasharray": "6,4" }));
      animG.appendChild(text(280, 285, "ALL-REDUCE", { "font-size": 11, "text-anchor": "middle", fill: flash ? "#e33" : "var(--muted)", "font-weight": "bold" }));
      if (flash) {
        animG.appendChild(el("circle", { cx: 280, cy: 295, r: 26, fill: "none", stroke: "#e33", "stroke-width": 2, opacity: 0.6 }));
      }
    }
    if (show(5)) {
      box(200, 330, 160, 26, "Z（完整输出）", "#2a7a3a", true);
    }
  }

  function tick() {
    var v = (+step.value + 1) % 6;
    step.value = v;
    draw();
  }
  play.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; play.textContent = "▶ 播放"; }
    else { timer = setInterval(tick, 900); play.textContent = "⏸ 停止"; }
  });
  step.addEventListener("input", function () {
    if (timer) { clearInterval(timer); timer = null; play.textContent = "▶ 播放"; }
    draw();
  });

  drawStatic();
  draw();
})();
