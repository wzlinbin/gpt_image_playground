# 项目上下文摘要（Worker 控制 API 配置）

生成时间：2026-07-27 15:18:31 +08:00

## 1. 需求与验收条件

- 目标：API 配置的全局只读状态和除 API Key 外的全部配置值改由 Cloudflare Worker 变量读取控制。
- 范围：Wrangler 配置、Worker 静态资源入口、浏览器启动配置、API 配置归一化、设置页交互、Service Worker、测试与 Cloudflare 部署文档。
- 交付物：Worker 代码、前端代码、变量说明、自动化测试、浏览器验收、验证报告。
- 审查要点：API Key 不进入 Worker 变量或运行时脚本；只读时所有非 Key 字段和配置管理入口均不可修改；非只读时 Worker 值作为默认值且用户可编辑；运行时变量不被 Service Worker 缓存。

## 2. Worker 变量协议

### `API_CONFIG_READ_ONLY`

- 类型：文本布尔值或 JSON 布尔值。
- `true`：CF 后台变量是权威配置，浏览器持久化数据、导入数据和 URL 参数都不能覆盖非 Key 字段。
- `false`：CF 后台变量是新用户和新默认配置的初始值，用户本地编辑可以覆盖。

### 配置值变量

在 Cloudflare Dashboard 的“设置 → 变量和密钥”中逐项添加文本变量：

| 变量 | 类型 | 约束 |
|---|---|---|
| `API_CONFIG_NAME` | string | 非空配置名称 |
| `API_CONFIG_PROVIDER` | string | `openai` 或 `fal` |
| `API_CONFIG_BASE_URL` | string | API 基础地址 |
| `API_CONFIG_MODEL` | string | 非空模型 ID |
| `API_CONFIG_TIMEOUT` | string/number | 10-600 秒 |
| `API_CONFIG_MODE` | string | `images` 或 `responses` |
| `API_CONFIG_CODEX_CLI` | string/boolean | Codex CLI 兼容模式 |
| `API_CONFIG_API_PROXY` | string/boolean | API 代理选项值 |
| `API_CONFIG_RESPONSE_FORMAT_B64_JSON` | string/boolean | 返回 Base64 图片数据 |
| `API_CONFIG_STREAM_IMAGES` | string/boolean | 流式传输 |
| `API_CONFIG_STREAM_PARTIAL_IMAGES` | string/number | 0-3 |

协议没有 API Key 对应变量，API Key 始终由浏览器本地管理。

## 3. 相似实现分析

### 实现 1：`deploy/inject-api-url.sh`

- 模式：Docker 启动时把运行时环境写入前端可同步读取的配置。
- 可复用：运行时配置必须在应用模块执行前可用。
- 差异：Worker 不修改构建产物，改为动态返回 `/runtime-config.js`。

### 实现 2：`src/lib/defaultApiUrl.ts`

- 模式：外部 URL 配置逐字段校验、裁剪数值范围，并处理接口模式与流式默认值。
- 可复用：`normalizeStreamPartialImages` 和严格的外部输入边界。
- 风险：不能用类型断言直接信任 Worker JSON 变量。

### 实现 3：`src/components/SettingsModal.tsx`

- 模式：现有 `defaultConfigOnly` 同时保护配置切换、创建、复制、名称、服务商和 URL。
- 可复用：统一只读条件、公共 `Select` 的 `disabled` 契约和原生输入的 `readOnly`。
- 风险：必须扩展到接口、模型、超时和所有开关，同时保留 API Key 可编辑。

### 实现 4：`src/lib/devProxy.ts`

- 模式：部署能力和用户选项分离，`apiProxyLocked` 具有独立优先级。
- 可复用：全局只读与部署端强制代理组合时使用逻辑或关系。
- 风险：Worker 配置中的 `apiProxy` 只是选项值，实际代理仍需部署能力存在。

## 4. 项目约定与测试策略

