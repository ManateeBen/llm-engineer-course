/* viz-edge：端边云三层账 + 跨设备切分策略对比（C 类）
 * 承 11-5 §1~§5。示意口径：端 3B W4 模型（带宽下界 25ms/token），
 * 云 3B 单卡（5ms/token + RTT），草稿 0.7B（6ms/token，k=4，α=0.7）。
 */
(function () {
  var root = document.getElementById("viz-edge");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#ed-static");
  var animG = root.querySelector("#ed-anim");

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

  var RTT = [20, 80, 150, 300]; // ms
  var SLAB = ["级联路由", "投机分层", "逐 token 上云"];
  // 端侧 3B W4：权重 1.7GB / 68GB/s = 25ms/token（级联时简单请求走端侧）
  var T_EDGE = 25;
  // 端侧草稿 0.7B W4：0.4GB/68GB/s ≈ 6ms
  var T_DRAFT = 6;
  // 云侧 decode 5ms/token（带宽受限），K=4 草稿、α=0.7
  var T_CLOUD = 5, K = 4, ALPHA = 0.7;

  var iS = root.querySelector("#ed-s");
  var iR = root.querySelector("#ed-r");

  function drawStatic() {
    textLayer = staticG;
    text(20, 22, "端 / 边 / 云：约束逐级跃迁", { "font-size": 12, fill: "var(--muted)" });
    var layers = [
      { x: 30, w: 180, c: "#c33", name: "端 5~15 W", rows: ["LPDDR 68 GB/s", "单请求延迟 × 能量", "账本：功耗墙"] },
      { x: 230, w: 180, c: "#d0873a", name: "边 100~500 W", rows: ["局域 RTT < 1 ms", "小规模服务化", "账本：8-7 缩印版"] },
      { x: 430, w: 180, c: "#4a7dbd", name: "云 kW 级", rows: ["HBM 3+ TB/s", "吞吐 × SLO", "账本：8-7/8-8 完整版"] }
    ];
    for (var i = 0; i < 3; i++) {
      var L = layers[i];
      staticG.appendChild(el("rect", { x: L.x, y: 36, width: L.w, height: 92, rx: 8, fill: "rgba(0,0,0,0.04)", stroke: L.c, "stroke-width": 1.5 }));
      staticG.appendChild(text(L.x + L.w / 2, 58, L.name, { "font-size": 12, "text-anchor": "middle", fill: L.c, "font-weight": "bold" }));
      for (var j = 0; j < L.rows.length; j++) {
        staticG.appendChild(text(L.x + L.w / 2, 80 + j * 16, L.rows[j], { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
      }
    }
    // 广域网虚线（端↔云）
    staticG.appendChild(el("line", { x1: 210, y1: 82, x2: 430, y2: 82, stroke: "var(--muted)", "stroke-width": 2, "stroke-dasharray": "6,4" }));
    staticG.appendChild(text(320, 74, "广域网 RTT 主导", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
  }

  function tokPerSec(strategy, rtt) {
    if (strategy === 0) {
      // 级联：p=0.7 端侧直答，其余上云（云 5ms + RTT）
      var p = 0.7;
      var tEdgeCase = T_EDGE;
      var tCloudCase = T_CLOUD + rtt + 15; // 上行+排队粗略 15ms
      return 1000 / (p * tEdgeCase + (1 - p) * tCloudCase);
    }
    if (strategy === 1) {
      // 投机分层：每轮 = 云验证 k token(5ms×k) + RTT，端侧草稿并行做(取 max 语义简化为求和)
      var tRound = K * T_CLOUD + rtt + K * T_DRAFT;
      var eff = ALPHA * K + (1 - ALPHA);
      return 1000 * eff / tRound;
    }
    // 逐 token 上云：每 token RTT + 云 decode
    return 1000 / (rtt + T_CLOUD + 5);
  }

  function draw() {
    textLayer = animG;
    var s = +iS.value;
    var rtt = RTT[+iR.value];
    root.querySelector("#ed-s-val").textContent = SLAB[s];
    root.querySelector("#ed-r-val").textContent = rtt + " ms";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var y0 = 175;
    text(20, y0 - 14, "交互式吞吐对比（token/s，示意口径）", { "font-size": 12, fill: "var(--muted)" });
    var names = SLAB;
    var vals = [0, 1, 2].map(function (i) { return tokPerSec(i, rtt); });
    var vmax = Math.max.apply(null, vals) * 1.25;
    var x0 = 150, x1 = 600, rowH = 46;
    for (var i = 0; i < 3; i++) {
      var y = y0 + i * rowH;
      animG.appendChild(text(140, y + 16, names[i], { "font-size": 11, "text-anchor": "end", fill: i === s ? "var(--fg)" : "var(--muted)", "font-weight": i === s ? "bold" : "normal" }));
      var w = (x1 - x0) * vals[i] / vmax;
      animG.appendChild(el("rect", { x: x0, y: y, width: Math.max(w, 2), height: 24, rx: 4, fill: i === s ? "#4a7dbd" : "#9db8d6", opacity: i === s ? 0.95 : 0.5 }));
      animG.appendChild(text(x0 + Math.max(w, 2) + 8, y + 16, vals[i].toFixed(1), { "font-size": 11, fill: i === s ? "var(--fg)" : "var(--muted)", "font-weight": i === s ? "bold" : "normal" }));
    }
    var yB = y0 + 3 * rowH;
    var sInfo = [
      "级联：期望成本 E[c]=p·cₑ+(1−p)(cₑ+c_c)，吞吐由端侧带宽下界决定（25ms/token）",
      "投机分层：每轮 " + K + " 草稿 → 平均有效 " + (ALPHA * K + 1 - ALPHA).toFixed(1) + " token，RTT 摊薄约 " + ((rtt + K * T_CLOUD) / (rtt / (ALPHA * K + 1 - ALPHA))).toFixed(1) + " 倍",
      "逐 token 上云：吞吐 ≤ 1000/" + (rtt + T_CLOUD + 5) + " ≈ " + (1000 / (rtt + T_CLOUD + 5)).toFixed(1) + " token/s，RTT 是硬上界（1/R 天花板）"
    ][s];
    text(20, yB + 14, sInfo, { "font-size": 11, fill: "var(--muted)" });
    text(20, yB + 32, "当前 RTT " + rtt + " ms → 每 token 至少一次往返的方案被 1/RTT 封顶；会话迁移请算「传 KV vs 重 prefill」（上行带宽稀缺 ⇒ 算常赢）", { "font-size": 11, fill: "var(--muted)" });
  }

  drawStatic();
  draw();
  iS.addEventListener("input", draw);
  iR.addEventListener("input", draw);
})();
