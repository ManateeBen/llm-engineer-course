/* viz-judge：judge 偏差修正 + 四层评测架构（C 类）承 7-4 */
(function () {
  var root = document.getElementById("viz-judge");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#judge-static");
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

  // 左：三类偏差
  text(30, 30, "judge 的三类系统性偏差", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var bias = [
    { t: "位置偏差", mag: "A/B 交换后翻转 10~30%", fix: "双序评测取平均", c: "#c33" },
    { t: "长度偏好", mag: "长答案系统性占优数点", fix: "长度回归 + prompt 中立", c: "#a86" },
    { t: "自我偏好", mag: "偏爱同族风格输出", fix: "非同族 judge + 披露", c: "#a5a" }
  ];
  var y = 45;
  bias.forEach(function (b) {
    g.appendChild(el("rect", { x: 30, y: y, width: 290, height: 72, rx: 6, fill: b.c, opacity: 0.08 }));
    g.appendChild(el("rect", { x: 30, y: y, width: 3, height: 72, rx: 1.5, fill: b.c }));
    text(45, y + 20, b.t, { "font-size": 11.5, "font-weight": 700, fill: b.c });
    text(45, y + 38, b.mag, { "font-size": 10, fill: "var(--fg)" });
    text(45, y + 56, "修正：" + b.fix, { "font-size": 10, fill: "#3a7" });
    y += 80;
  });

  // κ 标尺
  text(30, 300, "Cohen's κ 标尺", { "font-size": 11, "font-weight": 700, fill: "var(--fg)" });
  g.appendChild(el("rect", { x: 30, y: 308, width: 290, height: 14, rx: 7, fill: "#c33", opacity: 0.25 }));
  g.appendChild(el("rect", { x: 30, y: 308, width: 150, height: 14, rx: 7, fill: "#a86", opacity: 0.4 }));
  g.appendChild(el("rect", { x: 30, y: 308, width: 195, height: 14, rx: 7, fill: "#3a7", opacity: 0.5 }));
  text(35, 336, "0.0", { "font-size": 9, fill: "var(--muted)" });
  text(120, 336, "0.4 粗筛", { "font-size": 9, fill: "var(--muted)" });
  text(215, 336, "0.7 可决策", { "font-size": 9, fill: "var(--muted)" });
  text(285, 336, "1.0", { "font-size": 9, fill: "var(--muted)" });

  // 右：四层架构
  text(350, 30, "四层互锁评测架构", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var layers = [
    ["L1 judge 快筛", "每 checkpoint · 双序偏好一致率", "#38a"],
    ["L2 内部能力集", "每日 · 分桶准确率 + CI", "#3a7"],
    ["L3 人工金标准", "每周 · κ(judge vs 人)", "#a5a"],
    ["L4 公开榜", "发版 · 原始分 + CI 只报不优化", "#c73"]
  ];
  var ly = 45;
  layers.forEach(function (l, i) {
    g.appendChild(el("rect", { x: 350, y: ly, width: 260, height: 62, rx: 6, fill: l[2], opacity: 0.10 }));
    g.appendChild(el("rect", { x: 350, y: ly, width: 260, height: 62, rx: 6, fill: "none", stroke: l[2], "stroke-width": 1.5 }));
    text(365, ly + 22, l[0], { "font-size": 11.5, "font-weight": 700, fill: l[2] });
    text(365, ly + 42, l[1], { "font-size": 10, fill: "var(--fg)" });
    if (i < 3)
      text(480, ly + 72, "▼ 校准/仲裁", { "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" });
    ly += 76;
  });

  // 底部故事
  g.appendChild(el("rect", { x: 30, y: 356, width: 580, height: 36, rx: 6, fill: "#c33", opacity: 0.07 }));
  text(40, 373, "冲突仲裁：L1 偏好率涨 9 点但 L2 代码掉 4 点 ⇒ L3 的 κ 从 0.74 跌到 0.58 ⇒ judge 被长度偏好带偏，prompt 中立化 + 重校准后 L1 真实 +2 点", { "font-size": 10, fill: "var(--fg)" });
})();
