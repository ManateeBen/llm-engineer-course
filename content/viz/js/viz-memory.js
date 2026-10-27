/* viz-memory：显存瀑布（A 类）
 * 静态 = 16Ψ / 分片；激活 = 34·s·b·h·L / 分片 / 重计算因子；
 * 临时 = 10%。承 8-6 §2~§4。
 */
(function () {
  var root = document.getElementById("viz-memory");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mm-static");
  var animG = root.querySelector("#mm-anim");

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

  var N_OPTS = [7e9, 13e9, 34e9, 70e9];
  var N_LABEL = ["7B", "13B", "34B", "70B"];
  var SH_OPTS = [1, 2, 8, 16, 64];
  var S_OPTS = [4096, 8192, 16384, 32768];
  var RC = [1, 5, 17];           // 无 / 选择性 / 全量
  var RC_LABEL = ["无重算", "选择性", "全量"];
  var RC_TIME = ["+0%", "+2.5%", "+33%"];
  var B = 2, H = 5120, L = 40, CARD = 74;

  var iN = root.querySelector("#mm-n");
  var iSH = root.querySelector("#mm-sh");
  var iS = root.querySelector("#mm-s");
  var iRC = root.querySelector("#mm-rc");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 20, "每卡显存构成（GB）", { "font-size": 12, fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var psi = N_OPTS[+iN.value], sh = SH_OPTS[+iSH.value];
    var s = S_OPTS[+iS.value], rc = RC[+iRC.value];
    root.querySelector("#mm-n-val").textContent = N_LABEL[+iN.value];
    root.querySelector("#mm-sh-val").textContent = sh;
    root.querySelector("#mm-s-val").textContent = s;
    root.querySelector("#mm-rc-val").textContent = RC_LABEL[+iRC.value] + "（时间 " + RC_TIME[+iRC.value] + "）";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var w = 2 * psi / 1e9 / sh;
    var g = 2 * psi / 1e9 / sh;
    var o = 12 * psi / 1e9 / sh;
    var act = 34 * s * B * H * L * 2 / 1e9 / sh / rc;
    var tmp = 0.1 * (w + g + o + act);
    var parts = [
      { n: "权重", v: w, c: "#4a7dbd" },
      { n: "梯度", v: g, c: "#3a9d8f" },
      { n: "优化器", v: o, c: "#7a5db8" },
      { n: "激活", v: act, c: "#d0873a" },
      { n: "临时", v: tmp, c: "#999" }
    ];
    var total = parts.reduce(function (a, p) { return a + p.v; }, 0);

    var x0 = 130, x1 = 560, y0 = 60, h = 250;
    var sc = (x1 - x0) / Math.max(CARD, total);
    var over = total > CARD;
    // 卡容量线
    var xc = x0 + CARD * sc;
    animG.appendChild(el("line", { x1: xc, y1: y0 - 14, x2: xc, y2: y0 + h + 8, stroke: "#c33", "stroke-width": 2, "stroke-dasharray": "5,4" }));
    animG.appendChild(text(xc + 4, y0 - 18, "可用 74 GB", { "font-size": 11, fill: "#c33" }));

    // 水平堆叠（瀑布方向：左→右按池子顺序）
    var cy = y0 + h / 2 - 17;
    var cx = x0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var wd = p.v * sc;
      if (wd < 0.5) continue;
      animG.appendChild(el("rect", { x: cx, y: cy, width: wd, height: 34, fill: p.c, opacity: 0.88, rx: 2 }));
      if (wd > 46) animG.appendChild(text(cx + wd / 2, cy + 21, p.n, { "font-size": 11, "text-anchor": "middle", fill: "#fff" }));
      else animG.appendChild(text(cx + wd / 2, cy + 48, p.n, { "font-size": 10, "text-anchor": "middle", fill: p.c }));
      cx += wd;
    }
    animG.appendChild(text(x0, y0 + h + 40, "总 " + total.toFixed(0) + " GB  /  可用 74 GB   " + (over ? "⚠️ OOM" : "余量 " + (CARD - total).toFixed(0) + " GB"), { "font-size": 13, fill: over ? "#c33" : "var(--fg)", "font-weight": "bold" }));
    // 分解数字
    animG.appendChild(text(x0, y0 + h + 62, "静态 16Ψ÷" + sh + " = " + (16 * psi / 1e9 / sh).toFixed(1) + " GB　激活 = 34·" + s + "·" + B + "·" + H + "·" + L + "÷" + sh + "÷" + rc + " = " + act.toFixed(1) + " GB", { "font-size": 11, fill: "var(--muted)" }));
  }

  drawStatic();
  draw();
  iN.addEventListener("input", draw);
  iSH.addEventListener("input", draw);
  iS.addEventListener("input", draw);
  iRC.addEventListener("input", draw);
})();
