# 接力卡 Agent 后端

此目录提供真正的 Qwen-Agent 调用代码，不包含模型权重或密钥。GitHub Pages 只运行前端，不能运行这个 Python 服务。

## 三个项目如何使用

| 项目 | 在本项目的用途 | 边界 |
| --- | --- | --- |
| [ecommerce_multi_platform_agent](https://github.com/maizijian86/ecommerce_multi_platform_agent) | 借鉴理解→生成→校验的编排模式，本项目独立实现 | 不复制其模拟发布接口，也不接入淘宝、京东等平台 |
| [Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | `Assistant.run()` 单次多模态调用：图片＋物主原话→待确认草稿 | 必须提供可用的视觉模型服务；不开放代码执行或自动发布工具 |
| [AgentLego](https://github.com/InternLM/agentlego) | 可选 `load_tool('OCR')` 读取中英文凭证 | 需要 EasyOCR、PyTorch 和 OCR 权重；不是商品真伪鉴定 |

图片与模型输出均视为不可信资料。确定性校验限制字段、类型和长度，无法证明描述语义完全正确，因此仍需物主逐项确认。只有物主确认后的交易卡才可通过 `/items` 写入数据库；模型本身没有数据库或发布工具。

## 本机运行

在独立 Python 环境安装 `pip install -r requirements.txt`。按照 `.env.example` 为进程设置环境变量（文件不会自动加载）。

1. 百炼：设置 `DASHSCOPE_API_KEY` 与账户可用的视觉模型名 `RELAY_MODEL`。
2. 或本地视觉模型：设置 `RELAY_MODEL_SERVER` 为兼容接口地址、`RELAY_MODEL` 为实际模型名，必要时设置 `RELAY_MODEL_API_KEY`。
3. 在本目录运行 `python -m uvicorn app:app --host 127.0.0.1 --port 8787`。
4. 前端 `.env.local` 设置 `VITE_AI_ENDPOINT=http://127.0.0.1:8787`，重启 Vite。没有配置时仍保留手动发布。

可选 OCR：安装 `requirements-ocr.txt`，准备 EasyOCR 中英文权重，再设置 `RELAY_OCR_ENABLED=1`。首次初始化可能下载模型；CPU 可运行，但速度取决于设备。该接口现供后端调用，前端历史表单仍由物主填写。

## 接口与来源

- `GET /health`：返回配置状态，不冒充实际模型连通性检查。
- `POST /listing-draft`：`{"image":"data:image/jpeg;base64,..."}` 可带 `note`（物主原话） → `name / description / category / questions / guidance / source: Image Suggestion / requiresConfirmation: true`。只接受图片数据，不抓取外部网址。价格和交易次数不会从模型输出进入结果。
- `POST /history-ocr`：同样输入 → OCR 文本、候选来源 `Uploaded Record`、待确认标记。**不自动生成交易条目**，也不证明截图确属同一物品或已成交；物主确认前不成为 Uploaded Record。
- `POST /items`：保存物主确认后的交易卡；照片先标准化为 JPEG，再写入 Supabase 私有 Storage，字段写入 PostgreSQL。
- `POST /transactions`：仅在买卖双方均确认后写入平台成交记录，并成为后续同类价格参考。
- `POST /price-reference`：优先返回至少一条本站已确认的同类成交记录；本站无样本时才使用可选的公开网页报价检索。
- 两个接口都不保留图片；OCR 临时文件完成后删除。图片理解会将去除元数据后的图片发送至配置的模型服务，须遵循前端授权。
- 无平台记录不等于没有历史；Uploaded Record 永远不升级为 Platform Record。

## Supabase

按 [`docs/supabase-setup.md`](../docs/supabase-setup.md) 创建表与私有图片桶，再把 `SUPABASE_URL` 和 `SUPABASE_SECRET_KEY` 只配置到 Render。前端不需要、也不应出现 Supabase secret key。旧项目的 `SUPABASE_SERVICE_ROLE_KEY` 仍兼容。

## 部署边界

默认只监听本机。对外服务之前需配置 HTTPS、登录鉴权、按用户配额、请求体上限和网关超时；CORS 不是身份验证。当前单进程并发闸门仅防止同时堆积请求，不能替代公网配额。不要把模型密钥放进任何 `VITE_` 环境变量。确认托管后端地址后再构建 Pages 前端，不能把本机地址写入公开网站。

## 验证

安装 `requirements-test.txt` 后，`python -m unittest -v test_pipeline.py` 检查输入、单次编排、字段隔离、待确认状态和无服务降级。测试中的模型替身只验证契约，不代表完成真实视觉识别评测。真实模型需要用用户照片验证可见状况、拒绝猜测和错误处理。

2026-09-21 本机验证：Qwen-Agent 0.0.34 的 Assistant 已成功初始化；AgentLego 0.2.0 的 OCR 已确认在工具注册表中。未配置模型服务，未下载 OCR 权重，因此尚未执行真实图片识别或 OCR。补充声明 NumPy、SoundFile 和 python-dateutil，以修复 Qwen-Agent 在干净环境中的导入依赖缺失。
