/* viz-monitor：训练监控面板（C 类，点击切换告警定位故障域）
 * 三层：硬件层 / 训练动态层 / 能力层，每层若干指标格。
 * 点击格子切换 正常/告警，底部提示故障定位结论。
 */
(function () {
  var root = document.getElementById("viz-monitor");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#mo-static");
  var animG = root.querySelector("#mo-anim");

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

  var LAYERS = [
    { title: "① 硬件层", x: 20, items: ["GPU 利用率", "显存占用", "NVLink 带宽", "掉卡检测"] },
    { title: "② 训练动态层", x: 230, items: ["train/val loss", "grad norm", "吞吐 tokens/s", "序列长度分布"] },
    { title: "③ 能力层", x: 440, items: ["语言建模探针", "下游任务探针", "指令遵循探针", "—"] }
  ];
  var states = {}; // key -> 0/1

  function key(li, ii) { return li + "-" + ii; }

  var hintEl = root.querySelector("#mo-hint");
  var CW = 188, CH = 40, CGY = 8, TOP = 56;

  function draw() {
    staticG.innerHTML = "";
    animG.innerHTML = "";
    LAYERS.forEach(function (layer, li) {
      staticG.appendChild(text(layer.x, 30, layer.title, { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
      staticG.appendChild(el("rect", { x: layer.x, y: TOP - 8, width: CW, height: CGY + CH * layer.items.length, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
      layer.items.forEach(function (name, ii) {
        var y = TOP + ii * (CH + CGY);
        var alarm = states[key(li, ii)] === 1;
        var rect = el("rect", { x: layer.x + 6, y: y, width: CW - 12, height: CH, rx: 4, fill: alarm ? "var(--viz-danger)" : "var(--bg)", stroke: "var(--border)", "stroke-width": 0.8, style: "cursor:pointer" });
        rect.addEventListener("click", function () {
          states[key(li, ii)] = alarm ? 0 : 1;
          draw();
        });
        animG.appendChild(rect);
        animG.appendChild(text(layer.x + 14, y + 18, name, { "font-size": 10, fill: alarm ? "var(--bg)" : "var(--text)" }));
        animG.appendChild(el("circle", { cx: layer.x + CW - 22, cy: y + 20, r: 6, fill: alarm ? "var(--bg)" : "var(--viz-b)" }));
        animG.appendChild(text(layer.x + CW - 14, y + 24, alarm ? "!" : "✓", { "font-size": 9, "font-weight": "bold", fill: alarm ? "var(--viz-danger)" : "var(--bg)" }));
      });
    });
    // 故障定位结论
    var alarms = [];
    LAYERS.forEach(function (layer, li) {
      layer.items.forEach(function (n, ii) { if (states[key(li, ii)] === 1) alarms.push(layer.title.replace(/[①-③]\s*/, "") + " · " + n); });
    });
    var concl;
    if (alarms.length === 0) concl = "全部正常 ✓ 三层信号都在健康区间。";
    else if (alarms.some(function (a) { return a.indexOf("能力层") >= 0; })) concl = "能力层告警 → 静默不收敛嫌疑：loss 数字正常但探针为零，立即拦截查数据管道/mask/并行。";
    else if (alarms.some(function (a) { return a.indexOf("训练动态层") >= 0; })) concl = "训练动态层告警 → 看 grad norm（先于 spike）与吞吐（数据/通信瓶颈），必要时自动回滚（5-2）。";
    else concl = "硬件层告警 → 查掉卡/显存泄漏/带宽拥塞，属基础设施故障。";
    animG.appendChild(el("rect", { x: 20, y: 360, width: 600, height: 56, rx: 5, fill: "var(--bg-soft)", stroke: "var(--border)", "stroke-width": 0.9 }));
    animG.appendChild(text(32, 382, "故障定位结论：", { "font-size": 10, "font-weight": "bold", fill: "var(--text)" }));
    animG.appendChild(text(32, 400, concl, { "font-size": 9.5, fill: "var(--text)" }));
  }
  draw();
})();
