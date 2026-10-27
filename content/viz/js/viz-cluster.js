/* viz-cluster：gang 调度与碎片（C 类）
 * 16 机×8 卡。占用模式：mode0 均匀散布（每台占 4~6 卡），mode1 bin-pack（前 10 台占满、后 6 台空）。
 * 新任务需 3 台整机，高亮可起/不可起。承 5-5 §1~§3。
 */
(function () {
  var root = document.getElementById("viz-cluster");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#cl-static");
  var animG = root.querySelector("#cl-anim");

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

  var iMode = root.querySelector("#cl-mode");

  function drawStatic() {
    textLayer = staticG;
    staticG.appendChild(text(20, 22, "16 台机 × 8 卡（每行一台机）", { "font-size": 12, fill: "var(--muted)" }));
  }

  function draw() {
    textLayer = animG;
    var mode = +iMode.value;
    root.querySelector("#cl-mode-val").textContent = mode === 1 ? "gang + 装箱" : "乱占（无 gang）";
    while (animG.firstChild) animG.removeChild(animG.firstChild);

    var cols = ["#4a7dbd", "#3a9d8f", "#d0873a", "#7a5db8", "#b85a8a"];
    var x0 = 40, y0 = 46, cw = 26, ch = 14, gapY = 6;
    var totalIdle = 0, wholeMachines = 0;
    for (var m = 0; m < 16; m++) {
      var usedInMachine;
      if (mode === 0) usedInMachine = 4 + ((m * 3) % 3); // 4~6 卡散布
      else usedInMachine = m < 10 ? 8 : 0;               // 装箱：前 10 台满
      var idle = 8 - usedInMachine;
      totalIdle += idle;
      if (idle === 8) wholeMachines++;
      animG.appendChild(text(x0 - 8, y0 + m * (ch + gapY) + ch, "M" + m, { "font-size": 9, "text-anchor": "end", fill: "var(--muted)" }));
      for (var c = 0; c < 8; c++) {
        var used = c < usedInMachine;
        var fill = used ? cols[(m + c) % cols.length] : "#e8e8e8";
        var isNew = !used && mode === 1 && m >= 10 && m < 13;
        if (isNew) fill = "#2a7a3a";
        animG.appendChild(el("rect", { x: x0 + c * (cw + 2), y: y0 + m * (ch + gapY), width: cw, height: ch, fill: fill, opacity: used ? 0.75 : (isNew ? 0.95 : 0.9), rx: 2 }));
      }
    }
    var lx = 300;
    animG.appendChild(text(lx, y0 + 20, "总空闲卡：32", { "font-size": 12, fill: "var(--fg)" }));
    animG.appendChild(text(lx, y0 + 44, "空闲整机：" + wholeMachines + " 台", { "font-size": 12, fill: "var(--fg)" }));
    animG.appendChild(text(lx, y0 + 68, "新任务需 3 台整机（24 卡）", { "font-size": 12, fill: "var(--fg)" }));
    var canStart = wholeMachines >= 3;
    animG.appendChild(text(lx, y0 + 100, canStart ? "✔ 立即启动" : "✘ 一台未得：空等 32 张碎片卡", { "font-size": 14, fill: canStart ? "#2a7a3a" : "#c33", "font-weight": "bold" }));
    animG.appendChild(text(lx, y0 + 140, mode === 0
      ? "乱占模式：小任务被 spread 到全簇，"
      : "gang 模式：小任务 bin-pack 进前 10 台，") , { "font-size": 11, fill: "var(--muted)" });
    animG.appendChild(text(lx, y0 + 158, mode === 0
      ? "每台都剩几卡——连续性被切碎。"
      : "后 6 台保持整机空闲，随时可组大块。", { "font-size": 11, fill: "var(--muted)" }));
    // 图例
    animG.appendChild(el("rect", { x: lx, y: y0 + 190, width: 12, height: 12, fill: "#4a7dbd", opacity: 0.75 }));
    animG.appendChild(text(lx + 18, y0 + 200, "已占用", { "font-size": 11, fill: "var(--fg)" }));
    animG.appendChild(el("rect", { x: lx + 90, y: y0 + 190, width: 12, height: 12, fill: "#e8e8e8" }));
    animG.appendChild(text(lx + 108, y0 + 200, "空闲", { "font-size": 11, fill: "var(--fg)" }));
    animG.appendChild(el("rect", { x: lx + 160, y: y0 + 190, width: 12, height: 12, fill: "#2a7a3a" }));
    animG.appendChild(text(lx + 178, y0 + 200, "新任务获得", { "font-size": 11, fill: "var(--fg)" }));
  }

  drawStatic();
  draw();
  iMode.addEventListener("input", draw);
})();
