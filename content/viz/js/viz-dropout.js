/* viz-dropout：Dropout 前后的训练/验证损失曲线（A 类）
 * 合成模型（定性正确）：训练 loss 随 p 上升（子网络集成需更多 epoch），
 * 泛化 gap 随 p 收缩。播放 = epoch 0→60 推进游标。
 */
(function () {
  var root = document.getElementById("viz-dropout");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 360, PAD = { l: 56, r: 16, t: 30, b: 46 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var EMAX = 60, YMAX = 0.65;

  function sx(e) { return X0 + e / EMAX * (X1 - X0); }
  function sy(v) { return Y0 - v / YMAX * (Y0 - Y1); }
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
  function lTr(e, p) { return 0.55 * Math.exp(-e / (9 + 13 * p)) + 0.03 + 0.22 * p * (1 - Math.exp(-e / 12)); }
  function lVal(e, p) { return lTr(e, p) + 0.5 * (1 - Math.exp(-e / 14)) * (1 - 0.85 * p); }

  /* 静态：坐标轴 */
  var staticG = root.querySelector("#viz-dropout-static");
  var gx, gy;
  for (gx = 0; gx <= EMAX; gx += 10) {
    staticG.appendChild(el("line", { x1: sx(gx), y1: Y0, x2: sx(gx), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(gx), Y0 + 16, String(gx), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (gy = 0; gy <= YMAX + 1e-9; gy += 0.2) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(gy) + 4, gy.toFixed(1), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 10, "epoch", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(14, (Y0 + Y1) / 2, "loss", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));
  staticG.appendChild(el("line", { x1: X1 - 132, y1: Y1 + 2, x2: X1 - 102, y2: Y1 + 2, stroke: "var(--accent)", "stroke-width": 2.2 }));
  staticG.appendChild(text(X1 - 96, Y1 + 6, "训练 loss", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(el("line", { x1: X1 - 132, y1: Y1 + 18, x2: X1 - 102, y2: Y1 + 18, stroke: "var(--bad)", "stroke-width": 2.2, "stroke-dasharray": "5 3" }));
  staticG.appendChild(text(X1 - 96, Y1 + 22, "验证 loss", { "font-size": 11, fill: "var(--text-soft)" }));

  var animG = root.querySelector("#viz-dropout-anim");
  var slider = root.querySelector("#viz-dropout-p");
  var pval = root.querySelector("#viz-dropout-pval");
  var playBtn = root.querySelector("#viz-dropout-play");
  var resetBtn = root.querySelector("#viz-dropout-reset");

  var epoch = 0, timer = null, playing = false;

  function curve(fn, upto, color, dash) {
    var d = "";
    for (var e = 0; e <= upto + 1e-9; e += 0.5) {
      d += (d ? " L" : "M") + sx(e).toFixed(1) + " " + sy(Math.min(fn(e, parseFloat(slider.value)), YMAX)).toFixed(1);
    }
    return el("path", { d: d, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-dasharray": dash || "none" });
  }

  function draw() {
    var p = parseFloat(slider.value);
    pval.textContent = p.toFixed(2);
    animG.textContent = "";
    /* gap 填充 */
    var area = "M" + sx(0) + " " + sy(lVal(0, p));
    for (var e = 0.5; e <= epoch + 1e-9; e += 0.5) {
      area += " L" + sx(e).toFixed(1) + " " + sy(lVal(e, p)).toFixed(1);
    }
    for (var e2 = epoch; e2 >= 0; e2 -= 0.5) {
      area += " L" + sx(e2).toFixed(1) + " " + sy(lTr(e2, p)).toFixed(1);
    }
    area += " Z";
    animG.appendChild(el("path", { d: area, fill: "var(--warn-soft)", stroke: "none", opacity: 0.7 }));
    animG.appendChild(curve(lVal, epoch, "var(--bad)", "5 3"));
    animG.appendChild(curve(lTr, epoch, "var(--accent)"));
    /* 游标 */
    if (epoch > 0) {
      var vTr = lTr(epoch, p), vVa = lVal(epoch, p);
      animG.appendChild(el("line", { x1: sx(epoch), y1: sy(vVa), x2: sx(epoch), y2: sy(vTr), stroke: "var(--warn)", "stroke-width": 1.4 }));
      animG.appendChild(el("circle", { cx: sx(epoch), cy: sy(vTr), r: 4.5, fill: "var(--accent)", stroke: "var(--bg)", "stroke-width": 2 }));
      animG.appendChild(el("circle", { cx: sx(epoch), cy: sy(vVa), r: 4.5, fill: "var(--bad)", stroke: "var(--bg)", "stroke-width": 2 }));
      animG.appendChild(text(sx(epoch) + 8, sy(vVa) + 4, "gap = " + (vVa - vTr).toFixed(3), { "font-size": 11, fill: "var(--warn)" }));
    }
    animG.appendChild(text(X0 + 6, Y1 + 26, "p = " + p.toFixed(2) +
      (p === 0 ? "：无正则，验证 loss 翘起 = 过拟合" :
        p >= 0.6 ? "：正则过强，训练 loss 都降不动" :
          "：验证曲线被压住，训练稍慢"),
      { "font-size": 12, fill: "var(--text)" }));
  }

  function step() {
    epoch += 1;
    if (epoch > EMAX) { pause(); return; }
    draw();
  }
  function play() {
    if (playing) return;
    if (epoch >= EMAX) epoch = 0;
    playing = true;
    playBtn.textContent = "⏸ 暂停";
    timer = setInterval(step, 90);
  }
  function pause() {
    playing = false;
    clearInterval(timer);
    playBtn.textContent = epoch >= EMAX ? "↻ 重放" : "▶ 训练";
  }

  playBtn.addEventListener("click", function () { if (playing) pause(); else play(); });
  resetBtn.addEventListener("click", function () {
    pause(); epoch = 0; playBtn.textContent = "▶ 训练"; draw();
  });
  slider.addEventListener("input", function () { epoch = EMAX; pause(); playBtn.textContent = "↻ 重放"; draw(); });
  draw();
})();
