/* viz-dlstack：国产训练栈两路线分层图（C 类，静态） */
(function () {
  var root = document.getElementById("viz-dlstack");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#ds-static");
  var animG = root.querySelector("#ds-anim");

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

  function layer(x, y, w, label, sub, color) {
    animG.appendChild(el("rect", { x: x, y: y, width: w, height: 44, rx: 6, fill: color, opacity: 0.88 }));
    animG.appendChild(text(x + w / 2, y + 19, label, { "font-size": 12, "text-anchor": "middle", fill: "#fff", "font-weight": "bold" }));
    animG.appendChild(text(x + w / 2, y + 36, sub, { "font-size": 10, "text-anchor": "middle", fill: "rgba(255,255,255,0.85)" }));
  }

  function draw() {
    while (animG.firstChild) animG.removeChild(animG.firstChild);
    var y = 50;
    var lw = 250;
    // 左：原生栈
    text(140, y - 10, "原生栈（MindSpore / Paddle 类）", { "font-size": 13, "text-anchor": "middle", fill: "var(--fg)", "font-weight": "bold" });
    layer(15, y, lw, "Python API", "用户层", "#4a7dbd");
    layer(15, y + 54, lw, "中间表示 IR", "计算图 / 张量程序", "#3a9d8f");
    layer(15, y + 108, lw, "自动微分 + 自动并行 ←★", "策略传播：切分与通信在编译期", "#d0873a");
    layer(15, y + 162, lw, "算子库", "厂商算子（CANN 类）", "#7a5db8");
    // 右：兼容栈
    text(480, y - 10, "兼容栈（PyTorch + torch_npu 类）", { "font-size": 13, "text-anchor": "middle", fill: "var(--fg)", "font-weight": "bold" });
    layer(375, y, lw, "PyTorch 代码（CUDA 语义）", "生态零迁移", "#4a7dbd");
    layer(375, y + 54, lw, "设备映射 privateuse1", "cuda:N → npu:N", "#3a9d8f");
    layer(375, y + 108, lw, "分布式模块 ←★", "FSDP/DTensor：运行时分片", "#d0873a");
    layer(375, y + 162, lw, "算子分派 → 算子库", "覆盖度决定兼容质量", "#7a5db8");
    // 底部共同后端
    layer(195, y + 230, 250, "硬件（NPU）", "低精度单元 / 互联拓扑", "#555");
    // 连线
    animG.appendChild(el("line", { x1: 140, y1: y + 206, x2: 300, y2: y + 228, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "4,3" }));
    animG.appendChild(el("line", { x1: 500, y1: y + 206, x2: 340, y2: y + 228, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "4,3" }));
    text(320, y + 300, "★ = 自动并行问题的解决位置：编译期（左）vs 运行时（右）", { "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" });
  }

  draw();
})();
