/* viz-attn-flow：Transformer 单层数据流（A 类）
 * 11 个阶段的数据流图：输入 → QKV 投影 → 切头 → 每头注意力 → 拼回 W^O →
 * 残差+LN → FFN 升维 → GELU → FFN 降维 → 残差+LN → 输出。
 * 「发射 token」让绿点沿路径逐段流动并高亮当前阶段；
 * 右侧"形状账本"随 d_model / h 实时重算参数与 FLOPs。
 */
(function () {
  var root = document.getElementById("viz-attn-flow");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vaf-static");
  var animG = root.querySelector("#vaf-anim");
  var dIn = root.querySelector("#vaf-d");
  var hIn = root.querySelector("#vaf-h");
  var dVal = root.querySelector("#vaf-dval");
  var hVal = root.querySelector("#vaf-hval");
  var playBtn = root.querySelector("#vaf-play");

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
  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toFixed(0);
  }

  /* ---- 阶段定义 ---- */
  var CX = 215, BX = 40, BW = 350, BH = 25, GAP = 10.5;
  var stages = [
    { t: "输入 token x_t（嵌入向量，d 维）", tag: "embed" },
    { t: "线性投影：Q = xW^Q   K = xW^K   V = xW^V", tag: "qkv" },
    { t: "切成 h 个头，每头 d_k = d/h 维", tag: "split" },
    { t: "每头注意力：softmax(QK^T / √d_k) · V", tag: "attn" },
    { t: "拼接头 → 输出投影 W^O（混合各头信息）", tag: "merge" },
    { t: "残差相加 + LayerNorm（稳定训练，见 3-2）", tag: "res1" },
    { t: "FFN 升维：d → 4d（参数主力，见 3-0）", tag: "up" },
    { t: "GELU 非线性", tag: "gelu" },
    { t: "FFN 降维：4d → d", tag: "down" },
    { t: "残差相加 + LayerNorm", tag: "res2" },
    { t: "输出 → 下一层 / lm_head（共享嵌入权重）", tag: "out" }
  ];
  var boxY = [], boxes = [];
  for (var i = 0; i < stages.length; i++) {
    boxY.push(18 + i * (BH + GAP));
  }

  /* ---- 静态层：框、箭头、侧栏标题 ---- */
  for (i = 0; i < stages.length; i++) {
    var y = boxY[i];
    boxes.push(el("rect", {
      x: BX, y: y, width: BW, height: BH, rx: 5,
      fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 1, id: "vaf-box-" + i
    }));
    staticG.appendChild(boxes[i]);
    staticG.appendChild(text(BX + 12, y + BH / 2 + 4.5, (i + 1) + ". " + stages[i].t, { "font-size": 11.5, fill: "var(--text)" }));
    if (i < stages.length - 1) {
      staticG.appendChild(el("line", {
        x1: CX, y1: y + BH + 1, x2: CX, y2: y + BH + GAP - 1,
        stroke: "var(--text-soft)", "stroke-width": 1.4, "marker-end": "url(#vaf-arrow)"
      }));
    }
  }
  var defs = el("defs", {});
  var marker = el("marker", { id: "vaf-arrow", markerWidth: 6, markerHeight: 6, refX: 3, refY: 3, orient: "auto" });
  marker.appendChild(el("path", { d: "M0,0 L6,3 L0,6 z", fill: "var(--text-soft)" }));
  defs.appendChild(marker);
  staticG.appendChild(defs);

  /* 右侧账本面板 */
  var PX = 405, PY = 18, PW = 222, PH = 150;
  staticG.appendChild(el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 6, fill: "var(--bg-soft)", stroke: "var(--border)" }));
  staticG.appendChild(text(PX + 10, PY + 18, "形状账本（单层）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var bookLines = [];
  for (i = 0; i < 7; i++) {
    var tl = text(PX + 10, PY + 36 + i * 16, "", { "font-size": 11, fill: "var(--text-soft)" });
    staticG.appendChild(tl);
    bookLines.push(tl);
  }

  /* 右侧阶段说明 */
  var P2Y = PY + PH + 12;
  staticG.appendChild(el("rect", { x: PX, y: P2Y, width: PW, height: 92, rx: 6, fill: "var(--bg-soft)", stroke: "var(--border)" }));
  staticG.appendChild(text(PX + 10, P2Y + 18, "当前阶段", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var stageTitle = text(PX + 10, P2Y + 38, "", { "font-size": 11, fill: "var(--accent)", "font-weight": "bold" });
  var stageDesc = text(PX + 10, P2Y + 56, "", { "font-size": 11, fill: "var(--text-soft)" });
  var stageDesc2 = text(PX + 10, P2Y + 72, "", { "font-size": 11, fill: "var(--text-soft)" });
  staticG.appendChild(stageTitle); staticG.appendChild(stageDesc); staticG.appendChild(stageDesc2);

  /* 左下：参数量结构条 */
  var BY = boxY[stages.length - 1] + BH + 16;
  staticG.appendChild(text(BX, BY + 10, "单层参数构成（12d²）：", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  var segData = [
    { label: "QKV 投影 3d²", frac: 3, color: "var(--accent)" },
    { label: "W^O d²", frac: 1, color: "var(--viz-b)" },
    { label: "FFN 8d²", frac: 8, color: "var(--viz-c)" }
  ];
  var SX = BX, SW = BW, segX = SX;
  for (i = 0; i < segData.length; i++) {
    var w = (segData[i].frac / 12) * SW;
    staticG.appendChild(el("rect", { x: segX, y: BY + 18, width: w, height: 14, fill: segData[i].color, opacity: 0.85 }));
    staticG.appendChild(text(segX + w / 2, BY + 40, segData[i].label, { "text-anchor": "middle", "font-size": 10.5, fill: "var(--text-soft)" }));
    segX += w;
  }

  /* ---- 动态渲染 ---- */
  var timer = null, prog = 0, curStage = -1;

  function updateBook() {
    var d = parseInt(dIn.value, 10), h = parseInt(hIn.value, 10);
    var dk = Math.round(d / h);
    bookLines[0].textContent = "d = " + d + "，h = " + h + "，d_k = " + dk;
    bookLines[1].textContent = "QKV 投影参数：3d² = " + fmt(3 * d * d);
    bookLines[2].textContent = "输出投影 W^O：d² = " + fmt(d * d);
    bookLines[3].textContent = "FFN：2 × d × 4d = 8d² = " + fmt(8 * d * d);
    bookLines[4].textContent = "每层合计 ≈ 12d² = " + fmt(12 * d * d);
    bookLines[5].textContent = "KV cache/层/ token：4·h·d_k 元素";
    bookLines[6].textContent = "序列 L 的注意力计算：O(L²·d)";
  }

  var stageInfo = [
    ["嵌入查找", "token id → 词表中的 d 维向量；训练时该矩阵还兼任输出层（权重共享）。"],
    ["三个投影", "同一份 x 乘三张不同矩阵：Q 是提问，K 是索引，V 是答案。d² 参数 ×3。"],
    ["切头", "h 个头各自在 d_k 维子空间独立算注意力——不同头学不同关系（句法/指代/位置）。"],
    ["缩放点积", "QK^T/√d_k 防止方差随 d_k 膨胀；softmax 归一化为权重后加权 V。"],
    ["拼回 + W^O", "h 份结果拼接回 d 维，W^O 让各头信息混合。"],
    ["残差 + LN", "x + Sublayer(x) 保证梯度恒等通路（3-2）；LN 按特征维归一化。"],
    ["FFN 升维", "先升到 4d：Transformer 把三分之二参数花在这里——知识驻地。"],
    ["GELU", "平滑非线性；ReLU 的硬化版本，负区间不完全死。"],
    ["FFN 降维", "回到 d 维，准备与残差流汇合。"],
    ["残差 + LN", "第二次汇合；此后表示直接流向下一层同一位置。"],
    ["输出", "最后一层的输出进 lm_head 得词表 logits；中间层则继续堆叠。"]
  ];

  function render() {
    animG.textContent = "";
    dVal.textContent = dIn.value;
    hVal.textContent = hIn.value;
    updateBook();

    var si = Math.min(Math.floor(prog * stages.length), stages.length - 1);
    for (var k = 0; k < boxes.length; k++) {
      boxes[k].setAttribute("stroke", k === si ? "var(--accent)" : "var(--border)");
      boxes[k].setAttribute("stroke-width", k === si ? 2 : 1);
      boxes[k].setAttribute("fill", k === si ? "var(--accent-soft, rgba(207,34,46,0.10))" : "var(--bg-soft)");
    }
    /* 绿点位置：阶段内插值 */
    var local = prog * stages.length - si;
    var y0 = boxY[si] + BH / 2;
    var y1 = si < stages.length - 1 ? boxY[si + 1] + BH / 2 : boxY[si] + BH / 2;
    var dot = el("circle", { cx: CX, cy: y0 + (y1 - y0) * local, r: 5.5, fill: "var(--viz-c)", stroke: "var(--text)", "stroke-width": 1 });
    animG.appendChild(dot);
    /* 脉冲尾迹 */
    animG.appendChild(el("line", {
      x1: CX, y1: boxY[si] + BH, x2: CX, y2: y0 + (y1 - y0) * local,
      stroke: "var(--viz-c)", "stroke-width": 2, opacity: 0.35
    }));
    stageTitle.textContent = "阶段 " + (si + 1) + "：" + stageInfo[si][0];
    stageDesc.textContent = stageInfo[si][1].slice(0, 18);
    stageDesc2.textContent = stageInfo[si][1].length > 18 ? stageInfo[si][1].slice(18, 36) : "";
  }

  function tick() {
    prog += 0.012;
    if (prog >= 1) { prog = 0; }
    render();
  }

  playBtn.addEventListener("click", function () {
    if (timer) {
      clearInterval(timer); timer = null;
      playBtn.textContent = "▶ 发射 token";
      return;
    }
    prog = 0;
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(tick, 40);
  });
  dIn.addEventListener("input", render);
  hIn.addEventListener("input", render);
  render();
})();
