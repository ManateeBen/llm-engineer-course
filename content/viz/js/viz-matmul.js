/* viz-matmul：矩阵乘法"加权求和"动画
 * W = [[1,0,2],[-1,3,1]] (2x3)，x = [2,-1,3] (3x1) → y = [8,-2]
 */
(function () {
  var root = document.getElementById("viz-matmul");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var Wm = [[1, 0, 2], [-1, 3, 1]];
  var xv = [2, -1, 3];
  var yv = [0, 0];

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

  var staticG = root.querySelector("#viz-mm-static");
  var animG = root.querySelector("#viz-mm-anim");

  /* 布局 */
  var CELL = 34, GAP = 6;
  var wx = 40, wy = 90;           // W 左上
  var xx = 210, xy = 90;          // x 左上
  var yx = 420, yy = 100;         // y 左上
  var opX = wx + 3 * (CELL + GAP) + 8;
  var opY = xy + 1.5 * (CELL + GAP);
  var eqX = yx - 40;

  staticG.appendChild(text(wx, wy - 14, "W（2×3）", { "font-size": 12, "font-weight": 700, fill: "var(--text)" }));
  staticG.appendChild(text(xx, xy - 14, "x（3×1）", { "font-size": 12, "font-weight": 700, fill: "var(--text)" }));
  staticG.appendChild(text(yx, yy - 14, "y = Wx（2×1）", { "font-size": 12, "font-weight": 700, fill: "var(--text)" }));
  staticG.appendChild(text(opX, opY + 10, "×", { "font-size": 22, fill: "var(--text-soft)" }));
  staticG.appendChild(text(eqX, opY + 10, "=", { "font-size": 22, fill: "var(--text-soft)" }));

  var wCells = [], xCells = [], yCells = [];
  for (var i = 0; i < 2; i++) {
    for (var j = 0; j < 3; j++) {
      var r = el("rect", { x: wx + j * (CELL + GAP), y: wy + i * (CELL + GAP), width: CELL, height: CELL, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)" });
      staticG.appendChild(r);
      wCells.push(r);
      var t = text(wx + j * (CELL + GAP) + CELL / 2, wy + i * (CELL + GAP) + CELL / 2 + 4, String(Wm[i][j]), { "text-anchor": "middle", "font-size": 13, fill: "var(--text)" });
      staticG.appendChild(t);
    }
  }
  for (var j2 = 0; j2 < 3; j2++) {
    var r2 = el("rect", { x: xx, y: xy + j2 * (CELL + GAP), width: CELL, height: CELL, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)" });
    staticG.appendChild(r2);
    xCells.push(r2);
    staticG.appendChild(text(xx + CELL / 2, xy + j2 * (CELL + GAP) + CELL / 2 + 4, String(xv[j2]), { "text-anchor": "middle", "font-size": 13, fill: "var(--text)" }));
  }
  for (var i2 = 0; i2 < 2; i2++) {
    var r3 = el("rect", { x: yx, y: yy + i2 * (CELL + 12), width: CELL + 10, height: CELL, rx: 5, fill: "var(--ok-soft)", stroke: "var(--ok)" });
    staticG.appendChild(r3);
    yCells.push(r3);
    staticG.appendChild(text(yx + (CELL + 10) / 2, yy + i2 * (CELL + 12) + CELL / 2 + 4, "y" + (i2 + 1) + "=?", { "text-anchor": "middle", "font-size": 13, fill: "var(--ok)", "font-weight": 700 }));
  }
  /* 说明 */
  staticG.appendChild(text(40, 210, "y₁ = 1·2 + 0·(−1) + 2·3 = 8      y₂ = −1·2 + 3·(−1) + 1·3 = −2", { "font-size": 13, fill: "var(--text-soft)" }));

  /* 动画序列：y1 三项 → y2 三项 */
  var steps = [];
  for (var row = 0; row < 2; row++) {
    for (var col = 0; col < 3; col++) {
      steps.push({ row: row, col: col });
    }
  }
  var timer = null, stepIdx = 0, playing = false;

  function clearAnim() {
    while (animG.firstChild) animG.removeChild(animG.firstChild);
    wCells.forEach(function (c) { c.setAttribute("fill", "var(--bg-soft)"); });
    xCells.forEach(function (c) { c.setAttribute("fill", "var(--bg-soft)"); });
    yCells.forEach(function (c) { c.setAttribute("fill", "var(--ok-soft)"); });
  }

  function drawStep(k) {
    clearAnim();
    var s = steps[k];
    var wRect = { x: wx + s.col * (CELL + GAP), y: wy + s.row * (CELL + GAP) };
    var xRect = { x: xx, y: xy + s.col * (CELL + GAP) };
    var yRect = { x: yx, y: yy + s.row * (CELL + 12) };
    wCells[s.row * 3 + s.col].setAttribute("fill", "var(--accent-soft)");
    xCells[s.col].setAttribute("fill", "var(--accent-soft)");
    yCells[s.row].setAttribute("fill", "var(--warn-soft)");
    /* 连线 */
    var mid = el("path", {
      d: "M" + (wRect.x + CELL) + " " + (wRect.y + CELL / 2) + " L" + (xRect.x) + " " + (xRect.y + CELL / 2),
      stroke: "var(--accent)", "stroke-width": 1.5, fill: "none", "stroke-dasharray": "4 3", opacity: 0.85
    });
    animG.appendChild(mid);
    var mid2 = el("path", {
      d: "M" + (xRect.x + CELL) + " " + (xRect.y + CELL / 2) + " L" + (yRect.x) + " " + (yRect.y + CELL / 2),
      stroke: "var(--accent)", "stroke-width": 1.5, fill: "none", "stroke-dasharray": "4 3", opacity: 0.85
    });
    animG.appendChild(mid2);
    /* 当前乘积 */
    var prod = Wm[s.row][s.col] * xv[s.col];
    var acc = 0;
    for (var c = 0; c <= s.col; c++) acc += Wm[s.row][c] * xv[c];
    var lbl = text(300, 60 + s.row * 40, s.row === 0 ? "y₁" : "y₂", { "font-size": 14, "font-weight": 700, fill: "var(--text)" });
    animG.appendChild(lbl);
    animG.appendChild(text(340, 60 + s.row * 40,
      "第 " + (s.col + 1) + " 项：" + Wm[s.row][s.col] + "×" + xv[s.col] + " = " + prod + "   累加 = " + acc,
      { "font-size": 13, fill: "var(--accent)", "font-weight": 700 }));
    root.querySelector("#viz-mm-status").textContent =
      "第 " + (k + 1) + "/6 步：W 第 " + (s.row + 1) + " 行 · x 第 " + (s.col + 1) + " 个分量";
  }

  function play() {
    if (playing) return;
    playing = true;
    root.querySelector("#viz-mm-play").textContent = "⏸ 暂停";
    if (stepIdx >= steps.length) { stepIdx = 0; }
    timer = setInterval(function () {
      if (stepIdx >= steps.length) { pause(); return; }
      drawStep(stepIdx++);
    }, 650);
  }
  function pause() {
    playing = false;
    clearInterval(timer);
    root.querySelector("#viz-mm-play").textContent = "▶ 播放";
    if (stepIdx >= steps.length) {
      root.querySelector("#viz-mm-status").textContent = "完成：y = (8, −2)";
    }
  }
  function reset() {
    pause();
    stepIdx = 0;
    clearAnim();
    root.querySelector("#viz-mm-status").textContent = "";
  }
  root.querySelector("#viz-mm-play").addEventListener("click", function () {
    if (playing) pause(); else play();
  });
  root.querySelector("#viz-mm-reset").addEventListener("click", reset);
  reset();
})();
