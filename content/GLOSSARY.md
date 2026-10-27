# 术语表（单一事实来源，validate.py 按此校验正文用词）

> 格式：`正写 | 误写们`。正文一律用「正写」；英文缩写允许跟在括号内首次出现处。

层归一化（LayerNorm） | layernorm, Layer Norm, layer norm
位置编码（positional encoding） | 位置嵌入, position embedding
困惑度（perplexity） | 混淆度
缩放律（scaling law） | 规模法则, 标度律
监督微调（SFT） | 指令微调
前向传播 | 正向传播
批大小（batch size） | 批次大小
学习率 | 学习速率
模型坍缩 | 模型崩溃
交叉熵 | 交叉墒
链式法则 | 链律
分词器（tokenizer） | 分词机
检索增强生成（RAG） | 检索增强
思维链（CoT） | 思路链
投机解码 | 推测解码
预训练 | 预先训练
词嵌入（embedding） | 嵌入式表示, 嵌入层单用
推理（inference） | 推证
强化学习（RL） | 增强学习
奖励模型 | 回报模型
过拟合 | 过度拟合单独使用
欠拟合 | 拟合不足
随机梯度下降（SGD） | 随机梯度下降法
注意力（attention） | 关注机制
去重（deduplication） | 重复数据删除, 重复删除
质量过滤 | 质量筛选
合成数据 | 虚拟数据, 假数据
退火 | 回火
数据配比（data mixture） | 数据混合比例
梯度累积（gradient accumulation） | 梯度累加, 累积步单独用
持续预训练（continual pretraining, CPT） | 继续预训练
灾难性遗忘（catastrophic forgetting） | 灾难性忘记
微批大小（micro-batch） | 微批次
有效批大小（effective batch size） | 等效批大小
损失尖峰（loss spike） | 损失突刺
学习率调度（LR schedule） | 学习率计划
WSD 调度 | WSD 计划
雅可比矩阵（Jacobian） | 雅克比矩阵, 雅克比
海森矩阵（Hessian） | 黑森矩阵
泰勒展开 | 泰勒级数展开
条件数 | 条件数值
费雪信息矩阵 | 费希尔信息矩阵
算子（kernel / op） | 运算符, 操作符
算术强度（arithmetic intensity） | 计算强度
算子融合（kernel fusion） | 算子合并
前缀缓存（prefix caching） | 提示缓存
连续批处理（continuous batching） | 连续批量
分块预填充（chunked prefill） | 分块预填
专家并行（expert parallel, EP） | 专家平行
昇腾（Ascend） | 升腾
重计算（recomputation） | 重新计算
流水线气泡（pipeline bubble） | 流水线空泡
通信原语 | 通信算子
检查点（checkpoint） | 存档点, 检查站
成组调度（gang scheduling） | 集体调度
算力核算 | 算力估算单用
图编译（graph compilation） | 图编绎
RDMA（remote direct memory access） | 远程直接内存访问, 远端直接内存存取
incast 拥塞 | 汇入拥塞
显式拥塞通知（ECN） | 拥塞显式通知
优先级流控（PFC） | 优先级流量控制
性能剖析（profiling） | 性能分析器, 剖析器
端侧推理（on-device inference） | 设备端推理, 端上推理
会话迁移（session migration） | 会话搬移
级联路由（cascade routing） | 级联分流
投机式分层（speculative offloading） | 投机卸载
RLHF（reinforcement learning from human feedback） | 基于人类反馈的强化学习
PPO（proximal policy optimization） | 近端策略优化
信任区域（trust region） | 信任域
GRPO（group relative policy optimization） | 组相对策略优化
RLVR（RL with verifiable rewards） | 可验证奖励强化学习
DPO（direct preference optimization） | 直接偏好优化
隐式奖励（implicit reward） | 隐性奖励
过优化（overoptimization） | 过度优化
奖励黑客（reward hacking） | 奖励攻击
自博弈（self-play） | 自我对弈
对齐税（alignment tax） | 对齐代价
过度拒绝（over-refusal） | 过度拒答
越狱（jailbreak） | 越狱攻击
红队（red teaming） | 红蓝对抗
MLA（multi-head latent attention） | 多头潜在注意力
