/* viz-rm：过优化曲线（B 类）
 * U_gold(d)=α√d − κ_eff·d，κ_eff=κ/√n。承 6-3 §2。
 */
(function () {
  var root = document.getElementById("viz-rm");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#rm-static");
  var animG = root.querySelector("#rm-anim");

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var textLayer = staticG;
  function text(x, y, str, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    textLayer.appendChild(t);
    return t;
  }

  var KAPPA = [2.0, 1.0, 0.5]; // 差→好
  var NENS = [1, 4, 16];
  var ALPHA = 3.0;
  var X0 = 90, X1 = 560, Y0 = 320, Y1 = 70;
  var DMAX = 16;

  function sx(d) { return X0 + d / DMAX * (X1 - X0); }
  function sy(v) { return Y0 - (v + 1) / 6 * (Y0 - Y1); }

  var iK = root.querySelector("#rm-k");
  var iN = root.querySelector("#rm-n");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X1 + 15, y2: Y0, stroke: "var(--fg)", "stroke-width": 1 }));
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: "var(--fg)", "stroke-width": 1 }));
    text(X0, Y0 + 20, "0", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(sx(8), Y0 + 20, "8", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(X1 + 6, Y0 + 20, "16", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text((X0 + X1) / 2, Y0 + 38, "优化距离 d = E[KL(π‖π_ref)]（nats）", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
    text(X0 - 46, Y1, "效用", { "font-size": 11, fill: "var(--muted)" });
    text(X0 - 46, sy(0), "0", { "font-size": 10, fill: "var(--muted)" });
    // Gao 实测带
    staticG.appendChild(el("rect", { x: sx(9), y: Y1, width: sx(13) - sx(9), height: Y0 - Y1, fill: "#d0873a", opacity: 0.10 }));
    text(sx(11), Y1 - 4, "实测：KL 9~13 nats 后 gold 转平/下降", { "font-size": 10, "text-anchor": "middle", fill: "#854F0B" });
  }

  function draw() {
    textLayer = animG;
    var k = KAPPA[+iK.value];
    var n = NENS[+iN.value];
    var keff = k / Math.sqrt(n);
    root.querySelector("#rm-k-val").textContent = k.toFixed(1);
    root.querySelector("#rm-n-val").textContent = n;
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    function curve(fn, color, w, dash) {
      var pts = [];
      for (var i = 0; i <= 80; i++) {
        var d = DMAX * i / 80;
        pts.push([d, fn(d)]);
      }
      var dd = pts.map(function (p, i) { return (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1); }).join("");
      animG.appendChild(el("path", { d: dd, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": dash || "" }));
    }
    curve(function (d) { return ALPHA * Math.sqrt(d); }, "#888780", 1.5, "5,4"); // proxy
    curve(function (d) { return ALPHA * Math.sqrt(d) - keff * d; }, "#4a7dbd", 2.5); // gold

    var dstar = ALPHA * ALPHA / (4 * keff * keff);
    dstar = Math.min(dstar, DMAX);
    var ustar = ALPHA * Math.sqrt(dstar) - keff * dstar;
    animG.appendChild(el("circle", { cx: sx(dstar), cy: sy(ustar), r: 5, fill: "#d0873a", stroke: "#fff", "stroke-width": 1.5 }));
    animG.appendChild(el("line", { x1: sx(dstar), y1: sy(ustar), x2: sx(dstar), y2: Y0, stroke: "#d0873a", "stroke-width": 1, "stroke-dasharray": "3,3" }));
    text(30, 60, "最优停止点 d* = α²/(4κ²) = " + dstar.toFixed(1) + " nats，峰值效用 " + ustar.toFixed(2), { "font-size": 12, fill: "var(--fg)", "font-weight": "bold" });
    text(30, 80, "κ_eff = κ/√n = " + k.toFixed(1) + "/√" + n + " = " + keff.toFixed(2), { "font-size": 11, fill: "var(--muted)" });
    text(30, 98, "虚线=代理奖励（RM 视角，永远在涨）；实线=真实效用（∩ 形，先赚后亏）", { "font-size": 11, fill: "var(--muted)" });
    text(30, 350, "工程含义：把 d 当预算管——KL 监控超 d* 就停训/回滚；提升 RM（数据质量/集成/PRM）比调 RL 超参更能推迟崩溃点", { "font-size": 11, fill: "var(--muted)" });
  }

  drawStatic();
  draw();
  iK.addEventListener("input", draw);
  iN.addEventListener("input", draw);
})();
