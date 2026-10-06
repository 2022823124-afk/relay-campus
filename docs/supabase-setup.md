# Supabase 接入（PostgreSQL + Storage）

这一步不需要修改 GitHub Pages 的密钥。浏览器继续访问 Render 后端，只有 Render 能访问 Supabase 的 service role。

## 1. 创建数据结构

1. 在 Supabase 创建一个项目。
2. 打开 **SQL Editor**。
3. 复制并运行 `supabase/migrations/001_relay_storage.sql`。
4. 再运行 `supabase/migrations/002_accounts.sql`，创建私有账号同步表。

脚本会创建：

- `items`：物主确认后的交易卡和审核状态；
- `item_images`：照片类型与私有 Storage 路径；
- `transactions`：买卖双方确认后的真实平台成交；
- `price_records`：按来源分开的价格样本；
- 私有 `item-images` 图片桶。

所有表已开启 RLS，第一版不允许浏览器直接读写；Render 使用 service role 访问。

## 2. 在 Render 配置三个变量

进入 Render 的 `relay-campus-agent` 服务 → **Environment**，新增：

| 变量 | 从哪里复制 |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key（`sb_secret_...`） |
| `SUPABASE_STORAGE_BUCKET` | 填 `item-images` |

`SUPABASE_SECRET_KEY` 不要发到聊天、不要放进 GitHub，也不要写成任何 `VITE_` 变量。保存后让 Render 重新部署。旧项目只有 JWT 格式的 `service_role` 时，也可临时放进 `SUPABASE_SERVICE_ROLE_KEY`，但新项目优先使用 Secret key。

## 3. 检查是否接通

打开 Render 后端的 `/health`。看到下面字段即表示环境变量已加载：

```json
{"databaseConfigured": true}
```

然后在网站发布一件测试物品。Supabase 的 Table Editor 中应出现一条 `items`，Storage 的 `item-images` 中应出现对应照片。网站仍先把它放进工作人员审核状态。

## 邮箱账号与跨设备同步

在 Supabase 的 Authentication → Providers 中开启 Email，保留邮箱确认。Authentication → URL Configuration 的 Site URL 设置为 `https://2022823124-afk.github.io/relay-campus/`；注册验证后回到网站，使用邮箱与密码登录。正式开放前配置自己管理的 SMTP，并按 Supabase 文档设置邮件发送限制。

Render 使用已有 Supabase 后端密钥代理普通 `/auth/v1/signup`、密码登录与令牌刷新，不使用管理员创建用户或跳过邮箱确认。用户密码不写入网站的本地存储或数据库。浏览器只保存自己的会话令牌，后端每次加载、保存账号数据都先向 Supabase 验证用户，忽略浏览器提供的用户编号。

`account_states` 保存收藏、物品和发布记录、学校、接力树故事与养成进度。表开启 RLS，不向匿名或浏览器角色开放访问；由后端按已验证的用户编号访问。它是个人进度备份，不能作为正式订单、商家审核或奖励结算的权威依据。

访客与每个账号使用独立的本机存储。登录不会自动把访客数据发送到账号；用户可在“我的账号”选择合并访客收藏和发布记录。现有账号里的同编号物品优先保留，访客原记录也保留。接力树的访客进度不自动导入，避免把试玩奖励变成账号奖励。

更新使用版本号条件写入：两台设备同时修改时，较旧的一台暂停同步并提示重新加载，不能静默覆盖较新的记录。断网或云端失败时继续保留当前账号的本机记录。重新加载前会提示用户保留尚未同步的修改。

验收顺序：注册测试邮箱并完成验证 → 收藏一件物品 → 等待“已同步到账号” → 在另一个浏览器登录同一账号 → 检查收藏与小芽进度 → 登录不同账号确认数据隔离。在线数据库尚未配置时，网站应提示账号服务未连接，不应宣称已经同步。

官方说明：[邮箱密码认证](https://supabase.com/docs/guides/auth/passwords)、[后端密钥](https://supabase.com/docs/guides/getting-started/api-keys)。

## 价格建议的来源规则

只有 `source_type = platform_transaction` 且双方确认的成交记录会优先用于同类价格中位数。上传截图是 `uploaded_record`，公开网页是 `public_asking_price`，两者不会伪装成本站成交价。少于 3 条平台样本时展示记录，但不自动给出中位数建议。
