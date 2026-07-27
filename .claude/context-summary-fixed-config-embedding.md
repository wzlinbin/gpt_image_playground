# 项目上下文摘要（固定默认配置与受限嵌入）

生成时间：2026-07-27 11:41:25 +08:00

## 1. 目标、范围与交付物

- 目标一：在 `img.api2cn.com` 的生产构建中，把当前配置、配置名称、服务商类型和 API URL 固定为部署默认值并设为只读。
- 目标二：允许 `https://api.api2cn.com` 与 `https://cf.api2cn.com` 嵌入该系统，同时保留同源嵌入。
- 范围：生产环境变量、配置归一化、URL 参数导入、设置页控件、Cloudflare 静态资源响应头、测试与部署文档。
- 交付物：代码、环境配置、`public/_headers`、测试、构建产物验证和审查报告。
- 审查要点：旧持久化数据不能覆盖固定字段；URL 参数不能绕过锁定；API Key、模型等非截图字段仍可配置；只允许指定来源嵌入。

## 2. 相似实现分析

### 实现 1：`src/components/SettingsModal.tsx`

- 模式：通过 `isDefaultConfigOnlyEnabled()` 禁用当前配置和服务商类型选择，并在事件入口再次早返回。
- 可复用：`defaultConfigOnly` 状态及现有禁用样式。
- 需注意：配置名称和 API URL 当前仍可编辑，API URL 还显示 `?apiUrl=` 覆盖提示。

### 实现 2：`src/lib/apiProfiles.ts`

- 模式：`normalizeSettings` 统一清洗 IndexedDB/localStorage、导入数据和运行期设置，是外部配置进入业务层的标准边界。
- 可复用：`createDefaultOpenAIProfile`、`DEFAULT_OPENAI_PROFILE_ID`、`DEFAULT_API_URL_PATCH`。
- 需注意：只在普通默认 API URL 模式强制恢复 OpenAI 固定字段；以 JSON 配置 URL 定义的自定义默认服务商仍由导入流程决定。

### 实现 3：`src/lib/urlSettings.ts`

- 模式：仅展示默认配置时，URL 参数只 patch 当前配置，不新增配置或切换 provider。
- 可复用：`buildDefaultConfigOnlySettingsFromUrlParams` 的白名单式字段处理。
- 需注意：必须从白名单中移除 `name` 与 `baseUrl`，避免 `profileName`、`apiUrl` 或 `settings` JSON 绕过只读 UI。

### 实现 4：`src/lib/apiProfiles.test.ts` 与 `src/lib/urlSettings.test.ts`

- 模式：使用 `vi.stubEnv`、`vi.resetModules` 验证构建期环境变量分支，并对归一化后的完整 profile 断言。
- 可复用：动态导入模块和 URL 参数夹具。
- 需注意：测试需覆盖旧持久化配置、查询参数和 `settings` JSON 三类外部输入。

### 实现 5：Cloudflare Workers Static Assets `_headers`

- 模式：Vite 将 `public/` 文件复制到 `dist/`；Cloudflare Workers Static Assets 原生解析静态目录内的 `_headers` 并向匹配响应附加或移除头。
- 可复用：无需新增 Worker 脚本或改变 `wrangler.jsonc` 的静态资源架构。
- 需注意：`frame-ancestors` 必须放在 HTTP `Content-Security-Policy` 响应头中；`X-Frame-Options` 不支持两个指定来源，应显式移除以避免冲突。

## 3. 项目约定

- 命名：组件和类型使用 PascalCase，函数与变量使用 camelCase，模块常量使用 UPPER_SNAKE_CASE。
- 风格：2 空格缩进、单引号、无分号、优先早返回，中文注释和测试描述。
- 文件组织：配置纯逻辑放在 `src/lib/`，设置 UI 留在既有组件，部署静态文件放 `public/`。
- 测试：Vitest；先生产构建，再完整测试；Cloudflare 配置使用 Wrangler 本地验证。

## 4. 依赖与集成点

- 配置链路：`.env.production` -> Vite `import.meta.env` -> `apiProfiles.ts` -> Zustand 持久化合并 -> `SettingsModal`。
- URL 链路：浏览器查询参数 -> `urlSettings.ts` -> `normalizeSettings` -> Zustand 设置。
- 部署链路：`public/_headers` -> Vite `dist/_headers` -> Workers Static Assets -> 浏览器 iframe 策略。
- 固定输入：名称 `默认`、服务商 `openai`、API URL `https://api.api2cn.com`。
- 允许嵌入来源：同源、`https://api.api2cn.com`、`https://cf.api2cn.com`。
- 环境要求：Node.js、npm、Vite、Vitest、Wrangler；无需新增依赖。

## 5. 测试策略与验收条件

- 生产环境同时设置 `VITE_DEFAULT_API_URL` 与 `VITE_SHOW_DEFAULT_CONFIG_ONLY=true`。
- 设置归一化把任意旧名称、provider、baseUrl 和多 profile 恢复为单一部署默认 profile，同时保留 API Key、模型、超时等可配置字段。
- 默认配置模式忽略 `apiUrl`、`profileName` 和 `settings` JSON 中的名称与 baseUrl，但继续接受 API Key、模型等允许字段。
- 设置页四个截图字段均不可修改，API URL 不再提示可被查询参数覆盖。
- 构建后的 `dist/_headers` 精确包含 `frame-ancestors 'self' https://api.api2cn.com https://cf.api2cn.com`，并移除 `X-Frame-Options`。
- `npm run build`、定向 Vitest、完整 `npm test`、`npx wrangler deploy --dry-run` 全部通过。

## 6. 技术选型与风险

- 选择在 `normalizeSettings` 边界固化字段，而非只禁用 UI：可覆盖旧持久化数据、导入数据和内部 action。
- 选择保留 API Key、模型及运行参数：只固定截图明确要求的配置身份和地址，不扩大只读范围。
- 选择 `_headers` 而非新增 Worker：当前部署纯静态资源，官方原生能力更少代码、更少运行时开销。
- 风险：部署平台外部规则若再次注入冲突的 `X-Frame-Options`，需在 Cloudflare 控制台同步移除；仓库内规则已显式删除该响应头。
- 性能：归一化只进行一次 profile 查找和对象构造；静态响应头由平台应用，无业务运行时 I/O。

## 7. 来源与用途

- Cloudflare Workers Static Assets Headers：`https://developers.cloudflare.com/workers/static-assets/headers/`，用于确认 `_headers` 的目录、匹配和移除响应头语法。
- Cloudflare Workers Best Practices：`https://developers.cloudflare.com/workers/best-practices/workers-best-practices/`，用于确认无需新增 Worker 运行时逻辑。
- MDN `frame-ancestors`：`https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors`，用于确认多个允许祖先来源的语法。

## 8. 工具降级记录

当前环境未暴露 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7` 和 `github.search_code`。已使用结构化推理、任务计划、Git/`rg`/PowerShell、本地项目测试以及 Cloudflare/MDN 官方文档直接检索补偿。任务不涉及新增第三方编程 API，未使用非官方博客作为实现依据。

## 9. 上下文充分性检查

- 能定义接口契约：是，固定字段、保留字段、允许来源和响应头均已明确。
- 理解技术选型：是，已有环境开关、统一归一化边界和静态头能力可直接复用。
- 识别主要风险：是，持久化覆盖、URL 绕过、X-Frame-Options 冲突和构建复制均已覆盖。
- 知道验证方式：是，环境分支测试、URL 测试、构建产物断言、完整测试和 Wrangler dry-run。
- 确认不重复造轮子：是，未新增配置框架、状态层或 Worker 脚本。
