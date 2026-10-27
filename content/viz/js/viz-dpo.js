/* viz-dpo：DPO 损失曲线 + 管线对比（B 类）
 * L = -log σ(β·(log πw/πrefw − log πl/πrefl))，承 6-1 §3~§4。
 */
(function () {
  var root = document.getElementById("viz-dpo");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#dp-static");
  var animG = root.querySelector("#dp-anim");

  function el(tag, attrs) {
    var e = el0(tag, attrs);
    return e;
  }
  function el0(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var textLayer = staticG;
  function text(x, y, str, attrs) {
    var t = el0("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    textLayer.appendChild(t);
    return t;
  }

  var BETAS = [0.05, 0.1, 0.3, 1.0];
  var X0 = 300, X1 = 600, Y0 = 320, Y1 = 70;
  var MMIN = -3, MMAX = 3;

  function sx(m) { return X0 + (m - MMIN) / (MMAX - MMIN) * (X1 - X0); }
  function sy(v) { return Y0 - Math.min(v, 6) / 6 * (Y0 - Y1); }

  var iB = root.querySelector("#dp-b");
  var iM = root.querySelector("#dp-m");

  function drawStatic() {
    textLayer = staticG;
    // 左：管线对比
    text(30, 30, "管线对比", { "font-size": 12, fill: "var(--muted)" });
    staticG.appendChild(el0("rect", { x: 30, y: 44, width: 110, height: 130, rx: 8, fill: "rgba(0,0,0,0.04)", stroke: "#888780", "stroke-width": 1 }));
    text(85, 66, "RLHF(PPO)", { "font-size": 11, "text-anchor": "middle", "font-weight": "bold", fill: "var(--fg)" });
    ["actor 16Ψ", "critic 16Ψ", "ref 2Ψ", "reward 2Ψ", "在线采样×步"].forEach(function (s, i) {
      text(85, 88 + i * 17, s, { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });
    });
    text(85, 192, "≈36Ψ + 每步重采", { "font-size": 10, "text-anchor": "middle", fill: "#993C1D" });

    staticG.appendChild(el0("rect", { x: 160, y: 44, width: 110, height: 130, rx: 8, fill: "rgba(74,125,189,0.08)", stroke: "#4a7dbd", "stroke-width": 1 }));
    text(215, 66, "DPO", { "font-size": 11, "text-anchor": "middle", "font-weight": "bold", fill: "#4a7dbd" });
    ["actor 16Ψ", "ref 2Ψ", "—", "—", "离线一次训"].forEach(function (s, i) {
      text(215, 88 + i * 17, s, { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" });
    });
    text(215, 192, "≈18Ψ + 静态数据", { "font-size": 10, "text-anchor": "middle", fill: "#3B6D11" });

    // 右：坐标轴
    staticG.appendChild(el0("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(el0("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: "var(--fg)", "stroke-width": 1 }));
    text(X0, Y0 + 20, "−3", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(sx(0), Y0 + 20, "0", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(X1, Y0 + 20, "3", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text((X0 + X1) / 2, Y0 + 38, "margin m = log(πw/πrefw) − log(πl/πrefl)", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(X0 - 46, Y1, "损失", { "font-size": 11, fill: "var(--muted)" });
  }

  function draw() {
    textLayer = animG;
    var b = BETAS[+iB.value];
    var m = parseFloat(iM.value);
    root.querySelector("#dp-b-val").textContent = b.toFixed(2);
    root.querySelector("#dp-m-val").textContent = m.toFixed(1);
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var pts = [];
    for (var i = 0; i <= 60; i++) {
      var mm = MMIN + (MMAX - MMIN) * i / 60;
      var v = -Math.log(1 / (1 + Math.exp(-b * mm)));
      pts.push([mm, v]);
    }
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1); }).join("");
    animG.appendChild(el0("path", { d: d, fill: "none", stroke: "#4a7dbd", "stroke-width": 2.5 }));

    // 当前点
    var v = -Math.log(1 / (1 + Math.exp(-b * m)));
    animG.appendChild(el0("circle", { cx: sx(m), cy: sy(v), r: 5, fill: "#d0873a", stroke: "#fff", "stroke-width": 1.5 }));
    var loss = -Math.log(1 / (1 + Math.exp(-b * m)));
    text(40, 250, "当前 margin m = " + m.toFixed(1) + "，损失 = " + loss.toFixed(3), { "font-size": 12, fill: "var(--fg)", "font-weight": "bold" });
    text(40, 270, m > 0 ? "chosen 隐式奖励更高：损失趋 0（已分离）" : "chosen 被 rejected 反超：损失线性涨（分类错误）", { "font-size": 11, fill: m > 0 ? "#3B6D11" : "#A32D2D" });
    text(40, 292, "β=" + b.toFixed(2) + "：β 同时缩放横轴与斜率——越小越激进（易过拟合噪声），越大越贴 ref", { "font-size": 11, fill: "var(--muted)" });
  }

  drawStatic();
  draw();
  iB.addEventListener("input", draw);
  iM.addEventListener("input", draw);
})();
