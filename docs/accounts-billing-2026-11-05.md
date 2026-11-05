# 登录与月付报告

## 本轮实现

- 参考 Typeflow 的 Better Auth、PostgreSQL、Google OAuth、SMTP、Waffo 架构。独立 Cookie 前缀、站点 origin、商品与数据库；按用户授权复用 Waffo 商户凭据，SMTP 已复用 Resend，本站使用独立受限发信凭据。未复制 Typeflow 账户记录，本站使用独立认证密钥。
- 邮箱注册后必须验证；支持登录、确认邮件重发、密码重设与退出。Google OAuth 回调 `/api/auth/callback/google`。不开放账户删除，避免删除记录后失去订阅管理及首购历史。
- Basic：$9.99/月，首次付费30天$4.99，每期60,000词。Pro：$29.99/月，首次付费30天$14.99，每期260,000词。仅月付，自动续费，无年付入口。
- 两个付费套餐都使用既有完整报告功能，差别仅词数。未新增或承诺专家面板、批量分析、查重、事实核查。
- 基础本地分析与普通模型评论维持免费行为；付费额度用于完整报告。客户端不能通过隐藏按钮或修改套餐参数绕过服务端校验。
- 词数采用日语 `Intl.Segmenter('ja', {granularity:'word'})` 的 `isWordLike` 段；不是字符数、不按空格简单切分。只在服务端计费，需保持生产Node/ICU版本一致。
- 报告开始前按账户加事务锁预留全文词数；成功结算、失败释放。异常退出的预留在5分钟后下次请求时回收。未使用额度不结转。
- 已生成报告只在浏览器内存保留，重开不扣费；刷新后再次生成会重新扣费。OAuth/支付跳转前草稿临时保存在当前标签页sessionStorage，返回恢复后删除。
- 订单仅在服务端向Waffo查询后发放权限，校验商店、模式、买家、商品、金额、币种和已支付的当前账期。返回URL不是付款证明。退款与续费按提供商最新记录对账。
- 回调按原始请求验签、校验模式与商店，先持久化事件再确认接收。重复回调幂等；未知订单事件保持未处理。状态查询与报告调用也主动对账。
- 避免重叠购买：有活跃、取消中、欠费或已建提供商订单时需先管理现有订阅。当前不开放即时跨档升降级；原合同到期后可购买另一档，首月优惠不重复。

## 首月价格如何落地

Waffo SDK 0.26支持订阅产品 `prices.USD.trialAmount`，并要求 `metadata.trialDays`。采用30天付费首期，后续按monthly正常金额续费。页面明确写“初月（30日間）”。不能使用 `priceSnapshot` 实现首月折扣，因为它会覆盖后续常规周期价格。首次已支付的trial与后续账期都必须有本期成功、未退款、金额相符的付款记录。

## 配置与迁移

参照根目录 `.env.example` 配置，所有密钥只能在服务端：

1. 独立PostgreSQL数据库（TLS）、ACCOUNT_ORIGIN=https://aibunsho.com、32字符以上独立BETTER_AUTH_SECRET。
2. SMTP_HOST/FROM及必要的SMTP_USER/PASS；Google OAuth Client ID/Secret。Google控制台须添加本站回调URI。
3. Waffo商户凭据、本站独立商店、Basic与Pro商品ID，环境先test。
4. 执行 `pnpm auth:migrate` 和 `pnpm billing:migrate`。生产启动不自动修改数据库结构。
5. `pnpm billing:setup` 默认仅输出商品设计，不修改远程。配置test凭据后，`pnpm billing:setup --create-test-products` 创建测试产品及共享首期资格的产品组，引用写入被忽略的`.env.billing.generated`。需将引用合并进实际环境配置。
6. 配置Waffo webhook为 `https://aibunsho.com/api/billing/webhook`。禁止用Typeflow商品ID代替本站商品。
7. 真正生产发布前必须验证测试支付、30天付费trial字段/付款期号、续费、取消、退款，以及Google真实登录和SMTP实际投递。自动测试不能替代支付平台的真实联调。

## 验证与当前边界

自动测试覆盖注册→验证→登录→密码重设→退出的真实本地HTTP流程，Google授权URL及本站回调，日语词数、并发限额、异常释放、续费重置、退款撤权、订单身份、CSRF、签名/过期/跨模式回调、直接请求报告失败关闭。支付提供商返回值使用模拟数据，没有真实扣款。

2026-11-05 已完成的远程配置：

