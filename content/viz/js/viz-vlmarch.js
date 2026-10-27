/* viz-vlmarch：三范式 + anyres token 账（B 类）承 9-2 */
(function () {
  var root = document.getElementById("viz-vlmarch");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vlmarch-static");
  var animG = root.querySelector("#vlmarch-anim");
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

  var GRID = [1, 2, 3, 4];
  var iG = root.querySelector("#vlmarch-g");

  // 三种范式示意（静态）
  var archs = [
    { t: "桥接式 LLaVA", c: "#38a", x: 30, d: "φ(f(I)) 直接拼接" },
    { t: "查询式 BLIP-2", c: "#a5a", x: 240, d: "Q-Former → 32 token" },
    { t: "交叉注意力式", c: "#3a7", x: 450, d: "每层 cross-attn" }
  ];
  function drawStatic() {
    textLayer = staticG;
    archs.forEach(function (a) {
      staticG.appendChild(el("rect", { x: a.x, y: 30, width: 165, height: 108, rx: 8, fill: a.c, opacity: 0.08 }));
      staticG.appendChild(el("rect", { x: a.x, y: 30, width: 165, height: 108, rx: 8, fill: "none", stroke: a.c, "stroke-width": 1.5 }));
      text(a.x + 82, 50, a.t, { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: a.c });
      // 三块：编码器/桥/LLM
      staticG.appendChild(el("rect", { x: a.x + 15, y: 62, width: 40, height: 26, rx: 3, fill: a.c, opacity: 0.3 }));
      text(a.x + 35, 78, "enc", { "font-size": 9, "text-anchor": "middle", fill: "var(--fg)" });
      staticG.appendChild(el("rect", { x: a.x + 62, y: 62, width: 40, height: 26, rx: 3, fill: a.c, opacity: 0.5 }));
      text(a.x + 82, 78, "桥", { "font-size": 9, "text-anchor": "middle", fill: "var(--fg)" });
      staticG.appendChild(el("rect", { x: a.x + 109, y: 62, width: 40, height: 26, rx: 3, fill: a.c, opacity: 0.3 }));
      text(a.x + 129, 78, "LLM", { "font-size": 9, "text-anchor": "middle", fill: "var(--fg)" });
      staticG.appendChild(el("path", { d: "M" + (a.x + 56) + " 75 L" + (a.x + 61) + " 75", stroke: a.c, "stroke-width": 1.5 }));
      staticG.appendChild(el("path", { d: "M" + (a.x + 103) + " 75 L" + (a.x + 108) + " 75", stroke: a.c, "stroke-width": 1.5 }));
      text(a.x + 82, 105, a.d, { "font-size": 9.5, "text-anchor": "middle", fill: "var(--fg)" });
      text(a.x + 82, 120, ["token 576~2.8K · 开销中", "token 固定 32 · 开销低", "token 0 · 开销高"][archs.indexOf(a)], { "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" });
    });
    text(30, 160, "anyres切图示意（教学配置）", { "font-size": 11.5, "font-weight": 700, fill: "var(--fg)" });
  }

  function draw() {
    textLayer = animG;
    animG.innerHTML = "";
    var n = GRID[+iG.value];
    var cell = Math.min(40, 200 / n);
    var bx = 40, by = 175;
    // 原图框
    animG.appendChild(el("rect", { x: bx, y: by, width: 200, height: 200, rx: 4, fill: "#38a", opacity: 0.06, stroke: "#38a", "stroke-width": 1.5 }));
    // 网格
    for (var i = 1; i < n; i++) {
      animG.appendChild(el("line", { x1: bx + i * 200 / n, y1: by, x2: bx + i * 200 / n, y2: by + 200, stroke: "#38a", "stroke-width": 1, opacity: 0.6 }));
      animG.appendChild(el("line", { x1: bx, y1: by + i * 200 / n, x2: bx + 200, y2: by + i * 200 / n, stroke: "#38a", "stroke-width": 1, opacity: 0.6 }));
    }
    // 缩略图
    animG.appendChild(el("rect", { x: bx + 4, y: by + 4, width: 30, height: 30, rx: 3, fill: "#c73", opacity: 0.5 }));
    text(bx + 19, by + 46, "全局", { "font-size": 8, "text-anchor": "middle", fill: "#c73" });

    // 账本
    var nTok = (n * n + 1) * 576;
    var kv = 2 * 32 * 8 * 128 * (16384 + nTok) * 2 / 1e9; // GB，7B GQA8，含文本16K
    var lines = [
      "网格 " + n + "×" + n + " ⇒ 格子 " + n * n + " + 全局 1 = " + (n * n + 1) + " 张",
      "视觉 token = " + nTok.toLocaleString(),
      "32层 GQA-8 BF16，KV ≈ " + kv.toFixed(1) + " GB（序列含 16K 文本）",
      nTok > 9000 ? "需核对总上下文、batch及真实显存预算" : "此处仅估推理KV，不代表整机能运行"
    ];
    for (var k = 0; k < lines.length; k++)
      text(265, 185 + k * 24, lines[k], { "font-size": 11, fill: k === 3 && nTok > 9000 ? "#c33" : (k === 3 ? "#3a7" : "var(--fg)") });
    text(265, 165, "token 预算账", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
    text(265, 300, "减压：动态分辨率分桶 / 局部格子合并 /", { "font-size": 10, fill: "var(--muted)" });
    text(265, 316, "上下文-KV 联合调度（先算 8-7 的账）", { "font-size": 10, fill: "var(--muted)" });
  }

  drawStatic();
  iG.oninput = function () { root.querySelector("#vlmarch-g-val").textContent = GRID[+iG.value] + "×" + GRID[+iG.value]; draw(); };
  draw();
})();