- React 19、Vite、TypeScript、Zustand；2 空格、单引号、无分号。
- Worker 使用模块导出和 Wrangler 自动生成的 Assets `Env` 类型；Dashboard 动态变量使用可选接口补充，因为它们不声明在 Wrangler 配置中。
- Vitest 覆盖运行时配置正常值、无效值、API Key 排除、只读强制覆盖、非只读本地覆盖。
- `npm run build` 覆盖前端 TypeScript 与 Vite 构建。
- `wrangler types`、`wrangler deploy --dry-run` 和本地 `wrangler dev` 覆盖绑定类型、配置 schema、Worker bundle 与真实变量下发。
- Playwright 覆盖只读关闭时可编辑，以及只读开启时除 API Key 外全部不可编辑。

## 5. 依赖与集成点

```text
Cloudflare Dashboard 变量和密钥
  └─ deploy/worker.ts（逐项组装配置）
      └─ GET /runtime-config.js（no-store）
          └─ globalThis.__GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__
              └─ src/lib/workerRuntimeConfig.ts（边界归一化）
                  └─ src/lib/apiProfiles.ts（默认值/权威覆盖）
                      ├─ src/store.ts（所有写入统一归一化）
                      ├─ src/lib/urlSettings.ts（只读时拒绝 URL 覆盖）
                      └─ src/components/SettingsModal.tsx（交互禁用）
```

- `index.html` 在 Vite 模块前同步加载 `/runtime-config.js`。
- `public/runtime-config.js` 为非 Worker 环境提供空配置回退。
- `public/sw.js` 对该路径强制网络优先且不写缓存。
- API Key 只从浏览器本地状态读取，并在只读归一化时原样保留。

## 6. 官方资料与用途

- Cloudflare 环境变量：`https://developers.cloudflare.com/workers/configuration/environment-variables/`，确认 Dashboard 可添加文本或 JSON 变量，且通过 `env` 参数读取。
- Cloudflare 静态资源 binding：`https://developers.cloudflare.com/workers/static-assets/binding/`，确认 `ASSETS.fetch()` 与 `run_worker_first` 路由模式。
- Workers 最佳实践：`https://developers.cloudflare.com/workers/best-practices/workers-best-practices/`，用于 binding 类型、Promise、请求状态和配置审查。
- Wrangler 4.96.0 本地 schema：`node_modules/wrangler/config-schema.json`，确认 `keep_vars: true` 会在部署时保留 Dashboard 变量，并核对 `assets.run_worker_first` 结构。
- 最新 `@cloudflare/workers-types`：通过 `npm pack` 获取并核对 `Fetcher`、`ExportedHandler` 类型。

## 7. 技术选型与风险

- 选择外部同步脚本而非运行时 JSON fetch：避免重构所有模块级配置常量，且保证应用执行前配置已就绪。
- Worker 只拦截一个配置路径，其他静态资源继续由 Assets 直接服务，避免无谓 Worker 调用。
- 只读关闭时本地持久化优先是必要语义，否则控件虽可编辑但修改会立刻被 Worker 值覆盖。
- Service Worker 必须绕过配置脚本缓存，否则 Dashboard 更新变量后客户端可能长期读取旧值。
- Dashboard 变量是公开的非敏感配置；协议不提供 API Key 变量。
- 性能影响：首屏增加一个同源小型同步脚本请求；响应为短文本且 `no-store`，没有大对象解析或额外依赖。

## 8. 检索限制与补偿

- 当前环境未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7` 与 `github.search_code`。
- 已用 PowerShell/`rg`、Cloudflare 官方文档、Wrangler schema、最新 Workers 类型和仓库源码完成等价检索。
- GitHub 开源搜索无法按指定工具执行；本功能直接采用 Cloudflare 官方 Dashboard 环境变量与 Assets binding 标准模式，不依赖第三方库。

## 9. 上下文充分性结论

- [x] 已定义输入输出协议与字段约束。
- [x] 已分析至少 3 个相似实现和可复用接口。
- [x] 已理解 Zustand 归一化、URL 覆盖、Service Worker 和设置页集成点。
- [x] 已确定正常、边界、错误恢复和浏览器验证方式。
- [x] 已确认不新增第三方依赖，不重复实现公共表单组件。
