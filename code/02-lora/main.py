"""CPU低秩适配实验：冻结底座、训练AB、核对合并前后输出。对应5-6。"""
import json
import random
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"common"))
from autograd import Value, linear


def run():
    rng=random.Random(7)
    # W是普通float，不进入可训参数列表；目标差值由rank-1矩阵构造。
    w=[[1.,0.,0.],[0.,1.,0.]]
    a=[[Value(rng.gauss(0,.2)) for _ in range(3)]]
    b=[[Value(0)] for _ in range(2)]
    params=a[0]+[row[0] for row in b]
    samples=[[1.,0.,0.],[0.,1.,0.],[0.,0.,1.],[1.,1.,-1.]]
    def predict(x):
        base=[sum(v*z for v,z in zip(row,x)) for row in w]
        delta=linear(linear(x,a),b)
        return [base[i]+delta[i] for i in range(2)]
    def target(x):
        z=x[0]+2*x[1]-x[2]
        return [x[0]+z,x[1]-.5*z]
    initial=None
    for _ in range(500):
        loss=sum((pred-gold)**2 for x in samples for pred,gold in zip(predict(x),target(x)))/8
        if initial is None:initial=loss.data
        loss.backward()
        for p in params:p.data-=.05*p.grad
    merged=[[w[i][j]+b[i][0].data*a[0][j].data for j in range(3)] for i in range(2)]
    probe=[.3,-.7,1.2]
    error=max(abs(p.data-sum(v*z for v,z in zip(row,probe))) for p,row in zip(predict(probe),merged))
    assert w==[[1.,0.,0.],[0.,1.,0.]]
    assert loss.data<1e-6 and error<1e-10
    report={"trainable_parameters":len(params),"initial_loss":initial,"final_loss":loss.data,
            "merge_max_error":error,"base_unchanged":True,
            "scope":"低秩线性机制实验，不是大模型SFT或QLoRA实测"}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return report


if __name__=="__main__":run()
