/* viz-batch：batch×seq×accum 三量耦合（C 类，可交互滑杆）
 * 固定 8 卡、目标有效 batch 256、临界 batch 128、单卡 80GB。
 * 序列长度从滑杆取几何值；micro-batch 滑杆。
 * 计算：峰值显存（注意力平方主导）、所需 accum、有效 batch、吞吐代理。
 */
(function () {
  var root = document.getElementById("viz-batch");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#bat-static");
  var animG = root.querySelector("#bat-anim");

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

  var DP = 8, B_TARGET = 256, B_CRIT = 128, MEM_CAP = 80; // GB
  var SEQ_OPTS = [512, 1024, 2048, 4096, 8192];
  // 峰值显存模型（每卡，GB）：线性层 + 注意力平方项
  // mem = mb * (alpha*L + beta*L^2) / scale
  var ALPHA = 0.9, BETA = 0.0000042, SCALE = 1;

  function peakMem(mb, L) {
    return mb * (ALPHA * L + BETA * L * L) / SCALE / 1000 * 1.0; // 调参使其量级合理
  }

  function draw(L, mb) {
    animG.innerHTML = "";
    staticG.innerHTML = "";
    var mem = peakMem(mb, L);
    var over = mem > MEM_CAP;
    var accum = Math.max(1, Math.ceil(B_TARGET / (mb * DP)));
    var effBatch = mb * accum * DP;

    staticG.appendChild(text(20, 24, "三量耦合账本（8 卡 · 目标有效 batch 256 · 临界 128 · 单卡 80GB）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));

    /* 左：峰值显存瓦片 */
    var tx = 30, ty = 60, tileW = 22, tileH = 200, nTiles = 10;
    staticG.appendChild(text(tx, ty - 8, "单卡峰值显存", { "font-size": 10, fill: "var(--text-soft)" }));
    staticG.appendChild(el("rect", { x: tx, y: ty, width: tileW * nTiles + 10, height: tileH, rx: 4, fill: "none", stroke: "var(--border)", "stroke-width": 0.9 }));
    var fillFrac = Math.min(1, mem / MEM_CAP);
    var filled = Math.round(fillFrac * nTiles);
    for (var i = 0; i < nTiles; i++) {
      var x = tx + 5 + i * tileW;
      var col = over ? "var(--viz-danger)" : "var(--viz-b)";
      if (i >= filled) col = "var(--border)";
      animG.appendChild(el("rect", { x: x, y: ty + 5, width: tileW - 4, height: tileH - 10, rx: 2, fill: col, opacity: i < filled ? 0.85 : 0.3 }));
    }
    animG.appendChild(text(tx, ty + tileH + 18, "≈ " + mem.toFixed(1) + " GB / 80 GB " + (over ? "（超！需降 micro-batch 或加 accum）" : ""), { "font-size": 11, "font-weight": over ? "bold" : "normal", fill: over ? "var(--viz-danger)" : "var(--text)" }));

    /* 右：关键量读数 */
    var rx = 320, ry = 70;
    var rows = [
      ["序列长度 L", L + " tokens", "var(--text)"],
      ["micro-batch", String(mb), "var(--text)"],
      ["梯度累积步", String(accum), "var(--text)"],
      ["有效 batch", String(effBatch) + (effBatch >= B_TARGET ? " ✓达标" : " ✗不足"), effBatch >= B_TARGET ? "var(--viz-b)" : "var(--viz-danger)"],
      ["相对临界 batch", (effBatch >= B_CRIT ? "≥临界(高效)" : "<临界(需提LR)"), effBatch >= B_CRIT ? "var(--viz-b)" : "var(--viz-danger)"],
      ["每步 token 量", (mb * DP * L).toLocaleString(), "var(--text)"]
    ];
    staticG.appendChild(el("rect", { x: rx, y: ry - 14, width: 290, height: 200, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    rows.forEach(function (r, i) {
      var y = ry + 14 + i * 28;
      staticG.appendChild(text(rx + 12, y, r[0], { "font-size": 10.5, fill: "var(--text-soft)" }));
      staticG.appendChild(text(rx + 280, y, r[1], { "font-size": 10.5, "text-anchor": "end", fill: r[2], "font-weight": "bold" }));
    });
    // 吞吐说明
    animG.appendChild(text(rx + 12, ry + 14 + 5 * 28 + 6, "吞吐 ∝ 1/L²：L 翻倍，每步 wall-clock 约翻 4 倍", { "font-size": 8.5, fill: "var(--text-soft)" }));

    /* 底部结论 */
    var concl = over
      ? "结论：此配置单卡显存溢出——序列长度或 micro-batch 需下调，再用 accum 补有效 batch（但不补回算力的变贵）。"
      : "结论：有效 batch 达标，但注意长序列下 accum 增大 → 前向次数增多、吞吐下降。三者互相挤占是常态。";
    staticG.appendChild(text(20, 410, concl, { "font-size": 10, fill: "var(--text)" }));
    staticG.appendChild(text(20, 426, "注：峰值显存随 L² 增长，固定预算下 micro-batch ∝ 1/L²（注意力主导段）。", { "font-size": 9, fill: "var(--text-soft)" }));
  }

  var seqEl = root.querySelector("#bat-seq");
  var mbEl = root.querySelector("#bat-mb");
  var seqVal = root.querySelector("#bat-seq-val");
  var mbVal = root.querySelector("#bat-mb-val");
  function update() {
    var L = SEQ_OPTS[+seqEl.value];
    var mb = +mbEl.value;
    seqVal.textContent = L;
    mbVal.textContent = mb;
    draw(L, mb);
  }
  seqEl.addEventListener("input", update);
  mbEl.addEventListener("input", update);
  update();
})();
