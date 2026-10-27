/* viz-gd：梯度下降交互（A 类）
 * f(x)=x²，从 x=3 出发；x_{k+1} = x_k − η·2x_k = (1−2η)x_k
 * 滑杆 η ∈ [0, 2.5]；η>1 时展示发散。
 */
(function () {
  var root = document.getElementById("viz-gd");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 340, PAD = { l: 54, r: 30, t: 26, b: 46 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var xMin = -6, xMax = 6, yMax = 36;

  function sx(x) { return X0 + (x - xMin) / (xMax - xMin) * (X1 - X0); }
  function sy(y) { return Y0 - Math.min(y, yMax) / yMax * (Y0 - Y1); }
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

  /* 静态层：坐标轴 + f(x)=x² 曲线 */
  var staticG = root.querySelector("#viz-gd-static");
  var gx, gy;
  for (gx = xMin; gx <= xMax; gx += 2) {
    staticG.appendChild(el("line", { x1: sx(gx), y1: Y0, x2: sx(gx), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(gx), Y0 + 18, String(gx), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (gy = 0; gy <= yMax; gy += 6) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(gy) + 4, String(gy), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 8, "旋钮位置 x", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(16, (Y0 + Y1) / 2, "损失 f(x)=x²", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 16 " + (Y0 + Y1) / 2 + ")" }));
  var d = "";
  for (var px = -6; px <= 6.0001; px += 0.05) {
    d += (d ? " L" : "M") + sx(px).toFixed(1) + " " + sy(px * px).toFixed(1);
  }
  staticG.appendChild(el("path", { d: d, fill: "none", stroke: "var(--text-soft)", "stroke-width": 1.6 }));
  staticG.appendChild(text(sx(5.6), sy(5.6 * 5.6) - 8, "f(x)=x²", { "font-size": 12, fill: "var(--text-soft)" }));

  /* 动画层 */
  var animG = root.querySelector("#viz-gd-anim");
  var slider = root.querySelector("#viz-gd-eta");
  var etaVal = root.querySelector("#viz-gd-etaval");
  var status = root.querySelector("#viz-gd-status");

  var x = 3, iter = 0, pathD = "", timer = null, playing = false;
  var trail = el("path", { fill: "none", stroke: "var(--accent)", "stroke-width": 1.6, "stroke-dasharray": "2 3", opacity: 0.8 });
  var dot = el("circle", { r: 6, fill: "var(--accent)", stroke: "var(--bg)", "stroke-width": 2 });
  animG.appendChild(trail);
  animG.appendChild(dot);

  function render() {
    trail.setAttribute("d", pathD);
    dot.setAttribute("cx", sx(x));
    dot.setAttribute("cy", sy(x * x));
    etaVal.textContent = parseFloat(slider.value).toFixed(2);
  }

  function reset() {
    pause();
    x = 3; iter = 0; pathD = "";
    while (animG.childElementCount > 2) animG.removeChild(animG.lastChild);
    pathD = "M" + sx(3).toFixed(1) + " " + sy(9).toFixed(1);
    render();
    status.textContent = "起点 x=3，f=9";
  }

  function step() {
    var eta = parseFloat(slider.value);
    var xNew = (1 - 2 * eta) * x;
    iter++;
    /* 轨迹只画范围内的部分；发散时标注 */
    if (Math.abs(xNew) <= 6.5) {
      pathD += " L" + sx(Math.max(-6, Math.min(6, xNew))).toFixed(1) + " " + sy(Math.min(xNew * xNew, yMax)).toFixed(1);
    }
    x = xNew;
    render();
    if (Math.abs(x) > 6.5) {
      status.textContent = "第 " + iter + " 步：|x|=" + Math.abs(x).toFixed(2) + " 已飞出画面 —— 发散！(η>1)";
      pause();
      return;
    }
    if (Math.abs(x) < 0.01 || iter >= 60) {
      status.textContent = "第 " + iter + " 步收敛到 x≈" + x.toFixed(4) + "，f≈" + (x * x).toFixed(6) + "（谷底）";
      pause();
      return;
    }
    status.textContent = "第 " + iter + " 步：x=" + x.toFixed(4) + "，f=" + (x * x).toFixed(4);
  }

  function play() {
    if (playing) return;
    if (Math.abs(x) > 6.5 || iter >= 60) { reset(); }
    playing = true;
    root.querySelector("#viz-gd-play").textContent = "⏸ 暂停";
    timer = setInterval(step, 420);
  }
  function pause() {
    playing = false;
    clearInterval(timer);
    root.querySelector("#viz-gd-play").textContent = "▶ 播放";
  }

  root.querySelector("#viz-gd-play").addEventListener("click", function () { if (playing) pause(); else play(); });
  root.querySelector("#viz-gd-reset").addEventListener("click", reset);
  slider.addEventListener("input", function () {
    etaVal.textContent = parseFloat(slider.value).toFixed(2);
    if (parseFloat(slider.value) > 1) {
      status.textContent = "η>1：每步跨过谷底，|x| 每步乘 |1−2η|>1 —— 将发散";
    }
  });
  reset();
})();
