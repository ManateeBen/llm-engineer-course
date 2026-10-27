/* viz-vat：视频三重困境 + 音频 RVQ + 延迟预算（C 类）承 9-3 */
(function () {
  var root = document.getElementById("viz-vat");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#vat-static");
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

  // 左上：视频三重困境
  text(30, 30, "视频三重困境", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var trips = [
    ["时序冗余", "相邻帧 95%+ 相同", "1~2 fps 帧采样"],
    ["空间冗余", "背景大面积静态", "关键帧 + 差分 ROI"],
    ["长度爆炸", "token 随秒数线性涨", "分层：粗索引 + 细解码"]
  ];
  trips.forEach(function (t, i) {
    var y = 42 + i * 30;
    g.appendChild(el("rect", { x: 30, y: y, width: 285, height: 26, rx: 4, fill: "#c33", opacity: 0.07 }));
    text(42, y + 17, t[0], { "font-size": 10.5, "font-weight": 700, fill: "#c33" });
    text(120, y + 17, t[1], { "font-size": 10, fill: "var(--fg)" });
    text(240, y + 17, t[2], { "font-size": 10, fill: "#3a7" });
  });

  // 分层两阶段示意
  text(30, 150, "分层 token 化（方案 C）", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
  g.appendChild(el("rect", { x: 30, y: 160, width: 285, height: 26, rx: 4, fill: "#38a", opacity: 0.12 }));
  text(42, 177, "阶段 1：轻量编码器 ⇒ 480 token 粗索引", { "font-size": 10, fill: "var(--fg)" });
  g.appendChild(el("path", { d: "M172 186 L172 196", stroke: "#38a", "stroke-width": 1.5 }));
  g.appendChild(el("rect", { x: 30, y: 200, width: 285, height: 26, rx: 4, fill: "#a5a", opacity: 0.12 }));
  text(42, 217, "阶段 2：定位 3 片段 ⇒ 8,640 token 细解码", { "font-size": 10, fill: "var(--fg)" });
  text(42, 242, "总 9,120 token vs 密集方案 69,120 ⇒ 7.6× 节省", { "font-size": 10, "font-style": "italic", fill: "#3a7" });

  // 左下：延迟预算
  text(30, 278, "语音对话延迟预算（目标 <1.5s）", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
  var segs = [
    ["VAD 端点", 200, "#c73"],
    ["编码", 50, "#a86"],
    ["LLM TTFT", 550, "#38a"],
    ["vocoder", 100, "#a5a"]
  ];
  var lx = 30;
  segs.forEach(function (s) {
    var w = s[1] / 900 * 285;
    g.appendChild(el("rect", { x: lx, y: 290, width: w, height: 24, fill: s[2], opacity: 0.55 }));
    text(lx + w / 2, 306, s[1] + "", { "font-size": 9, "text-anchor": "middle", fill: "#fff" });
    lx += w;
  });
  text(30, 328, "barge-in：播放中 VAD 触发 ⇒ 清空队列 + 上下文追加", { "font-size": 9.5, fill: "var(--muted)" });
  text(30, 342, "= 6-6 异步 RL 的抢占思想在对话系统的应用", { "font-size": 9.5, fill: "var(--muted)" });

  // 右侧：音频 RVQ 管线
  text(345, 30, "音频 RVQ 量化管线", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var stages = [
    ["波形 24 kHz", "2.9 MB/min", "#a86"],
    ["卷积下采样", "stride 320 ⇒ 75 Hz", "#c73"],
    ["RVQ 级 1", "码本 2^10，量化残差", "#38a"],
    ["RVQ 级 2..n_q", "逐级精化，共 32 级", "#38a"],
    ["离散 token 流", "24 kbps ⇒ 180 KB/min", "#3a7"]
  ];
  var sy = 45;
  stages.forEach(function (s, i) {
    g.appendChild(el("rect", { x: 345, y: sy, width: 265, height: 42, rx: 6, fill: s[2], opacity: 0.10 }));
    g.appendChild(el("rect", { x: 345, y: sy, width: 265, height: 42, rx: 6, fill: "none", stroke: s[2], "stroke-width": 1 }));
    text(360, sy + 17, s[0], { "font-size": 11, "font-weight": 700, fill: s[2] });
    text(360, sy + 33, s[1], { "font-size": 9.5, fill: "var(--fg)" });
    if (i < 4) text(477, sy + 50, "▼", { "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" });
    sy += 54;
  });
  g.appendChild(el("rect", { x: 345, y: 325, width: 265, height: 60, rx: 6, fill: "#a5a", opacity: 0.08 }));
  text(357, 343, "为何 RVQ 而非单级大码本：", { "font-size": 10.5, "font-weight": 700, fill: "#84c" });
  text(357, 359, "码本 2^B_total 随比特指数增长，", { "font-size": 10, fill: "var(--fg)" });
  text(357, 373, "RVQ 拆成 n_q 个小码本逐级精化 ⇒ 可行", { "font-size": 10, fill: "var(--fg)" });
})();
