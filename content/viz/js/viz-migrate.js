/* viz-migrate：迁移五步 + 误差沿层累积（C 类，双滑杆）
 * 总误差（最坏串联）： (1+ε)^L - 1 ≈ exp(Lε)-1
 * 含一个坏算子：      (1+ε)^(L-1) * (1+ε_bad) - 1
 */
(function () {
  var root = document.getElementById("viz-migrate");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mig-static");
  var animG = root.querySelector("#mig-anim");

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
  function box(x, y, w, h, fill) {
    return el("rect", { x: x, y: y, width: w, height: h, rx: 4, fill: fill, stroke: "var(--border)", "stroke-width": 0.9 });
  }
  function centerText(x, y, w, h, str, fs, fill) {
    var t = el("text", { x: x + w / 2, y: y + h / 2 + 4, "text-anchor": "middle", "font-size": fs || 9, fill: fill || "var(--text)" });
    t.textContent = str;
    return t;
  }

  var E_OPTS = [1e-5, 5e-5, 1e-4, 5e-4, 1e-3, 5e-3, 1e-2];
  var E_LABELS = ["1e-5", "5e-5", "1e-4", "5e-4", "1e-3", "5e-3", "1e-2"];
  var E_BAD = 1e-2;

  /* 五步流程 */
  var steps = [
    { n: "① 盘点", d: "profiling 拿耗时占比\n先查现成库", c: "var(--viz-a)" },
    { n: "② 替换", d: "L1→L2→L3 逐层上探\n保持双平台对照", c: "var(--viz-b)" },
    { n: "③ 精度对齐", d: "逐层对比 ε_rel / cos / KL\n固定确定性等级", c: "var(--viz-danger)" },
    { n: "④ 归因", d: "roofline 判区 → Cube 利用率\n→ 流水与同步 → 通信", c: "var(--viz-c)" },
    { n: "⑤ 回归", d: "双平台基线自动化\n代际维护责任人", c: "var(--viz-a)" }
  ];
  staticG.appendChild(text(20, 22, "迁移五步法（11-2 §4）", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
  var sx = 20, sw = 116, sh = 52, gap = 8;
  steps.forEach(function (s, i) {
    var x = sx + i * (sw + gap);
    staticG.appendChild(box(x, 34, sw, sh, s.c));
    var t1 = el("text", { x: x + sw / 2, y: 50, "text-anchor": "middle", "font-size": 9.5, "font-weight": "bold", fill: "var(--text)" });
    t1.textContent = s.n; staticG.appendChild(t1);
    s.d.split("\n").forEach(function (line, j) {
      var t2 = el("text", { x: x + sw / 2, y: 64 + j * 11, "text-anchor": "middle", "font-size": 8, fill: "var(--text)" });
      t2.textContent = line; staticG.appendChild(t2);
    });
    if (i < steps.length - 1) {
      staticG.appendChild(el("line", { x1: x + sw + 1, y1: 60, x2: x + sw + gap - 1, y2: 60, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
      staticG.appendChild(el("path", { d: "M" + (x + sw + gap - 4) + " 57 L" + (x + sw + gap) + " 60 L" + (x + sw + gap - 4) + " 63", fill: "none", stroke: "var(--text-soft)", "stroke-width": 1.2 }));
    }
  });

  staticG.appendChild(text(20, 118, "误差累积：(1+ε)^L − 1 ≈ exp(Lε) − 1", { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));

  function pct(v) { return (v * 100).toFixed(2) + "%"; }

  function draw(eps, L) {
    animG.innerHTML = "";
    var uniform = Math.pow(1 + eps, L) - 1;
    var withBad = Math.pow(1 + eps, L - 1) * (1 + E_BAD) - 1;
    var badOnly = E_BAD;                       // 坏算子单独贡献（一阶）
    var restOnly = Math.pow(1 + eps, L - 1) - 1; // 其余层单独贡献

    var rows = [
      { lab: "全部层为 ε = " + E_LABELS[E_OPTS.indexOf(eps)] + "（L=" + L + " 层）", v: uniform, c: "var(--viz-b)" },
      { lab: "其中一层换成坏算子 ε_bad = 1e-2", v: withBad, c: "var(--viz-danger)" }
    ];
    var maxV = Math.max(uniform, withBad, 1e-4);
    var bx = 30, bw = 380, bh = 30;
    rows.forEach(function (r, i) {
      var y = 136 + i * 48;
      animG.appendChild(text(bx, y - 5, r.lab, { "font-size": 9.5, fill: "var(--text-soft)" }));
      animG.appendChild(el("rect", { x: bx, y: y, width: bw, height: bh, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
      animG.appendChild(el("rect", { x: bx, y: y, width: Math.max(2, bw * (r.v / maxV)), height: bh, rx: 3, fill: r.c, opacity: 0.85 }));
      animG.appendChild(text(bx + bw + 10, y + bh - 9, pct(r.v), { "font-size": 10.5, "font-weight": "bold", fill: r.c }));
    });

    /* 贡献拆解 */
    var denom = badOnly + restOnly;
    animG.appendChild(el("rect", { x: 30, y: 234, width: 580, height: 62, rx: 4, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    animG.appendChild(text(42, 252, "一阶贡献拆解：坏算子 " + pct(badOnly) + "  vs  其余 " + (L - 1) + " 层合计 " + pct(restOnly), { "font-size": 9.5, fill: "var(--text)" }));
    var dw = 540, dx = 42, dy = 262;
    var wBad = dw * (badOnly / denom);
    animG.appendChild(el("rect", { x: dx, y: dy, width: wBad, height: 20, rx: 2, fill: "var(--viz-danger)", opacity: 0.85 }));
    animG.appendChild(el("rect", { x: dx + wBad, y: dy, width: dw - wBad, height: 20, rx: 2, fill: "var(--viz-b)", opacity: 0.7 }));
    if (wBad > 50) animG.appendChild(centerText(dx, dy, wBad, 20, "坏算子 " + (100 * badOnly / denom).toFixed(0) + "%", 9, "var(--text)"));
    if (dw - wBad > 60) animG.appendChild(centerText(dx + wBad, dy, dw - wBad, 20, "其余层 " + (100 * restOnly / denom).toFixed(0) + "%", 9, "var(--text)"));
    animG.appendChild(text(42, 292, "倍数：坏算子单独贡献 ≈ 其余 " + (L - 1) + " 层之和的 " + (badOnly / Math.max(restOnly, 1e-12)).toFixed(2) + " 倍；强度比 ε_bad/ε = " + (E_BAD / eps).toFixed(0) + " 倍（即一个坏算子抵 " + (E_BAD / eps).toFixed(0) + " 个正常层）", { "font-size": 9, fill: "var(--text-soft)" }));

    /* 结论 */
    var warn = uniform > 0.02;
    animG.appendChild(text(20, 322, warn
      ? "注意：即便「每层只有 " + E_LABELS[E_OPTS.indexOf(eps)] + "」这种看起来完美的对齐，" + L + " 层后总误差也到 " + pct(uniform) + "——验收阈值必须按层数折算，不能只看单层。"
      : "当前配置下总误差 " + pct(uniform) + "，在常见验收阈值内。但注意第二组：一个坏算子就能把它推到 " + pct(withBad) + "。",
      { "font-size": 9.5, fill: warn ? "var(--viz-danger)" : "var(--text)" }));
    animG.appendChild(text(20, 340, "工程含义：精度对齐要按层定位最大误差源——把那个 ε_bad 降一个量级，胜过把其余所有层再压一半。", { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(20, 358, "验收判据参考（承 11-2 §4 第三步）：隐藏层 ε_rel 不劣于 bf16 跨版本差异；logits cos>0.999；贪心解码前 K token 一致率；训练 loss 曲线偏差在噪声底内。", { "font-size": 8.5, fill: "var(--text-soft)" }));
    animG.appendChild(text(20, 372, "做对比前务必固定确定性等级（CANN 0/1/2），否则测到的差异里混着浮点归约顺序的噪声（承 8-8 §4）。", { "font-size": 8.5, fill: "var(--text-soft)" }));

    /* 底层：五步的真实工期分配提示 */
    animG.appendChild(el("rect", { x: 30, y: 388, width: 580, height: 40, rx: 4, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    animG.appendChild(text(42, 404, "工期经验：写代码 ≈ 3 成，精度对齐 + 性能归因 + 回归 ≈ 7 成。先建双平台对照环境，否则无法区分「平台差异」与「实现 bug」。", { "font-size": 9, fill: "var(--text)" }));
    animG.appendChild(text(42, 420, "「每个算子 2 人周 × 12 个」这类平均主义估工是最贵的排法——先盘点砍掉现成能覆盖的，再按耗时占比排序。", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var eEl = root.querySelector("#mig-e"), lEl = root.querySelector("#mig-l");
  var eVal = root.querySelector("#mig-e-val"), lVal = root.querySelector("#mig-l-val");
  function update() {
    var eps = E_OPTS[+eEl.value], L = +lEl.value;
    eVal.textContent = E_LABELS[+eEl.value];
    lVal.textContent = L;
    draw(eps, L);
  }
  [eEl, lEl].forEach(function (e) { e.addEventListener("input", update); });
  update();
})();
