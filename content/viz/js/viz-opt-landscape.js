/* viz-opt-landscape：狭长山谷三种优化器轨迹（A 类）
 * f(x,y) = 0.05x² + y²，起点 (4, 4)
 */
(function () {
  var root = document.getElementById("viz-opt-landscape");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 360, PAD = { l: 60, r: 30, t: 30, b: 46 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;
  var xMin = -6, xMax = 6, yMin = -6, yMax = 6;

  function sx(x) { return X0 + (x - xMin) / (xMax - xMin) * (X1 - X0); }
  function sy(y) { return Y0 - (y - yMin) / (yMax - yMin) * (Y0 - Y1); }
  function f(x, y) { return 0.05 * x * x + y * y; }
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

  var staticG = root.querySelector("#viz-opt-static");
  var animG = root.querySelector("#viz-opt-anim");

  /* 坐标轴 + 谷底线 */
  var gx, gy;
  for (gx = xMin; gx <= xMax; gx += 2) {
    staticG.appendChild(el("line", { x1: sx(gx), y1: Y0, x2: sx(gx), y2: Y1, stroke: "var(--border)", "stroke-width": 0.4 }));
  }
  for (gy = yMin; gy <= yMax; gy += 2) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(gy), x2: X1, y2: sy(gy), stroke: "var(--border)", "stroke-width": 0.4 }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: sy(0), x2: X1, y2: sy(0), stroke: "var(--text-soft)", "stroke-width": 1 }));
  staticG.appendChild(el("line", { x1: sx(0), y1: Y0, x2: sx(0), y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1 }));
  /* 等高线：f = c 的椭圆 */
  [0.5, 2, 5, 10, 20, 30].forEach(function (c) {
    var d = "";
    var rx = Math.sqrt(c / 0.05), ry = Math.sqrt(c);
    if (rx > 12 || ry > 12) return;
    for (var a = 0; a <= 360; a += 4) {
      var rad = a * Math.PI / 180;
      var px = sx(rx * Math.cos(rad)), py = sy(ry * Math.sin(rad));
      d += (d ? " L" : "M") + px.toFixed(1) + " " + py.toFixed(1);
    }
    d += " Z";
    staticG.appendChild(el("path", { d: d, fill: "none", stroke: "var(--text-soft)", "stroke-width": 0.6, opacity: 0.45 }));
  });
  staticG.appendChild(text(X1 - 8, sy(0) - 6, "谷底 (0,0)", { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(text(X0 - 8, Y0 + 16, "x", { "text-size": 11, "font-size": 11, fill: "var(--text-soft)" }));

  var status = root.querySelector("#viz-opt-status");
  var timer = null;

  function clearAnim() {
    while (animG.firstChild) animG.removeChild(animG.firstChild);
  }

  /* 三种优化器，各跑 40 步 */
  function runOpt(kind) {
    clearAnim();
    var x = 4, y = 4, t = 0;
    var vx = 0, vy = 0;      /* 动量 */
    var mx = 0, my = 0, vxx = 0, vyy = 0; /* Adam 一二阶矩 */
    var eta = 0.35, beta = 0.9, b1 = 0.9, b2 = 0.999;
    var pts = [{ x: x, y: y }];
    for (var step = 0; step < 40; step++) {
      var gx_ = 0.1 * x, gy_ = 2 * y;
      if (kind === "sgd") {
        x -= eta * gx_; y -= eta * gy_;
      } else if (kind === "mom") {
        vx = beta * vx + gx_; vy = beta * vy + gy_;
        x -= eta * vx; y -= eta * vy;
      } else {
        t++;
        mx = b1 * mx + (1 - b1) * gx_; my = b1 * my + (1 - b1) * gy_;
        vxx = b2 * vxx + (1 - b2) * gx_ * gx_; vyy = b2 * vyy + (1 - b2) * gy_ * gy_;
        var mhx = mx / (1 - Math.pow(b1, t)), mhy = my / (1 - Math.pow(b1, t));
        var vhx = vxx / (1 - Math.pow(b2, t)), vhy = vyy / (1 - Math.pow(b2, t));
        x -= eta * mhx / (Math.sqrt(vhx) + 1e-8);
        y -= eta * mhy / (Math.sqrt(vhy) + 1e-8);
      }
      pts.push({ x: x, y: y });
    }
    /* 动画绘制 */
    var color = kind === "sgd" ? "var(--viz-a)" : kind === "mom" ? "var(--viz-b)" : "var(--viz-c)";
    var path = el("path", { fill: "none", stroke: color, "stroke-width": 2, opacity: 0.9 });
    animG.appendChild(path);
    var dot = el("circle", { r: 5, fill: color, stroke: "var(--bg)", "stroke-width": 2 });
    animG.appendChild(dot);
    var startMark = el("circle", { cx: sx(4), cy: sy(4), r: 4, fill: "none", stroke: "var(--text-soft)", "stroke-width": 1.5 });
    animG.appendChild(startMark);
    animG.appendChild(text(sx(4) + 8, sy(4) - 6, "起点", { "font-size": 11, fill: "var(--text-soft)" }));

    var i = 1;
    function frame() {
      if (i >= pts.length) {
        var last = pts[pts.length - 1];
        status.textContent = (kind === "sgd" ? "SGD" : kind === "mom" ? "动量" : "Adam") +
          " 40 步后：x=" + last.x.toFixed(2) + ", y=" + last.y.toFixed(2) + ", loss=" + f(last.x, last.y).toFixed(4);
        return;
      }
      var d = "";
      for (var k = 0; k <= i; k++) {
        d += (d ? " L" : "M") + sx(pts[k].x).toFixed(1) + " " + sy(pts[k].y).toFixed(1);
      }
      path.setAttribute("d", d);
      dot.setAttribute("cx", sx(pts[i].x)); dot.setAttribute("cy", sy(pts[i].y));
      status.textContent = (kind === "sgd" ? "SGD" : kind === "mom" ? "动量" : "Adam") +
        " 第 " + i + " 步：loss = " + f(pts[i].x, pts[i].y).toFixed(4);
      i++;
      timer = setTimeout(frame, 60);
    }
    clearTimeout(timer);
    frame();
  }

  root.querySelector("#viz-opt-sgd").addEventListener("click", function () { runOpt("sgd"); });
  root.querySelector("#viz-opt-mom").addEventListener("click", function () { runOpt("mom"); });
  root.querySelector("#viz-opt-adam").addEventListener("click", function () { runOpt("adam"); });
  root.querySelector("#viz-opt-reset").addEventListener("click", function () {
    clearTimeout(timer);
    clearAnim();
    status.textContent = "从 (4,4) 出发，选一个优化器";
  });
  status.textContent = "从 (4,4) 出发，选一个优化器";
})();
