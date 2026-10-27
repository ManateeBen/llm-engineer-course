/* viz-prenorm：Pre/Post-LN 梯度路径对比（C 类）
 * 左右两幅层栈 + 顶部释放的梯度脉冲下行；
 * Pre-LN：恒等旁路，脉冲亮度恒定；Post-LN：每层穿 LN 收费站，亮度指数衰减。
 * 底部：对数刻度逐层梯度柱状图；warmup 开关控制 Post-LN 训练初期的方差尖峰。
 */
(function () {
  var root = document.getElementById("viz-prenorm");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vp-static");
  var animG = root.querySelector("#vp-anim");
  var layersIn = root.querySelector("#vp-layers");
  var lVal = root.querySelector("#vp-lval");
  var playBtn = root.querySelector("#vp-play");
  var warmupChk = root.querySelector("#vp-warmup");

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

  var DECAY = 0.72;          /* Post-LN 每层衰减因子（示意） */
  var TOP = 52, BOTTOM = 300;
  var PULSE_X = { pre: 52, post: 372 };
  var BOX = { pre: { x: 78, w: 200 }, post: { x: 398, w: 200 } };

  /* ---------- 静态框架 ---------- */
  function panel(cx, title, formula, color) {
    staticG.appendChild(text(cx, 24, title, { "text-anchor": "middle", "font-size": 13, "font-weight": "bold", fill: color }));
    staticG.appendChild(text(cx, 40, formula, { "text-anchor": "middle", "font-size": 11.5, fill: "var(--text-soft)" }));
  }
  panel(168, "Pre-LN", "x + F(LayerNorm(x))", "var(--viz-c)");
  panel(492, "Post-LN", "LayerNorm(x + F(x))", "var(--accent)");
  /* 顶层 loss 与底层 embedding 标注 */
  staticG.appendChild(text(52, TOP - 8, "loss ∇", { "font-size": 11, fill: "var(--text)" }));
  staticG.appendChild(text(372, TOP - 8, "loss ∇", { "font-size": 11, fill: "var(--text)" }));
  staticG.appendChild(text(52, BOTTOM + 30, "嵌入层", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(text(372, BOTTOM + 30, "嵌入层", { "font-size": 11, fill: "var(--text-soft)" }));

  /* ---------- 动态：层栈 + 脉冲 ---------- */
  var timer = null, prog = -1;

  function layerY(idx, L) { return TOP + 14 + (idx / (L - 1)) * (BOTTOM - TOP - 28); }

  function drawStack(side, L, isPre) {
    var bx = BOX[side].x, bw = BOX[side].w, px = PULSE_X[side];
    /* 恒等通路：Pre 完整直线；Post 被每层 LN 打断 */
    if (isPre) {
      animG.appendChild(el("line", { x1: px, y1: TOP, x2: px, y2: BOTTOM, stroke: "var(--viz-c)", "stroke-width": 3, opacity: 0.55 }));
    }
    for (var i = 0; i < L; i++) {
      var y = layerY(i, L);
      var h = Math.min(15, (BOTTOM - TOP) / L * 0.62);
      if (isPre) {
        /* 层盒：LN → F 支路挂在高速公路上 */
        animG.appendChild(el("rect", { x: bx, y: y - h / 2, width: bw, height: h, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
        animG.appendChild(text(bx + bw / 2, y + 3.5, "LN → F", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));
        animG.appendChild(el("line", { x1: px, y1: y - h / 2, x2: bx, y2: y - h / 2, stroke: "var(--viz-c)", "stroke-width": 1.2, opacity: 0.7 }));
        animG.appendChild(el("line", { x1: bx, y1: y + h / 2, x2: px, y2: y + h / 2, stroke: "var(--viz-c)", "stroke-width": 1.2, opacity: 0.7 }));
        animG.appendChild(el("circle", { cx: px, cy: y, r: 2.6, fill: "var(--viz-c)" }));
      } else {
        /* 层盒直接压在通路上：梯度必须穿过 LN */
        animG.appendChild(el("rect", { x: bx - 40, y: y - h / 2, width: 90, height: h, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
        animG.appendChild(text(bx - 40 + 45, y + 3.5, "F", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));
        animG.appendChild(el("rect", { x: px - 26, y: y - h / 2, width: 52, height: h, rx: 3, fill: "rgba(207,34,46,0.12)", stroke: "var(--accent)", "stroke-width": 1.2 }));
        animG.appendChild(text(px, y + 3.5, "LN", { "text-anchor": "middle", "font-size": 9.5, "font-weight": "bold", fill: "var(--accent)" }));
        /* 断裂的通路段 */
        var segTop = i === 0 ? TOP : layerY(i - 1, L) + h / 2;
        var segBot = i === L - 1 ? BOTTOM : layerY(i + 1, L) - h / 2;
        animG.appendChild(el("line", { x1: px, y1: segTop, x2: px, y2: y - h / 2, stroke: "var(--accent)", "stroke-width": 3, opacity: 0.4 }));
        animG.appendChild(el("line", { x1: px, y1: y + h / 2, x2: px, y2: segBot, stroke: "var(--accent)", "stroke-width": 3, opacity: 0.4 }));
      }
    }
  }

  function render() {
    animG.textContent = "";
    var L = parseInt(layersIn.value, 10);
    lVal.textContent = L;
    drawStack("pre", L, true);
    drawStack("post", L, false);

    /* 脉冲 */
    if (prog >= 0) {
      var y = TOP + prog * (BOTTOM - TOP);
      var layerIdx = Math.round(((y - TOP) / (BOTTOM - TOP)) * (L - 1));
      /* Pre：亮度恒定 1；Post：0.72^layerIdx，warmup 缓解初期方差（示意：衰减略缓） */
      var dec = warmupChk.checked ? Math.pow(0.85, layerIdx) : Math.pow(DECAY, layerIdx);
      var preOp = 1;
      animG.appendChild(el("circle", { cx: PULSE_X.pre, cy: y, r: 5, fill: "var(--viz-c)", opacity: 0.35 + 0.65 * preOp, stroke: "var(--text)", "stroke-width": 0.8 }));
      animG.appendChild(el("circle", { cx: PULSE_X.post, cy: y, r: 5, fill: "var(--accent)", opacity: 0.25 + 0.75 * dec, stroke: "var(--text)", "stroke-width": 0.8 }));
    }

    /* 底部：对数刻度逐层梯度柱状图 */
    var BGY = 322, BGH = 62, BGX = 70, BGW = 500;
    animG.appendChild(text(BGX - 6, BGY - 6, "各层收到的梯度幅值（对数刻度）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
    [1, 0.1, 0.01].forEach(function (v, k) {
      var yy = BGY + BGH - (Math.log10(v) + 2) / 2 * BGH;
      animG.appendChild(el("line", { x1: BGX, y1: yy, x2: BGX + BGW, y2: yy, stroke: "var(--border)", "stroke-width": 0.6, "stroke-dasharray": "3 3" }));
      animG.appendChild(text(BGX - 6, yy + 3.5, String(v), { "text-anchor": "end", "font-size": 9.5, fill: "var(--text-soft)" }));
    });
    var bw2 = BGW / L;
    for (var i2 = 0; i2 < L; i2++) {
      var gp = 1, gq = warmupChk.checked ? Math.pow(0.85, i2) : Math.pow(DECAY, i2);
      var hp = (Math.log10(Math.max(gp, 0.01)) + 2) / 2 * BGH;
      var hq = (Math.log10(Math.max(gq, 0.01)) + 2) / 2 * BGH;
      animG.appendChild(el("rect", { x: BGX + i2 * bw2 + 1, y: BGY + BGH - hp, width: bw2 / 2 - 2, height: hp, fill: "var(--viz-c)", opacity: 0.85 }));
      animG.appendChild(el("rect", { x: BGX + i2 * bw2 + bw2 / 2 + 1, y: BGY + BGH - hq, width: bw2 / 2 - 2, height: hq, fill: "var(--accent)", opacity: 0.85 }));
    }
    animG.appendChild(el("line", { x1: BGX, y1: BGY + BGH, x2: BGX + BGW, y2: BGY + BGH, stroke: "var(--text)", "stroke-width": 1 }));
    animG.appendChild(text(BGX, BGY + BGH + 16, "第 1 层", { "font-size": 9.5, fill: "var(--text-soft)" }));
    animG.appendChild(text(BGX + BGW, BGY + BGH + 16, "第 " + L + " 层", { "text-anchor": "end", "font-size": 9.5, fill: "var(--text-soft)" }));
    /* 图例 */
    animG.appendChild(el("rect", { x: BGX + BGW - 150, y: BGY - 20, width: 10, height: 10, fill: "var(--viz-c)" }));
    animG.appendChild(text(BGX + BGW - 136, BGY - 11, "Pre-LN ≈ 1", { "font-size": 10.5, fill: "var(--text-soft)" }));
    animG.appendChild(el("rect", { x: BGX + BGW - 70, y: BGY - 20, width: 10, height: 10, fill: "var(--accent)" }));
    animG.appendChild(text(BGX + BGW - 56, BGY - 11, "Post-LN", { "font-size": 10.5, fill: "var(--text-soft)" }));

    /* 结论条（两行，控制宽度） */
    var eff = warmupChk.checked ? Math.ceil(Math.log(0.01) / Math.log(0.85)) : Math.ceil(Math.log(0.01) / Math.log(DECAY));
    eff = Math.min(eff, L);
    var msg1 = warmupChk.checked
      ? "warmup 压住初期方差尖峰，但每层穿 LN 的衰减仍在：有效深度 ≈ " + eff + " 层"
      : "Post-LN 有效深度 ≈ " + eff + " 层（梯度跌破 1%）——深层堆了也学不动";
    var msg2 = "Pre-LN 恒等旁路保证梯度 ≥ 1，与 warmup 无关；其收益递减来自表示层面，不是梯度消失";
    animG.appendChild(text(BGX - 6, BGY + BGH + 34, msg1, { "font-size": 11, fill: "var(--text)" }));
    animG.appendChild(text(BGX - 6, BGY + BGH + 50, msg2, { "font-size": 11, fill: "var(--text-soft)" }));
  }

  function tick() {
    prog += 0.016;
    if (prog > 1) { prog = -1; clearInterval(timer); timer = null; playBtn.textContent = "▶ 从顶层释放梯度"; }
    render();
  }

  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 从顶层释放梯度"; return; }
    prog = 0;
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(tick, 40);
  });
  layersIn.addEventListener("input", render);
  warmupChk.addEventListener("change", render);
  render();
})();
