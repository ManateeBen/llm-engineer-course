(function () {
  var root = document.getElementById("viz-inference-budget");
  if (!root) return;
  var slider = root.querySelector("input"), output = root.querySelector(".calculator-output");
  function render() { var n = Number(slider.value); output.textContent = "至少一个正确：" + (100 * (1 - Math.pow(0.7, n))).toFixed(1) + "%；生成预算：" + (800 * n) + " token"; }
  slider.addEventListener("input", render); render();
})();
