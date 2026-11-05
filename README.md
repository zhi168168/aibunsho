# AIチェッカー

围绕日语关键词「aiチェッカー」的工具站。React 19 + TypeScript + Vite，构建时预渲染日语首页，Vercel Serverless API 处理模型请求。

## 运行

需要 Node.js 22+ 和 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

开发和预览地址为 http://localhost:5173 。开发与预览服务器均挂载真实的 `/api/detect` 服务。

## 启用 DeepSeek

本地 `.env` 已准备，密钥保持空白，不进入 Git。只在本机编辑它：

```dotenv
DETECTION_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-flash
DETECTION_ENABLED=true
```

在 `DEEPSEEK_API_KEY=` 后填入真实密钥。Vite 会在 `.env` 更新后重启；如果没有自动恢复，重新运行 `pnpm dev`。不要使用 `VITE_` 前缀保存密钥，不要将密钥发在聊天中。

默认模型 `deepseek-flash` 根据 2026-11-05 读取的官方 Chat Completions 文档选择。可通过 `DEEPSEEK_MODEL` 更换账号支持的模型。模型调用固定发往官方 `https://api.deepseek.com/chat/completions`。

DeepSeek 是通用语言模型，此处提供**辅助文体评价**，不是训练过的专用 AI 检测器。0–100 分是模型的主观参考尺度，不是 AI 生成概率、准确率或校正过的置信度。输出包括日语说明和原文引用，后端会过滤不在原文中的引用。格式异常、截断输出、认证失败、余额不足和超时均明确报错，不回退成伪造的“成功结果”。

## 已实现的功能

- 日语界面、参考 Typing Animation 的暗色导航和排版、移动端布局。
- 本地统计：句长规律、定型表达、文末重复、4 字符片段重复，以及句首、局部语句多样性、段落和相邻句相似度，共 8 指标。100–10,000 字符，实际计算，不上传文本。
- DeepSeek 辅助评价 v2：8 项观测指标输入、4 维审查、支持/其他解释/模糊证据分组、原文引用与重叠校验、材料不足保留判断、报告导出；每次只调用一次 API。
- 可选 Copyleaks 专用分类器适配器：整体比例、文本区分、模型版本。日语不支持 AI Logic 短语解释，因此不展示伪造的解释。
- TXT 导入、拖放、字符计数、清空、Ctrl/Cmd+Enter、样例、逐句分析、复制和 TXT 报告下载。
- 隐私说明、FAQ、语义化标题、描述、Open Graph、FAQPage 和 WebApplication 结构化数据。
- 静态预渲染：不开 JavaScript 也能读取完整首页内容。

## Copyleaks 可选配置

```dotenv
DETECTION_PROVIDER=copyleaks
COPYLEAKS_EMAIL=
COPYLEAKS_API_KEY=
DETECTION_ENABLED=true
COPYLEAKS_SANDBOX=true
```

`sandbox=true` 返回服务商的测试数据，界面和报告会明确标记，**不是实际检测**。需要真实检测时，配置有效账号和额度，再设为 `false`。接口最低 255 字符，指定 `language: ja`。登录令牌在服务端缓存，付费扫描不会自动重试。

## 部署与域名

仓库包含 `vercel.json`。Vercel 使用 `pnpm run build`，输出目录 `dist`，`api/detect.ts` 为服务端函数。在 Vercel 环境变量中配置密钥，不能只部署静态 `dist` 来提供模型功能。纯静态托管仍可使用本地分析。

正式域名为 `https://aibunsho.com/`。本机已配置 `SITE_URL=https://aibunsho.com`，部署平台也需设置相同环境变量后再构建。构建器会生成 canonical、og:url、绝对地址的 OG/Twitter 分享图片、WebSite/WebPage 数据、sitemap.xml 和 robots.txt 中的 Sitemap。未提供域名时不编造 canonical 或站点地图域名。开发/预览服务器应只供本机使用。

模型 API 有每服务器实例每来源 5 次/小时、总计 50 次/日的保守限制。内存计数会在实例重启时清零，**不是跨实例的计费预算保证**；公开运营前需要按真实部署平台配置持久配额、入口限流与服务商预算控制。付费完整报告采用账户与数据库持久额度，不使用匿名内存配额。登录、订阅和生产配置见 [docs/accounts-billing-2026-11-05.md](docs/accounts-billing-2026-11-05.md)。

## 验证与限制

`pnpm build`、`pnpm test` 已通过。浏览器验证了本地分析、逐句切换、TXT 导入、下载、复制反馈、手机导航、FAQ 和隐私说明。用户配置密钥后，已通过生产预览页完成一次 `deepseek-flash` 真实调用，验证日语说明、4 条原文观察和报告下载。模型异常处理仍用注入模拟响应验证；Copyleaks 未真实调用，本站不宣称检测准确率。

设计对照、截图和细项验证见 [docs/qa.md](docs/qa.md)，开源研究见 [docs/detection-research.md](docs/detection-research.md)。

## SEO 逐项检查

本次 21 项审计、待上线验证项与发布流程见 [docs/seo-audit-2026-11-05.md](docs/seo-audit-2026-11-05.md)，本地 HTTP/HTML 验证记录见 [docs/seo-validation.json](docs/seo-validation.json)。新增 SEO 回归测试覆盖标题结构、页内锚点、FAQ 数据和正式 URL 一致性。只有首页具有独立搜索意图，说明与隐私使用页内锚点，不为关键词变体生成重复页面。


增强说明见 [docs/enhancement-2026-11-05.md](docs/enhancement-2026-11-05.md)。离线规则回归可运行 `pnpm exec tsx scripts/evaluate-review.ts`；加 `--live` 会对 3 个公开/内置样例各发起一次真实 DeepSeek 请求并产生费用，不在测试或构建中自动运行。样例评估不是准确率校准，未报告总体检测准确率。

## 高级报告

输入文章后点击「詳細レポートを作成」，独立调用一次 DeepSeek 生成全文区分点评、原文引用、改善建议和可选的局部改写示例，同时附8项统计、局限说明和全文。支持TXT下载，以及通过浏览器打印保存A4 PDF。当前免费开放、共用模型配额；尚无支付、报告历史或批量功能。报告仅在当前页面内存中保留。实现与真实验证见 [docs/advanced-report-2026-11-05.md](docs/advanced-report-2026-11-05.md)。

## 登录与完整报告订阅

已接入Google登录、邮箱注册/验证/登录/密码恢复，以及Waffo月付报告订阅。Basic：US$9.99/月，首次30天US$4.99，60,000词/期；Pro：US$29.99/月，首次30天US$14.99，260,000词/期。两档都包含完整报告，不提供年付。普通文章统计保持免费。生产需配置独立账户数据库、邮件和Google OAuth、本站Waffo商店及商品，执行数据库迁移；未配置时不开放真实购买。详见[配置与验证记录](docs/accounts-billing-2026-11-05.md)。
