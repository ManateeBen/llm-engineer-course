/* viz-dlmodels：国产模型谱系 + MLA KV 账（C 类，静态）
 * 承 11-3 §1/§2。KV/token：MHA 2·61·128·128·2B≈4.0MB；MLA 61·576·2B≈70KB。
 */
(function () {
  var root = document.getElementById("viz-dlmodels");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var G = root.querySelector("#dm-static");

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

  // 上：谱系
  text(30, 28, "主要系列（权重 / license / 架构卖点）", { "font-size": 12, fill: "var(--muted)" });
  var fams = [
    { x: 30, c: "#4a7dbd", t: "DeepSeek", s: ["V3/R1 · MIT", "MLA · MoE • MTP", "FP8 训练"] },
    { x: 175, c: "#1D9E75", t: "Qwen", s: ["全尺寸 · Apache 2.0", "dense + MoE", "vLLM 一等公民"] },
    { x: 320, c: "#7F77DD", t: "GLM", s: ["部分权重", "中文传统优势", "MaaS 生态"] },
    { x: 465, c: "#BA7517", t: "Kimi K2", s: ["1T/32B MoE", "MuonClip 优化器", "agentic 导向"] }
  ];
  fams.forEach(function (f) {
    G.appendChild(el("rect", { x: f.x, y: 40, width: 135, height: 96, rx: 8, fill: "rgba(0,0,0,0.03)", stroke: f.c, "stroke-width": 1.5 }));
    G.appendChild(text(f.x + 67, 62, f.t, { "font-size": 12, "text-anchor": "middle", "font-weight": "bold", fill: f.c }));
    f.s.forEach(function (s, i) {
      G.appendChild(text(f.x + 67, 84 + i * 16, s, { "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" }));
    });
  });

  // 下：KV 账
  text(30, 168, "每 token KV 缓存（V3 配置 L=61，BF16）", { "font-size": 12, fill: "var(--muted)" });
  var X0 = 90, X1 = 560, Y0 = 330, BH = 26;
  var bars = [
    { l: "MHA 128 头", kb: 4096, c: "#A32D2D" },
    { l: "GQA 8 组", kb: 125, c: "#BA7517" },
    { l: "MLA（V3）", kb: 70, c: "#1D9E75" }
  ];
  bars.forEach(function (b, i) {
    var y = 185 + i * 40;
    G.appendChild(text(X0 - 8, y + 17, b.l, { "font-size": 11, "text-anchor": "end", fill: "var(--fg)" }));
    var w = Math.max(6, X1 - X0 - 90) * (Math.log(b.kb) / Math.log(4096));
    G.appendChild(el("rect", { x: X0, y: y, width: w, height: BH, rx: 4, fill: b.c, opacity: 0.85 }));
    G.appendChild(text(X0 + w + 8, y + 17, b.kb + " KB", { "font-size": 11, fill: b.c, "font-weight": "bold" }));
  });
  text(X0, 330, "横轴按 log 缩放：MHA 4.0 MB → MLA 70 KB（57×）；诚实口径：相对 8 组 GQA 只有 1.8×", { "font-size": 11, fill: "var(--muted)" });
  text(X0, 350, "32K 上下文单请求 KV：MHA 131 GB（不可用）→ MLA 2.3 GB——8-7 的并发上限由此决定", { "font-size": 11, fill: "var(--muted)" });
  text(X0, 372, "部署经济性 = FP8 权重（671 GB vs 1342 GB）× MLA KV（57×）× MoE 稀疏激活（37B/671B）——三者相乘，缺一不可", { "font-size": 11, fill: "var(--fg)" });
})();
