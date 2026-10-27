/* viz-longctx：NIAH U 型陷阱 + RULER 有效上下文（B 类）
 * 左：准确率 vs 针位置（营销虚线平坦 vs 真实 U 型实线），播放=针位扫描。
 * 右：RULER 四任务的有效上下文横条 vs 宣称上下文竖线。
 * 底部：随宣称 ctx 增长的 KV cache 显存读数（7B/BF16/MHA，3-3 账本）。
 */
(function () {
  var root = document.getElementById("viz-longctx");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vlc-static");
  var animG = root.querySelector("#vlc-anim");
  var ctxIn = root.querySelector("#vlc-ctx");
  var cVal = root.querySelector("#vlc-cval");
  var playBtn = root.querySelector("#vlc-play");

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

  /* ---------- 左图：NIAH 位置-准确率 ---------- */
  var LX = 62, LY = 62, LW = 300, LH = 190;
  staticG.appendChild(text(LX + LW / 2, LY - 30, "大海捞针：准确率 vs 针的位置", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: LX, y: LY, width: LW, height: LH, fill: "var(--bg-soft)", stroke: "var(--border)" }));
  /* 迷失区底色（30%~70%） */
  staticG.appendChild(el("rect", { x: LX + 0.3 * LW, y: LY, width: 0.4 * LW, height: LH, fill: "rgba(207,34,46,0.07)" }));
  staticG.appendChild(text(LX + 0.5 * LW, LY + LH - 8, "迷失在中间", { "text-anchor": "middle", "font-size": 10, fill: "var(--accent)" }));
  /* 网格 */
  [0, 25, 50, 75, 100].forEach(function (p) {
    var yy = LY + LH - (p / 100) * LH;
    staticG.appendChild(el("line", { x1: LX, y1: yy, x2: LX + LW, y2: yy, stroke: "var(--border)", "stroke-width": 0.5, "stroke-dasharray": "3 3" }));
    staticG.appendChild(text(LX - 8, yy + 3.5, p + "%", { "text-anchor": "end", "font-size": 9.5, fill: "var(--text-soft)" }));
  });
  [0, 25, 50, 75, 100].forEach(function (p) {
    var xx = LX + (p / 100) * LW;
    staticG.appendChild(el("line", { x1: xx, y1: LY, x2: xx, y2: LY + LH, stroke: "var(--border)", "stroke-width": 0.5, "stroke-dasharray": "3 3" }));
    staticG.appendChild(text(xx, LY + LH + 15, p + "%", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));
  });
  staticG.appendChild(text(LX + LW / 2, LY + LH + 32, "针在上下文中的位置", { "text-anchor": "middle", "font-size": 10.5, fill: "var(--text-soft)" }));

  /* ---------- 右图：RULER 有效上下文 ---------- */
  var RX = 420, RY = 62, RW = 190;
  staticG.appendChild(text(RX + RW / 2, RY - 30, "RULER：各任务的有效上下文", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var tasks = [
    { name: "单针检索", frac: 1.0 },
    { name: "多针检索", frac: 0.72 },
    { name: "多跳追踪", frac: 0.26 },
    { name: "高频聚合", frac: 0.14 },
    { name: "长文 QA", frac: 0.20 }
  ];
  var rowH = 26;
  tasks.forEach(function (tk, i) {
    var yy = RY + 10 + i * rowH;
    staticG.appendChild(text(RX - 6, yy + 11, tk.name, { "text-anchor": "end", "font-size": 10.5, fill: "var(--text-soft)" }));
    staticG.appendChild(el("line", { x1: RX, y1: yy, x2: RX + RW, y2: yy, stroke: "var(--border)", "stroke-width": 0.5, "stroke-dasharray": "2 3" }));
  });
  staticG.appendChild(text(RX + RW / 2, RY + 10 + tasks.length * rowH + 16, "（横条 = 仍保持高准确的最大长度）", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));

  /* ---------- 底部：KV cache 读数条 ---------- */
  staticG.appendChild(el("line", { x1: LX, y1: 392, x2: 620, y2: 392, stroke: "var(--border)", "stroke-width": 1 }));
  staticG.appendChild(text(LX, 414, "系统层代价（7B / BF16 / MHA，batch=1）：", { "font-size": 11, fill: "var(--text-soft)" }));

  var marketPath = el("path", { d: "", fill: "none", stroke: "var(--text-soft)", "stroke-width": 1.6, "stroke-dasharray": "6 4" });
  var realPath = el("path", { d: "", fill: "none", stroke: "var(--accent)", "stroke-width": 2.4 });
  var claimLine = el("line", { y1: RY, y2: RY + 10 + tasks.length * rowH, stroke: "var(--viz-c)", "stroke-width": 2 });
  var bars = [];
  tasks.forEach(function (tk, i) {
    var b = el("rect", { x: RX, y: RY + 10 + i * rowH + 4, width: 0, height: rowH - 9, rx: 2, fill: "var(--viz-b)", opacity: 0.85 });
    bars.push(b);
    animG.appendChild(b);
    var lbl = text(RX, RY + 10 + i * rowH + 11, "", { "font-size": 9.5, fill: "var(--text-soft)" });
    bars.push(lbl);
    animG.appendChild(lbl);
  });
  animG.appendChild(marketPath); animG.appendChild(realPath); animG.appendChild(claimLine);

  function claimedCtx() { return Math.round(Math.pow(10, parseFloat(ctxIn.value))); }
  function fmtCtx(c) {
    if (c >= 1e6) return (c / 1e6).toFixed(2) + "M";
    if (c >= 10000) return Math.round(c / 1000) + "k";
    if (c >= 1000) return (c / 1000).toFixed(1) + "k";
    return String(c);
  }

  function render() {
    animG.textContent = "";
    var claim = claimedCtx();
    cVal.textContent = fmtCtx(claim);
    /* NIAH 曲线：营销平坦 97%；真实 U 型（位置 0/100 → 95%，中间 → 52%） */
    var dM = "", dR = "";
    for (var p = 0; p <= 100; p += 2) {
      var xx = LX + (p / 100) * LW;
      var m = LY + LH - 0.97 * LH;
      var dip = 0.52 + 0.43 * Math.exp(-Math.pow((p - 50) / 26, 2)) + 0.04 * Math.exp(-Math.pow((p - 4) / 5, 2)) + 0.03 * Math.exp(-Math.pow((p - 96) / 5, 2));
      dip = Math.min(dip, 0.99);
      var yy = LY + LH - dip * LH;
      dM += (p === 0 ? "M" : "L") + xx.toFixed(1) + "," + m.toFixed(1);
      dR += (p === 0 ? "M" : "L") + xx.toFixed(1) + "," + yy.toFixed(1);
    }
    marketPath.setAttribute("d", dM);
    realPath.setAttribute("d", dR);
    animG.appendChild(marketPath);
    animG.appendChild(realPath);

    /* RULER 横条 + 宣称线 */
    var claimX = RX + RW;
    claimLine.setAttribute("x1", claimX); claimLine.setAttribute("x2", claimX);
    animG.appendChild(claimLine);
    animG.appendChild(text(claimX, RY - 12, "宣称 " + fmtCtx(claim), { "text-anchor": "end", "font-size": 10.5, "font-weight": "bold", fill: "var(--viz-c)" }));
    tasks.forEach(function (tk, i) {
      var eff = tk.frac * claim;
      var wpx = Math.max((eff / claim) * RW, 2);
      var rect = bars[i * 2], lbl = bars[i * 2 + 1];
      rect.setAttribute("width", wpx);
      rect.setAttribute("fill", eff < claim * 0.5 ? "var(--accent)" : "var(--viz-b)");
      lbl.textContent = fmtCtx(Math.max(eff, 512));
      lbl.setAttribute("x", RX + wpx + 4);
      animG.appendChild(rect);
      animG.appendChild(lbl);
    });

    /* KV cache 读数 */
    var gb = 2 * 2 * 32 * 4096 * claim / 1e9;
    var kvMsg = "KV cache ≈ " + (gb >= 1 ? gb.toFixed(1) + " GB" : (gb * 1000).toFixed(0) + " MB")
      + " ｜GQA(÷8) ≈ " + (gb / 8 >= 1 ? (gb / 8).toFixed(1) + " GB" : (gb * 1000 / 8).toFixed(0) + " MB")
      + " ｜有效上下文 ≈ 宣称的 " + Math.round((0.72 + 0.26 + 0.14 + 0.20 + 1) / 5 * 100) + "%";
    animG.appendChild(text(LX + 195, 414, kvMsg, { "font-size": 11, fill: "var(--text)" }));
  }

  /* 播放：针位扫描 */
  var timer = null, pos = 0;
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 扫描针的位置"; render(); return; }
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(function () {
      pos += 2;
      if (pos > 100) pos = 0;
      render();
      var xx = LX + (pos / 100) * LW;
      var dip = 0.52 + 0.43 * Math.exp(-Math.pow((pos - 50) / 26, 2)) + 0.04 * Math.exp(-Math.pow((pos - 4) / 5, 2)) + 0.03 * Math.exp(-Math.pow((pos - 96) / 5, 2));
      dip = Math.min(dip, 0.99);
      animG.appendChild(el("line", { x1: xx, y1: LY, x2: xx, y2: LY + LH, stroke: "var(--viz-c)", "stroke-width": 1.6 }));
      animG.appendChild(el("circle", { cx: xx, cy: LY + LH - dip * LH, r: 5, fill: "var(--viz-c)", stroke: "var(--text)", "stroke-width": 1 }));
      animG.appendChild(text(Math.min(xx + 8, LX + LW - 60), LY + LH - dip * LH - 10, Math.round(dip * 100) + "%", { "font-size": 11, "font-weight": "bold", fill: "var(--viz-c)" }));
      animG.appendChild(text(xx, LY - 8, "针在 " + pos + "%", { "text-anchor": "middle", "font-size": 10, fill: "var(--viz-c)" }));
    }, 220);
  });
  ctxIn.addEventListener("input", render);
  render();
})();
