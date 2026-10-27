/* viz-ascend：GPU vs NPU 架构对比 + Ring AllReduce 时间构成（C 类，单滑杆）
 * T = 2(N-1)/N * D/B + 2(N-1)*α
 */
(function () {
  var root = document.getElementById("viz-ascend");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#asc-static");
  var animG = root.querySelector("#asc-anim");

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
  function box(x, y, w, h, fill, stroke) {
    return el("rect", { x: x, y: y, width: w, height: h, rx: 4, fill: fill, stroke: stroke || "var(--border)", "stroke-width": 0.9 });
  }
  function label(x, y, w, h, str, fs, fill) {
    var t = el("text", { x: x + w / 2, y: y + h / 2 + 4, "text-anchor": "middle", "font-size": fs || 9.5, fill: fill || "var(--text)" });
    t.textContent = str;
    return t;
  }

  var N_OPTS = [8, 16, 32, 64, 128];
  var D = 1e9;         // 1 GB
  var BW = 200e9;      // 200 GB/s
  var ALPHA = 2e-6;    // 每跳 2 μs

  /* ---- 左：GPU ---- */
  var lx = 24, ly = 44;
  staticG.appendChild(text(lx, 30, "GPU：统一 SIMT + 专用矩阵单元", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(box(lx, ly, 270, 150));
  staticG.appendChild(text(lx + 10, ly + 18, "大量同构核心（SIMT）", { "font-size": 9, fill: "var(--text-soft)" }));
  for (var r = 0; r < 3; r++) {
    for (var c = 0; c < 10; c++) {
      staticG.appendChild(el("rect", { x: lx + 12 + c * 25, y: ly + 26 + r * 22, width: 20, height: 16, rx: 2, fill: "var(--viz-a)", opacity: 0.75 }));
    }
  }
  staticG.appendChild(box(lx + 12, ly + 100, 246, 36, "var(--bg-soft)"));
  staticG.appendChild(label(lx + 12, ly + 100, 246, 36, "TensorCore：矩阵加速（规整 GEMM）", 9, "var(--text)"));
  staticG.appendChild(text(lx + 10, ly + 158, "cache 层次对程序员相对透明", { "font-size": 8.5, fill: "var(--text-soft)" }));

  /* ---- 右：NPU ---- */
  var rx = 330, ry = 44;
  staticG.appendChild(text(rx, 30, "昇腾 AI Core：三条异构流水线", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(box(rx, ry, 280, 150));
  var lanes = [
    { n: "Cube：矩阵乘（算力峰值来源）", c: "var(--viz-b)" },
    { n: "Vector：激活 / 归一化 / 归约", c: "var(--viz-c)" },
    { n: "Scalar：地址计算 / 流程控制", c: "var(--viz-a)" }
  ];
  lanes.forEach(function (l, i) {
    var y = ry + 12 + i * 34;
    staticG.appendChild(box(rx + 10, y, 260, 28, l.c));
    staticG.appendChild(label(rx + 10, y, 260, 28, l.n, 9, "var(--text)"));
  });
  staticG.appendChild(text(rx + 10, ry + 122, "显式分层存储：寄存器 → L0 → L1/UB → L2 → HBM", { "font-size": 8.5, fill: "var(--text)" }));
  staticG.appendChild(text(rx + 10, ry + 136, "搬运需显式编排 → 负担重，但排好可逼近硬件极限", { "font-size": 8.5, fill: "var(--text-soft)" }));
  staticG.appendChild(text(rx + 10, ry + 150, "（DeepGEMM-Ascend BF16 实测 99.8% 硬件极限）", { "font-size": 8, fill: "var(--text-soft)" }));

  /* ---- 下：AllReduce ---- */
  staticG.appendChild(text(24, 218, "Ring AllReduce 时间构成：T = 2(N−1)/N · D/B + 2(N−1)α", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(text(24, 232, "D = 1 GB，B = 200 GB/s，α = 2 μs（域内高速互联）", { "font-size": 8.5, fill: "var(--text-soft)" }));

  function draw(N) {
    animG.innerHTML = "";
    var tBw = (2 * (N - 1) / N) * (D / BW);
    var tLat = 2 * (N - 1) * ALPHA;
    var tot = tBw + tLat;
    var x0 = 40, w = 520, h = 30, y = 250;
    animG.appendChild(text(x0, y - 6, "N = " + N + " 卡", { "font-size": 9.5, fill: "var(--text-soft)" }));
    animG.appendChild(el("rect", { x: x0, y: y, width: w, height: h, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    var wBw = w * (tBw / tot);
    animG.appendChild(el("rect", { x: x0, y: y, width: wBw, height: h, rx: 3, fill: "var(--viz-b)", opacity: 0.9 }));
    animG.appendChild(el("rect", { x: x0 + wBw, y: y, width: w - wBw, height: h, rx: 3, fill: "var(--viz-danger)", opacity: 0.75 }));
    animG.appendChild(label(x0, y, wBw, h, "带宽项 " + (tBw * 1000).toFixed(2) + " ms（" + (100 * tBw / tot).toFixed(1) + "%）", 9.5, "var(--text)"));
    if (w - wBw > 60) {
      animG.appendChild(label(x0 + wBw, y, w - wBw, h, "延迟项 " + (tLat * 1e6).toFixed(0) + " μs", 9, "var(--text)"));
    }
    animG.appendChild(text(x0, y + h + 18, "总计 " + (tot * 1000).toFixed(2) + " ms；带宽项系数 2(N−1)/N = " + (2 * (N - 1) / N).toFixed(3) + "（→2，几乎与 N 无关）", { "font-size": 9, fill: "var(--text)" }));

    /* 跨节点退化对照 */
    var bwCross = 25e9; // 跨节点掉到 25 GB/s
    var tCross = (2 * (N - 1) / N) * (D / bwCross) + tLat;
    animG.appendChild(el("rect", { x: x0, y: y + 40, width: w * Math.min(1, tot / tCross), height: h, rx: 3, fill: "var(--viz-a)", opacity: 0.55 }));
    animG.appendChild(text(x0, y + 40 + h + 18, "若跨节点、链路掉到 25 GB/s：同一操作变成 " + (tCross * 1000).toFixed(2) + " ms（↑ " + (tCross / tot).toFixed(1) + "×）", { "font-size": 9, fill: "var(--text)" }));

    animG.appendChild(text(24, 400, "结论：卡数从 8 涨到 128，理论 AllReduce 时间几乎不变——所以 MoE 的通信瓶颈不在「卡多」，而在", { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(24, 414, "「跨节点带宽掉档」与「通信未与计算重叠」。这也是超节点要把互联与算力一起联合优化的原因。", { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(24, 430, "注：该公式是下界，假设链路无争用；实测更差时应查拓扑与重叠率（承 11-0 练习 3）。", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var nEl = root.querySelector("#asc-n"), nVal = root.querySelector("#asc-n-val");
  function update() {
    var N = N_OPTS[+nEl.value];
    nVal.textContent = N;
    draw(N);
  }
  nEl.addEventListener("input", update);
  update();
})();
