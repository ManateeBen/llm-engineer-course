/* viz-mix：数据配比与边际收益（C 类）
 * 代理规模 N=1B token；域级幂律 L_i(N)=li + a_i*N^(-b_i)。
 * 目标 = Σ u_i·L_i(w_i·N)（u_i 为域重要性权重：下游价值加权）。
 * 滑块调权重；按钮做 5% 步长网格搜索。最优点各域加权边际下降近似相等（等边际原则）。
 */
(function () {
  var root = document.getElementById("viz-mix");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mx-static");
  var animG = root.querySelector("#mx-anim");
  var optBtn = root.querySelector("#mx-opt");
  var resetBtn = root.querySelector("#mx-reset");

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

  var NTOT = 1e9; /* 代理规模：小模型上买信息 */
  var DOMAINS = [
    { name: "网页", color: "var(--viz-b)", li: 1.55, a: 9180, b: 0.55, nat: 0.60, u: 1.0 },
    { name: "书籍", color: "var(--accent)", li: 1.30, a: 5500, b: 0.55, nat: 0.15, u: 1.2 },
    { name: "代码", color: "#3b82f6", li: 1.20, a: 5500, b: 0.55, nat: 0.15, u: 1.4 },
    { name: "论文", color: "#8b5cf6", li: 1.40, a: 4680, b: 0.55, nat: 0.10, u: 1.0 }
  ];
  var w = DOMAINS.map(function (d) { return d.nat; });
  var sliders = [], vouts = [];

  function L(d, wi) { return d.li + d.a * Math.pow(wi * NTOT, -d.b); }
  function objective(ws) {
    var t = 0;
    for (var i = 0; i < DOMAINS.length; i++) t += DOMAINS[i].u * L(DOMAINS[i], ws[i]);
    return t;
  }
  /* 加权边际下降：该域权重 +5% 带来的目标改善 */
  function margGain(d, wi) {
    return (L(d, wi) - L(d, Math.min(0.95, wi + 0.05))) * d.u;
  }
  /* 网格搜索：5% 步长遍历单纯形 */
  function searchOpt() {
    var best = null, bw = null;
    var steps = 20;
    for (var i = 0; i <= steps; i++) {
      for (var j = 0; j <= steps - i; j++) {
        for (var k = 0; k <= steps - i - j; k++) {
          var l = steps - i - j - k;
          var ws = [i / steps, j / steps, k / steps, l / steps];
          var v = objective(ws);
          if (!best || v < best) { best = v; bw = ws; }
        }
      }
    }
    return { v: best, w: bw };
  }
  var OPT = searchOpt();

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(20, 26, "当前配比", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var BX = 20, BY = 36, BW = 600, BH = 34;
  staticG.appendChild(el("rect", { x: BX, y: BY, width: BW, height: BH, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8, rx: 3 }));

  /* 曲线面板坐标 */
  var CX = 56, CY = 118, CW = 548, CH = 150;
  staticG.appendChild(text(CX, CY - 8, "各域 loss 随自身权重的变化（代理规模 1B token，空心点 = 搜索出的最优权重）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: CX, y: CY, width: CW, height: CH, fill: "none", stroke: "var(--border)", "stroke-width": 0.8 }));

  /* ---------- 动态 ---------- */
  function render() {
    animG.textContent = "";
    DOMAINS.forEach(function (d, i) {
      vouts[i].textContent = (w[i] * 100).toFixed(0) + "%";
    });

    /* 堆叠条 */
    var x = BX;
    DOMAINS.forEach(function (d, i) {
      var seg = w[i] * BW;
      animG.appendChild(el("rect", { x: x, y: BY, width: seg, height: BH, fill: d.color, opacity: 0.85, stroke: "var(--bg)", "stroke-width": 1 }));
      if (seg > 42) {
        animG.appendChild(text(x + seg / 2, BY + 15, d.name, { "text-anchor": "middle", "font-size": 10, "font-weight": "bold", fill: "#fff" }));
        animG.appendChild(text(x + seg / 2, BY + 28, (w[i] * 100).toFixed(0) + "%", { "text-anchor": "middle", "font-size": 10, fill: "#fff" }));
      }
      x += seg;
    });

    /* 各域当前 loss 行 */
    var sy = 96;
    DOMAINS.forEach(function (d, i) {
      animG.appendChild(text(20, sy + 4, d.name, { "font-size": 10.5, "font-weight": "bold", fill: d.color }));
      animG.appendChild(text(64, sy + 4, "权重 " + (w[i] * 100).toFixed(0) + "% → loss " + L(d, w[i]).toFixed(3) + " ｜ 重要性 u=" + d.u.toFixed(1), { "font-size": 10, fill: "var(--text)" }));
      sy += 16;
    });

    /* 曲线：每个域的 loss vs 自身权重 0..0.8 */
    var lMin = 1.15, lMax = 1.85;
    function wy(v) { return CX + v / 0.8 * CW; }
    function ly(l) { return CY + CH * (1 - (l - lMin) / (lMax - lMin)); }
    [1.2, 1.4, 1.6, 1.8].forEach(function (lv) {
      animG.appendChild(el("line", { x1: CX, y1: ly(lv), x2: CX + CW, y2: ly(lv), stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "3 3" }));
      animG.appendChild(text(CX - 5, ly(lv) + 3.5, lv.toFixed(1), { "text-anchor": "end", "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    [0, 0.2, 0.4, 0.6, 0.8].forEach(function (v) {
      animG.appendChild(text(wy(v), CY + CH + 12, (v * 100).toFixed(0) + "%", { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    DOMAINS.forEach(function (d, i) {
      var dd = "";
      for (var px = 0; px <= 80; px++) {
        var v = px / 100;
        dd += (px === 0 ? "M" : "L") + wy(v).toFixed(1) + "," + ly(L(d, v)).toFixed(1);
      }
      animG.appendChild(el("path", { d: dd, fill: "none", stroke: d.color, "stroke-width": 1.8 }));
      animG.appendChild(el("line", { x1: wy(w[i]), y1: CY, x2: wy(w[i]), y2: CY + CH, stroke: d.color, "stroke-width": 0.8, "stroke-dasharray": "2 3" }));
      animG.appendChild(el("circle", { cx: wy(w[i]), cy: ly(L(d, w[i])), r: 4, fill: d.color, stroke: "var(--text)", "stroke-width": 0.8 }));
      animG.appendChild(el("circle", { cx: wy(OPT.w[i]), cy: ly(L(d, OPT.w[i])), r: 4.5, fill: "none", stroke: d.color, "stroke-width": 1.4 }));
    });
    animG.appendChild(text(CX + CW / 2, CY + CH + 26, "域权重", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));

    /* 目标读数 */
    var cur = objective(w);
    animG.appendChild(text(20, 320, "加权目标 Σ uᵢLᵢ = " + cur.toFixed(4) + "（当前）　vs　" + OPT.v.toFixed(4) + "（网格最优，改善 " + (100 * (cur - OPT.v) / cur).toFixed(1) + "%）", { "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(text(20, 338, "最优配比：网页 " + (OPT.w[0] * 100).toFixed(0) + "% ｜ 书籍 " + (OPT.w[1] * 100).toFixed(0) + "% ｜ 代码 " + (OPT.w[2] * 100).toFixed(0) + "% ｜ 论文 " + (OPT.w[3] * 100).toFixed(0) + "%", { "font-size": 10.5, fill: "var(--text-soft)" }));
    animG.appendChild(text(20, 356, "loss 上只改善 1~2%，但下游知识/代码任务的改善远大于此——loss 与下游能力非线性，这正是要用下游探针复核的原因（4-4）。", { "font-size": 10, fill: "var(--text-soft)" }));

    /* 各域加权边际下降条 */
    var my = 384;
    animG.appendChild(text(20, my, "加权边际下降 uᵢ·ΔLᵢ（每 +5% 权重的目标改善，越长越值得追加）：", { "font-size": 10, fill: "var(--text)" }));
    DOMAINS.forEach(function (d, i) {
      var mg = margGain(d, w[i]);
      var barW = Math.max(2, Math.min(300, mg * 2600));
      animG.appendChild(text(20, my + 16 + i * 15, d.name, { "font-size": 9.5, fill: d.color }));
      animG.appendChild(el("rect", { x: 60, y: my + 8 + i * 15, width: barW, height: 9, rx: 2, fill: d.color, opacity: 0.85 }));
      animG.appendChild(text(60 + barW + 5, my + 16 + i * 15, mg.toFixed(4), { "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    animG.appendChild(text(20, my + 16 + 4 * 15 + 6, "最优点处四根 bars 近似等长——等边际原则：把预算从短条挪向长条，直到没有可挪的收益。", { "font-size": 9.5, fill: "var(--text-soft)" }));
  }

  DOMAINS.forEach(function (d, i) {
    sliders[i] = root.querySelector("#mx-w" + i);
    vouts[i] = root.querySelector("#mx-v" + i);
    sliders[i].addEventListener("input", function () {
      w[i] = parseInt(sliders[i].value, 10) / 100;
      render();
    });
  });
  optBtn.addEventListener("click", function () {
    w = OPT.w.slice();
    sliders.forEach(function (s, i) { s.value = Math.round(w[i] * 100); });
    render();
  });
  resetBtn.addEventListener("click", function () {
    w = DOMAINS.map(function (d) { return d.nat; });
    sliders.forEach(function (s, i) { s.value = Math.round(w[i] * 100); });
    render();
  });

  render();
})();
