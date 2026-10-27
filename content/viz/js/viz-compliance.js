/* viz-compliance：合规流水线门禁（C 类，静态）
 * 承 6-7 §2/§5。
 */
(function () {
  var root = document.getElementById("viz-compliance");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var G = root.querySelector("#compliance-static");

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

  var stages = [
    { t: "语料采集", chk: "license 扫描 / PII 过滤", fail: "阻断训练" },
    { t: "训练", chk: "数据配方记录 / 标注抽检", fail: "阻断出库" },
    { t: "对齐", chk: "拒答训练数据配比", fail: "阻断出库" },
    { t: "评估", chk: "ASR / 过度拒绝 / 能力回归", fail: "超阈值阻断" },
    { t: "备案", chk: "材料包自动导出 + 版本戳", fail: "材料不齐不上线" },
    { t: "发布", chk: "模型卡 schema 校验", fail: "缺字段阻断" },
    { t: "监控", chk: "过滤误伤回流 / 投诉 SLA", fail: "超限回滚" }
  ];
  var Y = 70, W = 78, GAP = 8, X0 = 30;
  stages.forEach(function (s, i) {
    var x = X0 + i * (W + GAP);
    G.appendChild(el("rect", { x: x, y: Y, width: W, height: 74, rx: 8, fill: i < 4 ? "rgba(74,125,189,0.08)" : "rgba(208,135,58,0.10)", stroke: i < 4 ? "#4a7dbd" : "#d0873a", "stroke-width": 1 }));
    G.appendChild(text(x + W / 2, Y + 18, s.t, { "font-size": 11, "text-anchor": "middle", "font-weight": "bold", fill: "var(--fg)" }));
    G.appendChild(text(x + W / 2, Y + 38, s.chk, { "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" }));
    G.appendChild(text(x + W / 2, Y + 58, s.fail, { "font-size": 9, "text-anchor": "middle", fill: "#A32D2D" }));
    if (i < stages.length - 1) {
      G.appendChild(el("path", { d: "M" + (x + W + 1) + " " + (Y + 37) + " L" + (x + W + GAP - 1) + " " + (Y + 37), fill: "none", stroke: "var(--muted)", "stroke-width": 1.5 }));
    }
  });
  G.appendChild(el("path", { d: "M" + (X0 + 6 * (W + GAP) + W / 2) + " " + (Y + 75) + " C " + (X0 + 6 * (W + GAP) + W / 2) + " " + (Y + 120) + ", " + (X0 + 2 * (W + GAP) + W / 2) + " " + (Y + 120) + ", " + (X0 + 2 * (W + GAP) + W / 2) + " " + (Y + 78), fill: "none", stroke: "#d0873a", "stroke-width": 1.5, "stroke-dasharray": "5,3" }));
  text(X0 + 3 * (W + GAP), Y + 122, "误判样本回流：三层过滤的误判进同一数据湖，成为下一轮训练数据", { "font-size": 10, "text-anchor": "middle", fill: "#854F0B" });

  // 分级
  text(30, 210, "失败动作分级", { "font-size": 12, fill: "var(--muted)" });
  G.appendChild(el("rect", { x: 30, y: 224, width: 260, height: 60, rx: 8, fill: "rgba(162,45,45,0.08)", stroke: "#A32D2D", "stroke-width": 1 }));
  text(45, 244, "硬阻断（无绕过通道）", { "font-size": 11, "font-weight": "bold", fill: "#A32D2D" });
  text(45, 262, "语料 license/PII · 安全评估超阈 · 标识与日志自检", { "font-size": 10, fill: "var(--muted)" });
  G.appendChild(el("rect", { x: 310, y: 224, width: 260, height: 60, rx: 8, fill: "rgba(186,117,23,0.08)", stroke: "#BA7517", "stroke-width": 1 }));
  text(325, 244, "告警 + 灰度（可人工裁决）", { "font-size": 11, "font-weight": "bold", fill: "#854F0B" });
  text(325, 262, "能力回归 · 过滤误伤率波动 · 非红线延迟项", { "font-size": 10, fill: "var(--muted)" });

  text(30, 320, "标识义务（2025-09 起）：显式（界面标注）+ 隐式（元数据水印）双轨，多模态管线出口统一挂", { "font-size": 11, fill: "var(--muted)" });
  text(30, 340, "日志留痕：输入输出留存 + 处置记录 + 投诉闭环时限，与 5-4 实验日志共用可观测栈", { "font-size": 11, fill: "var(--muted)" });
  text(30, 368, "SRE 价值：备案边际成本趋近于零——每次「临时补材料」的团队，边际成本线性累积", { "font-size": 11, fill: "var(--fg)" });
})();
