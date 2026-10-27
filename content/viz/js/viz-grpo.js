/* viz-grpo：组内相对优势（B 类）
 * Â_i = (r_i − mean)/std，承 6-2 §1。
 */
(function () {
  var root = document.getElementById("viz-grpo");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#gp-static");
  var animG = root.querySelector("#gp-anim");

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

  var R = [0, 0, 1, 0, 1, 1, 0, 1]; // 初始奖励
  var iI = root.querySelector("#gp-i");
  var iR = root.querySelector("#gp-r");

  function stats(rr) {
    var m = rr.reduce(function (a, b) { return a + b; }, 0) / rr.length;
    var v = rr.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / rr.length;
    return { mean: m, std: Math.sqrt(v) };
  }

  function draw() {
    var idx = +iI.value;
    var r = parseFloat(iR.value);
    var rr = R.slice();
    rr[idx] = r;
    root.querySelector("#gp-i-val").textContent = "#" + (idx + 1);
    root.querySelector("#gp-r-val").textContent = r.toFixed(1);
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var st = stats(rr);
    var X0 = 70, W = 60, GAP = 10, YB = 130;
    text(30, 30, "原始奖励 r_i（0=错，1=对）", { "font-size": 12, fill: "var(--muted)" });
    for (var i = 0; i < 8; i++) {
      var x = X0 + i * (W + GAP);
      var h = rr[i] * 60;
      animG.appendChild(el("rect", { x: x, y: YB - h, width: W, height: Math.max(h, 2), rx: 3, fill: rr[i] > 0.5 ? "#3a9d8f" : "#c9c7bd" }));
      animG.appendChild(text(x + W / 2, YB + 16, "y" + (i + 1), { "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }));
      animG.appendChild(text(x + W / 2, YB - h - 6, rr[i].toFixed(1), { "font-size": 10, "text-anchor": "middle", fill: "var(--fg)" }));
    }
    // mean 线
    animG.appendChild(el("line", { x1: X0 - 10, y1: YB - st.mean * 60, x2: X0 + 8 * (W + GAP) - GAP + 10, y2: YB - st.mean * 60, stroke: "#d0873a", "stroke-width": 1.5, "stroke-dasharray": "5,3" }));
    text(X0 + 8 * (W + GAP) + 15, YB - st.mean * 60 + 4, "mean=" + st.mean.toFixed(3), { "font-size": 11, fill: "#d0873a" });

    // 优势条
    var Y2 = 210, H2 = 60;
    text(30, 178, "组内优势 Â_i = (r_i − mean) / std", { "font-size": 12, fill: "var(--muted)" });
    animG.appendChild(el("line", { x1: X0 - 10, y1: Y2 + H2 / 2, x2: X0 + 8 * (W + GAP) - GAP + 10, y2: Y2 + H2 / 2, stroke: "var(--fg)", "stroke-width": 1 }));
    var degenerate = st.std < 1e-9;
    for (var j = 0; j < 8; j++) {
      var x2 = X0 + j * (W + GAP);
      var a = degenerate ? 0 : (rr[j] - st.mean) / st.std;
      var hh = Math.abs(a) / 2 * H2;
      if (degenerate) hh = 1;
      var yTop = a >= 0 ? Y2 + H2 / 2 - hh : Y2 + H2 / 2;
      animG.appendChild(el("rect", { x: x2, y: yTop, width: W, height: Math.max(hh, 2), rx: 3, fill: degenerate ? "#c9c7bd" : (a >= 0 ? "#639922" : "#c33") }));
      if (!degenerate) animG.appendChild(text(x2 + W / 2, (a >= 0 ? yTop - 6 : yTop + Math.max(hh, 2) + 14), a.toFixed(2), { "font-size": 10, "text-anchor": "middle", fill: "var(--fg)" }));
    }
    text(30, Y2 + H2 + 30, degenerate
      ? "std=0：组内无区分度，所有 Â=0——本组无梯度（dynamic sampling 会丢弃这类 prompt）"
      : "std=" + st.std.toFixed(3) + "：绿色被 PPO 推高（加仓上限 1+ε），红色被压低（减仓下限 1−ε）；切换选中回答看均值如何带动全组",
      { "font-size": 11, fill: degenerate ? "#A32D2D" : "var(--muted)" });
    text(30, Y2 + H2 + 50, "GRPO 省掉 critic（16Ψ），代价是每 prompt 采 G 个（典型 16~64）——用采样算力换一个价值网络", { "font-size": 11, fill: "var(--muted)" });
  }

  draw();
  iI.addEventListener("input", draw);
  iR.addEventListener("input", draw);
})();
