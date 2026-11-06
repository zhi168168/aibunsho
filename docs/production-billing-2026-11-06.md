# Waffo 正式收款配置（2026-11-06）

- 商店 `STO_0trboJi28jvef6MrEeTWgu` 的业务审核已通过，官方 API 确认 `prodEnabled=true`。
- Basic 正式商品 `PROD_5Bf2cdDHO4Hn5YKkpUK7a4`：首期30天 $4.99，之后 $9.99/月，每期60,000词。
- Pro 正式商品 `PROD_0Nc2opGobFB7UiE3GLDsFf`：首期30天 $14.99，之后 $29.99/月，每期260,000词。
- 已读取正式版本核对价格、monthly 周期、trialDays=30、词数；正式商品组共享首期资格，关闭自助跨档切换。无年付入口。
- 已配置正式 HTTP webhook `96b471ab-1ede-4baf-90fd-a833c41386b4`，地址 `https://aibunsho.com/api/billing/webhook`，testMode=false。
- 回调包含订单完成、订阅激活/续费成功/待取消/恢复/取消/欠费及退款成功事件。
- 本地忽略环境和 Vercel Production Secret 改为 `WAFFO_ENVIRONMENT=prod`、`WAFFO_CHECKOUT_ENABLED=true`；发布后生效。账户数据库及商品仍独立于 Typeflow。

本次只开启正式收款和检查收银台，不执行真实购买或扣款。真实支付、后续自动续费与真实退款不属于已验证结果；服务端仍必须验签并对账，不能以跳转成功作为付费凭证。

## 线上验证

- 激活部署 `KixXkWmetbep9nrMJVWgCry549AW`（a8f9b2c）状态 Ready。
- `/api/auth/config` 返回200，Google、邮箱注册、密码恢复和 checkoutEnabled 均为 true。
- 已验证的本站测试账户密码登录200，Basic 正式结账会话创建200；Waffo 收银台显示今日应付 $4.99，30天后 $9.99/月，无测试模式标识。
- `/api/billing/status` 返回200，mode=prod；未付款的测试账户仍为 free、fullReport=false、无有效订阅。
- 无签名 webhook 请求返回401。公开 `/pricing/` 的两档价格、词数、登录购买入口与仅月付条款正确。
- 本轮未修改业务代码，未产生实际支付；本地私有会话及测试凭据继续排除在 Git 外。
