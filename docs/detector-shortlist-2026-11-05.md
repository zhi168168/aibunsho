# 日语 AI 文本检测开源项目筛选

核查日期：2026-11-05。目标：为 aibunsho.com 选择真正的日语检测引擎，替代把统计规则或 DeepSeek 主观打分作为主要检测依据的方案。

本次核查实际读取了 GitHub README、源码、许可证、实验文件和 Hugging Face 模型卡。没有安装第三方推理代码、下载模型权重、调用付费接口或评测检测准确率。以下是候选资格筛选，不是本站效果排行榜。

## 结论

1. **首选进入离线评测：Greyscope v2**。有明确的日语训练、可下载专用权重、推理入口和商用友好的代码/权重许可证。但外部测试暴露明显误报风险，不能直接宣称准确。
2. **日语研究对照组：Rio-Rf/Lab-AITextDetection**。真正使用日语模型的 Binoculars 分支，有日语数据实验；代码需修整，模型和实验较旧，双模型推理更重。
3. **Fast-DetectGPT 为第三顺位算法基线**。实现成熟度与研究价值较好，但所读官方材料未给出足以支持本站日语生产承诺的专门验证，必须另选日语评分模型并重校准。
4. 当前没有筛选出一个“只部署在现有 Vercel、无需额外推理服务、又有充分日语效果证据”的即插即用方案。

## 候选比较

