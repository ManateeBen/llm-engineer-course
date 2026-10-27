# 从零微型GPT

环境：Python 3.10+，只用标准库，无第三方依赖、无需显卡或网络。Windows PowerShell、macOS和Linux均从项目根目录执行。

```bash
python code/01-nanogpt/main.py --output code/01-nanogpt/runs/report.json
```

预期：默认种子7、120步，固定窗口loss从约2.19降到0.75。中文样本会重复，也可能有不完整句子。

手写688个参数、8维隐藏、双头、8字符上下文、RMSNorm、残差与FFN；标准库标量反传，因此只适合很小实验。损失是同训练语法上的拟合检查，未声称泛化。增加steps或改语法后记录曲线，设计按整句隔离的测试集再讨论泛化。

运行时间依电脑而异，微型GPT默认约数秒到数十秒。若 Python 命令不存在，先安装Python并确认 python --version；若从其他目录运行，先回到项目根目录。无GPU无需切换模式，默认即CPU。

验收后填写上级目录 experiment-report.md，区分训练拟合、独立测试与教学假设。