- 经用户确认接受 Neon/Vercel 集成条款，创建免费数据库 `aibunsho-accounts`，Neon 项目 `mute-shape-57794090`，Vercel 资源 `store_OXOcHXC39sUp66nw`。仅连接本站 Production，Preview 不连接；Neon Auth 与 Realtime 关闭。
- 独立远程数据库已成功执行账户及计费迁移，连接信息保存在被忽略的本地环境文件及 Vercel Sensitive 变量中。
- 同一 Waffo 商户下创建独立商店 `STO_0trboJi28jvef6MrEeTWgu`；Basic 测试商品 `PROD_5Bf2cdDHO4Hn5YKkpUK7a4`、Pro 测试商品 `PROD_0Nc2opGobFB7UiE3GLDsFf`，两档价格、30天首期及词数已远程回读核实。商店 `prodEnabled=false`，尚不能正式收款。
- 创建 Google Cloud 独立项目 `aibunsho`。经用户确认接受 Google API 用户数据政策，创建 Web 客户端 `Aibunsho Production Web`；授权来源 `https://aibunsho.com`、唯一回调 `https://aibunsho.com/api/auth/callback/google`，授权域名 `aibunsho.com`。品牌配置包含本站首页、隐私及条款链接，受众为外部正式版。只使用基本身份、邮箱、个人资料范围。凭据保存在忽略的本地环境文件中。
- Typeflow 的 Vercel SMTP 值为只写密文，无法读取复制；已找到原服务为 Resend，typing-animation.com 发信域名已验证。经用户授权创建 Aibunsho SMTP 专用 Sending access 密钥，仅限 typing-animation.com；已保存到忽略的本地 .env 和本站 Vercel Production Secret，SMTP 实际认证成功。不修改或撤销 Typeflow 原密钥。

最新验证：28 项 TypeScript 测试及15项账户/计费/内容检查测试通过，生产构建通过；Waffo 真实只读订单查询（含付款金额快照字段）通过。金额校验按税前套餐价和实际含税支付总额分别核对，未付款的第0期不授予权限。Google 已完成线上真实登录和会话恢复；没有进行真实扣款，SMTP 已完成线上真实投递、验证和密码登录；支付沙箱全流程未完成。

本站 Vercel Production 已安装 `ACCOUNT_ORIGIN`、`AUTH_DEV_MODE=false`、独立 `BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，全部为 Secret；Preview 未安装。Vercel 页面确认保存成功，新部署后才生效。

代码已通过 911df26、4c69644 推送并发布到 Vercel Production（dpl_whKJaKQPnVWkRAxNaVZzSeAX1A9f，Ready）。已合并远端同期提示词与结果文案更新。线上 /pricing/、/privacy/、/api/auth/config、/api/auth/get-session 和网站验证文件均验证成功。Waffo 服务端配置已安装为 Production Secret，但环境仍为 test 且 WAFFO_CHECKOUT_ENABLED=false；界面和后端均关闭购买。SMTP 未安装时邮箱注册和密码恢复返回不可用，Google 可用。

## Waffo 业务审核与内容检查（最新）

- 本站客服邮箱采用同一 Gmail 的独立别名 zhihaosong168+aibunsho@gmail.com，已验证；未解绑 Typeflow 原联系邮箱。
- 域名 aibunsho.com 已通过 well-known 文件验证。独立公开定价页、运营者与客服联系、订阅/退款/隐私政策已发布。平台网站自检结果为：未发现明显问题，可以提交。
- 经用户授权同意费率后，12步业务申请已成功提交，页面显示“审核中”。工单 TKT_07CYezVIuJCw1H0MrX084E，提交时间 2026-11-05T13:08:08.762Z。审核通常为1–3个工作日，尚未正式启用收款，生产商品和生产webhook尚未发布。
- Waffo Prompt Sift 输入/输出检查已接入并启用；真实接口对两段无敏感内容的部署样例均返回 allow。block 返回422、review/异常返回503；失败不结算完整报告词数。按9000 UTF-16长度切块并重叠256，记录哈希、判定、原因和处理ID，不记原文，30天后清理。远端数据库已迁移 content_safety_events 表。
- Waffo 费率：卡/钱包成功交易3.9%+$0.50；微信3.9%；特定失败交易$0.30；卡退款$1且原手续费不退；提现1%且最低$10；首次拒付$25、主动抗辩$10、仲裁前$25。来源 https://docs.waffo.ai/zh/mor/fees 。

发布后补充：75bf086 修复 Vercel 原生 Node ESM 对无扩展名导入的解析错误；本地原生编译导入检查、43项测试与生产构建通过，Vercel Ready。线上 /api/detect GET 200；匿名完整报告POST 401；普通模型真实POST 200，返回DeepSeek摘要与5条原文观察（包含输入/输出内容检查链路）。未认证结算请求401、无签名Webhook401。fc0ae25 将未开放购买的账户提示改为购买准备中。

## SMTP 生产验证完成

- Vercel Production 五项 SMTP 配置均为 Secret，Preview 不配置；重新部署 Ei7aUV8DVZo5YhLphHU3159rufaP 已 Ready，线上 emailRegistration/passwordReset/google 均为 true，checkoutEnabled=false。
- 以站点所有者 Gmail 独立测试别名注册，线上返回200且待验证。Resend 消息 01a1abd8-40d8-7dba-86d8-8e2c9a9c3576 显示 Delivered，Gmail 实际收到验证邮件。首封进入垃圾邮件，已对该测试邮件标记非垃圾邮件；不据此声称所有收件人的收件箱投递率已验证。
- 点击邮件验证后，密码登录200、会话确认 emailVerified=true、退出200；密码恢复请求200。测试密码仅保存在被忽略的 work/production-auth-test.json。未修改用户原有密码、未产生真实扣款。
- 审核凭证：waffo-review-pending.png；生产配置：smtp-production-configured.png；实际收信：smtp-live-delivery.png。
