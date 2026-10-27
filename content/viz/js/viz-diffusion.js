/* viz-diffusion：加噪轨迹 + 潜空间 + 步数对比（B 类）承 9-4 */
(function () {
  var root = document.getElementById("viz-diffusion");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#diff-static");
  var animG = root.querySelector("#diff-anim");
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

  var STEPS = [8, 25, 50, 1000];
  var iS = root.querySelector("#diff-step");
  var T0 = 10, T1 = 300;

  // 噪声水平曲线 ᾱ_t（余弦调度近似）
  function bar(t) { return Math.cos((t / T1) * Math.PI / 2); }
  function sx(t) { return T0 + t / T1 * (T1 - T0); }
  function sy(b) { return 250 - b * 180; }

  function drawStatic() {
    textLayer = staticG;
    // 坐标轴
    staticG.appendChild(el("line", { x1: T0, y1: 250, x2: T1 + 10, y2: 250, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(el("line", { x1: T0, y1: 250, x2: T0, y2: 60, stroke: "var(--fg)", "stroke-width": 1 }));
    text(T0 + 60, 272, "去噪方向 t：T（纯噪声）→ 0（图像）", { "font-size": 10, fill: "var(--muted)" });
    text(T0 - 6, 66, "信号", { "font-size": 9, fill: "var(--muted)" });
    text(T0 - 6, 252, "噪声", { "font-size": 9, fill: "var(--muted)" });
    // 信号/噪声比例曲线
    var p1 = "M", p2 = "M";
    for (var t = 0; t <= T1; t += 5) {
      var b = bar(t);
      p1 += (t === 0 ? "" : " L") + sx(t).toFixed(1) + "," + sy(b).toFixed(1);
      p2 += (t === 0 ? "" : " L") + sx(t).toFixed(1) + "," + sy(1 - b).toFixed(1);
    }
    staticG.appendChild(el("path", { d: p1, stroke: "#38a", "stroke-width": 1.5, fill: "none", opacity: 0.7 }));
    staticG.appendChild(el("path", { d: p2, stroke: "#c73", "stroke-width": 1.5, fill: "none", opacity: 0.7 }));
    text(sx(30), sy(0.85), "√ᾱ_t 信号", { "font-size": 9.5, fill: "#36c" });
    text(sx(30), sy(0.1), "√(1−ᾱ_t) 噪声", { "font-size": 9.5, fill: "#c73" });
    // 潜空间管线
    text(360, 76, "潜空间扩散", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
    [["512² 图像", 360, "#a86"], ["VAE 编码", 452, "#c73"], ["64×64×4 z", 544, "#38a"]].forEach(function (b) {
      staticG.appendChild(el("rect", { x: b[1], y: 90, width: 80, height: 30, rx: 5, fill: b[2], opacity: 0.15 }));
      staticG.appendChild(el("rect", { x: b[1], y: 90, width: 80, height: 30, rx: 5, fill: "none", stroke: b[2], "stroke-width": 1 }));
      text(b[1] + 40, 109, b[0], { "font-size": 10, "text-anchor": "middle", fill: "var(--fg)" });
    });
    staticG.appendChild(el("path", { d: "M442 105 L450 105", stroke: "var(--muted)", "stroke-width": 1.5 }));
    staticG.appendChild(el("path", { d: "M534 105 L542 105", stroke: "var(--muted)", "stroke-width": 1.5 }));
    text(360, 140, "扩散算力 ≈ 像素空间的 1/48~1/64", { "font-size": 10.5, fill: "#3a7" });
    text(360, 158, "VAE 重建损失 = 质量上限", { "font-size": 10.5, "font-style": "italic", fill: "#c33" });
    // adaLN-Zero
    staticG.appendChild(el("rect", { x: 360, y: 175, width: 240, height: 68, rx: 6, fill: "#a5a", opacity: 0.08 }));
    text(372, 193, "adaLN-Zero（DiT 条件注入）", { "font-size": 10.5, "font-weight": 700, fill: "#84c" });
    text(372, 210, "γ,β,g = MLP(c)，零初始化 ⇒ 初始恒等", { "font-size": 10, fill: "var(--fg)" });
    text(372, 226, "Attn(γ₁(c)⊙LN(x)+β₁(c)) → 残差分支从零学", { "font-size": 9.5, fill: "var(--fg)" });
    text(372, 239, "优于 cross-attention：参数少、规模律更干净", { "font-size": 9.5, fill: "var(--muted)" });
  }

  function draw() {
    textLayer = animG;
    animG.innerHTML = "";
    var n = STEPS[+iS.value];
    // 去噪路径上的点
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = T1 * (1 - i / Math.max(n, 1));
      var b = bar(t);
      pts.push([sx(t), sy(b)]);
    }
    var d = "M" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L");
    animG.appendChild(el("path", { d: d, stroke: "#38a", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }));
    pts.forEach(function (p) {
      animG.appendChild(el("circle", { cx: p[0], cy: p[1], r: 3.5, fill: "#fff", stroke: "#38a", "stroke-width": 2 }));
    });
    text(T0 + 40, 60, n + " 步采样（每步 = 一次网络前向）", { "font-size": 10.5, fill: "#36c" });

    // 成本账
    var flops = n * 100; // GFLOPs per image (潜空间 ViT-L 量级)
    var lines = [
      "本图去噪算力 ≈ " + (flops / 1000).toFixed(2) + " TFLOPs",
      "对比：LLM 生成 1K token ≈ 14 TFLOPs（7B）",
      "延迟分解：去噪占端到端 95%"
    ];
    for (var k = 0; k < lines.length; k++)
      text(360, 275 + k * 22, lines[k], { "font-size": 10.5, fill: "var(--fg)" });
    text(360, 255, "成本账（SDXL 级 1024²）", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
  }

  drawStatic();
  iS.oninput = function () { root.querySelector("#diff-step-val").textContent = STEPS[+iS.value]; draw(); };
  draw();
})();
