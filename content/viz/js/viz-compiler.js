/* viz-compiler：融合收益模型（B 类）
 * 不融合流量 2kn；窗口 w 融合 ⇒ ⌈k/w⌉ 段，流量 2n·(⌈k/w⌉ 读 + ⌈k/w⌉ 写) 近似 2·k'·n。
 * 承 8-9 §2。
 */
(function () {
  var root = document.getElementById("viz-compiler");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#cp-static");
  var animG = root.querySelector("#cp-anim");

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

  var iK = root.querySelector("#cp-k");
  var iW = root.querySelector("#cp-w");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 22, "HBM 流量（单位：n 字节）", { "font-size": 12, fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var k = +iK.value, w = +iW.value;
    root.querySelector("#cp-k-val").textContent = k;
    root.querySelector("#cp-w-val").textContent = w;
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var unfused = 2 * k;
    var groups = Math.ceil(k / w);
    var fused = 2 * groups;
    var bx0 = 60, x1 = 420, by = 60;
    var mx = Math.max(unfused, fused);
    var rows = [["不融合", unfused, "#c33"], ["融合后", fused, "#3a9d8f"]];
    for (var i = 0; i < 2; i++) {
      var y = by + i * 40;
      animG.appendChild(text(bx0, y + 14, rows[i][0], { "font-size": 12, fill: "var(--fg)" }));
      animG.appendChild(el("rect", { x: bx0 + 70, y: y, width: (x1 - bx0 - 70) * rows[i][1] / mx, height: 22, fill: rows[i][2], opacity: 0.85, rx: 3 }));
      animG.appendChild(text(bx0 + 78 + (x1 - bx0 - 70) * rows[i][1] / mx, y + 14, rows[i][1] + "n", { "font-size": 12, fill: "var(--fg)", "font-weight": "bold" }));
    }
    var gain = (unfused / fused).toFixed(1);
    animG.appendChild(text(bx0, by + 104, "提速 " + gain + "×（理想 = k×），窗口 " + w + " / k = " + k, { "font-size": 12, fill: "var(--fg)" }));

    // 右侧：k 个算子方块，按窗口 w 分组着色
    var gx = 460, gy = 60, cell = 30;
    animG.appendChild(text(gx, gy - 12, "算子分组（窗口 " + w + "）", { "font-size": 11, fill: "var(--muted)" }));
    var gcols = ["#4a7dbd", "#3a9d8f", "#d0873a", "#7a5db8", "#c33"];
    for (var j = 0; j < k; j++) {
      var gIdx = Math.floor(j / w);
      animG.appendChild(el("rect", { x: gx + (j % 5) * cell, y: gy + Math.floor(j / 5) * cell, width: cell - 3, height: cell - 3, fill: gcols[gIdx % gcols.length], opacity: 0.85, rx: 3 }));
    }
    animG.appendChild(text(gx, gy + Math.ceil(k / 5) * cell + 22, groups + " 次组内遍历 → 流量 2·" + groups + "·n", { "font-size": 11, fill: "var(--fg)" }));
  }

  drawStatic();
  draw();
  iK.addEventListener("input", draw);
  iW.addEventListener("input", draw);
})();
