(function () {
  var root = document.getElementById("viz-lora-budget");
  if (!root) return;
  var slider = root.querySelector("input"), output = root.querySelector(".calculator-output");
  function render() { var n = Number(slider.value); var params = 8192*n; output.textContent = "LoRA参数 " + params.toLocaleString() + "；占该层全参数 " + (100*params/16777216).toFixed(3) + "%"; }
  slider.addEventListener("input", render); render();
})();
