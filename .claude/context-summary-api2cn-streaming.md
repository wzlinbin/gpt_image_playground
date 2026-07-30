# 项目上下文摘要（api2cn 流式图片兼容）

生成时间：2026-07-30 09:42:00 +08:00

## 1. 需求与验收条件

目标：在不改变现有标准 Images API、Responses API 和非流式图片解析行为的前提下，兼容 api2cn 将最终图片放入 `response.output_text.delta` 文本分片的流式响应。

范围：`src/lib/openaiCompatibleImageApi.ts` 的流式响应解析，以及 `src/lib/api.test.ts` 的自动化回归测试。不修改请求配置、store、持久化结构、UI 或服务商配置。

交付物：兼容解析代码、正常/边界/失败测试、操作日志、验证报告。

验收条件：

- 现有 `image_generation.completed` 和 `image.generation.result` 最终事件继续优先解析。
- `response.output_text.delta` 被按顺序拼接，并能从 JSON、图片 Data URL 或完整纯 Base64 文本中提取最终图片。
- 能递归识别 Python 脚本支持的 `b64_json`、`base64`、`image_base64`、`partial_image_b64`、`result` 字段。
- 回退逻辑只在标准最终结果缺失时启用，不改变现有标准流结果和参数元数据。
- 无有效图片的文本流仍失败，不把任意普通文本误判为图片。
- 定向测试、完整测试、生产构建和差异检查全部通过。

## 2. 相似实现分析

实现 1：`src/lib/openaiCompatibleImageApi.ts:276`

- 模式：Images API 通过 `readJsonServerSentEvents` 逐事件解析。
- 可复用：`normalizeBase64Image`、`mergeActualParams`、`pickActualParams` 和标准最终事件优先级。
- 约束：标准事件只接受 `image_generation.completed`、`image_edit.completed`、`image.generation.result`、`image.edit.result`。

实现 2：`src/lib/openaiCompatibleImageApi.ts:350`

- 模式：Responses API 从 `response.completed` 或 `response.output_item.done` 组装图片结果。
- 可复用：同一个 SSE 读取器、统一的 `CallApiResult` 输出协议和标准结果优先策略。
- 约束：不能让文本回退覆盖已完成的标准 Responses 图片结果。

实现 3：`E:/个人项目/image2/generate_image_api2cn.py:140`

- 模式：递归扫描结构化事件中的多个图片字段，累计 `response.output_text.delta`，流结束后拼接文本再次提取。
- 可复用：图片字段集合、JSON/Data URL/纯 Base64 三阶段提取顺序、取最后一个图片候选的行为。
- 约束：Python 对结构化字段要求字符串长度大于 100，避免短字符串误判；前端兼容逻辑应保持同等门槛。

实现 4：`src/lib/serverSentEvents.ts`

- 模式：统一处理 SSE 分块、跨块缓冲、`data:` 多行合并、JSON 解析和错误事件。
- 可复用：无需新增流读取器，只扩展现有事件回调中的候选收集。
- 约束：SSE 传输错误仍由公共读取器负责，兼容层不吞掉错误。

## 3. 项目约定

命名约定：组件/类型使用 PascalCase，函数和变量使用 camelCase，模块常量使用 UPPER_SNAKE_CASE。

文件组织：纯解析逻辑保留在 `src/lib/`；本次逻辑只服务同一 API 模块，不新增无必要模块。

导入顺序：本地类型在前，本地模块随后；本次不新增第三方依赖。

代码风格：2 空格缩进、单引号、无分号、箭头函数参数加括号、优先早返回。

## 4. 可复用组件

- `src/lib/serverSentEvents.ts:readJsonServerSentEvents`：SSE 增量读取与 JSON 事件分发。
- `src/lib/imageApiShared.ts:normalizeBase64Image`：将裸 Base64 统一转换为 Data URL。
- `src/lib/imageApiShared.ts:mergeActualParams`：保持 `CallApiResult` 参数协议。
- `src/lib/imageApiShared.ts:pickActualParams`：提取已有参数元数据。
- `src/lib/api.test.ts`：使用原生 `Response` 构造内存 SSE，不访问真实接口。

