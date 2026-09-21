# DeepSeek 接入与部署

适配已完成：图片＋物主原话生成草稿，以及联网价格资料的筛选，都通过同一个模型适配层调用。已有的价格、来源、确认和审核规则保持不变。

依据 [DeepSeek 官方图像理解文档](https://api-docs.deepseek.com/guides/vision/) 和 [JSON 输出文档](https://api-docs.deepseek.com/guides/json_mode/)，默认使用 `deepseek-flash`，请求发送到 `https://api.deepseek.com/chat/completions`。密钥只读取后端 `DEEPSEEK_API_KEY`，前端不接触它。

## 当前状态

代码和模拟接口契约测试已完成。尚未填入用户密钥、尚未部署线上后端、尚未发起真实 DeepSeek 调用，所以不能声称 AI 已启用。

## Render 部署准备

仓库根目录 `render.yaml` 为 [Render Blueprint](https://render.com/docs/blueprint-spec)，指定 `free` 实例，不自动选择付费计划。只安装 DeepSeek 所需的小型依赖集，不下载 Qwen/AgentLego 本地模型。

1. 在 Render 登录后，从此 GitHub 仓库创建 Blueprint，使用仓库中的 `render.yaml`。
2. 在 Render 私密环境变量输入 `DEEPSEEK_API_KEY`；另外设置自己选择的 `RELAY_ACCESS_CODE`，作为课堂体验访问码，**它不是 DeepSeek 密钥**。不要把任何密钥提交到代码或聊天。
3. 部署成功后复制 Render 提供的实际 HTTPS 后端地址。不要猜测服务域名。
4. 在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 设置 `VITE_AI_ENDPOINT` 为该地址。工作流已读取这个变量，再运行一次 Pages 部署即可连接。
5. 网站第一步的“AI 服务访问码”输入课堂体验码，只在当前标签页保存。识图与联网查询请求都带这个码；未通过校验的调用不会进入模型。

健康检查 `/health` 只显示提供方与配置状态，不显示密钥，也不表示模型账户余额或网络调用已验证。公开模式若缺访问码会拒绝请求。当前共享访问码适用于小组试用，正式校园产品需要真实账户鉴权、持久配额和费用监控。

Render 免费服务存在休眠和资源限制，首次请求可能较慢，具体以 [Render 官方免费服务说明](https://render.com/docs/free) 为准。模型 API 本身按 DeepSeek 账户规则计费，托管免费不等于模型免费。

## 价格能力的区别

DeepSeek 负责理解与筛选，不自带本站的实时交易数据库。联网价格还需要后端 `TAVILY_API_KEY`；仅配置 DeepSeek 时，图片整理可以调用，市场比价仍会提示未配置。本站示例报价始终单独标明，不能伪装成市场成交价。

## 本机调试

在后端设置 `RELAY_PROVIDER=deepseek`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL=deepseek-flash`。选择 Qwen 时设置 `RELAY_PROVIDER=qwen`，原有配置仍可使用。`requirements-deepseek.txt` 是轻量运行依赖，完整测试环境仍用 `requirements-test.txt`。

所有网站改动均同步到原 GitHub 仓库。启用服务前以账户登录、密钥配置和实际后端 URL 为剩余步骤，不能把 Pages 静态部署当成后端部署完成。
