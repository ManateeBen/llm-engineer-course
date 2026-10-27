/* viz-rope2：RoPE 相对性与外推失效（A 类）
 * 左：单位圆上 q(mθ)、k(nθ) 旋转演示，点积 = cos((n−m)θ)——精确相对性。
 * 右：相对距离 Δ∈[0,2048] 的得分曲线 cos(Δθ_i')，绿色=训练区、红色=外推区；
 *     方案（none/pi/ntk/yarn）改变第 i 档的有效角度 θ_i'。
 * θ_i = 10000^(-2i/64)；PI: θ/4；NTK: base'=10000·4^(64/62)；
 * YaRN: r(i) 从 0（高频，保持）平滑升到 1（低频，插值），θ·(1/4)^r。
 */
(function () {
  var root = document.getElementById("viz-rope2");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vr2-static");
  var animG = root.querySelector("#vr2-anim");
  var mIn = root.querySelector("#vr2-m");
  var nIn = root.querySelector("#vr2-n");
  var bandIn = root.querySelector("#vr2-band");
  var modeSel = root.querySelector("#vr2-mode");
  var mVal = root.querySelector("#vr2-mval");
  var nVal = root.querySelector("#vr2-nval");
  var bVal = root.querySelector("#vr2-bval");

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

  var TRAIN_CTX = 512, MAXD = 2048, D = 64, SCALE = 4;
  var NTK_BASE = 10000 * Math.pow(SCALE, D / (D - 2));

  function thetaRaw(i) { return Math.pow(10000, -2 * i / D); }
  function yarnR(i) { return Math.min(Math.max((i - 2) / 6, 0), 1); }
  function thetaEff(i, mode) {
    var t = thetaRaw(i);
    if (mode === "pi") return t / SCALE;
    if (mode === "ntk") return Math.pow(NTK_BASE, -2 * i / D);
    if (mode === "yarn") return t * Math.pow(1 / SCALE, yarnR(i));
    return t;
  }

  /* ---------- 左图：单位圆 ---------- */
  var CCX = 128, CCY = 195, CR = 88;
  staticG.appendChild(el("circle", { cx: CCX, cy: CCY, r: CR, fill: "none", stroke: "var(--border)", "stroke-width": 1.2 }));
  staticG.appendChild(el("circle", { cx: CCX, cy: CCY, r: 2.5, fill: "var(--text-soft)" }));
  staticG.appendChild(el("line", { x1: CCX - CR - 8, y1: CCY, x2: CCX + CR + 8, y2: CCY, stroke: "var(--border)", "stroke-width": 0.6, "stroke-dasharray": "3 3" }));
  staticG.appendChild(el("line", { x1: CCX, y1: CCY - CR - 8, x2: CCX, y2: CCY + CR + 8, stroke: "var(--border)", "stroke-width": 0.6, "stroke-dasharray": "3 3" }));
  staticG.appendChild(text(CCX, CCY - CR - 16, "单位圆上的旋转", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));

  /* ---------- 右图：Δ-得分曲线 ---------- */
  var GX = 300, GY = 60, GW = 320, GH = 240;
  staticG.appendChild(text(GX + GW / 2, GY - 26, "相对距离 Δ 上的得分 cos(Δ·θ_i')", { "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  /* 训练区/外推区底色 */
  var tx = GX + (TRAIN_CTX / MAXD) * GW;
  staticG.appendChild(el("rect", { x: GX, y: GY, width: tx - GX, height: GH, fill: "rgba(26,127,55,0.08)" }));
  staticG.appendChild(el("rect", { x: tx, y: GY, width: GX + GW - tx, height: GH, fill: "rgba(207,34,46,0.07)" }));
  staticG.appendChild(el("line", { x1: tx, y1: GY - 6, x2: tx, y2: GY + GH + 6, stroke: "var(--text-soft)", "stroke-width": 1.2, "stroke-dasharray": "4 3" }));
  staticG.appendChild(text(tx, GY - 12, "训练区 | 外推区", { "text-anchor": "middle", "font-size": 10.5, fill: "var(--text-soft)" }));
  staticG.appendChild(text(GX + (tx - GX) / 2, GY + GH + 20, "训练时见过的模式", { "text-anchor": "middle", "font-size": 10.5, fill: "var(--viz-c)" }));
  staticG.appendChild(text((tx + GX + GW) / 2, GY + GH + 20, "外推：没转过的角度", { "text-anchor": "middle", "font-size": 10.5, fill: "var(--accent)" }));
  /* 坐标轴 */
  staticG.appendChild(el("line", { x1: GX, y1: GY + GH, x2: GX + GW, y2: GY + GH, stroke: "var(--text)", "stroke-width": 1 }));
  staticG.appendChild(el("line", { x1: GX, y1: GY, x2: GX, y2: GY + GH, stroke: "var(--text)", "stroke-width": 1 }));
  staticG.appendChild(el("line", { x1: GX - 5, y1: GY + GH / 2, x2: GX, y2: GY + GH / 2, stroke: "var(--text)", "stroke-width": 1 }));
  for (var dv = 0; dv <= MAXD; dv += 512) {
    var dx = GX + (dv / MAXD) * GW;
    staticG.appendChild(text(dx, GY + GH + 14, String(dv), { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(text(GX - 26, GY + GH / 2 - 6, "+1", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  staticG.appendChild(text(GX - 26, GY + GH / 2 + 12, "−1", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  staticG.appendChild(text(GX - 26, GY + GH / 2 + 4, "0", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));

  /* 曲线（动态层重画） */
  var curves = {};
  ["none", "pi", "ntk", "yarn"].forEach(function (m) {
    var p = el("path", { d: "", fill: "none", stroke: m === "none" ? "var(--accent)" : "var(--viz-b)", "stroke-width": m === "none" ? 2 : 1.6, opacity: m === "none" ? 1 : 0.9 });
    curves[m] = p;
    animG.appendChild(p);
  });
  /* 图例 */
  var legend = [
    ["none", "无修正", "var(--accent)"],
    ["pi", "PI ÷4", "var(--viz-b)"],
    ["ntk", "NTK-aware", "var(--viz-c)"],
    ["yarn", "YaRN", "var(--text)"]
  ];
  legend.forEach(function (L, idx) {
    var lx = GX + 8 + (idx % 2) * 150, ly = GY + 12 + Math.floor(idx / 2) * 16;
    animG.appendChild(el("line", { x1: lx, y1: ly - 4, x2: lx + 16, y2: ly - 4, stroke: L[2], "stroke-width": 2 }));
    animG.appendChild(text(lx + 20, ly, L[1], { "font-size": 10.5, fill: "var(--text-soft)" }));
  });

  var colors = { q: "var(--accent)", k: "var(--viz-b)", arc: "var(--viz-c)" };

  function render() {
    /* 清掉动态层里的曲线以外元素：直接重建全部动态内容 */
    animG.textContent = "";
    ["none", "pi", "ntk", "yarn"].forEach(function (m) { animG.appendChild(curves[m]); });
    legend.forEach(function (L, idx) {
      var lx = GX + 8 + (idx % 2) * 150, ly = GY + 12 + Math.floor(idx / 2) * 16;
      animG.appendChild(el("line", { x1: lx, y1: ly - 4, x2: lx + 16, y2: ly - 4, stroke: L[2], "stroke-width": 2 }));
      animG.appendChild(text(lx + 20, ly, L[1], { "font-size": 10.5, fill: "var(--text-soft)" }));
    });

    var m = parseInt(mIn.value, 10), n = parseInt(nIn.value, 10), i = parseInt(bandIn.value, 10);
    var mode = modeSel.value;
    mVal.textContent = m; nVal.textContent = n; bVal.textContent = i;

    var th = thetaRaw(i), thE = thetaEff(i, mode);
    var angQ = (m * thE) % (2 * Math.PI), angK = (n * thE) % (2 * Math.PI);
    var qx = CCX + CR * Math.cos(angQ), qy = CCY - CR * Math.sin(angQ);
    var kx = CCX + CR * Math.cos(angK), ky = CCY - CR * Math.sin(angK);

    /* q、k 向量 */
    animG.appendChild(el("line", { x1: CCX, y1: CCY, x2: qx, y2: qy, stroke: colors.q, "stroke-width": 2.4, "marker-end": "url(#vr2-aq)" }));
    animG.appendChild(el("line", { x1: CCX, y1: CCY, x2: kx, y2: ky, stroke: colors.k, "stroke-width": 2.4, "marker-end": "url(#vr2-ak)" }));
    /* 相对角弧（从 k 到 q 的短弧） */
    var rel = ((n - m) * thE) % (2 * Math.PI);
    var arcR = 30;
    var a0 = Math.min(angQ, angK), a1 = Math.max(angQ, angK);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var p0x = CCX + arcR * Math.cos(a0), p0y = CCY - arcR * Math.sin(a0);
    var p1x = CCX + arcR * Math.cos(a1), p1y = CCY - arcR * Math.sin(a1);
    /* y 轴向下：角度增大在屏幕上呈逆时针，SVG sweep = 0 */
    animG.appendChild(el("path", {
      d: "M" + p0x + "," + p0y + " A" + arcR + "," + arcR + " 0 " + large + " 0 " + p1x + "," + p1y,
      fill: "none", stroke: colors.arc, "stroke-width": 1.6, "stroke-dasharray": "4 2"
    }));
    animG.appendChild(text(CCX + 44, CCY - 34, "Δθ = " + (((n - m) * thE) % (2 * Math.PI)).toFixed(2) + " rad", { "font-size": 11, fill: colors.arc }));
    animG.appendChild(text(qx + 8, qy - 6, "q(m)", { "font-size": 11, "font-weight": "bold", fill: colors.q }));
    animG.appendChild(text(kx + 8, ky + 14, "k(n)", { "font-size": 11, "font-weight": "bold", fill: colors.k }));

    /* 左图读数 */
    var dot = Math.cos((n - m) * thE);
    var turns = Math.abs(m * thE) / (2 * Math.PI);
    var lines = [
      "θ_i = " + th.toFixed(4) + " rad/位置" + (mode === "none" ? "" : " → 修正后 " + thE.toFixed(4)),
      "q 被旋转 " + turns.toFixed(1) + " 整圈" + (mode === "none" ? "" : "（原 " + (Math.abs(m * th) / (2 * Math.PI)).toFixed(1) + " 圈）"),
      "点积 ⟨q̃_m,k̃_n⟩ = cos(Δθ) = " + dot.toFixed(3)
    ];
    for (var t = 0; t < lines.length; t++) {
      animG.appendChild(text(CCX - CR - 4, CCY + CR + 22 + t * 16, lines[t], { "font-size": 11, fill: t === 2 ? "var(--text)" : "var(--text-soft)" }));
    }
    animG.appendChild(text(CCX - CR - 4, CCY + CR + 22 + 3 * 16 + 4, "Δ=" + (n - m) + "：拖动 m、n 同增同减，读数不变", { "font-size": 10.5, fill: "var(--text-soft)" }));

    /* 右图四条曲线 */
    var modeColors = { none: "var(--accent)", pi: "var(--viz-b)", ntk: "var(--viz-c)", yarn: "var(--text)" };
    ["none", "pi", "ntk", "yarn"].forEach(function (mm) {
      var te = thetaEff(i, mm);
      var d = "";
      for (var dv2 = 0; dv2 <= MAXD; dv2 += 16) {
        var yy = GY + GH / 2 - Math.cos(dv2 * te) * (GH / 2 - 8);
        d += (dv2 === 0 ? "M" : "L") + (GX + (dv2 / MAXD) * GW).toFixed(1) + "," + yy.toFixed(1);
      }
      curves[mm].setAttribute("d", d);
      curves[mm].setAttribute("stroke", modeColors[mm]);
    });

    /* 当前 Δ 在右图上的标记 */
    var dCur = Math.abs(n - m);
    var mx = GX + (Math.min(dCur, MAXD) / MAXD) * GW;
    animG.appendChild(el("line", { x1: mx, y1: GY, x2: mx, y2: GY + GH, stroke: "var(--text)", "stroke-width": 1.2, "stroke-dasharray": "3 2" }));
    animG.appendChild(text(Math.min(mx + 5, GX + GW - 30), GY + GH - 8, "当前 Δ=" + dCur, { "font-size": 10.5, fill: "var(--text)" }));
  }

  var defs = el("defs", {});
  var mk1 = el("marker", { id: "vr2-aq", markerWidth: 7, markerHeight: 7, refX: 3.5, refY: 3, orient: "auto" });
  mk1.appendChild(el("path", { d: "M0,0 L7,3 L0,6 z", fill: colors.q }));
  var mk2 = el("marker", { id: "vr2-ak", markerWidth: 7, markerHeight: 7, refX: 3.5, refY: 3, orient: "auto" });
  mk2.appendChild(el("path", { d: "M0,0 L7,3 L0,6 z", fill: colors.k }));
  defs.appendChild(mk1); defs.appendChild(mk2);
  staticG.appendChild(defs);

  mIn.addEventListener("input", render);
  nIn.addEventListener("input", render);
  bandIn.addEventListener("input", render);
  modeSel.addEventListener("change", render);
  render();
})();
