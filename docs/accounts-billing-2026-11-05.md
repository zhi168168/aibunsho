# 登录与月付报告

## 本轮实现

- 参考 Typeflow 的 Better Auth、PostgreSQL、Google OAuth、SMTP、Waffo 架构。独立 Cookie 前缀、站点 origin、商品与数据库；按用户授权复用 Waffo 商户凭据，SMTP 待补齐。未复制 Typeflow 账户记录，本站使用独立认证密钥。
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
- Typeflow 的 Vercel SMTP 值为只写密文，无法读取复制；未修改 Typeflow 的配置，需要补充原 SMTP 凭据。

最新验证：28 项 TypeScript 测试及10项账户/计费测试通过，生产构建通过；Waffo 真实只读订单查询（含付款金额快照字段）通过。金额校验按税前套餐价和实际含税支付总额分别核对，未付款的第0期不授予权限。没有进行真实扣款，也未完成 Google 真实登录、SMTP 投递或支付沙箱全流程。

本站 Vercel Production 已安装 `ACCOUNT_ORIGIN`、`AUTH_DEV_MODE=false`、独立 `BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，全部为 Secret；Preview 未安装。Vercel 页面确认保存成功，新部署后才生效。

代码尚未推送或发布；支付配置仍待安装。上线前须完成 SMTP、Waffo 生产启用与 webhook 配置及实际登录/支付联调，避免付费报告暂时关闭。
