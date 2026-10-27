/* viz-rft：自训练循环 + 熵坍缩（C 类，静态）
 * 承 6-4 §1/§4。熵模型：H_{t+1} = H_t − η·Var(log p)·(1−α)²，示意参数。
 */
(function () {
  var root = document.getElementById("viz-rft");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var G = root.querySelector("#rf-static");

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

  // 左：循环
  text(30, 28, "RFT / STaR 循环", { "font-size": 12, fill: "var(--muted)" });
  var cx = 160, cy = 175;
  var nodes = [
    { x: 60, y: 60, w: 150, h: 40, t: "① 采样：每题 k 个回答" },
    { x: 250, y: 130, w: 150, h: 40, t: "② 筛选：verifier 留对的" },
    { x: 130, y: 200, w: 150, h: 40, t: "③ SFT：只训正样本" },
    { x: 20, y: 130, w: 100, h: 40, t: "STaR 补：答错喂答案倒推理由" }
  ];
  nodes.forEach(function (n, i) {
    G.appendChild(el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 8, fill: "rgba(74,125,189,0.08)", stroke: "#4a7dbd", "stroke-width": 1 }));
    G.appendChild(text(n.x + n.w / 2, n.y + 24, n.t, { "font-size": 11, "text-anchor": "middle", fill: "var(--fg)" }));
  });
  G.appendChild(el("path", { d: "M135 100 C 200 105, 235 125, 250 130", fill: "none", stroke: "var(--muted)", "stroke-width": 1.5 }));
  G.appendChild(el("path", { d: "M325 170 C 320 195, 290 200, 280 200", fill: "none", stroke: "var(--muted)", "stroke-width": 1.5 }));
  G.appendChild(el("path", { d: "M130 220 C 90 215, 60 190, 55 170", fill: "none", stroke: "var(--muted)", "stroke-width": 1.5 }));
  G.appendChild(el("path", { d: "M70 170 C 70 150, 60 130, 60 100", fill: "none", stroke: "var(--muted)", "stroke-width": 1.5 }));
  text(30, 265, "收益上界 = 基座 pass@k：k 个全错的 prompt，本地产不出正样本", { "font-size": 11, fill: "var(--muted)" });
  text(30, 283, "突破上界要靠 RLVR 在线探索（6-2）或换基座", { "font-size": 11, fill: "var(--muted)" });

  // 右：熵曲线
  var X0 = 360, X1 = 610, Y0 = 300, Y1 = 60;
  G.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
  G.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: "var(--fg)", "stroke-width": 1 }));
  text(X0, Y0 + 20, "0", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
  text(X1, Y0 + 20, "轮次 t", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
  text(X0 - 40, Y1, "H(p)", { "font-size": 11, fill: "var(--muted)" });

  // 示意曲线：alpha=0 快速坍缩，alpha=0.3 中速，alpha=0.7 慢
  var series = [
    { a: 0, c: "#A32D2D", l: "α=0（无回放）" },
    { a: 0.3, c: "#BA7517", l: "α=0.3" },
    { a: 0.7, c: "#3B6D11", l: "α=0.7（强回放）" }
  ];
  series.forEach(function (s) {
    var d = "";
    for (var i = 0; i <= 40; i++) {
      var t = i / 40 * 10;
      var H = 3.2 * Math.exp(-0.28 * t * (1 - s.a) * (1 - s.a));
      var x = X0 + t / 10 * (X1 - X0);
      var y = Y0 - H / 3.2 * (Y0 - Y1) * 0.9;
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    G.appendChild(el("path", { d: d, fill: "none", stroke: s.c, "stroke-width": 2 }));
    G.appendChild(text(X1 - 6, Y0 - 3.2 * Math.exp(-0.28 * 10 * (1 - s.a) * (1 - s.a)) / 3.2 * (Y0 - Y1) * 0.9 + 4, s.l, { "font-size": 10, "text-anchor": "end", fill: s.c }));
  });
  text(30, 340, "右图：熵衰减示意——方差项被 (1−α)² 压缩；坍缩自加速（越尖越快），防控要趁分布还胖", { "font-size": 11, fill: "var(--muted)" });
  text(30, 358, "KL 正则（β 拴 ref）与组内采样保探索是另两道闸", { "font-size": 11, fill: "var(--muted)" });
})();
