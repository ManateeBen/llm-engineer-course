/* viz-clip：CLIP 双塔 + InfoNCE + 失效修正（B 类）承 9-1 */
(function () {
  var root = document.getElementById("viz-clip");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#clip-static");
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

  // 双塔
  text(120, 40, "图像塔 f_I", { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: "#38a" });
  text(420, 40, "文本塔 f_T", { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: "#a5a" });
  // 图像 batch
  ["I₁", "I₂", "I₃"].forEach(function (t, i) {
    var y = 60 + i * 40;
    g.appendChild(el("rect", { x: 70, y: y, width: 60, height: 30, rx: 4, fill: "#38a", opacity: 0.15 }));
    text(100, y + 20, t, { "font-size": 12, "text-anchor": "middle", fill: "#36c", "font-weight": 700 });
  });
  ["T₁", "T₂", "T₃"].forEach(function (t, i) {
    var y = 60 + i * 40;
    g.appendChild(el("rect", { x: 410, y: y, width: 60, height: 30, rx: 4, fill: "#a5a", opacity: 0.15 }));
    text(440, y + 20, t, { "font-size": 12, "text-anchor": "middle", fill: "#84c", "font-weight": 700 });
  });
  // 正样本连线（实线）+ 负样本（虚线）
  [[0, 0], [1, 1], [2, 2]].forEach(function (p) {
    var y1 = 75 + p[0] * 40, y2 = 75 + p[1] * 40;
    g.appendChild(el("path", { d: "M130 " + y1 + " C 240 " + y1 + ", 300 " + y2 + ", 410 " + y2, stroke: "#3a7", "stroke-width": 2, fill: "none" }));
  });
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
    if (i === j) continue;
    var y1 = 75 + i * 40, y2 = 75 + j * 40;
    g.appendChild(el("path", { d: "M130 " + y1 + " C 240 " + y1 + ", 300 " + y2 + ", 410 " + y2, stroke: "#c33", "stroke-width": 0.7, fill: "none", "stroke-dasharray": "3 3", opacity: 0.4 }));
  }
  text(240, 130, "绿=正样本对（拉近）  红虚=负样本（推开）", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });
  // 相似度矩阵
  text(240, 160, "InfoNCE（I→T）：", { "font-size": 11, "font-weight": 700, "text-anchor": "middle", fill: "var(--fg)" });
  text(240, 178, "L = −log [ e^(s₁₁/τ) / Σⱼ e^(s₁ⱼ/τ) ]", { "font-size": 12, "text-anchor": "middle", fill: "#36c" });
  text(240, 196, "s_ij = cos(f_I(I_i), f_T(T_j))，τ 可学习 ≈0.07", { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });

  // 三失效三修正
  text(30, 230, "三个系统性失效 → 三条修正路线", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var rows = [
    ["细粒度区分差", "哈士奇 vs 阿拉斯加", "SigLIP：sigmoid 损失，batch 与负样本解耦", "#c33", "#3a7"],
    ["计数/OCR 差", "数不清、读不准", "提分辨率 384+ + caption 重写", "#c33", "#3a7"],
    ["密集特征弱", "patch 无语义", "DINO 自蒸馏：无文本，多裁剪对齐", "#c33", "#a5a"]
  ];
  rows.forEach(function (r, i) {
    var y = 244 + i * 34;
    g.appendChild(el("rect", { x: 30, y: y, width: 580, height: 28, rx: 4, fill: "var(--fg)", opacity: 0.04 }));
    text(45, y + 18, r[0], { "font-size": 10.5, "font-weight": 700, fill: r[3] });
    text(190, y + 18, r[1], { "font-size": 10.5, fill: "var(--fg)" });
    text(370, y + 18, r[2], { "font-size": 10.5, fill: r[4] });
  });
  g.appendChild(el("rect", { x: 30, y: 352, width: 580, height: 20, rx: 4, fill: "#38a", opacity: 0.07 }));
  text(45, 366, "InfoNCE = 6-3 Bradley-Terry 的多项推广：softmax 把“i 比所有负样本更像”变成概率，NLL 即交叉熵", { "font-size": 10, fill: "var(--fg)" });
})();
