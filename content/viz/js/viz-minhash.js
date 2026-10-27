/* viz-minhash：shingle → MinHash 签名 → LSH 分带（B 类）
 * 四篇微型文档（词级 2-gram）；12 个确定性哈希函数模拟 12 次随机排列。
 * 签名矩阵按 r 行/带分组；任一带 A、B 全同 → 候选对。
 * 曲线：P(s) = 1-(1-s^r)^(12/r)，阈值 (r/12)^(1/r)。
 */
(function () {
  var root = document.getElementById("viz-minhash");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mh-static");
  var animG = root.querySelector("#mh-anim");
  var rIn = root.querySelector("#mh-r");
  var rVal = root.querySelector("#mh-rval");
  var nbandsOut = root.querySelector("#mh-nbands");

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

  /* ---------- 数据 ---------- */
  var DOCS = [
    { id: "A", txt: "the cat sat on the mat", sh: ["the cat", "cat sat", "sat on", "on the", "the mat"] },
    { id: "B", txt: "the cat sat on the rug", sh: ["the cat", "cat sat", "sat on", "on the", "the rug"] },
    { id: "C", txt: "a cat sat on the hat", sh: ["a cat", "cat sat", "sat on", "on the", "the hat"] },
    { id: "D", txt: "quantum cats defy classical mats", sh: ["quantum cats", "cats defy", "defy classical", "classical mats"] }
  ];
  var B = 12;
  var HASH = [
    [3, 11], [7, 5], [11, 13], [17, 7], [23, 19], [31, 17],
    [41, 23], [53, 29], [67, 37], [79, 41], [97, 47], [101, 53]
  ];
  var MOD = 99991;

  function code(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function hfun(i, s) { return (HASH[i][0] * code(s) + HASH[i][1]) % MOD; }
  function signature(sh) {
    var sig = [];
    for (var i = 0; i < B; i++) {
      var m = Infinity;
      for (var j = 0; j < sh.length; j++) { var v = hfun(i, sh[j]); if (v < m) m = v; }
      sig.push(m);
    }
    return sig;
  }
  function jaccard(a, b) {
    var inter = 0;
    a.forEach(function (x) { if (b.indexOf(x) >= 0) inter++; });
    return inter / (a.length + b.length - inter);
  }
  var SIG = DOCS.map(function (d) { return signature(d.sh); });

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(20, 26, "文档与 shingle（词级 2-gram）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(text(330, 26, "A 与 B 的签名比对（每格 = 一个 MinHash）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));

  /* ---------- 动态 ---------- */
  function render() {
    animG.textContent = "";
    var r = parseInt(rIn.value, 10);
    var nb = Math.floor(B / r);
    rVal.textContent = r;
    nbandsOut.textContent = nb;

    /* 文档与 shingle 芯片 */
    var y = 44;
    DOCS.forEach(function (d) {
      animG.appendChild(text(20, y + 15, "文档 " + d.id, { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
      var x = 68;
      d.sh.forEach(function (s) {
        var w = Math.max(40, s.length * 6.4 + 10);
        animG.appendChild(el("rect", { x: x, y: y, width: w, height: 20, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
        animG.appendChild(text(x + w / 2, y + 14, s, { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text)" }));
        x += w + 4;
      });
      y += 34;
    });

    /* Jaccard 读数 */
    var jAB = jaccard(DOCS[0].sh, DOCS[1].sh), jAC = jaccard(DOCS[0].sh, DOCS[2].sh), jAD = jaccard(DOCS[0].sh, DOCS[3].sh);
    var est = 0;
    for (var i = 0; i < B; i++) if (SIG[0][i] === SIG[1][i]) est++;
    animG.appendChild(text(20, y + 14, "真实 Jaccard：J(A,B)=" + jAB.toFixed(2) + " ｜ J(A,C)=" + jAC.toFixed(2) + " ｜ J(A,D)=" + jAD.toFixed(2), { "font-size": 10.5, fill: "var(--text)" }));
    animG.appendChild(text(20, y + 30, "MinHash 估计 Ĵ(A,B)=" + est + "/" + B + "=" + (est / B).toFixed(2) + "（误差≈1/√12≈0.29，微型语料仅供参考）", { "font-size": 10.5, fill: "var(--text-soft)" }));

    /* 签名矩阵 */
    var gx = 330, gy = 40, gw = 62, rowh = 13, colw = 46;
    var hitBand = -1;
    for (var bd = 0; bd < nb; bd++) {
      var allEq = true;
      for (var k = 0; k < r; k++) {
        var idx = bd * r + k;
        if (SIG[0][idx] !== SIG[1][idx]) allEq = false;
      }
      if (allEq && hitBand < 0) hitBand = bd;
    }
    animG.appendChild(text(gx + gw / 2 + 8, gy - 4, "A", { "text-anchor": "middle", "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(text(gx + gw / 2 + colw + 8, gy - 4, "B", { "text-anchor": "middle", "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
    for (var i2 = 0; i2 < B; i2++) {
      var yy = gy + i2 * rowh;
      var bandIdx = Math.floor(i2 / r);
      var isBandStart = (i2 % r === 0);
      animG.appendChild(text(gx - 6, yy + 10, "h" + (i2 + 1), { "text-anchor": "end", "font-size": 8.5, fill: "var(--text-soft)" }));
      var eq = SIG[0][i2] === SIG[1][i2];
      [SIG[0][i2], SIG[1][i2]].forEach(function (v, ci) {
        var cx = gx + gw / 2 + 8 + ci * colw - colw / 2 + 4;
        animG.appendChild(el("rect", {
          x: cx, y: yy, width: colw - 8, height: rowh - 2, rx: 2,
          fill: eq ? "var(--accent-soft)" : "var(--bg-soft)",
          stroke: eq ? "var(--accent)" : "var(--border)", "stroke-width": eq ? 1.2 : 0.6
        }));
        animG.appendChild(text(cx + (colw - 8) / 2, yy + 9.5, String(v % 10000), { "text-anchor": "middle", "font-size": 8, fill: eq ? "var(--accent)" : "var(--text-soft)" }));
      });
      if (isBandStart && bandIdx > 0) {
        animG.appendChild(el("line", { x1: gx - 30, y1: yy - 1, x2: gx + gw + colw, y2: yy - 1, stroke: "var(--border)", "stroke-width": 1.2 }));
      }
    }
    var bandY = gy + B * rowh + 16;
    animG.appendChild(text(gx - 24, bandY, hitBand >= 0
      ? "带 " + (hitBand + 1) + " 整带相同 ✓ → (A,B) 成为候选对（再精确复核）"
      : "没有任何带整带相同 → (A,B) 落选", { "font-size": 10.5, fill: hitBand >= 0 ? "var(--accent)" : "var(--text-soft)", "font-weight": hitBand >= 0 ? "bold" : "normal" }));

    /* 候选概率曲线 */
    var CX = 46, CY = 246, CW = 548, CH = 168;
    animG.appendChild(text(CX, CY - 8, "候选概率 P(s)=1-(1-s^r)^" + nb + "（当前 r=" + r + "）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(el("rect", { x: CX, y: CY, width: CW, height: CH, fill: "none", stroke: "var(--border)", "stroke-width": 0.8 }));
    [0.25, 0.5, 0.75, 1].forEach(function (p) {
      animG.appendChild(el("line", { x1: CX, y1: CY + CH * (1 - p), x2: CX + CW, y2: CY + CH * (1 - p), stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "3 3" }));
      animG.appendChild(text(CX - 5, CY + CH * (1 - p) + 3.5, p.toFixed(2), { "text-anchor": "end", "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (s) {
      animG.appendChild(text(CX + CW * s, CY + CH + 12, s.toFixed(2), { "text-anchor": "middle", "font-size": 8.5, fill: "var(--text-soft)" }));
    });
    animG.appendChild(text(CX + CW / 2, CY + CH + 26, "Jaccard 相似度 s", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));
    var d = "";
    for (var px = 0; px <= 100; px++) {
      var s = px / 100;
      var pv = 1 - Math.pow(1 - Math.pow(s, r), nb);
      d += (px === 0 ? "M" : "L") + (CX + CW * s).toFixed(1) + "," + (CY + CH * (1 - pv)).toFixed(1);
    }
    animG.appendChild(el("path", { d: d, fill: "none", stroke: "var(--viz-b)", "stroke-width": 2 }));
    /* 阈值线 */
    var thr = Math.pow(1 / nb, 1 / r);
    animG.appendChild(el("line", { x1: CX + CW * thr, y1: CY, x2: CX + CW * thr, y2: CY + CH, stroke: "var(--accent)", "stroke-width": 1.2, "stroke-dasharray": "4 3" }));
    animG.appendChild(text(CX + CW * thr, CY - 2, "阈值 " + thr.toFixed(2), { "text-anchor": "middle", "font-size": 9.5, "font-weight": "bold", fill: "var(--accent)" }));
    /* 三对文档的落点 */
    [[jAB, "A·B", DOCS[0].id + "·" + DOCS[1].id], [jAC, "A·C", ""], [jAD, "A·D", ""]].forEach(function (pair) {
      var s = pair[0], pv = 1 - Math.pow(1 - Math.pow(s, r), nb);
      var mx = CX + CW * s, my = CY + CH * (1 - pv);
      var mk = el("circle", { cx: mx, cy: my, r: 4.5, fill: "var(--viz-b)", stroke: "var(--text)", "stroke-width": 0.8 });
      var ttl = el("title", {});
      ttl.textContent = pair[1] + "：s=" + s.toFixed(2) + "，候选概率 " + (pv * 100).toFixed(1) + "%";
      mk.appendChild(ttl);
      animG.appendChild(mk);
      animG.appendChild(text(mx, my - 8, pair[1] + " " + (pv * 100).toFixed(0) + "%", { "text-anchor": "middle", "font-size": 9, fill: "var(--text)" }));
    });
    animG.appendChild(text(CX + CW, CY + CH + 40, "阈值以上 S 型陡升；调 (b,r) 就是调阈值——松紧之间是候选池大小与精确复核成本的取舍", { "text-anchor": "end", "font-size": 9.5, fill: "var(--text-soft)" }));
  }

  rIn.addEventListener("input", render);
  render();
})();
