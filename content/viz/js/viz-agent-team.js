(function () {
  var root = document.getElementById("viz-agent-team");
  if (!root) return;
  var slider = root.querySelector("input"), output = root.querySelector(".calculator-output");
  function render() { var n = Number(slider.value); output.textContent = "全互连 " + (n*(n-1)) + " 条；中心拓扑 " + (2*(n-1)) + " 条；每轮800 token摘要全广播约 " + (n*(n-1)*800) + " 输入token"; }
  slider.addEventListener("input", render); render();
})();
