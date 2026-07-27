# 项目上下文摘要（上游更新）

生成时间：2026-07-27 11:04:31 +08:00

## 1. 目标、范围与交付物

- 目标：将 `CookSleep/gpt_image_playground` 的 `upstream/main` 合并到当前 `main`。
- 范围：保留本地两个 Cloudflare 部署提交，并保留 `src/lib/api.test.ts`、`src/lib/openaiCompatibleImageApi.ts` 的未提交改动。
- 交付物：完成的三方合并、已恢复的未提交改动、本地构建与测试结果、验证报告。
- 审查要点：不得丢失用户改动；不得残留冲突标记；上游新增模块与依赖必须可编译、可测试。

## 2. 相似实现分析

### 实现 1：`src/lib/openaiCompatibleImageApi.ts`

- 模式：根据 `ApiProfile.streamImages` 构造 Images/Responses API 的流式请求，并把 SSE 响应转换为 `CallApiResult`。
- 可复用：`isEventStreamResponse`、`readJsonServerSentEvents`、`maybeAppendStreamingHint`。
- 需注意：本地未提交修改要求 Responses API 始终使用流式响应，与上游的配置开关语义存在有意差异。

### 实现 2：`src/lib/agentApi.ts`

- 模式：Agent Responses 请求按配置启用流式传输，并复用共享 SSE 解析器处理文本、图片和错误事件。
- 可复用：共享事件解析、流式错误格式化、终止信号处理。
- 需注意：本次只借鉴请求和响应协议，不改变 Agent API 的配置开关行为。

### 实现 3：`src/lib/serverSentEvents.ts`

- 模式：集中处理 SSE 分块、JSON 解析、错误格式化和中止信号。
- 可复用：`isEventStreamResponse`、`readJsonServerSentEvents`。
- 需注意：上游已从 `openaiCompatibleImageApi.ts` 删除重复的自研 SSE 解析代码，恢复本地修改时必须沿用共享实现。

### 实现 4：`src/lib/api.test.ts`

- 模式：Vitest 模拟 `fetch`，直接断言请求体、请求头、流式事件和最终图片结果。
- 可复用：`Response` 构造的 SSE 测试夹具和 `vi.spyOn(globalThis, 'fetch')`。
- 需注意：需要同时覆盖无参考图输入数组格式、默认流式请求和最终结果解析。

## 3. 项目约定

- 命名约定：组件和类型使用 PascalCase，函数和变量使用 camelCase，模块常量使用 UPPER_SNAKE_CASE。
- 文件组织：API 纯逻辑位于 `src/lib/`，共享 SSE 逻辑集中在 `src/lib/serverSentEvents.ts`。
- 导入顺序：类型与本地模块分组，沿用文件现状。
- 代码风格：2 空格缩进、单引号、无分号、优先早返回，注释与测试描述使用中文。

## 4. 可复用组件清单

- `src/lib/serverSentEvents.ts`：SSE 响应识别和 JSON 事件读取。
- `src/lib/imageApiShared.ts`：图片结果、错误信息和实际参数的共享处理。
- `src/lib/apiProfiles.ts`：供应商配置及默认设置归一化。
- `src/lib/api.test.ts`：图像 API 请求与响应协议测试。

## 5. 测试策略

- 测试框架：Vitest，命令为 `npm test`。
- 编译验证：TypeScript 项目构建与 Vite 生产构建，命令为 `npm run build`。
- 正常流程：上游功能与本地 Responses 默认流式行为均通过完整测试。
- 边界条件：无参考图时仍使用消息数组；SSE 完成事件可返回最终图片。
- 错误恢复：若合并、构建或测试失败，立即检查冲突和失败用例，不继续交付。

## 6. 依赖和集成点

- 输入：`CallApiOptions`、`ApiProfile`、`AppSettings`。
- 调用链：`callImageApi` -> `callResponsesImageApiSingle` -> `fetch` -> `readJsonServerSentEvents`。
- 输出：`CallApiResult`，包括图片、实际参数、修订提示词和失败请求信息。
- 外部依赖：上游将版本升级到 `0.7.1`，新增 `jsdom` 开发依赖并将 `fflate` 升级到 `0.8.3`。
- 配置来源：`package.json`、`package-lock.json`、`.env.production`、`wrangler.jsonc`。

## 7. 技术选择与风险

- 选择三方合并而非重写历史：保留本地两个提交的可审计性，并把上游 59 个提交作为一个合并节点集成。
- 未提交修改先存入 Git stash：避免合并覆盖，并可在合并后精确恢复。
- 建立恢复分支：为合并提交和 stash 之外再提供明确的回滚点。
- 主要风险：`src/lib/openaiCompatibleImageApi.ts` 同时存在本地未提交和上游修改，恢复 stash 时可能冲突。
- 性能影响：默认 Responses 流式请求不会额外缓冲完整响应；共享 SSE 解析按块处理，内存占用与事件大小相关。

## 8. 上下文充分性检查

- 可以定义接口契约：是，输入、请求协议和 `CallApiResult` 输出均已确认。
- 理解技术选型：是，保留提交拓扑并复用上游共享 SSE 模块。
- 识别主要风险：是，重叠文件、依赖安装和测试回归已列出。
- 知道验证方式：是，执行定向测试、完整测试和生产构建。
- 确认未重复造轮子：是，已检查 API、Agent API、共享 SSE 和测试模块。

## 9. 工具降级记录

当前环境未暴露 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7` 和 `github.search_code`。本任务通过结构化推理、Git 历史与差异、本地 `rg`/PowerShell 检索以及项目既有构建和测试命令补偿；未引入新的库用法或自研替代实现。
