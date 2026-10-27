/* viz-moe-route：MoE 路由演示（A 类）
 * 8 专家 × 12 token/batch。分数 s(t,i)=affinity(t,i)+w_i；
 * top-k 选择；容量 C=ceil(cf·T/E)，超载分量丢弃（走残差）。
 * 正反馈：w_i += rate·load_i/T（明星专家通吃 = 路由坍缩）；
 * 辅助损失：w_i ← (1-λ)w_i + λ·mean(w)，λ=α/0.02（拉平 = 均衡）。
 */
(function () {
  var root = document.getElementById("viz-moe-route");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vmr-static");
  var animG = root.querySelector("#vmr-anim");
  var kIn = root.querySelector("#vmr-k");
  var cfIn = root.querySelector("#vmr-cf");
  var aIn = root.querySelector("#vmr-alpha");
  var kVal = root.querySelector("#vmr-kval");
  var cVal = root.querySelector("#vmr-cval");
  var aVal = root.querySelector("#vmr-aval");
  var playBtn = root.querySelector("#vmr-play");
  var resetBtn = root.querySelector("#vmr-reset");

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
  function hash01(t, i, b) {
    var s = (t * 131 + i * 617 + b * 1997) >>> 0;
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  var E = 8, T = 12, RATE = 0.35;
  var GX0 = 52, GW = 560, BW = GW / E, BASE_Y = 210, MAXH = 120;

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(GX0 + GW / 2, 22, "专家主路由柱（高=本 batch 选它为头号专家的 token 数；虚线=容量上限）", { "text-anchor": "middle", "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
  for (var i = 0; i < E; i++) {
    staticG.appendChild(text(GX0 + i * BW + BW / 2, BASE_Y + 18, "E" + (i + 1), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: GX0, y1: BASE_Y, x2: GX0 + GW, y2: BASE_Y, stroke: "var(--text)", "stroke-width": 1 }));
  /* 丢弃区 */
  staticG.appendChild(el("rect", { x: GX0 + GW + 6, y: BASE_Y - 90, width: 62, height: 90, rx: 5, fill: "rgba(207,34,46,0.08)", stroke: "var(--accent)", "stroke-dasharray": "3 2" }));
  staticG.appendChild(text(GX0 + GW + 37, BASE_Y - 96, "丢弃→残差", { "text-anchor": "middle", "font-size": 10, fill: "var(--accent)" }));
  /* 底部说明条 */
  staticG.appendChild(text(GX0, 448, "", { "font-size": 11, fill: "var(--text)", id: "vmr-msg" }));

  var w = [], batch = 0, load = [], dropped = 0, prim = [];
  function resetState() {
    w = [0.55, 0, 0, 0, 0, 0, 0, 0];   /* E1 有微小初始优势：任何不干预的系统都会找到它 */
    batch = 0; dropped = 0;
    load = [0, 0, 0, 0, 0, 0, 0, 0];
    prim = [0, 0, 0, 0, 0, 0, 0, 0];
  }
  resetState();

  function step() {
    var k = parseInt(kIn.value, 10);
    var cf = parseFloat(cfIn.value);
    var alpha = parseInt(aIn.value, 10) / 1000;
    load = []; dropped = 0; prim = [];
    for (var i = 0; i < E; i++) { load.push(0); prim.push(0); }
    var cap = Math.ceil((cf * T) / E);
    var assign = [];   /* {t, i, share, dropped} */
    for (var t = 0; t < T; t++) {
      var scored = [];
      for (var j = 0; j < E; j++) scored.push({ i: j, s: 0.6 * hash01(t, j, batch) + w[j] });
      scored.sort(function (a, b) { return b.s - a.s; });
      for (var r = 0; r < k; r++) {
        var share = r === 0 ? 1 : 1 / k;
        assign.push({ t: t, i: scored[r].i, share: share, primary: r === 0 });
      }
    }
    /* 容量裁决：prim 记录路由意愿（容量前），丢弃只影响折算负载与 w 更新 */
    var used = [];
    for (i = 0; i < E; i++) used.push(0);
    assign.forEach(function (a) {
      if (a.primary) prim[a.i] += 1;
      if (used[a.i] + a.share <= cap + 1e-9) { used[a.i] += a.share; load[a.i] += a.share; a.drop = false; }
      else { a.drop = true; dropped += a.share; }
    });
    /* 更新熟练度：数据拟合正反馈 + 辅助损失拉平 */
    var lam = Math.min(alpha / 0.02, 1);
    var mean = 0;
    for (i = 0; i < E; i++) mean += w[i];
    mean /= E;
    for (i = 0; i < E; i++) {
      w[i] = (1 - lam) * (w[i] + RATE * load[i] / T) + lam * mean;
    }
    batch++;
    return assign;
  }

  function render(assign) {
    animG.textContent = "";
    var k = parseInt(kIn.value, 10);
    var cf = parseFloat(cfIn.value);
    kVal.textContent = k; cVal.textContent = cf.toFixed(2);
    aVal.textContent = (parseInt(aIn.value, 10) / 1000).toFixed(3);
    var cap = Math.ceil((cf * T) / E);

    /* 容量线 + 主路由柱 */
    var capY = BASE_Y - Math.min(cap / T, 1) * MAXH;
    for (var i = 0; i < E; i++) {
      var lv = prim[i] || 0;
      var h = Math.min(lv / T, 1) * MAXH;
      var collapsed = w[i] > 1.2;
      animG.appendChild(el("rect", {
        x: GX0 + i * BW + 6, y: BASE_Y - h, width: BW - 12, height: h,
        fill: collapsed ? "var(--accent)" : "var(--viz-b)", opacity: collapsed ? 0.9 : 0.75, rx: 2
      }));
      animG.appendChild(el("line", {
        x1: GX0 + i * BW + 3, y1: capY, x2: GX0 + (i + 1) * BW - 3, y2: capY,
        stroke: "var(--accent)", "stroke-width": 1.1, "stroke-dasharray": "4 2"
      }));
      if (lv > 0) {
        animG.appendChild(text(GX0 + i * BW + BW / 2, BASE_Y - h - 5, lv.toFixed(0), { "text-anchor": "middle", "font-size": 10, fill: "var(--text)" }));
      }
      /* 熟练度 w 虚线（相对首列归一化到 0..MAXH） */
      var wmax = Math.max.apply(null, w.concat([0.001]));
      var wy = BASE_Y - Math.min(w[i] / (wmax * 1.05), 1) * MAXH;
      animG.appendChild(el("line", {
        x1: GX0 + i * BW + 3, y1: wy, x2: GX0 + (i + 1) * BW - 3, y2: wy,
        stroke: "var(--text-soft)", "stroke-width": 0.8, "stroke-dasharray": "2 3", opacity: 0.8
      }));
    }
    /* token 落点 */
    if (assign) {
      assign.forEach(function (a, idx) {
        var tx = GX0 + (a.t + 0.5) * (GW / T);
        var ex = GX0 + a.i * BW + BW / 2;
        var dropY = BASE_Y + 44 + (idx % 3) * 12;
        var endX = a.drop ? GX0 + GW + 30 : ex;
        var endY = a.drop ? dropY : BASE_Y - 4;
        animG.appendChild(el("path", {
          d: "M" + tx + ",58 Q" + (tx * 0.5 + endX * 0.5) + "," + 130 + " " + endX + "," + (endY - 6),
          fill: "none", stroke: a.drop ? "var(--accent)" : "var(--viz-b)", "stroke-width": a.primary ? 1.4 : 0.8, opacity: a.primary ? 0.8 : 0.4
        }));
        animG.appendChild(el("circle", { cx: endX, cy: endY, r: a.primary ? 4 : 2.6, fill: a.drop ? "var(--accent)" : "var(--viz-b)", stroke: "var(--text)", "stroke-width": 0.6 }));
      });
    }
    /* 指标 */
    var total = 0;
    for (var q = 0; q < E; q++) total += prim[q];
    var meanL = total / E, varL = 0;
    for (q = 0; q < E; q++) varL += (prim[q] - meanL) * (prim[q] - meanL);
    var maxShare = prim.length ? Math.max.apply(null, prim) / T : 0;
    var msgEl = staticG.querySelector("#vmr-msg");
    var verdict = maxShare > 0.6 ? "⚠ 路由坍缩：头部专家通吃，其余饿死" : (maxShare > 0.45 ? "负载不均，逼近容量线" : "负载健康");
    msgEl.textContent = "Batch #" + batch + "｜主路由 token " + total + "/" + T + "｜丢弃 " + dropped.toFixed(1) + " 折算量（走残差）｜主路由方差 " + varL.toFixed(2) + "｜" + verdict;
    var alpha = parseInt(aIn.value, 10) / 1000;
    var hint = alpha === 0 ? "（α=0：正反馈无人制约，连播几步看坍缩）" : (alpha >= 0.02 ? "（α≥0.02：辅助损失把熟练度拉回均值，均衡恢复）" : "（α 偏小：只能延缓、不能阻止坍缩）");
    var hintEl = animG.appendChild(text(GX0, 432, hint, { "font-size": 10.5, fill: "var(--text-soft)" }));
  }

  var timer = null;
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 推进 batch"; return; }
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(function () { render(step()); }, 900);
  });
  resetBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 推进 batch"; }
    resetState(); render(null);
  });
  kIn.addEventListener("input", function () { render(null); });
  cfIn.addEventListener("input", function () { render(null); });
  aIn.addEventListener("input", function () { render(null); });
  render(null);
})();