| 项目 | 原理和日语证据 | 许可核查 | 部署与决定 |
|---|---|---|---|
| [Greyscope v2](https://github.com/yaoandy107/greyscope) | Qwen3.5-4B LoRA + 四级 CORN 序数分类头；训练配置与模型卡均明确包含日语 | LICENSE 正文：代码 MIT，v2 权重 Apache-2.0；v1 是 CC BY-NC-SA 4.0，不可混用 | 优先离线评测。需要独立 Python 推理服务；bf16 文件约 8.4 GB，NVIDIA int4 约 3.5 GB；文件大小不等于峰值显存 |
| [日语 Binoculars 分支](https://github.com/Rio-Rf/Lab-AITextDetection) | 日语 rinna 3.6B 基座/指令模型对，默认使用 focal loss 改造；Livedoor/OSCAR 与 GPT-3.5 生成文本实验 | 仓库 LICENSE.md 为 BSD-3-Clause；底层模型/数据许可仍需分别核查 | 第二候选，需要维护推理代码和双模型服务，不能原样上线 |
| [Fast-DetectGPT](https://github.com/baoguangsheng/fast-detect-gpt) | 条件概率曲率，直接计算 token 概率信号；当前 README 推荐 Llama3-8B 模型对，但这不证明日语表现 | 代码 MIT；所选模型许可另算 | 研究基线，日语模型选择和阈值校准另做。官方 demo API 的存在不代表其日语能力已验证 |
| [Binoculars 原版](https://github.com/ahans30/Binoculars) | Falcon 7B 模型对的困惑度/交叉困惑度；README 明确英语更强 | BSD-3-Clause；README 另说明本实现面向学术用途，不能把展示 demo 当成成熟消费产品 | 不作为日语默认引擎，优先看日语分支 |
| [DetectGPT](https://github.com/eric-mitchell/detect-gpt) | 原文和扰动文本的概率曲率，需要评分模型与扰动模型 | 代码 MIT；底层模型另核查 | 原理参考；不优先承担在线工具请求，推理工作量更大 |
| [Desklib v1.01](https://github.com/desklib/ai-text-detector) | 微调 DeBERTa 分类器；[模型卡](https://huggingface.co/desklib/ai-text-detector-v1.01)明确写 English、language: en | 模型卡 MIT | 排除本站日语首选；不能把英文 RAID 成绩搬成日语准确率 |
| [浏览器多语言 ONNX 转换](https://github.com/mujian2026/multilingual-ai-text-detector) | XLM-R 分类器转换；作者明确日语只是实验信号，上游训练/评测为英、中、越 | 转换代码 MIT，源权重授权需单独核对 | q4 约 181 MB，能浏览器运行但日语证据不足；不为部署方便而选作主引擎 |
| [日语文体随机森林](https://github.com/m4fn3/Stylometric-analysis-of-Japanese-AI-generated-text) | 有训练的文体分类器，Wiki40B-ja 对 GPT-4o 生成文本；不同于本站手工等权计分 | 未发现明确仓库许可证，GitHub license=null；仓库已 archived | 可研究特征设计，暂不直接复制到商业站；单一题材/生成器的泛化也需验证 |

## Greyscope v2：推荐试验，但效果证据有边界

已读取的证据：

- [模型卡](https://huggingface.co/yaoandy107/greyscope-v2-qwen3.5-4b)：明确训练语言包括英、日、繁中，不能解释为仅“能输入日语”。
- [固定版本训练配置](https://github.com/yaoandy107/greyscope/blob/02df6e3c6cfb56039b95ac71167337f7de1c0464/configs/train.yaml)：日语与其他语言共同训练/采样。
- [发布评测文件](https://github.com/yaoandy107/greyscope/blob/02df6e3c6cfb56039b95ac71167337f7de1c0464/benchmarks/results/v2-summary.json)：Beemo 2,997 样本，AUROC=0.819；作者标记的发布阈值 FPR=0.132，TPR=0.553。即该测试里人工文本约 13.2% 被误标，AI 文本约 55.3% 被检出。这不是日本语专属成绩，也不是本站实测。
- 同一文件 Beemo 的 `TPR @ 1% FPR` 为 0.063，说明压低误报可能显著牺牲检出率；不能只看 AUROC，也不能把 0.819 说成“准确率 81.9%”。
- 作者三语测试集合并结果存在，但所读发布摘要没有足以确定本站日语效果的分语言指标，仍需日语独立测试。
- [推理实现](https://github.com/yaoandy107/greyscope/blob/02df6e3c6cfb56039b95ac71167337f7de1c0464/greyscope/inference.py)及模型 `calibration.json`：必须使用 CORN 专用解码，不能直接把三个 logits 当作三类 softmax 概率。AI 参与程度分数不是作者使用 AI 的校准概率。
- 输入最多 2,048 tokens。本站支持 10,000 字，接入时必须处理超长文本，不能静默只检测开头却宣称全篇检测；分段后的文档汇总也需验证。
- int4 3.5 GB 是权重文件体积，不是显存保底要求。作者的 M1 Pro 32GB 测速不等于当前 Windows/GPU/云服务器性能，不能据此承诺本站延迟或报价。

商业集成时锁定 **v2** 权重，保留 MIT/Apache 通知，并核查基座模型和依赖条款。GitHub 自动识别为 Other，实际 LICENSE 文字已经明确区分代码/v2/v1，不应只凭 API 的许可证标签作决定。

## 日语 Binoculars：有针对性，但不是成品 API

核查版本：`f5989050b709b6ac14f0eeb2d05afef1476cef5c`。

- [detector.py](https://github.com/Rio-Rf/Lab-AITextDetection/blob/f5989050b709b6ac14f0eeb2d05afef1476cef5c/binoculars/detector.py)：默认 `rinna/japanese-gpt-neox-3.6b` 与 `rinna/japanese-gpt-neox-3.6b-instruction-sft`，确实是日语模型。
- [实验元数据](https://github.com/Rio-Rf/Lab-AITextDetection/blob/f5989050b709b6ac14f0eeb2d05afef1476cef5c/experiments/results/test/LD-News-gpt-3.5-turbo-512-tokens/experiments_details.json)：Livedoor 新闻对 GPT-3.5、512 tokens、实验时间 2024-07。对新生成器、作文和现代改写方式的效果不能直接推定。
- GPU 设备硬编码 `cuda:2` 和 `cuda:1`，不适合普通单 GPU 环境，需改为可配置。
- 默认 `mode="low-fpr"` 引用 `BINOCULARS_FPR_THRESHOLD`，但该常量在当前源码中均被注释。静态检查即可发现原样构造可能报错；必须修复并重新校准，不应仅取消注释照搬旧阈值。
- 需重验截断、批量请求、显存占用、阈值与结果解释。代码使用 `trust_remote_code=True`，正式集成需审阅并锁定模型代码版本。
- 虽有实验输出，不把未复算的图表或旧阈值作为本站准确率证据。

## 与现有 Vercel 网站的衔接

推荐结构：

```text
用户浏览器 → Vercel /api/detect → 独立检测推理服务 → 专用模型
```

Vercel 继续承担页面和轻量代理；数 GB 模型放在独立的 Python/GPU 服务。CPU 方案可以测试，但在没有硬件实测前不承诺并发和延迟。独立服务有算力成本，开源不等于线上运行免费；本次未购买实例或报价。

DeepSeek 可以保留为可选文体建议，但不应伪装成专用模型检测结论，也不能把两个不校准分数简单平均后当作更准确的概率。没有足够证据的结果返回不确定。

## 下一阶段的验收门槛

1. 先选 Greyscope v2 做离线 POC，日语 Binoculars 做对照。此处尚未接入生产。
2. 初步至少 200 篇来源可信的人工日语与 200 篇已知生成来源的日语；覆盖新闻、报告、博客、作文及不同长度/生成器。该规模仅初筛，不能精确证明低至 1% 的误报率。
3. 改写/润色/人机混写单列；人工文本不由语言模型凭空冒充。按文档来源拆分校准集和测试集，避免同一原文的变体泄漏。
4. 分别报告 FPR、TPR、混淆矩阵、样本数、置信区间、长度/题材分组，以及实际延迟、峰值内存和并发；不只报告 AUROC 或“总体准确率”。
5. 用校准集选阈值，冻结后只在独立测试集验收。没有达标则不替换线上引擎，也不写“日语高准确率”。

本次抓取的原始资料位于本地 `docs/research-sources/`，用于核对来源；没有把第三方模型或代码集成进现有应用。
