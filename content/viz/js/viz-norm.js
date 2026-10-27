/* viz-norm：BatchNorm vs LayerNorm 统计方向（A 类）
 * 8×12 网格：行=batch 内样本，列=特征。颜色=归一化后的激活值。
 * BN：沿列（跨 batch）求 μ/σ；LN：沿行（跨特征）求 μ/σ。
 * 「切换 batch」观察：BN 的统计量随 batch 组成漂移而抖动，LN 只看样本自身、岿然不动。
 */
(function () {
  var root = document.getElementById("viz-norm");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var ROWS = 8, COLS = 12;
  var GX = 132, GY = 52, CW = 39, CH = 25;

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

  var staticG = root.querySelector("#viz-norm-static");
  var gridG = root.querySelector("#viz-norm-grid");
  var animG = root.querySelector("#viz-norm-anim");
  var mode = root.querySelector("#viz-norm-mode");
  var drift = root.querySelector("#viz-norm-drift");
  var dval = root.querySelector("#viz-norm-dval");
  var playBtn = root.querySelector("#viz-norm-play");

  /* 确定性伪随机 */
  function hash(i, j, b) {
    var s = (i * 73 + j * 151 + b * 997) >>> 0;
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  }
  /* 原始激活：特征相关偏置 + 样本相关偏移 + batch 漂移 */
  function raw(i, j, b) {
    var d = parseFloat(drift.value);
    return 0.9 * Math.sin(i * 0.9 + j * 0.55 + b * d * 1.6)
      + 0.55 * Math.cos(j * 1.05 + b * d * 0.8)
      + 0.25 * hash(i, j, b);
  }
  function stats(vals) {
    var m = 0, k;
    for (k = 0; k < vals.length; k++) m += vals[k];
    m /= vals.length;
    var v = 0;
    for (k = 0; k < vals.length; k++) v += (vals[k] - m) * (vals[k] - m);
    v /= vals.length;
    return { mu: m, sd: Math.sqrt(v) + 1e-6 };
  }
  /* 发散色标：负→蓝，0→灰，正→红 */
  function cellColor(v) {
    var a = Math.min(Math.abs(v) / 2, 1);
    if (v >= 0) return "rgba(207,34,46," + (0.12 + 0.75 * a).toFixed(3) + ")";
    return "rgba(9,105,218," + (0.12 + 0.75 * a).toFixed(3) + ")";
  }

  /* 静态框架：网格线 + 行/列标签 */
  var r, c;
  for (r = 0; r <= ROWS; r++) {
    staticG.appendChild(el("line", { x1: GX, y1: GY + r * CH, x2: GX + COLS * CW, y2: GY + r * CH, stroke: "var(--border)", "stroke-width": 0.7 }));
  }
  for (c = 0; c <= COLS; c++) {
    staticG.appendChild(el("line", { x1: GX + c * CW, y1: GY, x2: GX + c * CW, y2: GY + ROWS * CH, stroke: "var(--border)", "stroke-width": 0.7 }));
  }
  for (r = 0; r < ROWS; r++) {
    staticG.appendChild(text(GX - 10, GY + r * CH + CH / 2 + 4, "x" + (r + 1), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (c = 0; c < COLS; c++) {
    staticG.appendChild(text(GX + c * CW + CW / 2, GY - 8, "f" + (c + 1), { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(text(GX + COLS * CW / 2, GY + ROWS * CH + 20, "特征（神经元）→", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(22, GY + ROWS * CH / 2, "batch 内样本", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 22 " + (GY + ROWS * CH / 2) + ")" }));

  var b = 0, prevStats = null, timer = null;

  function render() {
    var isBN = mode.value === "bn";
    dval.textContent = parseFloat(drift.value).toFixed(2);
    gridG.textContent = "";
    animG.textContent = "";

    /* 原始矩阵 */
    var A = [], i, j;
    for (i = 0; i < ROWS; i++) {
      A.push([]);
      for (j = 0; j < COLS; j++) A[i].push(raw(i, j, b));
    }
    /* 统计量 + 归一化 */
    var cur = [], norm = [];
    if (isBN) {
      for (j = 0; j < COLS; j++) {
        var col = [];
        for (i = 0; i < ROWS; i++) col.push(A[i][j]);
        cur.push(stats(col));
      }
      for (i = 0; i < ROWS; i++) {
        norm.push([]);
        for (j = 0; j < COLS; j++) norm[i].push((A[i][j] - cur[j].mu) / cur[j].sd);
      }
    } else {
      for (i = 0; i < ROWS; i++) cur.push(stats(A[i]));
      for (i = 0; i < ROWS; i++) {
        norm.push([]);
        for (j = 0; j < COLS; j++) norm[i].push((A[i][j] - cur[i].mu) / cur[i].sd);
      }
    }
    /* 网格 */
    for (i = 0; i < ROWS; i++) {
      for (j = 0; j < COLS; j++) {
        gridG.appendChild(el("rect", {
          x: GX + j * CW + 1, y: GY + i * CH + 1, width: CW - 2, height: CH - 2,
          fill: cellColor(norm[i][j]), stroke: "none"
        }));
      }
    }
    /* 统计方向指示：BN 高亮列（顶部括号），LN 高亮行（左侧括号） */
    if (isBN) {
      for (j = 0; j < COLS; j++) {
        animG.appendChild(el("rect", {
          x: GX + j * CW, y: GY - 4, width: CW, height: 3,
          fill: j % 2 ? "var(--accent)" : "var(--viz-b)", opacity: 0.9
        }));
      }
    } else {
      for (i = 0; i < ROWS; i++) {
        animG.appendChild(el("rect", {
          x: GX - 4, y: GY + i * CH, width: 3, height: CH,
          fill: i % 2 ? "var(--accent)" : "var(--viz-b)", opacity: 0.9
        }));
      }
    }
    /* 底部统计量面板：当前 μ（实心）+ 上一个 batch 的 μ（空心残影） */
    var px = GX, py = GY + ROWS * CH + 34, pw = (COLS * CW) / (isBN ? COLS : ROWS);
    animG.appendChild(text(px, py - 8, isBN ? "各特征的 batch 均值 μ（残影=上一个 batch）" : "各样本的自身均值 μ（残影=上一个 batch）", { "font-size": 11, fill: "var(--text-soft)" }));
    var n = isBN ? COLS : ROWS;
    for (var k = 0; k < n; k++) {
      var m = cur[k].mu;
      var h = Math.min(Math.abs(m) * 26, 40);
      var base = py + 40;
      if (prevStats) {
        var pm = prevStats[k].mu;
        var ph = Math.min(Math.abs(pm) * 26, 40);
        animG.appendChild(el("rect", {
          x: px + k * pw + 3, y: base - ph, width: pw - 6, height: ph,
          fill: "none", stroke: "var(--text-soft)", "stroke-width": 1, "stroke-dasharray": "2 2", opacity: 0.7
        }));
      }
      animG.appendChild(el("rect", {
        x: px + k * pw + 3, y: base - h, width: pw - 6, height: h,
        fill: "var(--accent)", opacity: 0.85
      }));
    }
    animG.appendChild(el("line", { x1: px, y1: py + 40, x2: px + n * pw, y2: py + 40, stroke: "var(--text-soft)", "stroke-width": 1 }));
    var msg = isBN
      ? "Batch #" + b + "：μ、σ 按列统计 —— batch 组成一变，整列统计量随之抖动（见残影错位）"
      : "Batch #" + b + "：μ、σ 按行统计 —— 只看样本自身 12 个特征，换 batch 统计量不动（残影重合）";
    animG.appendChild(text(px, py + 62, msg, { "font-size": 12, fill: "var(--text)" }));
    prevStats = cur;
  }

  function step() { b = (b + 1) % 6; render(); }

  playBtn.addEventListener("click", function () {
    if (timer) {
      clearInterval(timer); timer = null;
      playBtn.textContent = "▶ 切换 batch";
      return;
    }
    playBtn.textContent = "⏸ 暂停";
    prevStats = null;
    render();
    timer = setInterval(step, 1100);
  });
  mode.addEventListener("change", function () { prevStats = null; render(); });
  drift.addEventListener("input", render);
  render();
})();
