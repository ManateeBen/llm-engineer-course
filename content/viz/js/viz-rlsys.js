/* viz-rlsys：RL 训练循环的速率失配（B 类）
 * 三种部署：0 分群 1:1、1 分群按耗时比、2 colocated。
 * U = (n_t·T_t + n_g·T_g) / ((n_t+n_g)·max(T_t,T_g))。承 6-6 §3~§4。
 */
(function () {
  var root = document.getElementById("viz-rlsys");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#rlsys-static");
  var animG = root.querySelector("#rlsys-anim");

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

  var R_OPTS = [1, 2, 5, 8, 10];
  var MODES = ["分群 1:1", "分群按耗时比", "colocated"];

  var iR = root.querySelector("#rlsys-r");
  var iMode = root.querySelector("#rlsys-mode");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 20, "一轮 RL 循环的时序（绿=生成，蓝=训练，灰=空转）", { "font-size": 12, fill: "var(--muted)" }));
  }

  function bar(y, h, segs, x0, x1) {
    // segs: [{frac, color}]
    var cx = x0, span = x1 - x0;
    for (var i = 0; i < segs.length; i++) {
      var w = segs[i].frac * span;
      animG.appendChild(el("rect", { x: cx, y: y, width: w, height: h, fill: segs[i].c, opacity: 0.85, rx: 2 }));
      cx += w;
    }
  }

  function draw() {
    textLayer = animG;
    var r = R_OPTS[+iR.value];
    var mode = +iMode.value;
    root.querySelector("#rlsys-r-val").textContent = r;
    root.querySelector("#rlsys-mode-val").textContent = MODES[mode];
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var x0 = 40, x1 = 600, y0 = 60;
    var G = "#2a7a3a", T = "#4a7dbd", IDLE = "#bbb";

    if (mode === 2) {
      // colocated：全体先共同生成（全卡），再共同训练
      var fracG = r / (r + 1), fracT = 1 / (r + 1);
      bar(y0, 30, [{ frac: fracG, c: G }, { frac: fracT, c: T }], x0, x1);
      animG.appendChild(text(x0, y0 + 50, "colocated：全体先一起生成再一起训练，U = 100%（无空转），", { "font-size": 11, fill: "var(--muted)" }));
      animG.appendChild(text(x0, y0 + 68, "代价是每步引擎切换开销 + 显存分时（6-6 §2）。", { "font-size": 11, fill: "var(--muted)" }));
    } else {
      var nt = mode === 0 ? 0.5 : r / (r + 1);
      var ng = 1 - nt;
      // 训练侧卡时间线：训练 T_t，然后空转等生成；生成侧：生成 T_g，然后空转
      var Tt = 1, Tg = r;
      var cycle = Math.max(Tt, Tg);
      var tFrac = Tt / cycle, gFrac = Tg / cycle;
      animG.appendChild(text(x0, y0 - 8, "训练侧（" + Math.round(nt * 100) + "% 卡）", { "font-size": 11, fill: "var(--muted)" }));
      bar(y0, 30, [{ frac: tFrac, c: T }, { frac: 1 - tFrac, c: IDLE }], x0, x1);
      animG.appendChild(text(x0, y0 + 78, "生成侧（" + Math.round(ng * 100) + "% 卡）", { "font-size": 11, fill: "var(--muted)" }));
      bar(y0 + 90, 30, [{ frac: gFrac, c: G }, { frac: 1 - gFrac, c: IDLE }], x0, x1);
      var U = (nt * Tt + ng * Tg) / ((nt + ng) * cycle);
      animG.appendChild(text(x0, y0 + 170, "利用率 U = " + (U * 100).toFixed(0) + "%", { "font-size": 14, fill: U > 0.9 ? "#2a7a3a" : "#c33", "font-weight": "bold" }));
      animG.appendChild(text(x0, y0 + 192, mode === 0
        ? "1:1 分群：训练侧空转严重——卡的配比没跟上耗时比。"
        : "按耗时比配卡：两侧几乎同时完工，U→100%。", { "font-size": 11, fill: "var(--muted)" }));
    }
    animG.appendChild(text(x0, y0 + 232, "绿=生成 rollout（带宽受限，8-0 §4）　蓝=训练（算力受限）　灰=空转", { "font-size": 11, fill: "var(--muted)" }));
    animG.appendChild(text(x0, y0 + 252, "权重同步在每个训练步后发生（图中省略）；同步越频繁，rollout 越在策略。", { "font-size": 11, fill: "var(--muted)" }));
  }

  drawStatic();
  draw();
  iR.addEventListener("input", draw);
  iMode.addEventListener("input", draw);
})();
