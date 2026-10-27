"""标准库手写微型GPT：embedding、双头因果注意力、RMSNorm、FFN和反传。

只用于机制教学，不代表真实语料上的泛化能力。对应3-0、0-8。
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "common"))
from autograd import Value, linear, softmax, dot

TEXT = "猫追鼠。鼠躲猫。猫看花。鼠看花。"  # 本项目自编的小型语法，非外部语料。
VOCAB = sorted(set(TEXT))
D, HEADS, CONTEXT = 8, 2, 8


class TinyGPT:
    def __init__(self, seed=7):
        rng = random.Random(seed)
        def matrix(rows, cols, scale=0.15):
            return [[Value(rng.gauss(0, scale)) for _ in range(cols)] for _ in range(rows)]
        self.weights = {
            "token": matrix(len(VOCAB), D), "position": matrix(CONTEXT, D),
            "q": matrix(D, D), "k": matrix(D, D), "v": matrix(D, D), "out": matrix(D, D),
            "ff1": matrix(2*D, D), "ff2": matrix(D, 2*D), "head": matrix(len(VOCAB), D)}
        self.parameters = [p for m in self.weights.values() for row in m for p in row]

    @staticmethod
    def norm(x):
        inv = (sum(v*v for v in x)/len(x)+1e-5)**-0.5
        return [v*inv for v in x]

    def forward(self, ids):
        if not 0 < len(ids) <= CONTEXT:
            raise ValueError("上下文长度必须在1到8之间")
        w = self.weights
        x = [[a+b for a,b in zip(w["token"][token],w["position"][i])] for i,token in enumerate(ids)]
        normalized = [self.norm(row) for row in x]
        qs,ks,vs = [[linear(row,w[name]) for row in normalized] for name in ["q","k","v"]]
        outputs = []
        dh = D//HEADS
        for i, row in enumerate(x):
            joined = []
            for head in range(HEADS):
                start,end = head*dh,(head+1)*dh
                # 只建立j<=i的边，未来token根本不进入softmax分母。
                scores = [dot(qs[i][start:end],ks[j][start:end])/math.sqrt(dh) for j in range(i+1)]
                probs = softmax(scores)
                joined.extend(sum(probs[j]*vs[j][k] for j in range(i+1)) for k in range(start,end))
            residual = [a+b for a,b in zip(row,linear(joined,w["out"]))]
            hidden = [v.relu() for v in linear(self.norm(residual),w["ff1"])]
            result = [a+b for a,b in zip(residual,linear(hidden,w["ff2"]))]
            outputs.append(linear(self.norm(result),w["head"]))
        return outputs

    def loss(self, ids, targets):
        return sum(-softmax(logits)[target].log() for logits,target in zip(self.forward(ids),targets))/len(ids)


def run(steps=120, seed=7, output=None):
    if steps < 1:
        raise ValueError("steps必须为正")
    rng = random.Random(seed)
    model = TinyGPT(seed)
    ids = [VOCAB.index(ch) for ch in TEXT*4]
    fixed_x,fixed_y = ids[:CONTEXT],ids[1:CONTEXT+1]
    initial = model.loss(fixed_x,fixed_y).data
    m,v = [0.0]*len(model.parameters),[0.0]*len(model.parameters)
    history = []
    for step in range(1,steps+1):
        start = rng.randrange(len(ids)-CONTEXT)
        loss = model.loss(ids[start:start+CONTEXT],ids[start+1:start+CONTEXT+1])
        # 某步没出现的embedding也要清零，防止沿用上步梯度。
        for p in model.parameters:
            p.grad = 0.0
        loss.backward()
        norm = math.sqrt(sum(p.grad*p.grad for p in model.parameters))
        clip = min(1.0,1.0/max(norm,1e-12))
        for i,p in enumerate(model.parameters):
            g = p.grad*clip
            m[i] = .9*m[i]+.1*g
            v[i] = .999*v[i]+.001*g*g
            p.data -= .015*(m[i]/(1-.9**step))/(math.sqrt(v[i]/(1-.999**step))+1e-8)
        if step == 1 or step % 20 == 0:
            history.append({"step":step,"loss":loss.data})
    final = model.loss(fixed_x,fixed_y).data
    generated = [VOCAB.index("猫")]
    for _ in range(39):
        logits = model.forward(generated[-CONTEXT:])[-1]
        generated.append(max(range(len(logits)),key=lambda i:logits[i].data))
    report = {"seed":seed,"steps":steps,"parameters":len(model.parameters),
              "initial_fixed_loss":initial,"final_fixed_loss":final,"history":history,
              "sample":"".join(VOCAB[i] for i in generated),
              "scope":"自编重复语法的拟合检查，不是独立测试集或泛化成绩"}
    if output:
        path=Path(output);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return report


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--steps",type=int,default=120)
    parser.add_argument("--seed",type=int,default=7)
    parser.add_argument("--output")
    args=parser.parse_args()
    run(args.steps,args.seed,args.output)
