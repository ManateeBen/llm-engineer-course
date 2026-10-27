/* viz-ssm：三架构对比 + 递推状态演示（B 类）
 * 三联小图（推理成本 / 训练 FLOPs / NIAH 精度）× 三架构（注意力/线性/混合）。
 * 递推演示：8 步写入状态矩阵 S（4×4），旧记忆 0.85 衰减；第 5 步是"针"。
 * 右侧 KV cache 无损回放对照。针残留 vs 精确检索 = 核心交换的定量展示。
 */
(function () {
  var root = document.getElementById("viz-ssm");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#vs-static");
  var animG = root.querySelector("#vs-anim");
  var lenIn = root.querySelector("#vs-len");
  var lVal = root.querySelector("#vs-lval");
  var playBtn = root.querySelector("#vs-play");

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

  var C_ATT = "var(--accent)", C_LIN = "var(--viz-b)", C_HYB = "var(--viz-c)";
  var LG0 = 3, LG1 = 8;   /* L: 1k ~ 100M */
  var PANS = [
    { x: 36, title: "每 token 推理成本", yLabel: "相对", a: "lin", b: "const", c: "mix" },
    { x: 232, title: "训练 FLOPs", yLabel: "相对", a: "sq", b: "lin", c: "mixf" },
    { x: 428, title: "NIAH 检索精度", yLabel: "%", a: "flat", b: "drop", c: "mixp" }
  ];
  var GY = 56, GH = 130, GW = 176;

  /* 序列长度 */
  function curL() { return Math.round(Math.pow(10, parseFloat(lenIn.value))); }
  function fmtL(l) { return l >= 1e6 ? (l / 1e6).toFixed(1) + "M" : (l / 1000) + "k"; }

  /* ---------- 静态：三联图 ---------- */
  PANS.forEach(function (p) {
    staticG.appendChild(text(p.x + GW / 2, 24, p.title, { "text-anchor": "middle", "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
    staticG.appendChild(el("rect", { x: p.x, y: GY, width: GW, height: GH, fill: "var(--bg-soft)", stroke: "var(--border)" }));
    [0, 0.5, 1].forEach(function (f) {
      staticG.appendChild(el("line", { x1: p.x, y1: GY + f * GH, x2: p.x + GW, y2: GY + f * GH, stroke: "var(--border)", "stroke-width": 0.5, "stroke-dasharray": "3 3" }));
    });
    [1000, 4000, 16000, 64000, 256000].forEach(function (lv) {
      var xx = p.x + (Math.log10(lv) - LG0) / (LG1 - LG0) * GW;
      staticG.appendChild(el("line", { x1: xx, y1: GY, x2: xx, y2: GY + GH, stroke: "var(--border)", "stroke-width": 0.4, "stroke-dasharray": "2 3" }));
      staticG.appendChild(text(xx, GY + GH + 14, fmtL(lv), { "text-anchor": "middle", "font-size": 9, fill: "var(--text-soft)" }));
    });
    staticG.appendChild(text(p.x + GW / 2, GY + GH + 30, "序列长度 L", { "text-anchor": "middle", "font-size": 9.5, fill: "var(--text-soft)" }));
  });
  /* 图例 */
  [["纯注意力", C_ATT], ["线性 / SSM", C_LIN], ["混合", C_HYB]].forEach(function (L0, i) {
    var lx = 36 + i * 200;
    staticG.appendChild(el("line", { x1: lx, y1: 238, x2: lx + 16, y2: 238, stroke: L0[1], "stroke-width": 2.4 }));
    staticG.appendChild(text(lx + 20, 241, L0[0], { "font-size": 10.5, fill: "var(--text-soft)" }));
  });

  /* ---------- 静态：递推演示区 ---------- */
  staticG.appendChild(text(36, 272, "递推写入演示（衰减 0.85/步；第 5 个 token 是「针」）", { "font-size": 11.5, "font-weight": "bold", fill: "var(--text)" }));
  /* 状态矩阵 4×4 */
  var MX = 44, MY = 288, MC = 22;
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      staticG.appendChild(el("rect", { x: MX + j * MC, y: MY + i * MC, width: MC - 2, height: MC - 2, rx: 2, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.6 }));
    }
  }
  staticG.appendChild(text(MX + 44, MY - 8, "线性注意力状态 S（4×4）", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  /* KV cache 对照 */
  var KX = 520;
  for (i = 0; i < 8; i++) {
    staticG.appendChild(el("rect", { x: KX + (i % 4) * 24, y: MY + Math.floor(i / 4) * 30, width: 20, height: 24, rx: 2, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.6 }));
  }
  staticG.appendChild(text(KX + 44, MY - 8, "注意力 KV cache（无损回放）", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));
  /* 时间步 */
  var TX0 = 170;
  for (i = 0; i < 8; i++) {
    staticG.appendChild(el("rect", { x: TX0 + i * 40, y: MY + 26, width: 30, height: 30, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    staticG.appendChild(text(TX0 + i * 40 + 15, MY + 45, i === 4 ? "针" : "t" + (i + 1), { "text-anchor": "middle", "font-size": 10, fill: i === 4 ? "var(--accent)" : "var(--text-soft)", "font-weight": i === 4 ? "bold" : "normal" }));
  }
  staticG.appendChild(text(TX0 + 160, MY + 45, "时间步", { "text-anchor": "middle", "font-size": 10, fill: "var(--text-soft)" }));

  /* ---------- 动态 ---------- */
  var step = 0;   /* 已写入步数 0..8 */
  var timer = null;

  function curve(p, kind, color, L) {
    var d = "";
    for (var lg = LG0; lg <= LG1; lg += 0.2) {
      var l = Math.pow(10, lg);
      var f;
      if (kind === "lin") f = (l - 1000) / 255000;                    /* O(L) 推理 */
      else if (kind === "sq") f = Math.pow((l - 1000) / 255000, 2);   /* O(L²) 训练 */
      else if (kind === "const") f = 0.06;                            /* O(1) 推理 */
      else if (kind === "mix") f = 0.1 + 0.12 * (l - 1000) / 255000;  /* 混合：近恒定 */
      else if (kind === "mixf") f = 0.25 * (l - 1000) / 255000 + 0.1; /* 混合：线性但斜率小 */
      else if (kind === "flat") f = 0.95;                             /* 检索：高 */
      else if (kind === "drop") f = Math.max(0.95 - 0.5 * (l - 1000) / 255000, 0.3); /* 检索：塌方 */
      else if (kind === "mixp") f = 0.9 - 0.12 * (l - 1000) / 255000; /* 混合：略降 */
      var xx = p.x + (lg - LG0) / (LG1 - LG0) * GW;
      var yy = GY + GH - Math.max(f, 0) * (GH - 6) - 3;
      d += (lg === LG0 ? "M" : "L") + xx.toFixed(1) + "," + yy.toFixed(1);
    }
    return { d: d, color: color };
  }

  function render() {
    animG.textContent = "";
    var lg = parseFloat(lenIn.value);
    lVal.textContent = fmtL(curL());

    /* 三联曲线 */
    PANS.forEach(function (p) {
      [["a", p.a, C_ATT], ["b", p.b, C_LIN], ["c", p.c, C_HYB]].forEach(function (t) {
        var cv = curve(p, t[1], t[2]);
        animG.appendChild(el("path", { d: cv.d, fill: "none", stroke: cv.color, "stroke-width": 2 }));
      });
      /* 当前 L 竖线 */
      var xx = p.x + (lg - LG0) / (LG1 - LG0) * GW;
      animG.appendChild(el("line", { x1: xx, y1: GY, x2: xx, y2: GY + GH, stroke: "var(--text)", "stroke-width": 1.1, "stroke-dasharray": "4 3" }));
    });

    /* 递推状态矩阵：已写入 step 步，每步一次 rank-1 写入 + 全局衰减 */
    var S = [];
    for (var i = 0; i < 4; i++) { S.push([0, 0, 0, 0]); }
    var needleResidue = 0;
    for (var s = 0; s < step; s++) {
      /* 旧记忆衰减 */
      for (i = 0; i < 4; i++) for (var j = 0; j < 4; j++) S[i][j] *= 0.85;
      /* 新写入（确定性伪随机 rank-1） */
      var amp = s === 4 ? 1.0 : 0.35;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
        var v = Math.sin(i * 1.7 + s * 0.9) * Math.cos(j * 1.3 + s * 0.6);
        S[i][j] += amp * v;
      }
    }
    if (step > 4) needleResidue = Math.pow(0.85, step - 5);
    else if (step === 4) needleResidue = 1;
    var smax = 1.4;
    for (i = 0; i < 4; i++) {
      for (j = 0; j < 4; j++) {
        var val = S[i][j];
        var a = Math.min(Math.abs(val) / smax, 1);
        animG.appendChild(el("rect", {
          x: MX + j * MC, y: MY + i * MC, width: MC - 2, height: MC - 2, rx: 2,
          fill: val >= 0 ? "rgba(26,127,55," + (0.1 + 0.7 * a).toFixed(3) + ")" : "rgba(207,34,46," + (0.1 + 0.7 * a).toFixed(3) + ")",
          stroke: "none"
        }));
      }
    }
    /* KV cache 对照：已写入的 token 全亮 */
    for (var k = 0; k < 8; k++) {
      var on = k < step;
      animG.appendChild(el("rect", {
        x: KX + (k % 4) * 24, y: MY + Math.floor(k / 4) * 30, width: 20, height: 24, rx: 2,
        fill: on ? (k === 4 ? "var(--accent)" : "var(--viz-b)") : "var(--bg-soft)",
        stroke: "var(--border)", "stroke-width": 0.6, opacity: on ? 0.9 : 1
      }));
    }
    /* 时间步高亮 */
    for (k = 0; k < 8; k++) {
      if (k === step - 1 || (step === 0 && k === 0)) {
        animG.appendChild(el("rect", { x: TX0 + k * 40, y: MY + 26, width: 30, height: 30, rx: 3, fill: "none", stroke: k === 4 ? "var(--accent)" : "var(--viz-b)", "stroke-width": 2 }));
      }
    }
    /* 读数 */
    var attnPct = step > 0 ? 100 : 0;
    animG.appendChild(text(36, 420, "已写入 " + step + "/8 步", { "font-size": 11, fill: "var(--text)" }));
    animG.appendChild(text(36, 438, "针的残留能量：" + Math.round(needleResidue * 100) + "%（被后续写入稀释）", { "font-size": 11, fill: "var(--accent)", "font-weight": step >= 5 ? "bold" : "normal" }));
    animG.appendChild(text(36, 456, "注意力 KV cache 检索针：精确回放 " + attnPct + "%", { "font-size": 11, fill: "var(--viz-b)" }));
    animG.appendChild(text(340, 438, step >= 5 ? "→ 检索差距 = " + (100 - Math.round(needleResidue * 100)) + " 个百分点：这就是线性注意力的瓶颈" : "→ 写入越过针之后，看残留如何衰减", { "font-size": 11, fill: "var(--text-soft)" }));
  }

  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 递推写入 8 个 token"; return; }
    step = 0;
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(function () {
      step++;
      render();
      if (step >= 8) { clearInterval(timer); timer = null; playBtn.textContent = "▶ 递推写入 8 个 token"; }
    }, 650);
  });
  lenIn.addEventListener("input", render);
  render();
})();
