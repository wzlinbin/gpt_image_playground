# 项目上下文摘要（安全合并上游 v0.7.2）

生成时间：2026-07-30 10:33:00 +08:00

## 1. 目标、范围与验收条件

目标：将 `CookSleep/gpt_image_playground` 的 `v0.7.2`（`aa789c3`）安全合并到当前 `main`（`05dee21`），保留全部本地定制并完整接入上游新功能。

范围：三方合并、冲突解决、推理强度与 Worker 运行时配置集成、Codex CLI 尺寸适配、相关 UI/URL/API/Agent/store/测试和文档。

交付物：合并后的工作树、自动化测试、构建结果、操作日志和验证报告。验证前不创建合并提交。

验收条件：

- `package.json` 与 Release 信息更新到 `0.7.2`。
- Responses API 推理强度在画廊、Agent、URL 导入和设置页完整传播。
- Cloudflare Worker 只读配置可通过独立后台变量控制推理强度，且 URL/导入不能绕过只读值。
- Codex CLI 模式不向图片接口发送 `size`，尺寸通过提示词表达并按上游规则规整。
- 本地 Responses API 强制 SSE 行为保持不变。
- api2cn 的 `response.output_text.delta` 图片回退、标准事件优先和中间图语义保持不变。
- 本地首次 API Key 提示、Worker 配置、Cloudflare 部署和 UI 精简功能保持不变。
- 不残留冲突标记；定向测试、完整测试、生产构建和差异检查全部通过。

## 2. 分叉与冲突分析

- 共同基点：`85af989`。
- 本地领先共同基点 5 个提交，上游领先 6 个提交。
- 本地修改 54 个文件，上游修改 27 个文件，双方重叠 10 个文件。
- 三方合并明确冲突：`README.md`、`src/lib/api.test.ts`、`src/lib/apiProfiles.ts`、`src/lib/openaiCompatibleImageApi.ts`、`src/lib/urlSettings.ts`。
- 已创建备份分支：`backup/pre-upstream-v0.7.2-20260730`，指向 `05dee21`。

## 3. 相似实现分析

### 实现 1：上游 Responses 推理强度

- 文件：`src/types.ts`、`src/lib/defaultApiUrl.ts`、`src/lib/apiProfiles.ts`、`src/lib/urlSettings.ts`、`src/components/SettingsModal.tsx`。
- 模式：`ReasoningEffort` 联合类型作为单一协议，通过默认 URL、profile 归一化、URL 参数和 UI 逐层传播。
- 可复用：`normalizeReasoningEffort`、`REASONING_EFFORT_VALUES`、profile draft 和导入归一化。
- 集成约束：本地 Worker 只读配置必须成为更高优先级来源，并阻止 URL 覆盖。

### 实现 2：上游 Codex CLI 尺寸适配

- 文件：`src/lib/size.ts`、`src/components/SizePickerModal.tsx`、`src/lib/openaiCompatibleImageApi.ts`、`src/lib/agentApi.ts`、`src/store.ts`。
- 模式：集中尺寸规整与提示词构造，Codex CLI 请求不再发送 `size`，避免接口不支持参数。
- 可复用：上游尺寸工具和已有参数兼容层，不新增第二套尺寸计算。
- 集成约束：不得改变非 Codex CLI 的现有 size 请求和实际参数记录。

### 实现 3：本地 api2cn 流式图片兼容

- 文件：`src/lib/openaiCompatibleImageApi.ts`、`src/lib/api.test.ts`。
- 模式：标准 Images/Responses SSE 事件优先，缺少标准结果时拼接 `response.output_text.delta` 并提取图片。
- 可复用：`readJsonServerSentEvents`、`normalizeBase64Image`、回退字段和图片签名校验。
- 集成约束：上游对同一请求体的 reasoning/size 修改不能覆盖回退解析和 Responses 强制 SSE。

### 实现 4：本地 Worker 只读配置

