# 第三方来源与许可

课程中的引用文献按各单元参考资料列出，相关论文、网站和产品名称仍归其权利人所有。本项目许可证不授予这些材料的额外权利。

## 随项目分发

- **KaTeX 0.16.11**：`build/katex/` 中的公式渲染程序、自动渲染扩展和样式；MIT，Copyright (c) 2013-2020 Khan Academy and other contributors。完整声明见 [KaTeX LICENSE](build/katex/LICENSE)，上游 https://github.com/KaTeX/KaTeX/tree/v0.16.11 。
- **KaTeX fonts**：`build/katex/fonts/` 中的字体；完整 MIT 许可和版权声明见 [字体 LICENSE](build/katex/fonts/LICENSE)，上游 https://github.com/KaTeX/katex-fonts 。

构建后的离线 HTML 包含这些组件及其许可声明；PDF 嵌入排版所需字体，课程内容许可与第三方声明保持适用。

## 构建与测试依赖

Python-Markdown（BSD）、pypdf（BSD-3-Clause）和 Playwright（Apache-2.0）通过依赖清单安装，不把其安装目录提交到本仓库。各依赖的完整许可随其软件包分发。

## 教学实现

自动微分与微型 Transformer 实验为教学实现；micrograd、nanoGPT 是机制与学习方向的命名参考，不表示与对应上游项目存在隶属关系。课程使用的教学数据及示例应结合各文件中的来源和假设理解。
