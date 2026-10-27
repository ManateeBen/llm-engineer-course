/* viz-kernel：roofline 模型（B 类，可交互滑杆）
 * 固定 K=N=4096，滑杆调 M（batch token 数，几何档位）。
 * I(M,K,N) = MNK / (2(MK+KN+MN))，FP32 4 字节口径（承 8-1 §1）。
 * 可达性能 P = min(P_max, I*B_max)。
 */
(function () {
  var root = document.getElementById("viz-kernel");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#ker-static");
  var animG = root.querySelector("#ker-anim");

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

  var P_MAX = 2.2e15;      // BF16 稠密峰值 FLOP/s
  var B_MAX = 8e12;        // HBM 带宽 Byte/s
  var I_STAR = P_MAX / B_MAX; // 临界算术强度 ≈ 275
  var K = 4096, N = 4096;
  var M_OPTS = [1, 4, 16, 64, 256, 1024, 4096, 8192];

  function intensity(M, Kk, Nn) {
    return (M * Kk * Nn) / (2 * (M * Kk + Kk * Nn + M * Nn));
  }

  /* 对数坐标映射 */
  var X0 = 70, X1 = 600, Y0 = 370, Y1 = 50;
  var LI_MIN = -0.5, LI_MAX = 3.2;          // log10(I)
  var LP_MIN = 11.5, LP_MAX = 15.6;         // log10(P)
  function px(I) { return X0 + (Math.log(I) / Math.LN10 - LI_MIN) / (LI_MAX - LI_MIN) * (X1 - X0); }
  function py(P) { return Y0 - (Math.log(P) / Math.LN10 - LP_MIN) / (LP_MAX - LP_MIN) * (Y0 - Y1); }

  function fmt(P) {
    if (P >= 1e15) return (P / 1e15).toFixed(2) + " PFLOP/s";
    if (P >= 1e12) return (P / 1e12).toFixed(2) + " TFLOP/s";
    return (P / 1e9).toFixed(0) + " GFLOP/s";
  }

  function drawAxes() {
    /* 轴框 */
    staticG.appendChild(el("rect", { x: X0, y: Y1, width: X1 - X0, height: Y0 - Y1, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    /* 横轴刻度（10 的幂） */
    [-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3].forEach(function (e) {
      if (e < LI_MIN || e > LI_MAX) return;
      var I = Math.pow(10, e), x = px(I);
      staticG.appendChild(el("line", { x1: x, y1: Y0, x2: x, y2: Y0 + 5, stroke: "var(--text-soft)", "stroke-width": 0.8 }));
      staticG.appendChild(text(x, Y0 + 18, (I < 1 ? I.toFixed(1) : String(Math.round(I))), { "font-size": 8.5, "text-anchor": "middle", fill: "var(--text-soft)" }));
    });
    /* 纵轴刻度 */
    [12, 13, 14, 15].forEach(function (e) {
      var P = Math.pow(10, e), y = py(P);
      staticG.appendChild(el("line", { x1: X0 - 5, y1: y, x2: X0, y2: y, stroke: "var(--text-soft)", "stroke-width": 0.8 }));
      staticG.appendChild(text(X0 - 9, y + 3, "1e" + e, { "font-size": 8.5, "text-anchor": "end", fill: "var(--text-soft)" }));
    });
    staticG.appendChild(text((X0 + X1) / 2, Y0 + 34, "算术强度 I（FLOPs/Byte，对数）", { "font-size": 10, "text-anchor": "middle", fill: "var(--text)" }));
    staticG.appendChild(text(16, (Y0 + Y1) / 2, "可达性能", { "font-size": 10, "text-anchor": "middle", fill: "var(--text)", transform: "rotate(-90 16 " + ((Y0 + Y1) / 2) + ")" }));

    /* roofline：带宽斜坡 + 算力平台 */
    var I_RAMP0 = Math.pow(10, LI_MIN);
    staticG.appendChild(el("line", {
      x1: px(I_RAMP0), y1: py(I_RAMP0 * B_MAX), x2: px(I_STAR), y2: py(P_MAX),
      stroke: "var(--viz-b)", "stroke-width": 2
    }));
    staticG.appendChild(el("line", {
      x1: px(I_STAR), y1: py(P_MAX), x2: px(Math.pow(10, LI_MAX)), y2: py(P_MAX),
      stroke: "var(--viz-a)", "stroke-width": 2
    }));
    /* 临界点标记 */
    staticG.appendChild(el("line", { x1: px(I_STAR), y1: py(P_MAX), x2: px(I_STAR), y2: Y0, stroke: "var(--viz-danger)", "stroke-width": 1, "stroke-dasharray": "4 3" }));
    staticG.appendChild(text(px(I_STAR) + 6, Y0 - 8, "I*≈275", { "font-size": 9.5, fill: "var(--viz-danger)", "font-weight": "bold" }));
    staticG.appendChild(text(px(I_STAR) + 6, py(P_MAX) - 8, "算力平台 P_max", { "font-size": 9, fill: "var(--viz-a)" }));
    staticG.appendChild(text(X0 + 8, py(Math.pow(10, 13.2)) + 4, "带宽斜坡 I·B_max", { "font-size": 9, fill: "var(--viz-b)" }));
    /* 区域标注 */
    staticG.appendChild(text(X0 + 12, Y1 + 20, "← 带宽受限区（优化方向：少搬字节 / 融合 / 量化）", { "font-size": 9, fill: "var(--text-soft)" }));
    staticG.appendChild(text(px(I_STAR) + 12, Y1 + 20, "算力受限区（优化方向：算子 / 并行）→", { "font-size": 9, fill: "var(--text-soft)" }));

    /* 参考算子点（固定） */
    var refs = [
      { name: "逐元素激活", I: 0.25 },
      { name: "LayerNorm", I: 0.33 },
      { name: "Softmax", I: 0.5 },
      { name: "注意力 QKᵀ", I: 8 }
    ];
    refs.forEach(function (r) {
      var P = Math.min(P_MAX, r.I * B_MAX);
      staticG.appendChild(el("circle", { cx: px(r.I), cy: py(P), r: 3.2, fill: "var(--text-soft)", opacity: 0.7 }));
      staticG.appendChild(text(px(r.I) + 6, py(P) + 3, r.name + " I=" + r.I, { "font-size": 8, fill: "var(--text-soft)" }));
    });
  }

  function draw(M) {
    animG.innerHTML = "";
    var I = intensity(M, K, N);
    var P = Math.min(P_MAX, I * B_MAX);
    var bound = I < I_STAR;
    var x = px(I), y = py(P);

    /* 竖线连到 x 轴 */
    animG.appendChild(el("line", { x1: x, y1: y, x2: x, y2: Y0, stroke: "var(--viz-c)", "stroke-width": 1, "stroke-dasharray": "3 3" }));
    /* 当前 GEMM 点 */
    animG.appendChild(el("circle", { cx: x, cy: y, r: 6, fill: bound ? "var(--viz-danger)" : "var(--viz-c)", opacity: 0.95 }));
    animG.appendChild(el("circle", { cx: x, cy: y, r: 11, fill: "none", stroke: bound ? "var(--viz-danger)" : "var(--viz-c)", "stroke-width": 1.2, opacity: 0.5 }));
    animG.appendChild(text(x + 14, y - 4, "GEMM M=" + M, { "font-size": 9.5, "font-weight": "bold", fill: bound ? "var(--viz-danger)" : "var(--viz-c)" }));
    animG.appendChild(text(x + 14, y + 9, "I=" + I.toFixed(2) + " → " + fmt(P), { "font-size": 9, fill: "var(--text)" }));

    /* 读数面板 */
    var rx = 78, ry = 62;
    animG.appendChild(el("rect", { x: rx, y: ry, width: 250, height: 74, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9, opacity: 0.96 }));
    animG.appendChild(text(rx + 10, ry + 20, "形状：M=" + M + "  K=" + K + "  N=" + N, { "font-size": 9.5, fill: "var(--text-soft)" }));
    animG.appendChild(text(rx + 10, ry + 38, "算术强度 I = " + I.toFixed(2) + " FLOPs/Byte", { "font-size": 10, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(text(rx + 10, ry + 55, "可达 " + fmt(P) + "（峰值的 " + (100 * P / P_MAX).toFixed(1) + "%）", { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(rx + 10, ry + 69, bound ? "判定：带宽受限 → 融合 / 量化 / 提 batch" : "判定：算力受限 → 更好的算子与并行", { "font-size": 9.5, "font-weight": "bold", fill: bound ? "var(--viz-danger)" : "var(--viz-c)" }));

    var concl = bound
      ? "结论：M=" + M + " 时 GEMM 仍在带宽受限区——单请求解码的 batch 太小时，瓶颈是「搬权重」而非「算矩阵」，优化 GEMM 本身无效。"
      : "结论：M=" + M + " 已越过 I*，进入算力受限区——此时该优化算子与并行策略；继续增大 batch 不再提升单步效率。";
    animG.appendChild(text(20, 412, concl, { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(20, 428, "注：I=MNK/(2(MK+KN+MN))，三个偏导恒正（8-1 §1 已证），故任意维度增大都提升算术强度。", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var mEl = root.querySelector("#ker-m");
  var mVal = root.querySelector("#ker-m-val");
  function update() {
    var M = M_OPTS[+mEl.value];
    mVal.textContent = M;
    draw(M);
  }
  drawAxes();
  mEl.addEventListener("input", update);
  update();
})();
