/* viz-rope：RoPE 旋转位置编码（C 类）
 * 位置 m 编码为旋转 mθ：实际向量 = R(mθ)·内容向量。
 * ⟨R(mθ)q, R(nθ)k⟩ = cos(φ − (n−m)θ)，只依赖相对位置 n−m。
 */
(function () {
  var root = document.getElementById("viz-rope");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var CX = 330, CY = 180, R = 120;

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
  function rad(d) { return d * Math.PI / 180; }

  var staticG = root.querySelector("#viz-rope-static");
  var animG = root.querySelector("#viz-rope-anim");
  var sm = root.querySelector("#viz-rope-m");
  var sn = root.querySelector("#viz-rope-n");
  var st = root.querySelector("#viz-rope-theta");
  var vm = root.querySelector("#viz-rope-mval");
  var vn = root.querySelector("#viz-rope-nval");
  var vt = root.querySelector("#viz-rope-tval");

  /* 静态：单位圆 + 坐标轴 + 内容向量 q(0°)、k(30°) */
  staticG.appendChild(el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: "var(--border)", "stroke-width": 1.2 }));
  staticG.appendChild(el("line", { x1: CX - R - 24, y1: CY, x2: CX + R + 24, y2: CY, stroke: "var(--border)", "stroke-width": 0.8 }));
  staticG.appendChild(el("line", { x1: CX, y1: CY + R + 24, x2: CX, y2: CY - R - 24, stroke: "var(--border)", "stroke-width": 0.8 }));
  function arrow(x1, y1, x2, y2, color, width, opacity) {
    var g = el("g", { opacity: opacity == null ? 1 : opacity });
    g.appendChild(el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, "stroke-width": width || 2 }));
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var s = 8;
    g.appendChild(el("path", {
      d: "M" + x2 + " " + y2 +
        " L" + (x2 - s * Math.cos(ang - 0.4)) + " " + (y2 - s * Math.sin(ang - 0.4)) +
        " L" + (x2 - s * Math.cos(ang + 0.4)) + " " + (y2 - s * Math.sin(ang + 0.4)) + " Z",
      fill: color
    }));
    return g;
  }
  function pt(deg) { return { x: CX + R * Math.cos(rad(deg)), y: CY - R * Math.sin(rad(deg)) }; }

  var q0 = pt(0), k0 = pt(30);
  staticG.appendChild(arrow(CX, CY, q0.x, q0.y, "var(--text-soft)", 1.6, 0.55));
  staticG.appendChild(arrow(CX, CY, k0.x, k0.y, "var(--text-soft)", 1.6, 0.55));
  staticG.appendChild(text(q0.x + 10, q0.y + 16, "q（内容向量）", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(text(k0.x + 6, k0.y - 8, "k（内容向量）", { "font-size": 11, fill: "var(--text-soft)" }));
  staticG.appendChild(text(CX, CY - R - 34, "内容向量 q、k（浅色）旋转 mθ、nθ 后得到实际参与注意力点积的向量（深色）", { "text-anchor": "middle", "font-size": 11, fill: "var(--text-soft)" }));

  function draw() {
    var m = parseInt(sm.value, 10);
    var n = parseInt(sn.value, 10);
    var th = parseFloat(st.value);
    vm.textContent = String(m);
    vn.textContent = String(n);
    vt.textContent = th + "°";
    animG.textContent = "";

    var qm = pt(m * th), kn = pt(n * th);
    animG.appendChild(arrow(CX, CY, qm.x, qm.y, "var(--accent)", 3));
    animG.appendChild(arrow(CX, CY, kn.x, kn.y, "var(--bad)", 3));
    animG.appendChild(text(qm.x + 10, qm.y + 16, "R(mθ)q", { "font-size": 12, fill: "var(--accent)" }));
    animG.appendChild(text(kn.x + 10, kn.y + 16, "R(nθ)k", { "font-size": 12, fill: "var(--bad)" }));

    /* 相对角弧：(n−m)θ */
    var rel = (n - m) * th;
    var a0 = Math.min(m * th, n * th), a1 = Math.max(m * th, n * th);
    if (Math.abs(rel) > 0.5) {
      var rr = 46;
      var p1 = { x: CX + rr * Math.cos(rad(a0)), y: CY - rr * Math.sin(rad(a0)) };
      var p2 = { x: CX + rr * Math.cos(rad(a1)), y: CY - rr * Math.sin(rad(a1)) };
      var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
      var sweep = n > m ? 0 : 1;
      animG.appendChild(el("path", {
        d: "M" + p1.x + " " + p1.y + " A" + rr + " " + rr + " 0 " + large + " " + sweep + " " + p2.x + " " + p2.y,
        fill: "none", stroke: "var(--viz-c)", "stroke-width": 2
      }));
      var mid = (a0 + a1) / 2;
      var mp = { x: CX + (rr + 18) * Math.cos(rad(mid)), y: CY - (rr + 18) * Math.sin(rad(mid)) };
      animG.appendChild(text(mp.x, mp.y + 4, "(n−m)θ = " + rel.toFixed(0) + "°", { "text-anchor": "middle", "font-size": 12, fill: "var(--viz-c)" }));
    }

    /* 点积值：⟨q, R((n−m)θ)k⟩ = cos(30° − rel) */
    var dp = Math.cos(rad(30 - rel));
    animG.appendChild(text(20, 40, "⟨R(mθ)q, R(nθ)k⟩ = cos(30° − (n−m)θ) = " + dp.toFixed(3), { "font-size": 13, fill: "var(--text)" }));
    animG.appendChild(text(20, 60, "相对距离 n−m = " + (n - m) + "，与绝对位置 m=" + m + "、n=" + n + " 无关", { "font-size": 12, fill: "var(--text-soft)" }));
    animG.appendChild(text(20, 78, Math.abs(rel) > 0.5 ? "" : "m=n 时相对角为 0：无论绝对位置在哪，点积都是 cos30°=0.866", { "font-size": 12, fill: "var(--viz-b)" }));
  }

  sm.addEventListener("input", draw);
  sn.addEventListener("input", draw);
  st.addEventListener("input", draw);
  draw();
})();
