(function () {
  var root = document.getElementById("viz-agent-loop");
  if (!root) return;
  var slider = root.querySelector("input"), output = root.querySelector(".calculator-output");
  function render() { var n = Number(slider.value); var value = Math.pow(0.95, n); output.textContent = n + " 步全部成功概率约 " + (100 * value).toFixed(1) + "%"; }
  slider.addEventListener("input", render); render();
})();
