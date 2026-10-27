"""python code/00-micrograd/main.py：梯度核对和拟合 y=2x+1。"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "common"))
from autograd import Value


def run():
    x = Value(3)
    y = x * x + x  # 同一个节点走两条乘法边，必须累加梯度。
    y.backward()
    h = 1e-5
    numeric = (((3+h)**2+3+h)-((3-h)**2+3-h))/(2*h)
    assert abs(x.grad - numeric) < 1e-8
    w, b = Value(0), Value(0)
    losses = []
    for _ in range(120):
        loss = sum((w*x+b-(2*x+1))**2 for x in [-2, -1, 0, 1, 2])/5
        losses.append(loss.data)
        loss.backward()
        w.data -= 0.05*w.grad
        b.data -= 0.05*b.grad
    assert losses[-1] < 1e-8
    report = {"analytic_gradient": x.grad, "finite_difference": numeric,
              "initial_loss": losses[0], "final_loss": losses[-1], "w": w.data, "b": b.data}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


if __name__ == "__main__":
    run()
