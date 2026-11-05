# AI 文本检测实现调研

调研日期：2026-11-05。读取了下列仓库的官方 README、Greyscope LICENSE，以及服务商 API 文档。项目没有复制这些仓库的模型或算法代码，本地统计引擎为独立实现。

| 方案 | 原理 | 本项目取舍 |
| --- | --- | --- |
| [DetectGPT](https://github.com/eric-mitchell/detect-gpt) | 比较输入文本与扰动文本在语言模型中的对数概率，使用概率曲率信号 | 需要评分和扰动模型；不是轻量前端算法，未集成 |
| [Fast-DetectGPT](https://github.com/baoguangsheng/fast-detect-gpt) | 条件概率曲率，减少扰动采样开销 | 仍需大型模型推理；README 的实验 AUROC 不是本站或日语检测的准确率 |
| [Binoculars](https://github.com/ahans30/Binoculars) | 两个语言模型间的 perplexity / cross-perplexity 对比 | 默认 Falcon 7B 组合，README 明确英语优于其他语言、用于学术目的；不直接当日语生产引擎 |
| [Greyscope](https://github.com/yaoandy107/greyscope) | Qwen3.5-4B LoRA + CORN ordinal head，分级评价 AI 参与程度 | README 声明支持日语、英语、繁中，是自部署候选；bf16 8.4 GB、int4 3.5 GB。代码 MIT，v2 权重 Apache-2.0；旧版 v1 非商用许可不能混用。此处未下载权重、未验证日语效果 |
| [DeepSeek](https://api-docs.deepseek.com/api/create-chat-completion) | 通用语言模型对文章文体做结构化评价 | 按用户选择接入，默认 `deepseek-flash`，JSON mode、关闭 thinking、验证引用。不是专用检测模型，分数不能作为概率或准确率 |
| [Copyleaks](https://docs.copyleaks.com/guides/ai-detector/ai-text-detection) | 托管专用分类 API | 作为可选适配器接入。官方语言表明确包含日语 `ja`，同步接口最少 255 字符。日语不在 AI Logic 的 6 种解释语言中 |

## 已核对的 API 约定

DeepSeek：

- `POST https://api.deepseek.com/chat/completions`，Bearer key 仅在服务端使用。
- 官方文档目前列出的模型包括 `deepseek-flash` 和 `deepseek-v4-pro`，因此不凭旧知识硬写 `deepseek-chat`。
- `response_format: { type: 'json_object' }`，同时在 system prompt 明确要求 JSON。
- `thinking: { type: 'disabled' }`，`max_tokens: 3000`，非流式请求。
- 验证 `finish_reason === 'stop'`；不完整、不合法或超范围结果均拒绝。
- 官方文档：[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)。用户添加密钥后，已通过页面实测 `deepseek-flash` 一次真实调用，返回有效日语说明和 4 条原文引用；没有评估检测准确率。

Copyleaks：

- [认证](https://docs.copyleaks.com/using-the-apis/authentication)：邮箱和 API Key 换取 access token，避免每个请求重复登录。
- [同步检测](https://docs.copyleaks.com/reference/actions/writer-detector/check)：`POST /v2/writer-detector/{scanId}/check`，发送 `text`、`language: ja`、`sensitivity: 2`，不请求日语不支持的 AI Logic。
- [语言表](https://docs.copyleaks.com/reference/actions/miscellaneous/ai-detection-supported-languages)：包含 Japanese / `ja`；AI Logic 的语言不包含日语。
- [响应结构](https://docs.copyleaks.com/reference/data-types/ai-detector/ai-text-detector-response)：`summary` 是整体分类比例，`results[].probability` 是区分的分类信心；两者不混淆。
- Sandbox 固定响应必须明确标记为测试，不能冒充真实结果。
- 公开定价页抓取受到访问限制，未核实 API 套餐价格，也没有购买额度或创建账户。

## 本地统计不等于模型检测

本地引擎只计算实际可观察的指标，四项可用指标等权平均得到“文章規則性スコア”。不足 3 句时，句长和句末跨句统计不可用，不会用 0 冒充真实值。样例仅展示不同文体，不能拿来证明检测准确率。

DeepSeek 辅助评价、Copyleaks 分类与本地统计是三种不同性质的输出。页面、报告、接口错误和隐私说明都明确区分，不会静默把失败的模型调用替换成本地结果。
