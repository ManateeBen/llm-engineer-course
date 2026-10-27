/* viz-patch：patch 化 token 数计算 + 三路线（B 类）承 9-0 */
(function () {
  var root = document.getElementById("viz-patch");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#patch-static");
  var animG = root.querySelector("#patch-anim");
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

  var RES = [224, 336, 448, 672];
  var PS = [14, 16, 32];
  var iR = root.querySelector("#patch-res");
  var iP = root.querySelector("#patch-p");

  // 左侧网格示意
  var GX = 60, GY = 70, GS = 160;
  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(el("rect", { x: GX, y: GY, width: GS, height: GS, rx: 4, fill: "#38a", opacity: 0.06, stroke: "#38a", "stroke-width": 1.5 }));
    text(GX + GS / 2, GY - 8, "图像 → patch 网格", { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: "var(--fg)" });
    // 三路线
    var routes = [
      { t: "① patch 化", d: "连续向量直接喂 Transformer", c: "#38a" },
      { t: "② 码本量化", d: "离散整数进词表（统一生成必需）", c: "#a5a" },
      { t: "③ 连续投影", d: "CLIP 特征 + 投影器（VLM 主流）", c: "#3a7" }
    ];
    routes.forEach(function (r, i) {
      var y = 250 + i * 34;
      staticG.appendChild(el("rect", { x: 30, y: y, width: 250, height: 28, rx: 5, fill: r.c, opacity: 0.10 }));
      staticG.appendChild(el("rect", { x: 30, y: y, width: 3, height: 28, rx: 1.5, fill: r.c }));
      text(42, y + 12, r.t, { "font-size": 11, "font-weight": 700, fill: r.c });
      text(42, y + 24, r.d, { "font-size": 9.5, fill: "var(--fg)" });
    });
  }

  function draw() {
    textLayer = animG;
    animG.innerHTML = "";
    var res = RES[+iR.value], p = PS[+iP.value];
    var n = Math.ceil(res / p);
    var nTok = n * n;
    // 网格线
    for (var i = 1; i < n; i++) {
      animG.appendChild(el("line", { x1: GX + i * GS / n, y1: GY, x2: GX + i * GS / n, y2: GY + GS, stroke: "#38a", "stroke-width": 0.8, opacity: 0.55 }));
      animG.appendChild(el("line", { x1: GX, y1: GY + i * GS / n, x2: GX + GS, y2: GY + i * GS / n, stroke: "#38a", "stroke-width": 0.8, opacity: 0.55 }));
    }
    // 高亮一个 patch
    animG.appendChild(el("rect", { x: GX + GS / n, y: GY + GS / n, width: GS / n, height: GS / n, fill: "#c73", opacity: 0.35 }));
    text(GX + GS / 2, GY + GS + 16, res + "×" + res + "，P=" + p + " ⇒ " + n + "×" + n, { "font-size": 10.5, "text-anchor": "middle", fill: "var(--fg)" });

    // 右侧账本
    var attn = Math.pow(1024 + nTok, 2) / Math.pow(1024, 2);
    var lines = [
      "视觉 token 数 = " + nTok,
      "序列长 = 1024 文本 + " + nTok + " 视觉 = " + (1024 + nTok),
      "注意力 FLOPs ≈ (1600/1024)² 基准的 " + attn.toFixed(1) + " 倍",
      "上下文占用：" + (nTok * 2 / 32).toFixed(0) + " KB/token-BF16 量级（KV 另算）"
    ];
    for (var k = 0; k < lines.length; k++)
      text(310, 100 + k * 24, lines[k], { "font-size": 11, fill: k === 2 ? "#c33" : "var(--fg)" });
    text(310, 76, "token 经济学", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
    text(310, 210, "减压阀：", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
    ["动态分辨率（anyres 分桶）", "token 压缩（Q-Former/Pooling 576→64）", "文本-视觉配比（防淹没语言）"].forEach(function (s, i) {
      text(310, 230 + i * 18, "· " + s, { "font-size": 10.5, fill: "var(--fg)" });
    });
  }

  drawStatic();
  iR.oninput = function () { root.querySelector("#patch-res-val").textContent = RES[+iR.value] + " px"; draw(); };
  iP.oninput = function () { root.querySelector("#patch-p-val").textContent = PS[+iP.value]; draw(); };
  draw();
})();
