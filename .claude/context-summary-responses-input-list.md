** 项目上下文摘要（Responses 生图 input 列表兼容）
生成时间：2026-07-07 11:41:08 +08:00

# 1. 相似实现分析
**实现1**: src/lib/openaiCompatibleImageApi.ts:223
  - 模式：Responses API 生图请求由 `createResponsesInput`、`createResponsesImageTool` 和 `callResponsesImageApiSingle` 分职责构造。
  - 可复用：继续复用现有 `createResponsesInput`，避免新增重复构造逻辑。
  - 需注意：纯文生图当前会把 `input` 发成字符串，部分 OpenAI 兼容中转会拒绝并返回 `Input must be a list`。

**实现2**: src/lib/agentApi.ts: callAgentResponsesApi 调用路径
  - 模式：Agent Responses 请求统一传入消息数组，`input` 形态稳定。
  - 可复用：沿用 `{ role: 'user', content: [{ type: 'input_text', text }] }` 的消息数组协议。
  - 需注意：Agent 路径独立，不应被本次修改影响。

**实现3**: src/lib/falAiImageApi.ts: createFalRequestInput
  - 模式：请求体通过单独函数生成，外部 SDK 只接收结构化输入对象。
  - 可复用：保持小范围修改，不引入新抽象。
  - 需注意：fal.ai 路径使用 `input` 对象，与 Responses API 无直接耦合。

**实现4**: E:/个人项目/image2/generate_image.py: build_input
  - 模式：已验证脚本默认 `DEFAULT_INPUT_FORMAT = "list"` 和 `DEFAULT_STREAM = True`，Responses API 请求体中的 `input` 为用户消息数组，并优先用 SSE 响应。
  - 可复用：对齐其 `[{ role: "user", content: [{ type: "input_text", text: prompt }] }]` 结构，以及 `stream: true` + `Accept: text/event-stream` 的成功路径。
  - 需注意：该脚本仅在显式 `--input-format string` 时发送字符串，本项目不需要保留字符串分支。

# 2. 项目约定
**命名约定**: 函数和变量使用 camelCase，类型使用 PascalCase，常量使用 UPPER_SNAKE_CASE。
**文件组织**: API 调用逻辑位于 `src/lib/`，对应测试位于同目录 `*.test.ts`。
**导入顺序**: 本次不新增导入。
**代码风格**: 2 空格缩进、单引号、无分号、优先早返回。

# 3. 可复用组件清单
`src/lib/openaiCompatibleImageApi.ts`: 复用 `createResponsesInput` 作为唯一请求输入构造入口。
`src/lib/api.ts`: 复用 `callImageApi` 的供应商分发路径。
`src/lib/apiProfiles.ts`: 复用 `apiMode: 'responses'` 的既有配置归一化。
`src/lib/imageApiShared.ts`: 复用现有错误解析、流式提示、图片大小校验。

# 4. 测试策略
**测试框架**: Vitest。
**测试模式**: 通过 mock `globalThis.fetch` 断言实际请求体。
**参考文件**: `src/lib/api.test.ts`、`src/lib/agentApi.test.ts`、`src/store.test.ts`。
**覆盖要求**: 覆盖不允许提示改写、允许提示改写、默认流式 Responses 生图、SSE 解析四个路径，确保 `input` 为数组且保留提示词文本。

# 5. 依赖和集成点
**外部依赖**: OpenAI Responses API 或兼容中转服务。
**内部依赖**: `callImageApi` -> `callOpenAICompatibleImageApi` -> `callResponsesImageApiSingle` -> `createResponsesInput`。
**集成方式**: 根据活动 API 配置的 `apiMode` 选择 Images API 或 Responses API。
**配置来源**: `DEFAULT_SETTINGS`、用户设置、URL 参数与持久化配置。

# 6. 技术选型理由
**为什么用这个方案**: 参考已测试通过的 `E:/个人项目/image2/generate_image.py`，Responses API 默认使用消息数组输入；统一发数组能兼容要求 `input` 为 list 的中转，同时不改变文本内容和图片输入协议。
**优势**: 修改集中、可测试、对 Images API 和自定义供应商无影响。
**劣势和风险**: 个别非标准兼容服务若只接受字符串可能受影响，但报错来源表明当前服务要求列表。

# 7. 关键风险点
**并发问题**: 多图并发会复用相同输入构造函数，修改后每个单图请求都应得到数组输入。
**边界条件**: 无输入图、开启提示改写、关闭提示改写、默认流式输出、服务商返回 JSON 响应时的解析兜底。
**性能瓶颈**: 请求体只增加一层消息结构，体积影响可忽略。
**安全考虑**: 本次不涉及认证、鉴权、加密或审计逻辑。

# 工具与资料记录
- `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7`、`github.search_code` 未在当前会话工具列表中暴露，已改用本地 `rg`、PowerShell 读取与 Vitest 验证。
- 官方资料检索：尝试使用官方 OpenAI 文档路径核对 Responses API 请求格式，但当前网页工具未返回可用正文；本次实现以用户提供的已验证脚本为主要证据。
- 用户提供参考：`E:/个人项目/image2/generate_image.py`，用途为对齐已测试通过的 Responses API 请求体结构。
