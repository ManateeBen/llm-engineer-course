/* viz-kv-heads：KV cache 显存账本（B 类）
 * 双对数图：KV cache GB vs 上下文长度，MHA/GQA(g=8)/MQA/MLA 四线，
 * A100 80GB 红线 + 当前 (ctx, batch) 标记点；播放 = 上下文扫描。
 * 底部：头级共享结构示意（Q 头圆点连到 K/V 柱）。
 * 模型：7B，32 层，d_head=128，BF16。bytes/token/层 = 2(KV) × 2(字节) × 32(层) × d_kv。
 */
(function () {
  var root = document.getElementById("viz-kv-heads");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vkh-static");
  var animG = root.querySelector("#vkh-anim");
  var ctxIn = root.querySelector("#vkh-ctx");
  var batchIn = root.querySelector("#vkh-batch");
  var cVal = root.querySelector("#vkh-cval");
  var bVal = root.querySelector("#vkh-bval");
  var playBtn = root.querySelector("#vkh-play");

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

  var LAYERS = 32, DHEAD = 128;
  var schemes = [
    { id: "mha", name: "MHA（32 组 KV）", kvHeads: 32, color: "var(--accent)" },
    { id: "gqa", name: "GQA g=8（4 组）", kvHeads: 4, color: "var(--viz-b)" },
    { id: "mla", name: "MLA（576 潜向量）", kvHeads: 576 / 128, color: "var(--viz-c)" },
    { id: "mqa", name: "MQA（1 组）", kvHeads: 1, color: "var(--text)" }
  ];
  function kvGB(s, ctx, batch) {
    var dKV = s.kvHeads * DHEAD;
    return 2 * 2 * LAYERS * dKV * ctx * batch / 1e9;
  }
  function ctxFromSlider(v) { return Math.round(Math.pow(10, v)); }
  function fmtCtx(c) { return c >= 1000 ? (c / 1000).toFixed(c % 1000 === 0 ? 0 : 1) + "k" : String(c); }
  function fmtGB(g) {
    if (g >= 1000) return (g / 1000).toFixed(2) + " TB";
    if (g >= 1) return g.toFixed(1) + " GB";
    return (g * 1000).toFixed(0) + " MB";
  }

  /* ---------- 静态：对数坐标 ---------- */
  var GX = 58, GY = 44, GW = 350, GH = 210;
  var LGC0 = 3, LGC1 = 17;          /* ctx log10 范围 1k~128k */
  var LGG0 = -2, LGG1 = 4;          /* GB log10 范围 0.01~10000 */
  function cx(lg) { return GX + (lg - LGC0) / (LGC1 - LGC0) * GW; }
  function gy(lg) { return GY + GH - (lg - LGG0) / (LGG1 - LGG0) * GH; }

  staticG.appendChild(text(GX + GW / 2, GY - 22, "KV cache 显存 vs 上下文长度（双对数，batch 见滑杆）", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  /* 网格与刻度 */
  [1, 10, 100, 1000, 10000].forEach(function (g) {
    var yy = gy(Math.log10(g));
    staticG.appendChild(el("line", { x1: GX, y1: yy, x2: GX + GW, y2: yy, stroke: "var(--border)", "stroke-width": 0.6, "stroke-dasharray": "3 3" }));
    staticG.appendChild(text(GX - 6, yy + 3.5, g + (g >= 1000 ? "" : ""), { "text-anchor": "end", "font-size": 10, fill: "var(--text-soft)" }));
  });
  [1000, 2000, 8000, 32000, 128000].forEach(function (c) {
    var xx = cx(Math.log10(c));
    staticG.appendChild(el("line", { x1: xx, y1: GY, x2: xx, y2: GY + GH, stroke: "var(--border)", "stroke-width": 0.6, "stroke-dasharray": "3 3" }));
    staticG.appendChild(text(xx, GY + GH + 16, fmtCtx(c), { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(text(GX - 6, GY - 8, "GB", { "text-anchor": "end", "font-size": 10, fill: "var(--text-soft)" }));
  staticG.appendChild(text(GX + GW, GY + GH + 32, "上下文长度（token）", { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  /* A100 80GB 红线 */
  var y80 = gy(Math.log10(80));
  staticG.appendChild(el("line", { x1: GX, y1: y80, x2: GX + GW, y2: y80, stroke: "var(--accent)", "stroke-width": 1.4, "stroke-dasharray": "6 3" }));
  staticG.appendChild(text(GX + GW - 4, y80 - 5, "A100 80 GB", { "text-anchor": "end", "font-size": 10.5, "font-weight": "bold", fill: "var(--accent)" }));

  /* 底部：头结构示意 */
  var SY = 330;
  staticG.appendChild(text(GX - 4, SY - 8, "头级结构：Q 头（圆）与 KV 组（柱）的共享关系", { "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
  var headGroups = [
    { title: "MHA：32 组", kv: 4, share: 1 },
    { title: "GQA g=8：4 组", kv: 2, share: 4 },
    { title: "MQA：1 组", kv: 1, share: 4 }
  ];
  headGroups.forEach(function (hg, gi) {
    var ox = GX + gi * 118;
    staticG.appendChild(text(ox + 44, SY + 12, hg.title, { "text-anchor": "middle", "font-size": 10.5, fill: "var(--text-soft)" }));
    for (var q = 0; q < 4; q++) {
      var qx = ox + 8 + q * 18, qy = SY + 30;
      var owner = Math.floor(q / hg.share);
      staticG.appendChild(el("circle", { cx: qx, cy: qy, r: 5, fill: "var(--viz-b)", opacity: 0.9 }));
      staticG.appendChild(el("line", { x1: qx, y1: qy + 6, x2: ox + 8 + owner * 18 + 8, y2: SY + 62, stroke: "var(--text-soft)", "stroke-width": 0.7, opacity: 0.6 }));
    }
    for (var k = 0; k < hg.kv; k++) {
      staticG.appendChild(el("rect", { x: ox + 8 + k * 18 + 1, y: SY + 62, width: 14, height: 22, rx: 2, fill: "var(--accent)", opacity: 0.85 }));
      staticG.appendChild(text(ox + 8 + k * 18 + 8, SY + 76, "KV", { "text-anchor": "middle", "font-size": 8.5, fill: "#fff" }));
    }
  });

  /* ---------- 动态 ---------- */
  var paths = {}, dots = {};
  schemes.forEach(function (s) {
    var p = el("path", { d: "", fill: "none", stroke: s.color, "stroke-width": 2, opacity: 0.95 });
    paths[s.id] = p;
    animG.appendChild(p);
    dots[s.id] = el("circle", { r: 4, fill: s.color, stroke: "var(--text)", "stroke-width": 0.8 });
    animG.appendChild(dots[s.id]);
  });

  function render() {
    animG.textContent = "";
    schemes.forEach(function (s) {
      animG.appendChild(paths[s.id]);
      animG.appendChild(dots[s.id]);
    });
    var lg = parseFloat(ctxIn.value);
    var ctx = ctxFromSlider(lg);
    var batch = parseInt(batchIn.value, 10);
    cVal.textContent = fmtCtx(ctx);
    bVal.textContent = batch;

    schemes.forEach(function (s) {
      var d = "";
      for (var l = LGC0; l <= LGC1; l += 0.25) {
        var c = Math.pow(10, l);
        var g = kvGB(s, c, batch);
        var yy = gy(Math.log10(Math.max(g, 0.01)));
        d += (l === LGC0 ? "M" : "L") + cx(l).toFixed(1) + "," + yy.toFixed(1);
      }
      paths[s.id].setAttribute("d", d);
      var gCur = kvGB(s, ctx, batch);
      dots[s.id].setAttribute("cx", cx(lg));
      dots[s.id].setAttribute("cy", gy(Math.log10(Math.max(gCur, 0.01))));
      dots[s.id].style.display = gCur <= 10000 ? "" : "none";
    });

    /* 当前竖线 */
    animG.appendChild(el("line", { x1: cx(lg), y1: GY, x2: cx(lg), y2: GY + GH, stroke: "var(--text)", "stroke-width": 1.1, "stroke-dasharray": "4 3" }));

    /* 右侧读数面板 */
    var PX = 424, PY = 44;
    animG.appendChild(el("rect", { x: PX, y: PY, width: 202, height: 152, rx: 6, fill: "var(--bg-soft)", stroke: "var(--border)" }));
    animG.appendChild(text(PX + 10, PY + 18, "ctx=" + fmtCtx(ctx) + "，batch=" + batch, { "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
    schemes.forEach(function (s, i2) {
      var g = kvGB(s, ctx, batch);
      var over = g > 80;
      animG.appendChild(text(PX + 10, PY + 38 + i2 * 20, s.name.split("（")[0], { "font-size": 11, fill: s.color }));
      animG.appendChild(text(PX + 116, PY + 38 + i2 * 20, fmtGB(g) + (over ? " ⚠" : ""), { "font-size": 11, "font-weight": over ? "bold" : "normal", fill: over ? "var(--accent)" : "var(--text)" }));
    });
    var mhaG = kvGB(schemes[0], ctx, batch);
    animG.appendChild(text(PX + 10, PY + 38 + 4 * 20 + 6, mhaG > 80 ? "MHA 超出单卡 → 必须换 GQA/MQA/MLA" : "MHA 尚可容纳", { "font-size": 10.5, fill: "var(--text-soft)" }));

    /* 图例 */
    schemes.forEach(function (s, i3) {
      var lx = GX + (i3 % 2) * 170, ly = GY + GH + 48 + Math.floor(i3 / 2) * 16;
      animG.appendChild(el("line", { x1: lx, y1: ly - 4, x2: lx + 16, y2: ly - 4, stroke: s.color, "stroke-width": 2 }));
      animG.appendChild(text(lx + 20, ly, s.name, { "font-size": 10.5, fill: "var(--text-soft)" }));
    });
  }

  var timer = null;
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 扫描上下文长度"; return; }
    playBtn.textContent = "⏸ 暂停";
    var v = 3;
    timer = setInterval(function () {
      v += 0.05;
      if (v > 5.1) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 扫描上下文长度"; return; }
      ctxIn.value = v;
      render();
    }, 120);
  });
  ctxIn.addEventListener("input", render);
  batchIn.addEventListener("input", render);
  render();
})();
