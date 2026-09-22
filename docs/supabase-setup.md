# Supabase 接入（PostgreSQL + Storage）

这一步不需要修改 GitHub Pages 的密钥。浏览器继续访问 Render 后端，只有 Render 能访问 Supabase 的 service role。

## 1. 创建数据结构

1. 在 Supabase 创建一个项目。
2. 打开 **SQL Editor**。
3. 复制并运行 `supabase/migrations/001_relay_storage.sql`。

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

## 价格建议的来源规则

只有 `source_type = platform_transaction` 且双方确认的成交记录会优先用于同类价格中位数。上传截图是 `uploaded_record`，公开网页是 `public_asking_price`，两者不会伪装成本站成交价。少于 3 条平台样本时展示记录，但不自动给出中位数建议。
