/* viz-stability：五类 loss 异常诊断 + 自动回滚（A 类，卡片点击 + 播放动画）
 * 左：5 张可点击卡片（五类异常）；右：选中类型的曲线 + 成因 + 处置。
 * 播放：stable → spike → 检测 → 回滚到前 checkpoint → 跳过坏 batch → 恢复。
 */
(function () {
  var root = document.getElementById("viz-stability");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#st-static");
  var animG = root.querySelector("#st-anim");

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

  var TYPES = [
    { id: 0, name: "① 平滑上升 divergence", cause: "学习率过高 / 梯度爆炸 / 初始化失效", fix: "降 LR、开梯度裁剪、查 RMSNorm 与初始化" },
    { id: 1, name: "② 孤立尖峰 spike", cause: "离群 batch / 污染样本 / tokenizer bug 触发瞬时大梯度", fix: "回滚前 checkpoint + 跳过坏 batch（非重训）" },
    { id: 2, name: "③ 平台卡死 plateau", cause: "过早衰减到 η_min / warmup 不足 / 数据重复度高", fix: "检查 LR 曲线对齐、补 warmup、降重复度" },
    { id: 3, name: "④ 缓慢漂移 drift", cause: "流式数据混入低质源 / 优化器状态腐败 / 静默精度丢失", fix: "时间窗滑动平均监控趋势、查数据管道" },
    { id: 4, name: "⑤ 静默不收敛 silent", cause: "数据 bug / mask 写错 / 并行丢梯度（数字正常能力零）", fix: "每 checkpoint 跑下游探针，为零即拦截" }
  ];

  var sel = 1;
  var CX = 24, CY = 44, CW = 300, CH = 64, CG = 8;
  var PX = 348, PY = 50, PW = 270, PH = 200; // 曲线面板

  function lossCurve(type, x0, y0, w, h) {
    // 生成损失曲线点（t 0..1 -> loss）
    var pts = [];
    for (var i = 0; i <= 100; i++) {
      var t = i / 100, v;
      var base = 3.0 - 2.2 * (1 - Math.exp(-3 * t)); // 平滑下降到 ~0.8
      switch (type) {
        case 0: v = 0.8 + 4.5 * Math.max(0, t - 0.55) * (t - 0.55); break; // 后段飙升
        case 1: v = base + (t > 0.5 && t < 0.54 ? 9 * (1 - Math.abs(t - 0.52) / 0.02) : 0); break; // 尖峰
        case 2: v = 3.0 - 1.0 * (1 - Math.exp(-3 * t)); break; // 早停平台（降得少）
        case 3: v = base + 0.6 * t; break; // 缓慢抬升
        case 4: v = base; break; // 看起来正常
        default: v = base;
      }
      pts.push([x0 + t * w, y0 + h - (v / 6.0) * h]);
    }
    return pts;
  }

  function drawCards() {
    staticG.innerHTML = "";
    TYPES.forEach(function (tp, i) {
      var y = CY + i * (CH + CG);
      var rect = el("rect", { x: CX, y: y, width: CW, height: CH, rx: 5, fill: i === sel ? "var(--accent)" : "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9, style: "cursor:pointer" });
      rect.addEventListener("click", function () { sel = i; render(); });
      staticG.appendChild(rect);
      staticG.appendChild(text(CX + 12, y + 22, tp.name, { "font-size": 11, "font-weight": "bold", fill: i === sel ? "var(--bg)" : "var(--text)" }));
      staticG.appendChild(text(CX + 12, y + 42, "成因：" + tp.cause, { "font-size": 8.5, fill: i === sel ? "var(--bg)" : "var(--text-soft)" }));
      staticG.appendChild(text(CX + 12, y + 56, "处置：" + tp.fix, { "font-size": 8.5, fill: i === sel ? "var(--bg)" : "var(--text-soft)" }));
    });
    staticG.appendChild(text(CX, CY - 14, "点击卡片查看（右侧为曲线 + 处置）", { "font-size": 10, fill: "var(--text-soft)" }));
  }

  function render() {
    drawCards();
    animG.innerHTML = "";
    var tp = TYPES[sel];
    // 曲线面板边框
    staticG.appendChild(el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 4, fill: "none", stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(text(PX, PY - 8, tp.name, { "font-size": 10.5, "font-weight": "bold", fill: "var(--text)" }));
    var pts = lossCurve(sel, PX, PY, PW, PH);
    var d = "";
    pts.forEach(function (p, i) { d += (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1) + " "; });
    animG.appendChild(el("path", { d: d, fill: "none", stroke: sel === 0 ? "var(--viz-danger)" : "var(--viz-b)", "stroke-width": 2 }));
    if (sel === 1) {
      // 标注尖峰
      var sp = pts[52];
      animG.appendChild(el("circle", { cx: sp[0], cy: sp[1], r: 4, fill: "var(--viz-danger)" }));
      animG.appendChild(text(sp[0] - 30, sp[1] + 16, "spike", { "font-size": 9, fill: "var(--viz-danger)" }));
    }
    if (sel === 4) {
      animG.appendChild(text(PX + 60, PY + PH - 16, "探针 = 0 ⚠", { "font-size": 10, "font-weight": "bold", fill: "var(--viz-danger)" }));
    }
    // 诊断结论
    animG.appendChild(el("rect", { x: PX, y: PY + PH + 14, width: PW, height: 70, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    animG.appendChild(text(PX + 10, PY + PH + 32, "成因：" + tp.cause, { "font-size": 9, fill: "var(--text)" }));
    animG.appendChild(text(PX + 10, PY + PH + 50, "处置：" + tp.fix, { "font-size": 9, fill: "var(--text)" }));
    animG.appendChild(text(PX + 10, PY + PH + 66, "诊断前置：grad norm / NaN 计数 / 吞吐（见 5-4）", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  /* 自动回滚动画 */
  var playBtn = root.querySelector("#st-play");
  var hintEl = root.querySelector("#st-hint");
  var playing = false;
  playBtn.addEventListener("click", function () {
    if (playing) return;
    playing = true;
    sel = 1; render();
    var steps = [
      { t: 0, msg: "稳定训练：loss 平滑下降…" },
      { t: 30, msg: "第 3 万步 grad norm 突涨 → 检测 spike" },
      { t: 52, msg: "loss 飙到峰值（坏 batch 触发）" },
      { t: 60, msg: "自动回滚到 2.9 万步干净 checkpoint" },
      { t: 78, msg: "跳过坏 batch 区间，降 LR×0.5 重试" },
      { t: 100, msg: "恢复：loss 回到轨道，分钟级而非重训" }
    ];
    var idx = 0;
    hintEl.textContent = steps[0].msg;
    var iv = setInterval(function () {
      idx++;
      if (idx >= steps.length) { clearInterval(iv); playing = false; hintEl.textContent = "回滚完成 ✓ 点击卡片继续查看其他异常"; return; }
      hintEl.textContent = steps[idx].msg;
      // 重画曲线面板上的进度标记
      animG.innerHTML = "";
      var pts = lossCurve(1, PX, PY, PW, PH);
      // 截断到当前进度
      var cut = Math.min(pts.length - 1, Math.floor(steps[idx].t / 100 * pts.length));
      var dd = "";
      for (var i = 0; i <= cut; i++) dd += (i === 0 ? "M" : "L") + pts[i][0].toFixed(1) + "," + pts[i][1].toFixed(1) + " ";
      animG.appendChild(el("path", { d: dd, fill: "none", stroke: "var(--viz-b)", "stroke-width": 2 }));
      // 回滚标记
      if (idx >= 3) {
        var rb = Math.floor(0.30 * pts.length);
        animG.appendChild(el("line", { x1: pts[rb][0], y1: PY, x2: pts[rb][0], y2: PY + PH, stroke: "var(--accent)", "stroke-width": 1.3, "stroke-dasharray": "4 3" }));
        animG.appendChild(text(pts[rb][0] + 2, PY + 12, "回滚点", { "font-size": 8.5, fill: "var(--accent)" }));
      }
      animG.appendChild(el("rect", { x: PX, y: PY + PH + 14, width: PW, height: 70, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
      animG.appendChild(text(PX + 10, PY + PH + 50, steps[idx].msg, { "font-size": 9, fill: "var(--text)" }));
    }, 900);
  });

  render();
})();
