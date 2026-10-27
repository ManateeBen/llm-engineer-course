/* viz-npudeploy：PD 分离架构 + KV 容量账（C 类）
 * KV/token = 2*L*n_kv*d_h*bytes；示意模型 L=80, n_kv=8 头×128 维。
 * 承 11-4 §2~§3、8-7 的账本。
 */
(function () {
  var root = document.getElementById("viz-npudeploy");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#nd-static");
  var animG = root.querySelector("#nd-anim");

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var textLayer = staticG;
  function text(x, y, str, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    textLayer.appendChild(t);
    return t;
  }

  var L = 80, NHKV = 8, DH = 128, S = 8192;
  var BYTES = [2, 1]; // FP16 / INT8
  var WLABEL = ["FP16", "INT8"];
  var B_OPTS = [8, 16, 32, 64];
  var WEIGHT_GB = 14, KV_BUDGET_GB = 60;

  var iW = root.querySelector("#nd-w");
  var iB = root.querySelector("#nd-b");

  function drawStatic() {
    textLayer = staticG;
    // PD 分离示意（上）
    staticG.appendChild(text(20, 22, "PD 分离服务架构", { "font-size": 12, fill: "var(--muted)" }));
    staticG.appendChild(el("rect", { x: 30, y: 36, width: 250, height: 96, rx: 8, fill: "rgba(212,135,58,0.12)", stroke: "#d0873a", "stroke-width": 1.5 }));
    staticG.appendChild(text(155, 60, "预填充组（P）", { "font-size": 12, "text-anchor": "middle", fill: "#d0873a", "font-weight": "bold" }));
    staticG.appendChild(text(155, 80, "整段 prompt 一次算", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
    staticG.appendChild(text(155, 96, "算力受限 → 吃 P_max", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
    staticG.appendChild(text(155, 116, "扩缩：按 prefill 队列长度", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));

    staticG.appendChild(el("rect", { x: 360, y: 36, width: 250, height: 96, rx: 8, fill: "rgba(74,125,189,0.12)", stroke: "#4a7dbd", "stroke-width": 1.5 }));
    staticG.appendChild(text(485, 60, "解码组（D）", { "font-size": 12, "text-anchor": "middle", fill: "#4a7dbd", "font-weight": "bold" }));
    staticG.appendChild(text(485, 80, "逐 token 生成", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
    staticG.appendChild(text(485, 96, "带宽受限 → 吃 B_max", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
    staticG.appendChild(text(485, 116, "扩缩：按并发会话数", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));

    staticG.appendChild(el("line", { x1: 280, y1: 84, x2: 360, y2: 84, stroke: "var(--muted)", "stroke-width": 2, "stroke-dasharray": "6,4" }));
    staticG.appendChild(text(320, 76, "KV 搬家", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var by = BYTES[+iW.value];
    var b = B_OPTS[+iB.value];
    root.querySelector("#nd-w-val").textContent = WLABEL[+iW.value];
    root.querySelector("#nd-b-val").textContent = b;
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var kvPerTok = 2 * L * NHKV * DH * by; // 字节/token
    var kvPerReq = kvPerTok * S / 1e9;     // GB
    var totalKV = kvPerReq * b;

    var y0 = 190;
    text(20, y0 - 14, "KV cache 账本（8k 上下文 / 条）", { "font-size": 12, fill: "var(--muted)" });
    // 权重区 + KV 区堆叠
    var x0 = 60, x1 = 560, h = 40;
    var sc = (x1 - x0) / (WEIGHT_GB + KV_BUDGET_GB);
    animG.appendChild(el("rect", { x: x0, y: y0, width: WEIGHT_GB * sc, height: h, fill: "#4a7dbd", opacity: 0.85 }));
    animG.appendChild(text(x0 + WEIGHT_GB * sc / 2, y0 + 24, "权重 " + WEIGHT_GB + "GB", { "font-size": 10, "text-anchor": "middle", fill: "#fff" }));
    var kvw = totalKV * sc;
    var over = totalKV > KV_BUDGET_GB;
    animG.appendChild(el("rect", { x: x0 + WEIGHT_GB * sc, y: y0, width: Math.min(kvw, KV_BUDGET_GB * sc), height: h, fill: over ? "#c33" : "#3a9d8f", opacity: 0.85 }));
    if (kvw < KV_BUDGET_GB * sc && kvw > 60) animG.appendChild(text(x0 + WEIGHT_GB * sc + kvw / 2, y0 + 24, "KV", { "font-size": 10, "text-anchor": "middle", fill: "#fff" }));
    animG.appendChild(el("rect", { x: x0 + (WEIGHT_GB + KV_BUDGET_GB) * sc, y: y0, width: (x1 - x0) - (WEIGHT_GB + KV_BUDGET_GB) * sc, height: h, fill: "#e8e8e8" }));
    text(x0, y0 + h + 22, "每条 KV " + kvPerReq.toFixed(2) + " GB × " + b + " 并发 = " + totalKV.toFixed(1) + " GB / 预算 " + KV_BUDGET_GB + " GB  " + (over ? "⚠️ 容量不足" : "✔ 可行"), { "font-size": 12, fill: over ? "#c33" : "var(--fg)", "font-weight": "bold" });
    text(x0, y0 + h + 44, "KV/token = 2·L·n_kv·d_h·" + by + "B = " + (kvPerTok / 1024).toFixed(0) + " KB（MLA/量化/前缀缓存是三个乘法杠杆）", { "font-size": 11, fill: "var(--muted)" });
  }

  drawStatic();
  draw();
  iW.addEventListener("input", draw);
  iB.addEventListener("input", draw);
})();
