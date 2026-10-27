/* viz-serving：前缀缓存策略 + KV cache 占用（C 类，三滑杆）
 * 上半：无缓存 / 块级前缀缓存 / 前缀树 的累计 prefill token 量
 *       - 无缓存：T*(P+Δ)
 *       - 块级：  P + (T-1)*(Δ + P mod B)   （未对齐尾部每轮重算）
 *       - 前缀树：P + (T-1)*Δ               （token 级精确命中）
 * 下半：会话长度下三种 KV 表示的显存（KB/token）
 */
(function () {
  var root = document.getElementById("viz-serving");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#ser-static");
  var animG = root.querySelector("#ser-anim");

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

  var P_OPTS = [1007, 2043, 3071, 5117];
  var B_OPTS = [8, 16, 32, 64];
  var DELTA = 150;        // 每轮新增 token
  var KB_PER_TOK = [
    { name: "FP16 · GQA 8 头", kb: 128, color: "var(--viz-danger)" },
    { name: "FP8 · MQA 1 头", kb: 8, color: "var(--viz-a)" },
    { name: "FP4 + 跨层复用", kb: 0.89, color: "var(--viz-b)" }
  ];

  staticG.appendChild(text(20, 22, "① 累计 prefill token 量（越低越好）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(text(20, 218, "② 单会话 KV cache 占用（会话长度 = P + T×" + DELTA + "）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));

  function bar(x, y, w, h, frac, color, label, value, maxRef) {
    staticG.appendChild(text(x, y - 4, label, { "font-size": 9.5, fill: "var(--text-soft)" }));
    animG.appendChild(el("rect", { x: x, y: y, width: w, height: h, rx: 3, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    animG.appendChild(el("rect", { x: x, y: y, width: Math.max(2, w * frac), height: h, rx: 3, fill: color, opacity: 0.85 }));
    animG.appendChild(text(x + w + 8, y + h - 3, value + (maxRef ? "  (基准 " + maxRef + ")" : ""), { "font-size": 9.5, "font-weight": "bold", fill: "var(--text)" }));
  }

  function fmtTok(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + " M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + " K";
    return String(Math.round(n));
  }
  function fmtMem(kb) {
    if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(2) + " GB";
    if (kb >= 1024) return (kb / 1024).toFixed(1) + " MB";
    return kb.toFixed(0) + " KB";
  }

  function draw(P, T, B) {
    animG.innerHTML = "";
    var noCache = T * (P + DELTA);
    var tail = P % B;
    var blockCache = P + (T - 1) * (DELTA + tail);
    var radix = P + (T - 1) * DELTA;
    var maxV = noCache;

    var rows = [
      { lab: "无前缀缓存", v: noCache, c: "var(--viz-danger)" },
      { lab: "块级缓存（B=" + B + "）", v: blockCache, c: "var(--viz-a)" },
      { lab: "前缀树（token 级）", v: radix, c: "var(--viz-b)" }
    ];
    var bx = 30, bw = 420, bh = 26;
    rows.forEach(function (r, i) {
      bar(bx, 40 + i * 44, bw, bh, r.v / maxV, r.c, r.lab, fmtTok(r.v) + " tokens", i === 0 ? "100%" : null);
    });

    /* 对齐损失读数 */
    var waste = (T - 1) * tail;
    animG.appendChild(el("rect", { x: bx, y: 172, width: 580, height: 34, rx: 4, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.8 }));
    animG.appendChild(text(bx + 10, 190, "对齐损失：P mod B = " + P + " mod " + B + " = " + tail + " token/轮 × " + (T - 1) + " 轮 = " + waste + " token",
      { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(bx + 10, 202, "省下的重算量 = " + fmtTok(noCache - radix) + " tokens（" + (100 * (noCache - radix) / noCache).toFixed(1) + "%），其中块级还能再省 " + waste + " tokens", { "font-size": 9, fill: "var(--text-soft)" }));

    /* KV 占用 */
    var sessLen = P + T * DELTA;
    var maxKb = KB_PER_TOK[0].kb * sessLen;
    KB_PER_TOK.forEach(function (k, i) {
      var kb = k.kb * sessLen;
      bar(30, 240 + i * 44, 420, 26, kb / maxKb, k.color, k.name + "（" + k.kb + " KB/token）", fmtMem(kb), i === 0 ? "基准" : null);
    });
    animG.appendChild(text(30, 380, "会话长度 = " + fmtTok(sessLen) + " tokens；并发 64 时把上面的数字 ×64", { "font-size": 9, fill: "var(--text-soft)" }));

    var ratio = (KB_PER_TOK[0].kb / KB_PER_TOK[2].kb).toFixed(0);
    animG.appendChild(text(20, 404, "结论：KV 表示带来的压缩（" + ratio + " 倍）量级远大于前缀缓存的对齐损失——先解决「每个 token 存多少字节」，再解决「要不要重算」。",
      { "font-size": 9.5, fill: "var(--text)" }));
    animG.appendChild(text(20, 420, "注：块级 vs 前缀树的差距在分支对话（树形共享）中会被放大，此处只算了线性多轮的对齐损失。", { "font-size": 8.5, fill: "var(--text-soft)" }));
  }

  var pEl = root.querySelector("#ser-p"), tEl = root.querySelector("#ser-t"), bEl = root.querySelector("#ser-b");
  var pVal = root.querySelector("#ser-p-val"), tVal = root.querySelector("#ser-t-val"), bVal = root.querySelector("#ser-b-val");
  function update() {
    var P = P_OPTS[+pEl.value], T = +tEl.value, B = B_OPTS[+bEl.value];
    pVal.textContent = P; tVal.textContent = T; bVal.textContent = B;
    draw(P, T, B);
  }
  [pEl, tEl, bEl].forEach(function (e) { e.addEventListener("input", update); });
  update();
})();
