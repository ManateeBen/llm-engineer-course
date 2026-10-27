# RAG检索与引用基线

环境：Python 3.10+，只用标准库，无第三方依赖、无需显卡或网络。Windows PowerShell、macOS和Linux均从项目根目录执行。

```bash
python code/07-rag/main.py
```

预期：6个检索/拒答样例通过；删除文档后不再引用。

自编4条运维文档，英文词与中文二元片段做BM25。默认答案为证据摘录，未接LLM。可运行 python code/07-rag/main.py --query "OOMKilled 怎么办？"。接生成模型后需另测生成忠实度，不复用此小集宣称效果。

运行时间依电脑而异，微型GPT默认约数秒到数十秒。若 Python 命令不存在，先安装Python并确认 python --version；若从其他目录运行，先回到项目根目录。无GPU无需切换模式，默认即CPU。

验收后填写上级目录 experiment-report.md，区分训练拟合、独立测试与教学假设。
