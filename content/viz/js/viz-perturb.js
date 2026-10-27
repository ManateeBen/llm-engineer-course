/* viz-perturb：参数扰动探针（B 类）
 * 蓝线：沿随机方向的 1D 损失切片（有起伏）
 * 橙线：解 θ₁ → 解 θ₂ 的连线（平缓，模式连通性）
 */
(function () {
  var root = document.getElementById("viz-perturb");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 340, PAD = { l: 56, r: 30, t: 30, b: 48 };
  var X0 = PAD.l, X1 = W - PAD.r, Y0 = H - PAD.b, Y1 = PAD.t;

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

  var eMin = -1.5, eMax = 1.5, lossMin = 0, lossMax = 3.2;
  function sx(e) { return X0 + (e - eMin) / (eMax - eMin) * (X1 - X0); }
  function sy(l) { return Y0 - (l - lossMin) / (lossMax - lossMin) * (Y0 - Y1); }

  var staticG = root.querySelector("#viz-pt-static");
  var dynG = root.querySelector("#viz-pt-dyn");

  /* 坐标 */
  var i;
  for (i = -1.5; i <= 1.501; i += 0.5) {
    staticG.appendChild(el("line", { x1: sx(i), y1: Y0, x2: sx(i), y2: Y1, stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(sx(i), Y0 + 18, i.toFixed(1), { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
  }
  for (i = 0; i <= 3.001; i += 0.5) {
    staticG.appendChild(el("line", { x1: X0, y1: sy(i), x2: X1, y2: sy(i), stroke: "var(--border)", "stroke-width": 0.5 }));
    staticG.appendChild(text(X0 - 8, sy(i) + 4, i.toFixed(1), { "text-anchor": "end", "font-size": 11, fill: "var(--text-soft)" }));
  }
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: "var(--text-soft)", "stroke-width": 1.2 }));
  staticG.appendChild(text((X0 + X1) / 2, H - 10, "扰动幅度 ε（θ + ε·δ）", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)" }));
  staticG.appendChild(text(14, (Y0 + Y1) / 2, "损失", { "text-anchor": "middle", "font-size": 12, fill: "var(--text-soft)", transform: "rotate(-90 14 " + (Y0 + Y1) / 2 + ")" }));

  /* 解的位置标记 */
  staticG.appendChild(el("circle", { cx: sx(0), cy: sy(0.15), r: 4, fill: "var(--viz-b)", stroke: "var(--bg)", "stroke-width": 1.5 }));
  staticG.appendChild(text(sx(0) + 8, sy(0.15) + 4, "解 θ₁（训练所得）", { "font-size": 11, fill: "var(--viz-b)" }));
  staticG.appendChild(el("circle", { cx: sx(1.2), cy: sy(0.15), r: 4, fill: "var(--viz-c)", stroke: "var(--bg)", "stroke-width": 1.5 }));
  staticG.appendChild(text(sx(1.2) + 8, sy(0.15) + 4, "解 θ₂（独立训练）", { "font-size": 11, fill: "var(--viz-c)" }));

  /* 曲线定义 */
  var seed = 1;
  function rand(s) {
    /* 确定性伪随机，保证"换方向"可复现 */
    var x = Math.sin(s * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function randLoss(e) {
    /* 沿随机方向的切片：基线 + 随机起伏 */
    var base = 0.15 + 0.35 * e * e;
    var bump = 0;
    for (var k = 1; k <= 4; k++) {
      bump += (rand(k * 10 + e * 7) - 0.5) * 0.9 / k;
    }
    return Math.min(lossMax, Math.max(lossMin, base + Math.abs(bump) + (e < -0.4 ? 0.25 * (-0.4 - e) * 2 : 0)));
  }
  function connLoss(e) {
    /* 两解连线：从 0.15 到 0.15，中间微鼓（平缓） */
    var t = (e - 0) / 1.2;
    return 0.15 + 0.18 * Math.sin(Math.PI * Math.max(0, Math.min(1, t))) + 0.05 * Math.abs(e) * 0.2;
  }

  var randPath = el("path", { fill: "none", stroke: "var(--viz-a)", "stroke-width": 2.2 });
  var connPath = el("path", { fill: "none", stroke: "var(--viz-c)", "stroke-width": 2.2, "stroke-dasharray": "6 4" });
  dynG.appendChild(randPath); dynG.appendChild(connPath);

  /* 图例 */
  dynG.appendChild(text(X1 - 10, Y1 + 14, "— 随机方向切片（有起伏）", { "text-anchor": "end", "font-size": 11, fill: "var(--viz-a)" }));
  dynG.appendChild(text(X1 - 10, Y1 + 30, "- - 两解连线（平缓通道）", { "text-anchor": "end", "font-size": 11, fill: "var(--viz-c)" }));

  /* 游标 */
  var vline = el("line", { y1: Y1, y2: Y0, stroke: "var(--text-soft)", "stroke-width": 0.8, "stroke-dasharray": "2 3" });
  var d1 = el("circle", { r: 4.5, fill: "var(--viz-a)", stroke: "var(--bg)", "stroke-width": 1.5 });
  var d2 = el("circle", { r: 4.5, fill: "var(--viz-c)", stroke: "var(--bg)", "stroke-width": 1.5 });
  dynG.appendChild(vline); dynG.appendChild(d1); dynG.appendChild(d2);

  function drawCurves() {
    var d1s = "", d2s = "";
    for (var e = eMin; e <= eMax + 1e-9; e += 0.02) {
      d1s += (d1s ? " L" : "M") + sx(e).toFixed(1) + " " + sy(randLoss(e)).toFixed(1);
      d2s += (d2s ? " L" : "M") + sx(e).toFixed(1) + " " + sy(connLoss(e)).toFixed(1);
    }
    randPath.setAttribute("d", d1s);
    connPath.setAttribute("d", d2s);
  }

  var slider = root.querySelector("#viz-pt-eps");
  var epsVal = root.querySelector("#viz-pt-epsval");
  var status = root.querySelector("#viz-pt-status");

  function update() {
    var e = parseFloat(slider.value);
    epsVal.textContent = e.toFixed(2);
    vline.setAttribute("x1", sx(e)); vline.setAttribute("x2", sx(e));
    d1.setAttribute("cx", sx(e)); d1.setAttribute("cy", sy(randLoss(e)));
    d2.setAttribute("cx", sx(e)); d2.setAttribute("cy", sy(connLoss(e)));
    status.textContent = "ε=" + e.toFixed(2) + "：随机切片 loss=" + randLoss(e).toFixed(2) +
      "，连线 loss=" + connLoss(e).toFixed(2) + " —— 连线处处更低更平";
  }

  root.querySelector("#viz-pt-rand").addEventListener("click", function () {
    seed = Math.floor(Math.random() * 10000) + 1;
    drawCurves();
    update();
  });
  slider.addEventListener("input", update);
  drawCurves();
  update();
})();
