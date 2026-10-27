/* ============================================================
 * LLM 工程师养成系统 — 课程前端逻辑（原生 JS，禁 CDN）
 * 数据来自 build 时内联的 UNITS_META / GATES
 * 存储：localStorage（进度 / 错题 / gate / 主题），可一键清空
 * ============================================================ */
(function () {
  "use strict";

  var UNITS = window.__UNITS__ || [];
  var STAGES = window.__STAGES__ || {};
  var GATES = window.__GATES__ || [];
  var LS = {
    done: "llm-course:done",
    exits: "llm-course:exits",
    gates: "llm-course:gates",
    wrong: "llm-course:wrong",
    theme: "llm-course:theme",
    pos: "llm-course:pos",
    mode: "llm-course:mode"
  };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var state = {
    done: new Set(load(LS.done, [])),
    exits: load(LS.exits, {}),          // { unitId: [idx, ...] }
    gates: load(LS.gates, {}),          // { stage: {score, total, pass} }
    wrong: load(LS.wrong, []),          // [{unit, q}] 错题
    current: null
  };
  var mode = load(LS.mode, "free") === "guided" ? "guided" : "free";
  var searchIndex = {};

  function lockedBy(stage) {
    if (mode !== "guided") return null;
    var pending = GATES.filter(function (g) {
      return g.stage < stage && !(state.gates[g.stage] && state.gates[g.stage].pass);
    }).sort(function (a, b) { return a.stage - b.stage; });
    return pending.length ? pending[0].stage : null;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- 导航树 ---------------- */

  function buildNav() {
    var nav = $("#navtree");
    nav.innerHTML = "";
    var byStage = {};
    UNITS.forEach(function (u) {
      (byStage[u.stage] = byStage[u.stage] || []).push(u);
    });
    Object.keys(byStage).map(Number).sort(function (a, b) { return a - b; }).forEach(function (st) {
      var wrap = document.createElement("div");
      wrap.className = "nav-stage open";
      var title = document.createElement("div");
      title.className = "nav-stage-title";
      title.innerHTML = "<span>" + esc(STAGES[st] || ("阶段 " + st)) + "</span>" +
        '<span class="stage-count" data-stage-count="' + st + '"></span>';
      title.onclick = function () { wrap.classList.toggle("open"); };
      wrap.appendChild(title);
      var items = document.createElement("div");
      items.className = "nav-stage-items";
      byStage[st].forEach(function (u) {
        var it = document.createElement("div");
        it.className = "nav-item";
        it.dataset.unit = u.id;
        it.innerHTML =
          '<input type="checkbox" class="nav-check" data-unit="' + u.id + '"' +
          (state.done.has(u.id) ? " checked" : "") + ">" +
          '<span class="nav-id">' + u.id + "</span>" +
          '<span class="nav-title">' + esc(u.t) + "</span>" +
          (u.viz && u.viz !== "none"
            ? '<span class="nav-viz viz-' + u.viz.toLowerCase() + '">' + esc(u.viz) + "</span>"
            : "");
        it.onclick = function (e) {
          if (e.target.classList.contains("nav-check")) return;
          showUnit(u.id);
        };
        items.appendChild(it);
      });
      // gate 入口
      var gate = GATES.filter(function (g) { return g.stage === st; })[0];
      if (gate) {
        var gi = document.createElement("div");
        gi.className = "nav-item gate-entry";
        gi.dataset.gate = String(st);
        gi.innerHTML = '<span class="nav-id">gate</span><span class="nav-title">' +
          esc(gate.title) + '</span><span class="gate-state" data-gate-state="' + st + '"></span>';
        gi.onclick = function () { showGate(st); };
        items.appendChild(gi);
      }
      wrap.appendChild(items);
      nav.appendChild(wrap);
    });
    refreshCounts();
  }

  function refreshCounts() {
    var byStage = {};
    UNITS.forEach(function (u) {
      byStage[u.stage] = byStage[u.stage] || { total: 0, done: 0 };
      byStage[u.stage].total++;
      if (state.done.has(u.id)) byStage[u.stage].done++;
    });
    $all("[data-stage-count]").forEach(function (el) {
      var c = byStage[el.dataset.stageCount] || { total: 0, done: 0 };
      el.textContent = c.done + "/" + c.total;
    });
    var pct = UNITS.length ? Math.round(state.done.size / UNITS.length * 100) : 0;
    $all(".progress-bar > div").forEach(function (el) {
      el.style.width = pct + "%";
    });
    $all(".progress-text-span, #progress-text").forEach(function (el) {
      el.textContent = "已完成 " + state.done.size + " / " + UNITS.length + "（" + pct + "%）";
    });
    // gate 状态
    $all("[data-gate-state]").forEach(function (el) {
      var g = state.gates[el.dataset.gateState];
      el.textContent = g ? (g.pass ? "已通过" : "未通过") : "未测";
      el.style.color = g ? (g.pass ? "var(--ok)" : "var(--bad)") : "var(--text-soft)";
      el.style.fontSize = "11px";
    });
    // 导航勾选态
    $all(".nav-check").forEach(function (cb) {
      cb.checked = state.done.has(cb.dataset.unit);
      var item = cb.closest(".nav-item");
      if (item) item.classList.toggle("done", cb.checked);
    });
    // 单元页按钮
    $all(".done-btn").forEach(function (btn) {
      var on = state.done.has(btn.dataset.unit);
      btn.classList.toggle("done", on);
      btn.textContent = on ? "✓ 已学完（点击取消）" : "标记为已学完";
    });
    // 热力图
    renderHeatmap();
  }

  /* ---------------- 单元显隐 ---------------- */

  function showUnit(uid) {
    var unit = UNITS.find(function (u) { return u.id === uid; });
    if (!unit) { showHome(); return; }
    var blocker = lockedBy(unit.stage);
    if (blocker !== null) { showGate(blocker); return; }
    state.current = "unit:" + uid;
    save(LS.pos, state.current);
    location.hash = "#/" + uid;
    $all(".unit").forEach(function (s) { s.classList.remove("visible"); });
    $all(".gate").forEach(function (s) { s.classList.remove("visible"); });
    var sec = document.getElementById("unit-" + uid);
    if (sec) sec.classList.add("visible");
    $all(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.dataset.unit === uid);
    });
    window.scrollTo(0, 0);
    closeSidebarOnMobile();
  }

  function showGate(stage) {
    if (!GATES.some(function (g) { return g.stage === stage; })) { showHome(); return; }
    var blocker = lockedBy(stage);
    if (blocker !== null) { showGate(blocker); return; }
    state.current = "gate:" + stage;
    save(LS.pos, state.current);
    location.hash = "#/gate-" + stage;
    $all(".unit").forEach(function (s) { s.classList.remove("visible"); });
    $all(".gate").forEach(function (s) { s.classList.remove("visible"); });
    var sec = document.getElementById("gate-" + stage);
    if (sec) sec.classList.add("visible");
    $all(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.dataset.gate === String(stage));
    });
    window.scrollTo(0, 0);
    closeSidebarOnMobile();
  }

  function showHome() {
    state.current = "home";
    location.hash = "#/";
    $all(".unit").forEach(function (s) { s.classList.remove("visible"); });
    $all(".gate").forEach(function (s) { s.classList.remove("visible"); });
    var home = $("#home");
    if (home) home.classList.add("visible");
    $all(".nav-item").forEach(function (n) { n.classList.remove("active"); });
    window.scrollTo(0, 0);
  }

  function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) $("#sidebar").classList.remove("open");
  }

  /* ---------------- 搜索 ---------------- */

  function bindSearch() {
    var input = $("#search-input");
    UNITS.forEach(function (u) {
      var section = document.getElementById("unit-" + u.id);
      searchIndex[u.id] = (u.id + " " + u.t + " " + u.s + " " + (section ? section.textContent : "")).toLowerCase();
    });
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      $all(".nav-stage").forEach(function (stageEl) {
        var any = false;
        $all(".nav-item", stageEl).forEach(function (it) {
          var uid = it.dataset.unit;
          var u = UNITS.filter(function (x) { return x.id === uid; })[0];
          var text = searchIndex[uid] || it.textContent.toLowerCase();
          var hit = !q || text.indexOf(q) !== -1;
          it.style.display = hit ? "" : "none";
          if (hit) any = true;
        });
        stageEl.style.display = any ? "" : "none";
        if (q && any) stageEl.classList.add("open");
      });
    });
  }

  /* ---------------- 完成 / 退出标准 ---------------- */

  function bindDone() {
    document.addEventListener("change", function (e) {
      if (!e.target.classList.contains("nav-check")) return;
      var uid = e.target.dataset.unit;
      var unit = UNITS.find(function (u) { return u.id === uid; });
      if (lockedBy(unit.stage) !== null) { refreshCounts(); return; }
      if (e.target.checked) state.done.add(uid); else state.done.delete(uid);
      save(LS.done, Array.from(state.done));
      refreshCounts();
    });
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".done-btn");
      if (btn) {
        var uid = btn.dataset.unit;
        if (state.done.has(uid)) state.done.delete(uid);
        else state.done.add(uid);
        save(LS.done, Array.from(state.done));
        refreshCounts();
      }
      var li = e.target.closest(".exit-list li");
      if (li) {
        var key = li.dataset.exit; // "unit-idx"
        var parts = key.split("-");
        var idx = parseInt(parts.pop(), 10);
        var u = parts.join("-");
        state.exits[u] = state.exits[u] || [];
        var i = state.exits[u].indexOf(idx);
        if (i === -1) state.exits[u].push(idx); else state.exits[u].splice(i, 1);
        save(LS.exits, state.exits);
        li.classList.toggle("checked");
      }
    });
    // 恢复 exit 勾选态
    $all(".exit-list li").forEach(function (li) {
      var key = li.dataset.exit;
      var parts = key.split("-");
      var idx = parseInt(parts.pop(), 10);
      var u = parts.join("-");
      if ((state.exits[u] || []).indexOf(idx) !== -1) li.classList.add("checked");
    });
  }

  /* ---------------- gate 大测 ---------------- */

  function buildGates() {
    GATES.forEach(function (g) {
      var sec = document.createElement("section");
      sec.className = "gate";
      sec.id = "gate-" + g.stage;
      var rec = state.gates[g.stage];
      var html =
        '<div class="gate-head"><h1>' + esc(g.title) + '</h1>' +
        '<p>共 ' + g.questions.length + ' 题，用于检查本阶段关键知识；' +
        '得分 ≥ ' + Math.round(g.pass * 100) + '% 为通过。闯关模式需通过此前各阶段测验。' +
        (rec ? '（上次成绩：' + rec.score + '/' + rec.total + (rec.pass ? '，已通过' : '，未通过') + '）' : "") +
        '</p></div><div class="gate-list">';
      g.questions.forEach(function (q) {
        html += '<div class="gate-q" data-q="' + g.stage + "-" + q.n + '">' +
          '<div class="gq-stem">' + q.stem +
          (q.unit ? '<span class="gq-unit">[' + esc(q.unit) + ']</span>' : "") + '</div>';
        q.options.forEach(function (o) {
          html += '<label><input type="radio" name="g' + g.stage + "-" + q.n + '" value="' + o.k + '">' +
            "<b>" + o.k + ".</b> " + o.t + "</label>";
        });
        html += '<div class="gq-verdict"></div><div class="gq-why">' + q.why + "</div></div>";
      });
      html += '</div><div class="gate-actions"><button data-grade="' + g.stage + '">提交并评分</button>' +
        '<span class="gate-result" id="gate-result-' + g.stage + '"></span>' +
        '<span class="gate-locked" id="gate-lock-' + g.stage + '"></span></div>';
      sec.innerHTML = html;
      $("#content").appendChild(sec);
    });
    $all("[data-grade]").forEach(function (btn) {
      btn.addEventListener("click", function () { gradeGate(parseInt(btn.dataset.grade, 10)); });
    });
  }

  function gradeGate(stage) {
    var g = GATES.filter(function (x) { return x.stage === stage; })[0];
    if (!g) return;
    var score = 0, wrongNow = [];
    g.questions.forEach(function (q) {
      var sel = $('input[name="g' + stage + "-" + q.n + '"]:checked');
      var box = $('.gate-q[data-q="' + stage + "-" + q.n + '"]');
      box.classList.add("graded");
      var picked = sel ? sel.value : "";
      if (picked === q.answer) {
        score++;
        box.classList.add("correct");
        box.classList.remove("wrong");
        $(".gq-verdict", box).textContent = "✓ 正确";
      } else {
        box.classList.add("wrong");
        box.classList.remove("correct");
        $(".gq-verdict", box).textContent = "✗ 正确答案：" + q.answer + (picked ? "（你选了 " + picked + "）" : "（未作答）");
        wrongNow.push({ unit: q.unit, q: q.n, stage: stage });
      }
    });
    var total = g.questions.length;
    var pass = score / total >= g.pass;
    state.gates[stage] = { score: score, total: total, pass: pass };
    save(LS.gates, state.gates);
    // 本次重测答对的题从待复习队列移除。
    state.wrong = state.wrong.filter(function (w) { return w.stage !== stage; });
    wrongNow.forEach(function (w) {
      var dup = state.wrong.some(function (x) {
        return x.stage === w.stage && x.q === w.q;
      });
      if (!dup) state.wrong.push(w);
    });
    save(LS.wrong, state.wrong);
    var res = $("#gate-result-" + stage);
    res.textContent = "成绩：" + score + " / " + total + "（" + Math.round(score / total * 100) + "%）" +
      (pass ? " — 已通过本阶段测验" : " — 未达到 " + Math.round(g.pass * 100) + "%，复习后重测");
    res.className = "gate-result " + (pass ? "pass" : "fail");
    $("#gate-lock-" + stage).textContent = pass ? "" : "请在首页错题本查看复习单元，再重新作答。";
    refreshCounts();
    renderWrongPanel();
  }

  /* ---------------- 错题本 ---------------- */

  function renderWrongPanel() {
    var box = $("#wrong-panel");
    if (!box) return;
    if (!state.wrong.length) {
      box.innerHTML = '<p class="gate-locked">暂无错题。gate 大测答错的题会自动进入这里。</p>';
      return;
    }
    var html = "<p>共 " + state.wrong.length + " 道错题（来自各阶段 gate）。点击跳到对应单元复习：</p><ul>";
    state.wrong.forEach(function (w) {
      var ids = String(w.unit || "").match(/\d+-\d+/g) || [];
      html += '<li><a href="#/gate-' + w.stage + '">阶段 ' + w.stage + ' · 第 ' + w.q + ' 题重练</a> · ' +
        ids.filter(function (id) { return UNITS.some(function (u) { return u.id === id; }); }).map(function (id) {
          return '<a href="#/' + id + '" data-jump="' + id + '">复习 ' + id + '</a>';
        }).join(' / ') + '</li>';
    });
    html += "</ul>";
    box.innerHTML = html;
    $all("[data-jump]", box).forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (a.dataset.jump) showUnit(a.dataset.jump);
      });
    });
  }

  /* ---------------- 能力热力图 ---------------- */

  function renderHeatmap() {
    var box = $("#heatmap");
    if (!box) return;
    var byStage = {};
    UNITS.forEach(function (u) {
      byStage[u.stage] = byStage[u.stage] || { total: 0, done: 0 };
      byStage[u.stage].total++;
      if (state.done.has(u.id)) byStage[u.stage].done++;
    });
    var html = '<div class="heat-grid">';
    Object.keys(byStage).map(Number).sort(function (a, b) { return a - b; }).forEach(function (st) {
      var c = byStage[st];
      var pct = c.total ? c.done / c.total : 0;
      var level = pct === 0 ? 0 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : pct < 1 ? 3 : 4;
      html += '<div class="heat-cell" data-level="' + level + '" title="' +
        esc(STAGES[st] || st) + "：" + c.done + "/" + c.total + '">' +
        "<b>" + st + "</b><span>" + c.done + "/" + c.total + "</span></div>";
    });
    html += "</div>";
    box.innerHTML = html;
  }

  /* ---------------- 主题 / 清空 / 菜单 ---------------- */

  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    save(LS.theme, t);
    var btn = $("#theme-btn");
    if (btn) btn.textContent = t === "dark" ? "☀ 亮色" : "🌙 暗色";
  }

  function bindTools() {
    $("#learning-mode").value = mode;
    $("#learning-mode").addEventListener("change", function (e) {
      mode = e.target.value;
      save(LS.mode, mode);
      route();
    });
    $("#resume-btn").addEventListener("click", function () {
      var pos = load(LS.pos, "unit:0-0");
      if (/^unit:\d+-\d+$/.test(pos)) showUnit(pos.slice(5));
      else if (/^gate:\d+$/.test(pos)) showGate(Number(pos.slice(5)));
      else showUnit("0-0");
    });
    $("#export-btn").addEventListener("click", function () {
      var data = { version: 1, done: Array.from(state.done), exits: state.exits, gates: state.gates,
        wrong: state.wrong, pos: load(LS.pos, "unit:0-0") };
      var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      var a = document.createElement("a");
      a.href = url; a.download = "llm-course-progress.json"; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    $("#import-input").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) { alert("进度文件超过 1 MB，请检查文件。"); e.target.value = ""; return; }
      file.text().then(function (text) {
        var data = JSON.parse(text);
        if (!data || data.version !== 1 || !Array.isArray(data.done) || !Array.isArray(data.wrong) ||
            !data.exits || typeof data.exits !== "object" || !data.gates || typeof data.gates !== "object") {
          throw new Error("文件结构不正确");
        }
        var known = UNITS.map(function (u) { return u.id; });
        var clean = { done: data.done.filter(function (id) { return known.indexOf(id) !== -1; }), exits: {}, gates: {}, wrong: [] };
        UNITS.forEach(function (u) {
          var values = data.exits[u.id];
          if (Array.isArray(values)) clean.exits[u.id] = values.filter(function (i) {
            return Number.isInteger(i) && i > 0 && i <= u.nEx;
          });
        });
        GATES.forEach(function (g) {
          var rec = data.gates[g.stage];
          if (rec && Number.isInteger(rec.score) && rec.total === g.questions.length && rec.score >= 0 && rec.score <= rec.total) {
            clean.gates[g.stage] = { score: rec.score, total: rec.total, pass: rec.score / rec.total >= g.pass };
          }
          g.questions.forEach(function (q) {
            if (data.wrong.some(function (w) { return w && w.stage === g.stage && w.q === q.n; })) {
              clean.wrong.push({ stage: g.stage, q: q.n, unit: q.unit });
            }
          });
        });
        if (!confirm("导入将替换本机学习进度。建议先导出备份。继续吗？")) return;
        Object.keys(clean).forEach(function (key) { save(LS[key], clean[key]); });
        if (typeof data.pos === "string" && /^(unit:\d+-\d+|gate:\d+)$/.test(data.pos)) save(LS.pos, data.pos);
        location.reload();
      }).catch(function (error) { alert("导入失败：" + error.message); });
      e.target.value = "";
    });
    $("#theme-btn").addEventListener("click", function () {
      var cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(cur);
    });
    $("#clear-btn").addEventListener("click", function () {
      if (!confirm("确定清空全部学习进度、错题与 gate 成绩？此操作不可撤销。")) return;
      ["done", "exits", "gates", "wrong", "pos"].forEach(function (k) { localStorage.removeItem(LS[k]); });
      state.done = new Set();
      state.exits = {};
      state.gates = {};
      state.wrong = [];
      location.hash = "#/";
      location.reload();
    });
    $("#menu-toggle").addEventListener("click", function () {
      $("#sidebar").classList.toggle("open");
    });
    $("#home-link").addEventListener("click", function (e) {
      e.preventDefault();
      showHome();
    });
  }

  /* ---------------- 路由 ---------------- */

  function route() {
    var h = location.hash || "#/";
    var m = h.match(/^#\/([0-9]+-[0-9]+)$/);
    if (m) { showUnit(m[1]); return; }
    var g = h.match(/^#\/gate-([0-9]+)$/);
    if (g) { showGate(parseInt(g[1], 10)); return; }
    showHome();
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    applyTheme(load(LS.theme, "light"));
    buildNav();
    buildGates();
    bindSearch();
    bindDone();
    bindTools();
    // 首页卡片跳转
    $all(".home-card[data-goto]").forEach(function (card) {
      card.addEventListener("click", function () { showUnit(card.dataset.goto); });
    });
    refreshCounts();
    renderWrongPanel();
    window.addEventListener("hashchange", route);
    route();
    // KaTeX 渲染（auto-render，delimiters 与 content 约定一致）
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
