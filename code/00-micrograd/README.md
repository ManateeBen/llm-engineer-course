# 自动微分

环境：Python 3.10+，只用标准库，无第三方依赖、无需显卡或网络。Windows PowerShell、macOS和Linux均从项目根目录执行。

```bash
python code/00-micrograd/main.py
```

预期：解析梯度7，有限差分约7；最终拟合损失约1.3e-11。

修改目标函数，并同时改解析导数对照。检查共享节点的梯度累加，试验学习率太大时会怎样。

运行时间依电脑而异，微型GPT默认约数秒到数十秒。若 Python 命令不存在，先安装Python并确认 python --version；若从其他目录运行，先回到项目根目录。无GPU无需切换模式，默认即CPU。

验收后填写上级目录 experiment-report.md，区分训练拟合、独立测试与教学假设。
