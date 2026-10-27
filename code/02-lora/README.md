# LoRA低秩适配

环境：Python 3.10+，只用标准库，无第三方依赖、无需显卡或网络。Windows PowerShell、macOS和Linux均从项目根目录执行。

```bash
python code/02-lora/main.py
```

预期：5个可训参数；最终loss低于1e-6；底座不变；合并误差低于1e-10。

目标特意为rank-1更新。改成满秩目标观察表达限制；对比A/B都为零的失败初始化。此项目不下载真实模型，不执行QLoRA或大模型SFT。

运行时间依电脑而异，微型GPT默认约数秒到数十秒。若 Python 命令不存在，先安装Python并确认 python --version；若从其他目录运行，先回到项目根目录。无GPU无需切换模式，默认即CPU。

验收后填写上级目录 experiment-report.md，区分训练拟合、独立测试与教学假设。
