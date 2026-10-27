/* viz-bpe：BPE 逐轮合并 + 词表权衡（B 类）
 * 语料：[low×3, lower×2, newest×2, lowest×2, wider×1]。
 * 每轮：统计相邻对频率（加权）→ 合并最高频对（并列取字典序先者）→ 词表 +1。
 * 权衡图：从零重放整条合并轨迹，画 序列长度 vs 嵌入参数 两条曲线 + 当前状态标记。
 */
(function () {
  var root = document.getElementById("viz-bpe");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vb-static");
  var animG = root.querySelector("#vb-anim");
  var vocabIn = root.querySelector("#vb-vocab");
  var vVal = root.querySelector("#vb-vval");
  var playBtn = root.querySelector("#vb-play");
  var stepBtn = root.querySelector("#vb-step");
  var resetBtn = root.querySelector("#vb-reset");

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

  var WORDS = [
    { w: "low", c: 3 },
    { w: "lower", c: 2 },
    { w: "newest", c: 2 },
    { w: "lowest", c: 2 },
    { w: "wider", c: 1 }
  ];
  var D = 512, V0 = 10;

  /* ---------- BPE 引擎（作用于给定 seqs 数组） ---------- */
  function freshSeqs() {
    return WORDS.map(function (o) { return { w: o.w, c: o.c, toks: o.w.split("") }; });
  }
  function pairCounts(arr) {
    var pc = {};
    arr.forEach(function (s) {
      for (var i = 0; i < s.toks.length - 1; i++) {
        var key = s.toks[i] + " " + s.toks[i + 1];
        pc[key] = (pc[key] || 0) + s.c;
      }
    });
    return pc;
  }
  function bestPair(arr) {
    var pc = pairCounts(arr);
    var best = null, bestC = -1;
    for (var key in pc) {
      if (pc[key] > bestC || (pc[key] === bestC && best && key < best)) { best = key; bestC = pc[key]; }
    }
    if (!best || bestC < 2) return null;
    return { pair: best.split(" "), count: bestC };
  }
  function mergeOnce(arr) {
    var bp = bestPair(arr);
    if (!bp) return null;
    var a = bp.pair[0], b = bp.pair[1], nt = a + b;
    arr.forEach(function (s) {
      var out = [], i = 0;
      while (i < s.toks.length) {
        if (i < s.toks.length - 1 && s.toks[i] === a && s.toks[i + 1] === b) { out.push(nt); i += 2; }
        else { out.push(s.toks[i]); i++; }
      }
      s.toks = out;
    });
    return { pair: [a, b], tok: nt, count: bp.count };
  }
  function totalTokens(arr) {
    var n = 0;
    arr.forEach(function (s) { n += s.c * s.toks.length; });
    return n;
  }

  var seqs = freshSeqs(), merges = [], curMerge = 0;

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(30, 26, "语料（× 后为词频）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(text(30, 250, "合并记录（按发生顺序，只显示最近 9 条）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var TX = 330, TY = 250, TW = 280, TH = 130;
  staticG.appendChild(text(TX + TW / 2, 250, "词表权衡：序列长度 vs 嵌入参数", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  [0, 0.5, 1].forEach(function (f) {
    var yy = TY + 14 + f * (TH - 20);
    staticG.appendChild(el("line", { x1: TX, y1: yy, x2: TX + TW, y2: yy, stroke: "var(--border)", "stroke-width": 0.5, "stroke-dasharray": "3 3" }));
  });
  staticG.appendChild(text(TX, TY + TH + 18, "词表 " + V0, { "font-size": 9.5, fill: "var(--text-soft)" }));
  staticG.appendChild(text(TX + TW, TY + TH + 18, "词表 17", { "text-anchor": "end", "font-size": 9.5, fill: "var(--text-soft)" }));

  /* ---------- 动态 ---------- */
  function render(lastTok) {
    animG.textContent = "";
    vVal.textContent = V0 + curMerge;

    /* 语料 token 方块 */
    var x = 30, y = 40;
    seqs.forEach(function (s, wi) {
      var tx = x;
      s.toks.forEach(function (tk) {
        var wpx = Math.max(18, tk.length * 8.5 + 8);
        var isNew = lastTok === tk;
        animG.appendChild(el("rect", {
          x: tx, y: y, width: wpx, height: 22, rx: 3,
          fill: isNew ? "var(--accent-soft)" : "var(--bg-soft)",
          stroke: isNew ? "var(--accent)" : "var(--border)", "stroke-width": isNew ? 1.6 : 0.8
        }));
        animG.appendChild(text(tx + wpx / 2, y + 15, tk, { "text-anchor": "middle", "font-size": 11, fill: isNew ? "var(--accent)" : "var(--text)", "font-weight": isNew ? "bold" : "normal" }));
        tx += wpx + 3;
      });
      animG.appendChild(text(tx + 4, y + 15, "×" + s.c, { "font-size": 10, fill: "var(--text-soft)" }));
      y += 34;
      if (wi === 2) { x = 330; y = 40; }
    });

    /* 指标行 */
    animG.appendChild(text(30, 232, "词表 = " + (V0 + curMerge) + " ｜语料总 token = " + totalTokens(seqs) + " ｜嵌入参数 2·V·d = " + (2 * (V0 + curMerge) * D / 1000).toFixed(0) + "k", { "font-size": 11, fill: "var(--text)" }));

    /* 合并记录 */
    var my = 268;
    merges.slice(-9).forEach(function (mg, idx) {
      var recent = idx === merges.slice(-9).length - 1;
      animG.appendChild(text(30, my, "· " + mg.pair[0] + " + " + mg.pair[1] + " → \"" + mg.tok + "\"（频次 " + mg.count + "）", { "font-size": 10.5, fill: recent ? "var(--accent)" : "var(--text-soft)", "font-weight": recent ? "bold" : "normal" }));
      my += 15;
    });
    var bp = bestPair(seqs);
    if (bp) {
      animG.appendChild(text(30, my + 4, "下一轮候选：" + bp.pair[0] + " + " + bp.pair[1] + "（频次 " + bp.count + "）", { "font-size": 11, fill: "var(--text)" }));
    } else {
      animG.appendChild(text(30, my + 4, "所有相邻对频次 < 2：微型语料已无可合并项", { "font-size": 11, fill: "var(--text-soft)" }));
    }

    /* 权衡曲线：从零重放完整轨迹 */
    var arr = freshSeqs(), pts = [];
    pts.push({ v: V0, t: totalTokens(arr) });
    while (true) {
      if (!mergeOnce(arr)) break;
      pts.push({ v: V0 + pts.length, t: totalTokens(arr) });
      if (pts.length > 20) break;
    }
    var vMin = V0, vMax = V0 + pts.length - 1;
    var tMax = pts[0].t, tMin = pts[pts.length - 1].t;
    var eMin = 2 * V0 * D, eMax = 2 * vMax * D;
    function tpx(v) { return TX + (v - vMin) / Math.max(vMax - vMin, 1) * TW; }
    function tpy(t) { return TY + 14 + (t - tMin) / Math.max(tMax - tMin, 1e-9) * (TH - 34); }
    function epy(e) { return TY + 14 + (e - eMin) / Math.max(eMax - eMin, 1e-9) * (TH - 34); }
    var dT = "", dE = "";
    pts.forEach(function (p, i) {
      dT += (i === 0 ? "M" : "L") + tpx(p.v).toFixed(1) + "," + tpy(p.t).toFixed(1);
      dE += (i === 0 ? "M" : "L") + tpx(p.v).toFixed(1) + "," + epy(2 * p.v * D).toFixed(1);
    });
    animG.appendChild(el("path", { d: dT, fill: "none", stroke: "var(--viz-b)", "stroke-width": 2 }));
    animG.appendChild(el("path", { d: dE, fill: "none", stroke: "var(--accent)", "stroke-width": 2 }));
    /* 当前状态标记 */
    var cv = V0 + curMerge;
    animG.appendChild(el("line", { x1: tpx(cv), y1: TY + 6, x2: tpx(cv), y2: TY + TH, stroke: "var(--text)", "stroke-width": 1, "stroke-dasharray": "3 2" }));
    animG.appendChild(el("circle", { cx: tpx(cv), cy: tpy(totalTokens(seqs)), r: 4, fill: "var(--viz-b)", stroke: "var(--text)", "stroke-width": 0.8 }));
    animG.appendChild(el("circle", { cx: tpx(cv), cy: epy(2 * cv * D), r: 4, fill: "var(--accent)", stroke: "var(--text)", "stroke-width": 0.8 }));
    animG.appendChild(el("line", { x1: TX + 4, y1: TY + 10, x2: TX + 18, y2: TY + 10, stroke: "var(--viz-b)", "stroke-width": 2 }));
    animG.appendChild(text(TX + 22, TY + 13, "序列长度（token 数，越低越好）", { "font-size": 10, fill: "var(--text-soft)" }));
    animG.appendChild(el("line", { x1: TX + 4, y1: TY + 26, x2: TX + 18, y2: TY + 26, stroke: "var(--accent)", "stroke-width": 2 }));
    animG.appendChild(text(TX + 22, TY + 29, "嵌入参数 2·V·d（越高越贵）", { "font-size": 10, fill: "var(--text-soft)" }));
    animG.appendChild(text(TX + TW / 2, TY + TH + 34, "真实语料上这条权衡是平缓 U 型：主流词表 32k~128k 取谷底", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  }

  function mergeToTarget() {
    while (V0 + curMerge < parseInt(vocabIn.value, 10)) {
      var m = mergeOnce(seqs);
      if (!m) break;
      merges.push(m); curMerge++;
    }
  }

  var timer = null;
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 逐轮合并"; return; }
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(function () {
      var m = mergeOnce(seqs);
      if (!m) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 逐轮合并"; render(null); return; }
      merges.push(m); curMerge++;
      render(m.tok);
    }, 750);
  });
  stepBtn.addEventListener("click", function () {
    var m = mergeOnce(seqs);
    if (m) { merges.push(m); curMerge++; render(m.tok); }
  });
  resetBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 逐轮合并"; }
    seqs = freshSeqs(); merges = []; curMerge = 0;
    mergeToTarget();
    render(null);
  });
  vocabIn.addEventListener("input", function () { mergeToTarget(); render(null); });

  mergeToTarget();
  render(null);
})();