## 5. 依赖与集成点

依赖图：

```text
store / Agent
  -> callImageApi
  -> callOpenAICompatibleImageApi
  -> callImagesApiSingle 或 callResponsesImageApiSingle
  -> readJsonServerSentEvents
  -> 标准最终事件解析
  -> 文本/Base64 回退解析（仅标准结果缺失时）
  -> CallApiResult
```

输入协议：浏览器 `Response`，内容类型为 `text/event-stream`；事件为 JSON 对象。

输出协议：`CallApiResult`，至少包含 `images`、`actualParams`、`actualParamsList`、`revisedPrompts`。

配置来源：现有 `ApiProfile.streamImages`、`streamPartialImages` 和 `responseFormatB64Json`，本次不新增配置。

环境需求：Node.js、npm、Vitest、TypeScript、Vite；使用仓库既有命令验证。

## 6. 测试策略

测试框架：Vitest。

参考测试：

- `src/lib/api.test.ts:157`：标准 partial/completed 流。
- `src/lib/api.test.ts:282`：标准 completed 事件参数。
- `src/lib/api.test.ts:321`：`image.generation.result` 兼容事件。
- `src/lib/api.test.ts:450`：Responses API 流式结果。

新增覆盖：分片 JSON 文本正常流程、Data URL/嵌套字段边界、普通文本失败保持。现有测试作为不破坏原逻辑的回归证明。

## 7. 技术选型与风险

方案：把 Python 的递归图片字段提取与文本提取移植为模块内纯函数，在两个现有流解析器中收集回退候选，但始终让现有标准结果先返回。

优势：不改请求体、配置和调用链；兼容范围与已验证 Python 脚本一致；所有新增逻辑可用内存 SSE 单元测试验证。

风险与控制：

- 误判普通文本：保留 Python 的长度门槛，并对纯 Base64 执行格式和解码校验。
- 返回中间图：拼接文本产生的图片优先于结构化回退候选，标准最终事件优先于全部回退候选。
- 内存占用：图片 Base64 本就需要在浏览器中完整保存；新增文本拼接与现有最终 Data URL 同阶，不增加额外网络或持久化 I/O。
- 协议漂移：新增测试固定 api2cn 已实测的 `response.output_text.delta` 行为；未知字段仍保持失败。

性能评估：设响应总文本长度为 n，递归扫描和文本提取均为 O(n)；候选数组只保存服务端已经返回的图片字符串，不引入阻塞操作或新依赖。

## 8. 检索与工具记录

- 官方 OpenAI 图片生成文档可访问，确认官方图片流包含流式和中间图片概念；api2cn 的 `response.output_text.delta` 属于第三方兼容行为，以本地实测记录为准。
- GitHub Code Search 的 REST 后备请求返回 401，未获得开源样例；不影响对本地已验证 Python 实现的复用。
- 当前会话未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、Context7 和 `github.search_code`。分别使用计划工具、PowerShell/`rg`、官方文档页面、本地 Git 历史和 Python 实测记录补偿。
- 已按 `openai-docs` 技能注册官方 OpenAI 文档 MCP；当前会话需要重启后才会暴露新工具，因此本次使用官方页面可达性检查补偿。

## 9. 上下文充分性检查

- 能定义接口契约：是，输入为 SSE JSON 事件，输出为现有 `CallApiResult`。
- 理解技术选型：是，标准解析优先，Python 式解析只作回退。
- 识别主要风险：是，覆盖误判、中间图、内存和协议漂移。
- 知道验证方式：是，Vitest 定向/完整测试、TypeScript/Vite 构建、差异检查。
- 已分析至少三个相似实现：是，Images 流、Responses 流、Python 流和公共 SSE 读取器。
- 已确认复用组件：是，复用 SSE、Base64 归一化和结果参数工具。
- 已确认不重复造轮子：是，没有新增请求器、SSE 框架或配置结构。
