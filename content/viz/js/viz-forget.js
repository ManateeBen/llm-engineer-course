/* viz-forget：持续预训练遗忘曲线（C 类，replay 滑杆）
 * 横轴 CPT 步数；绿线=领域 loss（降），橙线=通用分数（降=遗忘）。
 * replay 比例越高，遗忘曲线越平。
 */
(function () {
  var root = document.getElementById("viz-forget");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#fg-static");
  var animG = root.querySelector("#fg-anim");

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

  var X0 = 70, Y0 = 50, W = 500, H = 300;
  var S_MAX = 100; // 步数归一
  function px(s) { return X0 + (s / S_MAX) * W; }
  // 领域 loss：从 4.0 降到 1.0（指数趋近），replay 略拖慢但不影响最终太多
  function domainLoss(s, rep) {
    var lim = 1.0 + 0.4 * rep; // replay 略微抬高数据极限
    return lim + (4.0 - lim) * Math.exp(-s / 28);
  }
  // 通用分数：起点 75，遗忘幅度受 replay 抑制；rep>=0.3 基本不遗忘
  function generalScore(s, rep) {
    var forgetMag = Math.max(0, 1 - rep / 0.3) * 35; // 0%→35分, 30%→0
    var floor = 75 - forgetMag;
    return floor + forgetMag * Math.exp(-s / 22); // 从高 75 降到 floor
  }

  function draw(rep) {
    animG.innerHTML = "";
    staticG.innerHTML = "";
    // 轴
    staticG.appendChild(el("line", { x1: X0, y1: Y0, x2: X0, y2: Y0 + H, stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(el("line", { x1: X0, y1: Y0 + H, x2: X0 + W, y2: Y0 + H, stroke: "var(--border)", "stroke-width": 0.9 }));
    staticG.appendChild(text(X0 - 8, Y0 - 6, "loss / score", { "font-size": 9, fill: "var(--text-soft)" }));
    staticG.appendChild(text(X0 + W - 4, Y0 + H + 22, "CPT 步数 →", { "font-size": 10, fill: "var(--text-soft)" }));
    // 双纵轴说明
    staticG.appendChild(text(X0 + 6, Y0 + 14, "绿=领域 loss↓", { "font-size": 9, fill: "#22c55e" }));
    staticG.appendChild(text(X0 + 6, Y0 + 30, "橙=通用分数↓", { "font-size": 9, fill: "var(--viz-b)" }));

    // 领域 loss 曲线（绿）
    var dl = "", gs = "";
    for (var i = 0; i <= 100; i++) {
      var s = i / 100 * S_MAX;
      var x = px(s);
      var yl = Y0 + H - domainLoss(s, rep) / 5.0 * H;
      dl += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + yl.toFixed(1) + " ";
      var ys = Y0 + H - (generalScore(s, rep) - 35) / 50 * H; // 35..110 映射到画布
      gs += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + ys.toFixed(1) + " ";
    }
    animG.appendChild(el("path", { d: dl, fill: "none", stroke: "#22c55e", "stroke-width": 2 }));
    animG.appendChild(el("path", { d: gs, fill: "none", stroke: "var(--viz-b)", "stroke-width": 2 }));

    // 终值读数
    var dEnd = domainLoss(S_MAX, rep), gEnd = generalScore(S_MAX, rep);
    animG.appendChild(text(X0 + 10, Y0 + H - 6, "终: 领域=" + dEnd.toFixed(1) + " 通用=" + gEnd.toFixed(1) + (gEnd < 45 ? " (严重遗忘!)" : ""), { "font-size": 10, "font-weight": "bold", fill: gEnd < 45 ? "var(--viz-danger)" : "var(--text)" }));

    // 结论
    var concl = rep === 0
      ? "replay 0%：通用分数自由落体（灾难性遗忘）——纯领域数据是陷阱。"
      : (rep >= 30 ? "replay ≥30%：遗忘曲线被压平，领域与通用达成帕累托前沿。" : "replay " + rep + "%：遗忘明显缓解，继续提比例更稳。");
    staticG.appendChild(text(20, 400, concl, { "font-size": 10, fill: "var(--text)" }));
    staticG.appendChild(text(20, 418, "配方=领域70~90% + 通用replay10~30% + 学习率退火到原峰值10~30%（见 5-3 正文）。", { "font-size": 9, fill: "var(--text-soft)" }));
  }

  var repEl = root.querySelector("#fg-rep");
  var repVal = root.querySelector("#fg-rep-val");
  function update() {
    var r = +repEl.value;
    repVal.textContent = r + "%";
    draw(r / 100);
  }
  repEl.addEventListener("input", update);
  update();
})();
