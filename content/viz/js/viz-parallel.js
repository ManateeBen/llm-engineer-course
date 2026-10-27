/* viz-parallel：4D 并行配置器（A 类）
 * 64 卡、70B：静态 16Ψ 按 TP*PP 分片（ZeRO-1 只切 12Ψ 的 DP 份），
 * 激活 34*s*b*h*L 按 TP 分摊，气泡 (p-1)/(m+p-1)。承 8-2 §2~§4、8-6 §3。
 */
(function () {
  var root = document.getElementById("viz-parallel");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#pa-static");
  var animG = root.querySelector("#pa-anim");

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

  var CARDS = 64, PSI = 70e9;
  var TP_OPTS = [1, 2, 4, 8];
  var PP_OPTS = [1, 2, 4, 8];
  var M_OPTS = [8, 16, 32, 64, 128];
  var S = 4096, B = 1, H = 8192, L = 80;
  var CARD_GB = 74; // 80GB 卡可用

  var iTP = root.querySelector("#pa-tp");
  var iPP = root.querySelector("#pa-pp");
  var iZR = root.querySelector("#pa-zr");
  var iM = root.querySelector("#pa-m");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 22, "每卡显存（GB）", { "font-size": 12, fill: "var(--muted)" }));
    staticG.appendChild(el("line", { x1: 60, y1: 170, x2: 600, y2: 170, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(text(20, 260, "PP 气泡率", { "font-size": 12, fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var tp = TP_OPTS[+iTP.value], pp = PP_OPTS[+iPP.value];
    var zr = +iZR.value, m = M_OPTS[+iM.value];
    root.querySelector("#pa-tp-val").textContent = tp;
    root.querySelector("#pa-pp-val").textContent = pp;
    root.querySelector("#pa-zr-val").textContent = zr;
    root.querySelector("#pa-m-val").textContent = m;

    while (animG.firstChild) animG.removeChild(animG.firstChild);

    // DP 组大小（至少 1），ZeRO 切 DP 份
    var dp = Math.max(1, CARDS / (tp * pp));
    var shardDP = Math.max(1, Math.round(dp));
    // 静态五段（GB）：w2, g2, master4, m4, v4 —— ZeRO-0/1/2/3
    var seg;
    var w = 2 * PSI / 1e9, g = 2 * PSI / 1e9, o = 12 * PSI / 1e9;
    if (zr === 0) seg = [w, g, o];
    else if (zr === 1) seg = [w, g, o / shardDP];
    else if (zr === 2) seg = [w, g / shardDP, o / shardDP];
    else seg = [(w + g + o) / shardDP];
    var scale = tp * pp;
    seg = seg.map(function (x) { return x / scale; });
    // 激活：34*s*b*h*L 字节 → GB，除 TP（SP 粗略再省 20%）
    var act = 34 * S * B * H * L * 2 / 1e9 / tp / pp * 0.8;
    var temp = 0.1 * (seg.reduce(function (a, b) { return a + b; }, 0) + act);
    var parts = zr === 0
      ? [{ n: "权重+梯度", v: (w + g) / scale, c: "#4a7dbd" }, { n: "优化器", v: o / scale, c: "#7a5db8" }]
      : (zr === 1
        ? [{ n: "权重", v: w / scale, c: "#4a7dbd" }, { n: "梯度", v: g / scale, c: "#3a9d8f" }, { n: "优化器÷DP", v: o / shardDP / scale, c: "#7a5db8" }]
        : (zr === 2
          ? [{ n: "权重", v: w / scale, c: "#4a7dbd" }, { n: "梯度÷DP", v: g / shardDP / scale, c: "#3a9d8f" }, { n: "优化器÷DP", v: o / shardDP / scale, c: "#7a5db8" }]
          : [{ n: "全分片", v: (w + g + o) / shardDP / scale, c: "#4a7dbd" }]));
    parts.push({ n: "激活", v: act, c: "#d0873a" });
    parts.push({ n: "临时", v: temp, c: "#999" });

    var total = parts.reduce(function (a, p) { return a + p.v; }, 0);
    var x0 = 60, x1 = 580, y0 = 150, h = 34;
    var sc = (x1 - x0) / Math.max(CARD_GB, total) ;
    // 红线：卡容量
    var xCard = x0 + CARD_GB * sc;
    animG.appendChild(el("line", { x1: xCard, y1: y0 - 18, x2: xCard, y2: y0 + h + 6, stroke: "#c33", "stroke-width": 2, "stroke-dasharray": "5,4" }));
    animG.appendChild(text(xCard + 4, y0 - 22, "80 GB 卡可用 74", { "font-size": 11, fill: "#c33" }));

    var cx = x0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var wd = p.v * sc;
      if (wd <= 0) continue;
      animG.appendChild(el("rect", { x: cx, y: y0, width: Math.max(wd, 1), height: h, fill: p.c, opacity: 0.85 }));
      if (wd > 42) animG.appendChild(text(cx + wd / 2, y0 + h / 2 + 4, p.n, { "font-size": 10, "text-anchor": "middle", fill: "#fff" }));
      cx += wd;
    }
    var over = total > CARD_GB;
    animG.appendChild(text(x0, y0 + h + 24,
      "总 " + total.toFixed(0) + " GB  " + (over ? "⚠️ OOM！" : "余 " + (CARD_GB - total).toFixed(0) + " GB"),
      { "font-size": 12, fill: over ? "#c33" : "var(--fg)", "font-weight": "bold" }));

    // 气泡
    var bubble = (pp - 1) / (m + pp - 1);
    var by = 300, bx0 = 60, bx1 = 560;
    animG.appendChild(el("rect", { x: bx0, y: by, width: bx1 - bx0, height: 26, fill: "#eee", opacity: 0.35, rx: 4 }));
    animG.appendChild(el("rect", { x: bx0, y: by, width: (bx1 - bx0) * bubble, height: 26, fill: "#c33", opacity: 0.55, rx: 4 }));
    animG.appendChild(text(bx0 + (bx1 - bx0) + 8, by + 17, (bubble * 100).toFixed(1) + "%", { "font-size": 12, fill: "var(--fg)", "font-weight": "bold" }));
    animG.appendChild(text(bx0, by - 8, "流水线气泡（m=" + m + "，1F1B）", { "font-size": 11, fill: "var(--muted)" }));
  }

  drawStatic();
  draw();
  iTP.addEventListener("input", draw);
  iPP.addEventListener("input", draw);
  iZR.addEventListener("input", draw);
  iM.addEventListener("input", draw);
})();
