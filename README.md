# LLM 工程学习课程

从基础数学、模型训练到评测、系统与 Agent 的中文学习材料，配套交互图、练习答案和 CPU 入门实验。

[在线阅读](https://manateeben.github.io/llm-engineer-course/) · [离线 HTML / PDF 下载](https://github.com/ManateeBen/llm-engineer-course/releases/latest) · [实验指南](code/README.md)

## 课程内容

首版包含 **78 个单元、12 套阶段测试、4 个可运行实验**。

| 阶段 | 内容 |
|---|---|
| 0–2 | 零起点、数学、深度学习原理 |
| 3–5 | 模型架构、数据工程、训练与 LoRA |
| 6–8 | 后训练与对齐、评测、系统工程 |
| 9–11 | 多模态、RAG 与 Agent、国产化生态 |

建议初学者按目录顺序学习，每个单元先理解例子，再独立做题，最后对照答案与退出标准。已有基础可自由跳转；闯关模式要求先通过前面阶段的测试（80%）。阅读完成标记不代表能力认证。

课程支持全文搜索、错题回看、继续学习、亮暗主题以及进度导入导出。进度保存在当前浏览器，不上传服务器；在线版、离线文件或不同浏览器之间请使用 JSON 导出和导入迁移。清理浏览器数据会清除进度。

## 本地运行

直接下载 Release 中的 `llm-course.html` 并用现代浏览器打开即可离线学习。PDF 用于阅读与打印，不包含交互功能。

修改与构建源码需要 Python 3.10+；推荐 Python 3.11 和 Node.js 22。Node.js 用于公式校验和浏览器测试。

```sh
git clone https://github.com/ManateeBen/llm-engineer-course.git
cd llm-engineer-course
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS / Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python build/build.py
```

构建生成根目录的 `llm-course.html`，公式库、字体、图表和脚本均内嵌。

## 四个 CPU 实验

实验只使用 Python 标准库，无需模型账号、显卡或联网下载权重。在项目根目录运行：

```sh
python code/00-micrograd/main.py
python code/01-nanogpt/main.py
python code/02-lora/main.py
python code/07-rag/main.py
```

这些实验分别演示自动微分、微型因果 Transformer、低秩适配与检索问答。微型 GPT 使用自编重复语法，训练损失下降不代表真实语料泛化；LoRA 实验是线性机制验证；RAG 返回证据摘录，没有调用生成模型。真实大模型 SFT、QLoRA、DPO/GRPO 训练和生产部署尚未实现。

## 验证与 PDF 构建

```sh
python build/validate.py
python -m unittest discover -s build -p "test_*.py"
npm ci
npx playwright install chromium
npm run test:browser
```

Linux 首次运行浏览器测试可用 `npx playwright install --with-deps chromium` 安装系统依赖。也可通过 `CHROME_PATH` 环境变量指定本机 Chrome。

```sh
python -m pip install -r requirements-pdf.txt
python build/pdf.py
# 浏览器无法自动发现时：python build/pdf.py --chrome /path/to/chrome
```

PDF 构建需要 Chrome、Edge 或 Chromium，中文字体需由系统提供。GitHub Actions 检查课程结构、公式、实验与浏览器交互，检查通过后自动发布在线课程。离线 PDF 在 Release 中提供。

## 参与完善

发现内容错误、公式问题或交互异常，请提交 Issue，注明单元编号、复现步骤和参考来源。修改课程后运行上述检查；新单元需要同步课程清单、阶段测试与引用。欢迎用独立测试数据补充实验结果，报告模板见 [实验报告](code/experiment-report.md)。

课程仍在完善，示例中的硬件、成本和性能数字应结合其假设理解，不代表产品实测或就业保证。

## 许可

代码采用 [MIT](LICENSE)；原创课程正文、练习和图解采用 [CC BY 4.0](LICENSE-CONTENT.md)。引用文献和第三方组件保留各自许可，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。转载课程请注明 ManateeBen、本仓库链接、许可证及修改情况。
