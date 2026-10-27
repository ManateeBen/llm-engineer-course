/* viz-mmeval：四阶段课程 + 幻觉三层 + 报告模板（C 类）承 9-5 */
(function () {
  var root = document.getElementById("viz-mmeval");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var g = root.querySelector("#mmeval-static");
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

  // 左：四阶段课程
  text(25, 30, "四阶段训练课程", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var stages = [
    ["0 投影对齐", "1.2M 图文对 · 冻结两端", "~0.5 天"],
    ["1 视觉指令 SFT", "665K 指令 · 解冻 LLM", "1~3 天"],
    ["2 多模态 DPO", "10K~100K 偏好对", "0.5~2 天"],
    ["3 RLHF（可选）", "片段级奖励 · GRPO", "2~5 天"]
  ];
  var y = 42;
  stages.forEach(function (s, i) {
    g.appendChild(el("rect", { x: 25, y: y, width: 195, height: 46, rx: 6, fill: "#38a", opacity: 0.07 + 0.02 * i }));
    g.appendChild(el("rect", { x: 25, y: y, width: 3, height: 46, rx: 1.5, fill: "#38a" }));
    text(38, y + 16, s[0], { "font-size": 10.5, "font-weight": 700, fill: "#36c" });
    text(38, y + 30, s[1], { "font-size": 9.5, fill: "var(--fg)" });
    text(38, y + 41, s[2], { "font-size": 9, fill: "var(--muted)" });
    y += 54;
  });
  g.appendChild(el("rect", { x: 25, y: 262, width: 195, height: 46, rx: 6, fill: "#3a7", opacity: 0.10 }));
  text(38, 279, "RLHF-V 实证：10K 人工校正样本", { "font-size": 10, "font-weight": 700, fill: "#3a7" });
  text(38, 293, "幻觉率 54% → 12%（密集监督 > 数量）", { "font-size": 9.5, fill: "var(--fg)" });

  // 中：幻觉三层
  text(250, 30, "幻觉三层归因", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var layers = [
    ["数据层", "caption 噪声（训练数据本身有幻觉）", "过滤 + 拒绝采样", "#c73"],
    ["训练目标层", "语言先验压过视觉证据", "RLHF-V 数据飞轮", "#c33"],
    ["解码层", "采样多样性产生不一致", "自洽性投票（10-2）", "#a86"]
  ];
  layers.forEach(function (l, i) {
    var yy = 42 + i * 72;
    g.appendChild(el("rect", { x: 250, y: yy, width: 170, height: 62, rx: 6, fill: l[3], opacity: 0.08 }));
    g.appendChild(el("rect", { x: 250, y: yy, width: 170, height: 62, rx: 6, fill: "none", stroke: l[3], "stroke-width": 1 }));
    text(262, yy + 18, l[0], { "font-size": 10.5, "font-weight": 700, fill: l[3] });
    text(262, yy + 34, l[1], { "font-size": 9, fill: "var(--fg)" });
    text(262, yy + 50, "→ " + l[2], { "font-size": 9.5, fill: "#3a7" });
  });
  text(250, 265, "DPO 副作用监控：", { "font-size": 10, "font-weight": 700, fill: "var(--fg)" });
  text(250, 280, "似然位移 ⇒ 变保守 ⇒ 弃答率涨", { "font-size": 9.5, fill: "var(--fg)" });
  text(250, 294, "（5%→18% 即过度矫正信号）", { "font-size": 9.5, fill: "#c33" });

  // 右：报告模板
  text(450, 30, "评测报告三支柱", { "font-size": 12, "font-weight": 700, fill: "var(--fg)" });
  var pillars = [
    ["公开集（PR 口径）", "MME / MMMU / TextVQA", "只报不优化", "#a5a"],
    ["私有集六桶", "通用/OCR/图表/计数/空间/视频", "每桶配置换对照组", "#38a"],
    ["幻觉专项", "POPE 物体级 / CHAIR 虚构率", "独立指标", "#c73"]
  ];
  pillars.forEach(function (p, i) {
    var yy = 42 + i * 72;
    g.appendChild(el("rect", { x: 450, y: yy, width: 170, height: 62, rx: 6, fill: p[3], opacity: 0.08 }));
    g.appendChild(el("rect", { x: 450, y: yy, width: 170, height: 62, rx: 6, fill: "none", stroke: p[3], "stroke-width": 1 }));
    text(462, yy + 18, p[0], { "font-size": 10.5, "font-weight": 700, fill: p[3] });
    text(462, yy + 34, p[1], { "font-size": 9, fill: "var(--fg)" });
    text(462, yy + 50, p[2], { "font-size": 9.5, fill: "var(--muted)" });
  });
  g.appendChild(el("rect", { x: 450, y: 262, width: 170, height: 46, rx: 6, fill: "#3a7", opacity: 0.10 }));
  text(462, 279, "置换对照：打乱后掉点", { "font-size": 10, "font-weight": 700, fill: "#3a7" });
  text(462, 293, "少 ⇒ 靠文本先验猜；", { "font-size": 9.5, fill: "var(--fg)" });
  text(462, 305, "多 ⇒ 真的在看图", { "font-size": 9.5, fill: "var(--fg)" });

  // 底部
  g.appendChild(el("rect", { x: 25, y: 325, width: 595, height: 55, rx: 6, fill: "#38a", opacity: 0.07 }));
  text(40, 343, "报告纪律：每个数字带 bootstrap CI、每项都有对照组、每个结论都分层——", { "font-size": 10.5, fill: "var(--fg)" });
  text(40, 359, "7-2 的统计纪律 + 7-4 的架构纪律在多模态的完整落地。", { "font-size": 10.5, fill: "var(--fg)" });
})();