- 文件：`deploy/worker.ts`、`src/lib/workerRuntimeConfig.ts`、`src/lib/apiProfiles.ts`、`src/lib/urlSettings.ts`、`src/components/SettingsModal.tsx`。
- 模式：Cloudflare 后台独立变量经 `/runtime-config.js` 注入，`normalizeSettings` 作为数据权威边界，API Key 例外保存在浏览器。
- 可复用：Worker 配置归一化、只读 profile 重建、UI disabled/readOnly 和 URL 防绕过。
- 集成约束：新增 `reasoningEffort` 必须进入 Worker 类型、变量组装、归一化、profile 锁定和 UI 禁用链路。

## 4. 项目约定与可复用组件

- 代码风格：2 空格、单引号、无分号、优先早返回。
- 命名：类型 PascalCase，变量/函数 camelCase，模块常量 UPPER_SNAKE_CASE。
- 纯逻辑放 `src/lib/`；store 只保留状态和 action 入口。
- 复用 `normalizeReasoningEffort`、`normalizeSettings`、`normalizeWorkerRuntimeConfig`、`readJsonServerSentEvents`、现有尺寸工具和 `Select`。
- 测试继续使用 Vitest；API 流使用内存 `Response`，Worker 使用现有请求夹具。

## 5. 依赖与集成图

```text
Cloudflare 后台变量
  -> deploy/worker.ts
  -> /runtime-config.js
  -> workerRuntimeConfig.ts
  -> apiProfiles.normalizeSettings
  -> SettingsModal / urlSettings / store
  -> callOpenAICompatibleImageApi / callAgentResponsesApi

上游 size/reasoning
  -> profile + params
  -> Codex CLI 提示词/请求体
  -> 标准 SSE 解析
  -> api2cn 文本回退（仅标准结果缺失）
```

输入协议：`ApiProfile.reasoningEffort`、`TaskParams.size`、Worker 文本变量、URL 参数和 SSE JSON 事件。

输出协议：OpenAI 兼容请求体、现有 `CallApiResult`、持久化 `AppSettings`。

环境需求：npm、Vitest、TypeScript、Vite、Wrangler；不新增依赖。

## 6. 测试策略

- 冲突文件定向测试：`api.test.ts`、`apiProfiles.test.ts`、`urlSettings.test.ts`、`workerRuntimeConfig.test.ts`、`agentApi.test.ts`、`size.test.ts`、`paramCompatibility.test.ts`、`store.test.ts`、`deploy/worker.test.ts`。
- 正常流程：推理强度传递、Codex CLI 尺寸适配、标准图片流、api2cn 文本流。
- 边界条件：Worker 只读开关、无推理强度默认值、无填充/错误 Base64、1K 尺寸预算、URL 导入。
- 错误恢复：中间图不得成为最终图、失败事件继续抛错、URL 不得覆盖只读配置。
- 完整验证：`npm test`、`npm run build`、`npx wrangler deploy --dry-run`、`git diff --check`。

## 7. 风险与性能

- 主要风险：同一 profile 和请求体字段由上游与本地同时修改，错误选择一侧会导致功能静默丢失。
- 合并策略：语义合并，不采用整文件 ours/theirs；先保留双方字段，再用测试固定优先级。
- 性能：推理强度仅增加一个小字段；尺寸规整为常数时间；流式回退仍为 O(n)，无新增网络和持久化 I/O。
- 回滚：合并前备份分支可恢复到 `05dee21`；合并阶段不自动提交。

## 8. 工具与充分性检查

- 当前会话未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、Context7 和 `github.search_code`；使用计划工具、Git 三方差异、PowerShell/`rg`、GitHub Release API 和完整本地验证补偿。
- 能定义接口契约：是。
- 理解双方技术选择：是。
- 已识别主要冲突和风险：是。
- 已分析至少三个实现：是，共四个。
- 已确认复用路径和测试方式：是。
- 已确认不重复造轮子：是，全部使用双方既有模块。
