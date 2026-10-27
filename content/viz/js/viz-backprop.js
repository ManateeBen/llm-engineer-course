/* viz-backprop：计算图反向传播动画（A 类）
 * 前向：c=a·b, d=c+1, L=d²
 * 反向：∂L/∂d=2d, ∂L/∂c=∂L/∂d×1, ∂L/∂a=∂L/∂c×b, ∂L/∂b=∂L/∂c×a
 */
(function () {
  var root = document.getElementById("viz-backprop");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 640, H = 320;

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

  var staticG = root.querySelector("#viz-bp-static");
  var animG = root.querySelector("#viz-bp-anim");

  /* 节点布局 */
  var NODES = {
    a: { x: 70, y: 250, label: "a", leaf: true },
    b: { x: 70, y: 120, label: "b", leaf: true },
    c: { x: 250, y: 185, label: "c = a×b" },
    d: { x: 430, y: 185, label: "d = c+1" },
    L: { x: 570, y: 90, label: "L = d²" }
  };
  var EDGES = [
    { from: "a", to: "c", op: "×b", rev: "×b" },
    { from: "b", to: "c", op: "×a", rev: "×a" },
    { from: "c", to: "d", op: "+1", rev: "×1" },
    { from: "d", to: "L", op: "平方", rev: "×2d" }
  ];

  var nodeEls = {};
  var edgeEls = [];

  function drawGraph() {
    while (staticG.firstChild) staticG.removeChild(staticG.firstChild);
    edgeEls = [];
    EDGES.forEach(function (e) {
      var f = NODES[e.from], t = NODES[e.to];
      var line = el("line", {
        x1: f.x + 34, y1: f.y, x2: t.x - 44, y2: t.y,
        stroke: "var(--border)", "stroke-width": 1.6
      });
      staticG.appendChild(line);
      edgeEls.push(line);
      staticG.appendChild(text((f.x + t.x) / 2, (f.y + t.y) / 2 - 8, e.op, { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));
    });
    Object.keys(NODES).forEach(function (k) {
      var n = NODES[k];
      var g = el("g", {});
      var r = el("rect", {
        x: n.x - 34, y: n.y - 20, width: 68, height: 40, rx: 8,
        fill: n.leaf ? "var(--bg-soft)" : "var(--card)",
        stroke: n.leaf ? "var(--text-soft)" : "var(--accent)",
        "stroke-width": 1.5
      });
      g.appendChild(r);
      var lbl = text(n.x, n.y + 5, k, { "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--text)" });
      g.appendChild(lbl);
      var val = text(n.x, n.y + 34, "", { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" });
      g.appendChild(val);
      staticG.appendChild(g);
      nodeEls[k] = { g: g, val: val, rect: r };
    });
    /* 方向标注 */
    staticG.appendChild(text(70, 300, "← 输入（叶子）", { "font-size": 11, fill: "var(--text-soft)" }));
    staticG.appendChild(text(500, 300, "← 损失（终点）", { "font-size": 11, fill: "var(--text-soft)" }));
  }

  var aIn = root.querySelector("#viz-bp-a");
  var bIn = root.querySelector("#viz-bp-b");
  var status = root.querySelector("#viz-bp-status");
  var timer = null, playing = false;

  function getAB() {
    var a = parseFloat(aIn.value), b = parseFloat(bIn.value);
    if (!isFinite(a) || !isFinite(b)) { a = 2; b = 3; }
    return [a, b];
  }

  function compute() {
    var ab = getAB(), a = ab[0], b = ab[1];
    var c = a * b, d = c + 1, L = d * d;
    var gd = 2 * d, gc = gd * 1, ga = gc * b, gb = gc * a;
    return {
      a: a, b: b, c: c, d: d, L: L,
      gd: gd, gc: gc, ga: ga, gb: gb
    };
  }

  function showForward() {
    var v = compute();
    nodeEls.a.val.textContent = "= " + v.a;
    nodeEls.b.val.textContent = "= " + v.b;
    nodeEls.c.val.textContent = "= " + v.c;
    nodeEls.d.val.textContent = "= " + v.d;
    nodeEls.L.val.textContent = "= " + v.L;
    status.textContent = "前向完成：L = " + v.L + "。点「播放反向」看梯度回流。";
  }

  function highlight(key, on, color) {
    var n = nodeEls[key];
    if (n) n.rect.setAttribute("stroke", on ? color : (NODES[key].leaf ? "var(--text-soft)" : "var(--accent)"));
  }

  function playBackward() {
    if (playing) return;
    playing = true;
    var v = compute();
    root.querySelector("#viz-bp-play").textContent = "播放中…";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var seq = [
      { key: "L", txt: "L=d² 的局部坡度：2d = " + v.gd, g: v.gd },
      { key: "d", txt: "d=c+1 局部坡度 ×1：∂L/∂c = " + v.gd + "×1 = " + v.gc, g: v.gc },
      { key: "c", txt: "c=a×b：∂L/∂a = " + v.gc + "×b = " + v.ga + "；∂L/∂b = " + v.gc + "×a = " + v.gb, g: v.gc }
    ];
    var i = 0;
    function nextFrame() {
      if (i >= seq.length) {
        playing = false;
        root.querySelector("#viz-bp-play").textContent = "▶ 播放反向";
        status.textContent = "反向完成：∂L/∂a=" + v.ga + "，∂L/∂b=" + v.gb + "。改 a/b 再放一次，看责任分配变化。";
        return;
      }
      var s = seq[i];
      Object.keys(nodeEls).forEach(function (k) { highlight(k, false, ""); });
      highlight(s.key, true, "var(--warn)");
      if (i === 2) { highlight("a", true, "var(--warn)"); highlight("b", true, "var(--warn)"); }
      status.textContent = s.txt;
      i++;
      timer = setTimeout(nextFrame, 1400);
    }
    nextFrame();
  }

  function reset() {
    playing = false;
    clearTimeout(timer);
    root.querySelector("#viz-bp-play").textContent = "▶ 播放反向";
    while (animG.firstChild) animG.removeChild(animG.firstChild);
    Object.keys(nodeEls).forEach(function (k) { highlight(k, false, ""); });
    showForward();
  }

  root.querySelector("#viz-bp-play").addEventListener("click", playBackward);
  root.querySelector("#viz-bp-reset").addEventListener("click", reset);
  [aIn, bIn].forEach(function (inp) {
    inp.addEventListener("input", function () {
      playing = false;
      clearTimeout(timer);
      while (animG.firstChild) animG.removeChild(animG.firstChild);
      Object.keys(nodeEls).forEach(function (k) { highlight(k, false, ""); });
      showForward();
    });
  });

  drawGraph();
  showForward();
})();
