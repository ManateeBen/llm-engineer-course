/* viz-pack：序列打包与注意力隔离（C 类）
 * 4 条文档（prompt+response）打包成 18 token 序列；
 * 左：朴素因果 mask（跨文档可见，高亮渗漏区）；右：块对角隔离。
 * 底部 loss mask 行只点亮 response token。按钮切换渗漏区高亮。
 */
(function () {
  var root = document.getElementById("viz-pack");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var staticG = root.querySelector("#pk-static");
  var animG = root.querySelector("#pk-anim");
  var toggleBtn = root.querySelector("#pk-toggle");

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

  var DOCS = [
    { name: "D1", len: 6, resp: [4, 5], color: "var(--viz-b)" },
    { name: "D2", len: 4, resp: [2, 3], color: "#3b82f6" },
    { name: "D3", len: 5, resp: [3, 4], color: "#8b5cf6" },
    { name: "D4", len: 3, resp: [1, 2], color: "#f59e0b" }
  ];
  var NT = 18; /* 总 token 数 */
  var owner = []; /* 每个 token 属于哪篇文档 */
  var isResp = [];
  DOCS.forEach(function (d) {
    for (var i = 0; i < d.len; i++) {
      owner.push(d.name);
      isResp.push(d.resp.indexOf(i) >= 0);
    }
  });
  var docOf = {};
  DOCS.forEach(function (d) { docOf[d.name] = d; });

  var highlight = true;

  /* ---------- 静态 ---------- */
  staticG.appendChild(text(40, 26, "打包序列（深色 = response，浅色 = prompt）", { "font-size": 12, "font-weight": "bold", fill: "var(--text)" }));
  var SX = 40, SY = 40, CW = 26, CH = 30;
  var MX = 66, MY = 158, CELL = 12; /* 矩阵参数 */
  staticG.appendChild(text(MX - 26, MY - 8, "朴素打包：因果 mask（跨文档渗漏）", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: MX - 6, y: MY - 4, width: NT * CELL + 12, height: NT * CELL + 10, fill: "none", stroke: "var(--border)", "stroke-width": 0.8 }));
  var MX2 = 372;
  staticG.appendChild(text(MX2 - 26, MY - 8, "隔离打包：块对角注意力", { "font-size": 11, "font-weight": "bold", fill: "var(--text)" }));
  staticG.appendChild(el("rect", { x: MX2 - 6, y: MY - 4, width: NT * CELL + 12, height: NT * CELL + 10, fill: "none", stroke: "var(--border)", "stroke-width": 0.8 }));

  /* ---------- 动态 ---------- */
  function render() {
    animG.textContent = "";
    toggleBtn.textContent = highlight ? "👁 高亮跨文档注意力：开" : "👁 高亮跨文档注意力：关";

    /* 打包序列 */
    var x = SX;
    for (var i = 0; i < NT; i++) {
      var d = docOf[owner[i]];
      animG.appendChild(el("rect", {
        x: x, y: SY, width: CW - 2, height: CH, rx: 3,
        fill: d.color, opacity: isResp[i] ? 0.95 : 0.35,
        stroke: isResp[i] ? d.color : "var(--border)", "stroke-width": isResp[i] ? 1.2 : 0.6
      }));
      animG.appendChild(text(x + (CW - 2) / 2, SY + 19, isResp[i] ? "▣" : "▢", { "text-anchor": "middle", "font-size": 10, fill: isResp[i] ? "#fff" : "var(--text-soft)" }));
      x += CW;
    }
    /* 文档标签 */
    var lx = SX;
    DOCS.forEach(function (d) {
      var w = d.len * CW;
      animG.appendChild(el("line", { x1: lx, y1: SY + CH + 16, x2: lx + w - 2, y2: SY + CH + 16, stroke: d.color, "stroke-width": 2 }));
      animG.appendChild(text(lx + w / 2 - 1, SY + CH + 28, d.name + "（" + d.len + " tok）", { "text-anchor": "middle", "font-size": 9.5, "font-weight": "bold", fill: d.color }));
      lx += w;
    });
    /* loss mask 行 */
    animG.appendChild(text(SX, SY + CH + 46, "loss mask：", { "font-size": 10, "font-weight": "bold", fill: "var(--text)" }));
    var mx2 = SX + 70;
    for (var j = 0; j < NT; j++) {
      animG.appendChild(el("rect", {
        x: mx2, y: SY + CH + 36, width: CW - 2, height: 12, rx: 2,
        fill: isResp[j] ? "var(--accent)" : "var(--bg-soft)",
        stroke: isResp[j] ? "var(--accent)" : "var(--border)", "stroke-width": 0.6
      }));
      mx2 += CW;
    }
    animG.appendChild(text(SX, SY + CH + 62, "只有 response token（红）进 loss；prompt 与 PAD 全部屏蔽——漏屏蔽的模型会学会复读用户问题", { "font-size": 9.5, fill: "var(--text-soft)" }));

    /* 两个矩阵 */
    function drawMatrix(ox, isolated) {
      for (var r = 0; r < NT; r++) {
        for (var c = 0; c <= r; c++) {
          var same = owner[r] === owner[c];
          var cx = ox + c * CELL, cy = MY + r * CELL;
          if (isolated) {
            animG.appendChild(el("rect", {
              x: cx, y: cy, width: CELL - 1, height: CELL - 1,
              fill: same ? docOf[owner[r]].color : "var(--bg-soft)",
              opacity: same ? 0.9 : 0.25,
              stroke: same ? "none" : "var(--border)", "stroke-width": 0.4
            }));
          } else {
            var leak = !same;
            animG.appendChild(el("rect", {
              x: cx, y: cy, width: CELL - 1, height: CELL - 1,
              fill: leak && highlight ? "var(--accent)" : (leak ? "var(--accent)" : docOf[owner[r]].color),
              opacity: leak ? (highlight ? 0.55 : 0.28) : 0.85,
              stroke: "var(--bg)", "stroke-width": 0.3
            }));
          }
        }
      }
      /* 文档分隔线 */
      var acc = 0;
      DOCS.forEach(function (d, di) {
        acc += d.len;
        if (di < DOCS.length - 1) {
          animG.appendChild(el("line", { x1: ox - 3, y1: MY + acc * CELL, x2: ox + NT * CELL, y2: MY + acc * CELL, stroke: "var(--text)", "stroke-width": 1, "stroke-dasharray": "3 2" }));
          animG.appendChild(el("line", { x1: ox + acc * CELL, y1: MY - 3, x2: ox + acc * CELL, y2: MY + NT * CELL, stroke: "var(--text)", "stroke-width": 1, "stroke-dasharray": "3 2" }));
        }
      });
    }
    drawMatrix(MX, false);
    drawMatrix(MX2, true);
    animG.appendChild(text(MX, MY + NT * CELL + 14, "↑ 每行 = 当前 token 能注意到的范围；彩色 = 看到了别的文档", { "font-size": 9, fill: "var(--text-soft)" }));
    animG.appendChild(text(MX2, MY + NT * CELL + 14, "跨文档格全灭：每条样本独立成块", { "font-size": 9, fill: "var(--text-soft)" }));

    /* 底部要点 */
    var by = MY + NT * CELL + 36;
    animG.appendChild(text(40, by, "· 块对角 mask + 位置 id 按文档重置：RoPE 的相对位置不跨文档错乱（LongAlign 2024）", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(40, by + 16, "· 代价：实现略复杂（变长 attention / 文档边界记录），收益是省掉 padding 算力 + 不学幻觉关联", { "font-size": 10, fill: "var(--text)" }));
    animG.appendChild(text(40, by + 32, "· 不隔离的另一种做法是文档间加分隔 token 并接受轻微污染——质量要求高的对齐训练别用", { "font-size": 10, fill: "var(--text)" }));
  }

  toggleBtn.addEventListener("click", function () {
    highlight = !highlight;
    render();
  });

  render();
})();
