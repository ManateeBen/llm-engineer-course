/* viz-collapse：模型坍缩逐代演化（B 类）
 * 初始分布 p0；每代：温度采样 N=200 → 拟合端规则（计数<K=3 的模式被丢弃，
 * 质量按比例让给保留模式）→ 混入 m 比例真实数据。种子固定（可复现）。
 * 读数：尾部质量 / 熵 / 与真实分布的 KL；底部轨迹图记录每代尾部质量。
 */
(function () {
  var root = document.getElementById("viz-collapse");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#co-static");
  var animG = root.querySelector("#co-anim");
  var tauIn = root.querySelector("#co-tau");
  var mixIn = root.querySelector("#co-mix");
  var tVal = root.querySelector("#co-tval");
  var mVal = root.querySelector("#co-mval");
  var nextBtn = root.querySelector("#co-next");
  var playBtn = root.querySelector("#co-play");
  var resetBtn = root.querySelector("#co-reset");

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
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var P0 = [0.45, 0.25, 0.15, 0.08, 0.04, 0.02, 0.008, 0.002];
  var NTOK = 8, NSAMP = 200, KMIN = 3, GMAX = 12;
  var p = P0.slice(), gen = 0, trail = [];
  var rand = mulberry32(42);

  function tailMass(dist) { var t = 0; for (var i = 5; i < NTOK; i++) t += dist[i]; return t; }
  function entropy(dist) { var h = 0; for (var i = 0; i < NTOK; i++) if (dist[i] > 0) h -= dist[i] * Math.log(dist[i]); return h / Math.LN2; }
  function kl(dist) { var k = 0; for (var i = 0; i < NTOK; i++) if (dist[i] > 0) k += dist[i] * Math.log(dist[i] / P0[i]); return k; }

  function step() {
    var tau = parseFloat(tauIn.value);
    var m = parseFloat(mixIn.value);
    var q = p.map(function (x) { return Math.pow(x, 1 / tau); });
    var sum = q.reduce(function (a, b) { return a + b; }, 0);
    q = q.map(function (x) { return x / sum; });
    var cnt = new Array(NTOK).fill(0);
    for (var i = 0; i < NSAMP; i++) {
      var r = rand(), acc = 0;
      for (var j = 0; j < NTOK; j++) { acc += q[j]; if (r <= acc) { cnt[j]++; break; } }
    }
    var kept = 0;
    cnt.forEach(function (c) { if (c >= KMIN) kept += c; });
    var f = kept > 0 ? cnt.map(function (c) { return c >= KMIN ? c / kept : 0; }) : P0.slice();
    p = p.map(function (x, i) { return (1 - m) * f[i] + m * P0[i]; });
    gen++;
    trail.push(tailMass(p));
  }

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(40, 26, "token 分布（虚线轮廓 = 真实分布）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var BX = 40, BY = 300, BH = 230, BW = 34, GAP = 6;
  staticG.appendChild(el("line", { x1: BX - 6, y1: BY, x2: BX + NTOK * (BW + GAP), y2: BY, stroke: "var(--border)", "stroke-width": 1 }));
  /* 轨迹图坐标 */
  var TX = 40, TY = 372, TW = 340, TH = 66;
  staticG.appendChild(text(TX, TY - 6, "尾部质量轨迹（每代）", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: TX, y: TY, width: TW, height: TH, fill: "none", stroke: "var(--border)", "stroke-width": 0.8 }));

  /* ---------- 动态 ---------- */
  function render() {
    animG.textContent = "";
    tVal.textContent = parseFloat(tauIn.value).toFixed(1);
    mVal.textContent = (parseFloat(mixIn.value) * 100).toFixed(0) + "%";

    /* 柱状图 */
    var maxP = 0.45;
    for (var i = 0; i < NTOK; i++) {
      var x = BX + i * (BW + GAP);
      var isTail = i >= 5;
      var col = isTail ? "var(--accent)" : "var(--viz-b)";
      var h0 = P0[i] / maxP * BH, h1 = p[i] / maxP * BH;
      animG.appendChild(el("rect", { x: x, y: BY - h0, width: BW, height: h0, fill: "none", stroke: "var(--text-soft)", "stroke-width": 0.8, "stroke-dasharray": "3 3" }));
      animG.appendChild(el("rect", { x: x, y: BY - h1, width: BW, height: Math.max(h1, 0.5), rx: 2, fill: col, opacity: 0.9 }));
      animG.appendChild(text(x + BW / 2, BY + 13, "t" + (i + 1), { "text-anchor": "middle", "font-size": 9.5, fill: p[i] === 0 ? "var(--accent)" : "var(--text-soft)", "font-weight": p[i] === 0 ? "bold" : "normal" }));
      if (p[i] === 0) {
        animG.appendChild(text(x + BW / 2, BY - h0 - 6, "✕", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--accent)" }));
      } else {
        animG.appendChild(text(x + BW / 2, BY - h1 - 5, p[i].toFixed(3), { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text)" }));
      }
    }
    animG.appendChild(text(BX, BY + 28, "✕ = 该 token 已从分布中消失（尾部先死）", { "font-size": 9.5, fill: "var(--text-soft)" }));

    /* 读数面板 */
    var RX = 404;
    animG.appendChild(text(RX, 26, "第 " + gen + " 代 / 上限 " + GMAX, { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(el("rect", { x: RX, y: 36, width: 216, height: 96, rx: 4, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    var rows = [
      ["尾部质量（t6~t8）", tailMass(p).toFixed(4), "var(--accent)"],
      ["分布熵 H（bits）", entropy(p).toFixed(3), "var(--text)"],
      ["KL(当前‖真实)", kl(p).toFixed(4), "var(--text)"],
      ["已消失 token 数", String(NTOK - p.filter(function (x) { return x > 0; }).length), "var(--text)"]
    ];
    rows.forEach(function (r, i) {
      animG.appendChild(text(RX + 10, 54 + i * 20, r[0], { "font-size": 10, fill: "var(--text-soft)" }));
      animG.appendChild(text(RX + 206, 54 + i * 20, r[1], { "text-anchor": "end", "font-size": 10.5, "font-weight": "bold", fill: r[2] }));
    });
    var extinct = [];
    for (var i2 = 0; i2 < NTOK; i2++) if (p[i2] === 0) extinct.push("t" + (i2 + 1));
    animG.appendChild(text(RX, 156, extinct.length ? "已灭绝：" + extinct.join("、") : "尚无 token 灭绝", { "font-size": 10, fill: extinct.length ? "var(--accent)" : "var(--text-soft)" }));
    animG.appendChild(text(RX, 176, gen >= GMAX ? "已达代数上限——点重置换参数重来" : "点「下一代」推进一代", { "font-size": 10, fill: "var(--text-soft)" }));
    animG.appendChild(text(RX, 200, "两个收窄引擎：① 温度采样（左滑块）", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(RX, 216, "压低尾部送样；② 拟合端规则——", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(RX, 232, "采样不足的模式学不动，质量让给头部。", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(RX, 252, "混入真实数据 = 给分布打锚，", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(RX, 268, "20% 即可显著延缓坍缩。", { "font-size": 10, fill: "var(--text)" }));

    /* 轨迹图 */
    var pts = [tailMass(P0)].concat(trail);
    function tx(i) { return TX + 6 + (GMAX === 0 ? 0 : i / GMAX * (TW - 12)); }
    function ty(v) { return TY + TH - 6 - v / 0.06 * (TH - 12); }
    [0, 0.02, 0.04, 0.06].forEach(function (v) {
      animG.appendChild(el("line", { x1: TX, y1: ty(v), x2: TX + TW, y2: ty(v), stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "3 3" }));
      animG.appendChild(text(TX + TW + 2, ty(v) + 3.5, v.toFixed(2), { "font-size": 8, fill: "var(--text-soft)" }));
    });
    animG.appendChild(el("line", { x1: TX, y1: ty(0.03), x2: TX + TW, y2: ty(0.03), stroke: "var(--accent)", "stroke-width": 0.7, "stroke-dasharray": "5 3" }));
    animG.appendChild(text(TX + TW, TY - 6 + 12, "", { "font-size": 8 }));
    if (pts.length > 1) {
      var d = "";
      pts.forEach(function (v, i) { d += (i === 0 ? "M" : "L") + tx(i).toFixed(1) + "," + ty(v).toFixed(1); });
      animG.appendChild(el("path", { d: d, fill: "none", stroke: "var(--accent)", "stroke-width": 1.8 }));
    }
    pts.forEach(function (v, i) {
      animG.appendChild(el("circle", { cx: tx(i), cy: ty(v), r: i === pts.length - 1 ? 3.5 : 2, fill: i === pts.length - 1 ? "var(--accent)" : "var(--viz-b)" }));
    });
    animG.appendChild(text(TX + TW / 2, TY + TH + 14, "虚线 = 真实分布的尾部质量 0.03", { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var timer = null;
  nextBtn.addEventListener("click", function () {
    if (gen < GMAX) { step(); render(); }
  });
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 演化"; return; }
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(function () {
      if (gen >= GMAX) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 演化"; render(); return; }
      step(); render();
    }, 850);
  });
  resetBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 演化"; }
    p = P0.slice(); gen = 0; trail = [];
    render();
  });
  tauIn.addEventListener("input", render);
  mixIn.addEventListener("input", render);

  render();
})();
