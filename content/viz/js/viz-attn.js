/* viz-attn：注意力分数表 + softmax 缩放温度（A 类）
 * 3 个词的示意分数表（模拟 Q·Kᵀ 缩放前）
 */
(function () {
  var root = document.getElementById("viz-attn");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var words = ["它", "追", "老鼠"];
  /* 示意原始分数（缩放前），行=查询词，列=被关注词 */
  var S = [[-1, 1, 3], [0, 1, 2], [1, 2, 1]];
  var dHead = 4; /* 与 1-0 正文的单头示例一致 */

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
  function softmaxRow(row, temp) {
    var out = [], sum = 0, i;
    for (i = 0; i < row.length; i++) {
      var z = row[i] / Math.pow(dHead, temp / 2); /* 除以 (√d)^t */
      out.push(Math.exp(z));
      sum += out[i];
    }
    for (i = 0; i < out.length; i++) out[i] /= sum;
    return out;
  }

  var tableG = root.querySelector("#viz-attn-table");
  var overlayG = root.querySelector("#viz-attn-overlay");

  var CELL = 64, X0 = 92, Y0 = 64;
  var cells = [];

  function drawStatic() {
    /* 标题：行=查询，列=被关注 */
    tableG.appendChild(text(X0 - 70, Y0 + 1.5 * CELL, "查询词 ↓", { "font-size": 12, fill: "var(--text-soft)", "text-anchor": "middle", transform: "rotate(-90 " + (X0 - 70) + " " + (Y0 + 1.5 * CELL) + ")" }));
    tableG.appendChild(text(X0 + 1.5 * CELL, Y0 - 14, "被关注词 →", { "font-size": 12, fill: "var(--text-soft)", "text-anchor": "middle" }));
    words.forEach(function (w, i) {
      tableG.appendChild(text(X0 + i * CELL + CELL / 2, Y0 - 30, w, { "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "var(--text)" }));
      tableG.appendChild(text(X0 - 14, Y0 + i * CELL + CELL / 2 + 5, w, { "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: "var(--text)" }));
    });
    /* 格框 */
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var r = el("rect", {
          x: X0 + j * CELL, y: Y0 + i * CELL, width: CELL - 2, height: CELL - 2, rx: 6,
          fill: "var(--bg-soft)", stroke: "var(--border)"
        });
        tableG.appendChild(r);
        var t = text(X0 + j * CELL + (CELL - 2) / 2, Y0 + i * CELL + (CELL - 2) / 2 + 5, "", { "text-anchor": "middle", "font-size": 14, "font-weight": 700 });
        tableG.appendChild(t);
        cells.push({ rect: r, txt: t, i: i, j: j });
      }
    }
  }

  var slider = root.querySelector("#viz-attn-t");
  var tval = root.querySelector("#viz-attn-tval");
  var status = root.querySelector("#viz-attn-status");
  var tip = text(0, 0, "", { "font-size": 11, fill: "var(--text)", visibility: "hidden" });
  var tipBg = el("rect", { width: 150, height: 46, rx: 4, fill: "var(--card)", stroke: "var(--border)", visibility: "hidden" });
  overlayG.appendChild(tipBg); overlayG.appendChild(tip);

  function heatColor(p) {
    /* p ∈ [0,1] → 蓝的透明度 */
    return "color-mix(in srgb, var(--accent) " + Math.round(p * 100) + "%, var(--bg-soft))";
  }

  function render() {
    var t = parseFloat(slider.value);
    tval.textContent = t.toFixed(1);
    var maxP = 0;
    cells.forEach(function (c) {
      var row = softmaxRow(S[c.i], t);
      var p = row[c.j];
      maxP = Math.max(maxP, p);
      c.rect.setAttribute("fill", heatColor(p));
      c.txt.textContent = p.toFixed(2);
      c.txt.setAttribute("fill", p > 0.55 ? "#fff" : "var(--text)");
    });
    status.textContent = "当前最大 softmax 值 = " + maxP.toFixed(3) +
      (maxP > 0.97 ? "（接近 one-hot，饱和：梯度趋零）" :
       maxP < 0.4 ? "（接近均匀，分辨力丧失）" : "（软分配，可学习区间）");
  }

  /* 悬停明细 */
  cells.forEach(function (c) {
    c.rect.addEventListener("mouseenter", function () {
      var t = parseFloat(slider.value);
      var row = softmaxRow(S[c.i], t);
      var scaled = S[c.i][c.j] / Math.pow(dHead, t / 2);
      tipBg.setAttribute("visibility", "visible");
      tip.setAttribute("visibility", "visible");
      tip.textContent = "原始分 " + S[c.i][c.j].toFixed(1) + " → 缩放 " + scaled.toFixed(2) + " → softmax " + row[c.j].toFixed(3);
      var cx = X0 + c.j * CELL, cy = Y0 + c.i * CELL;
      var tx = Math.min(480, cx + 10), ty = Math.max(60, cy - 50);
      tipBg.setAttribute("x", tx - 4); tipBg.setAttribute("y", ty - 14);
      tip.setAttribute("x", tx); tip.setAttribute("y", ty);
    });
    c.rect.addEventListener("mouseleave", function () {
      tipBg.setAttribute("visibility", "hidden");
      tip.setAttribute("visibility", "hidden");
    });
  });

  /* 逐行播放 */
  var playBtn = root.querySelector("#viz-attn-play");
  var playing = false, timer = null;
  playBtn.addEventListener("click", function () {
    if (playing) return;
    playing = true;
    playBtn.textContent = "播放中…";
    var rows = [0, 1, 2], k = 0;
    function next() {
      if (k >= rows.length) {
        playing = false;
        playBtn.textContent = "▶ 逐行播放 softmax";
        cells.forEach(function (c) { c.rect.removeAttribute("stroke"); });
        return;
      }
      cells.forEach(function (c) {
        c.rect.setAttribute("stroke", c.i === rows[k] ? "var(--accent)" : "var(--border)");
        c.rect.setAttribute("stroke-width", c.i === rows[k] ? 2 : 1);
      });
      status.textContent = "第 " + (rows[k] + 1) + " 行（查询词「" + words[rows[k]] + "」）：softmax 把三个分数归一成概率分布，和 = 1";
      k++;
      timer = setTimeout(next, 1200);
    }
    next();
  });

  slider.addEventListener("input", render);
  drawStatic();
  render();
})();
