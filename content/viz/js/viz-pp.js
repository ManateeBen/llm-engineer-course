/* viz-pp：1F1B / AFAB 时序网格（A 类）
 * 时钟步 t：每格一个 micro-batch 的前向或反向。
 * AFAB：设备 i 先做所有 F 再做所有 B。
 * 1F1B：设备 i 先做 (p-1-i) 次预热 F，然后 F/B 交替。
 * 在飞激活：AFAB = m，1F1B = min(m, p-i)（设备 i）。
 */
(function () {
  var root = document.getElementById("viz-pp");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#pp-static");
  var animG = root.querySelector("#pp-anim");

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

  var P_OPTS = [2, 4, 6, 8];
  var M_OPTS = [4, 8, 16, 32, 64];

  var iP = root.querySelector("#pp-p");
  var iM = root.querySelector("#pp-m");
  var iMode = root.querySelector("#pp-mode");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 20, "设备 \\ 时钟步", { "font-size": 11, fill: "var(--muted)" }));
  }

  function schedule(p, m, mode) {
    // 返回 rows[p][t] = 0 空 / 1 F / 2 B
    if (mode === 1) {
      // AFAB：F 阶段 t = i + j (j<m)；B 阶段 t = m + i + j
      var T1 = 2 * (m + p - 1), rows = [];
      for (var i = 0; i < p; i++) {
        var r = new Array(T1).fill(0);
        for (var j = 0; j < m; j++) { r[i + j] = 1; r[m + i + j] = 2; }
        rows.push(r);
      }
      return { rows: rows, T: T1, inflight: m };
    }
    // 1F1B（Megatron flush 风格简化）
    var T0 = 2 * (m + p - 1), rows0 = [];
    for (var i2 = 0; i2 < p; i2++) {
      var r2 = [];
      for (var t = 0; t < T0; t++) r2.push(0);
      // 构造该设备的事件序列：warmup (p-1-i) 个 F，然后交替 F/B，最后 flush B
      var events = [];
      var warm = Math.min(p - 1 - i2, m);
      var fleft = m, bleft = 0;
      for (var k = 0; k < warm; k++) { events.push(1); fleft--; bleft++; }
      while (fleft > 0) { events.push(1); fleft--; events.push(2); bleft--; }
      while (bleft > 0) { events.push(2); bleft--; }
      // 摆放：从 t = i2 开始找连续空位
      var pos = i2;
      for (var e = 0; e < events.length; e++) {
        while (r2[pos] !== 0) pos++;
        r2[pos] = events[e];
        pos++;
      }
      rows0.push(r2);
    }
    return { rows: rows0, T: T0, inflight: Math.min(m, p) };
  }

  function draw() {
    textLayer = animG;
    var p = P_OPTS[+iP.value], m = M_OPTS[+iM.value];
    var mode = +iMode.value;
    root.querySelector("#pp-p-val").textContent = p;
    root.querySelector("#pp-m-val").textContent = m;
    root.querySelector("#pp-mode-val").textContent = mode === 1 ? "朴素 AFAB" : "1F1B";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var sch = schedule(p, m, mode);
    var x0 = 100, y0 = 40, cw, ch = 22;
    cw = Math.min(16, 520 / sch.T);
    for (var i = 0; i < p; i++) {
      animG.appendChild(text(x0 - 8, y0 + i * (ch + 3) + ch / 2 + 4, "D" + i, { "font-size": 11, "text-anchor": "end", fill: "var(--muted)" }));
      for (var t = 0; t < sch.T; t++) {
        var v = sch.rows[i][t];
        var color = v === 1 ? "#4a7dbd" : v === 2 ? "#d0873a" : "#bbb";
        animG.appendChild(el("rect", {
          x: x0 + t * (cw + 1), y: y0 + i * (ch + 3), width: cw, height: ch,
          fill: color, opacity: v === 0 ? 0.35 : 0.9, rx: 2
        }));
      }
    }
    // 图例
    var ly = y0 + p * (ch + 3) + 16;
    animG.appendChild(el("rect", { x: x0, y: ly, width: 12, height: 12, fill: "#4a7dbd", rx: 2 }));
    animG.appendChild(text(x0 + 16, ly + 10, "前向 F", { "font-size": 11, fill: "var(--fg)" }));
    animG.appendChild(el("rect", { x: x0 + 80, y: ly, width: 12, height: 12, fill: "#d0873a", rx: 2 }));
    animG.appendChild(text(x0 + 96, ly + 10, "反向 B", { "font-size": 11, fill: "var(--fg)" }));
    animG.appendChild(el("rect", { x: x0 + 160, y: ly, width: 12, height: 12, fill: "#bbb", opacity: 0.35, rx: 2 }));
    animG.appendChild(text(x0 + 176, ly + 10, "气泡", { "font-size": 11, fill: "var(--fg)" }));

    // 统计
    var bubble = (p - 1) / (m + p - 1);
    animG.appendChild(text(x0, ly + 34, "气泡率 = " + (p - 1) + "/" + (m + p - 1) + " = " + (bubble * 100).toFixed(1) + "%（两种调度相同）", { "font-size": 12, fill: "var(--fg)" }));
    animG.appendChild(text(x0, ly + 54, "在飞激活 = " + sch.inflight + " 份" + (mode === 1 ? "（随 m 线性涨！）" : "（封顶，与 m 解耦）"), { "font-size": 12, fill: mode === 1 ? "#c33" : "#2a7a3a", "font-weight": "bold" }));
  }

  drawStatic();
  draw();
  iP.addEventListener("input", draw);
  iM.addEventListener("input", draw);
  iMode.addEventListener("input", draw);
})();
