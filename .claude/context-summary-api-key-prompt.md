# 项目上下文摘要（首次 API Key 必填与 API 配置锁定）

生成时间：2026-07-27 12:19:20 +08:00

## 1. 目标、范围与验收条件

- 目标：生产环境首次打开且没有 API Key 时，阻塞提示“请输入生图专用组的API key”。
- 范围：默认配置归一化、URL 配置导入、根组件初始化、API 设置页和对应自动化测试。
- 交付物：代码、测试、操作记录和验证报告。
- 验收：空白 Key 不能提交或关闭；已有持久化 Key 不弹窗；保存后弹窗消失；除 API Key 外的 API 配置恢复部署默认值且只读；URL 参数不能绕过。

## 2. 相似实现分析

### `src/components/SupportPromptModal.tsx`

- 模式：根组件常驻挂载，按 store 状态决定是否渲染 Portal，并复用背景滚动锁。
- 可复用：`usePreventBackgroundScroll`、遮罩层和移动端自适应弹窗布局。
- 约束：本任务不能复用其遮罩关闭、Escape 关闭和右上角关闭按钮。

### `src/components/ConfirmDialog.tsx`

- 模式：高层级阻塞弹窗，表单操作期间禁用按钮，使用 `aria` 语义表达状态。
- 可复用：`z-[110]` 层级、按钮禁用样式和阻塞交互结构。
- 约束：API Key 弹窗在有效输入前不得有取消路径。

### `src/components/SettingsModal.tsx`

- 模式：设置先写入本地 `draft`，失焦或立即提交时调用现有 `setSettings`。
- 可复用：API Key 密码输入与显隐交互、`defaultConfigOnly` 生产锁定开关、现有 `Select` 的 `disabled` 属性。
- 约束：只允许 API Key 保持可编辑；当前配置、名称、服务商、URL、代理、接口、模型、流式参数、Base64、Codex 模式和超时全部只读。

### `src/lib/apiProfiles.ts`

- 模式：`normalizeSettings` 是 localStorage 恢复、URL 导入、备份导入和 store action 的统一归一化边界。
- 可复用：`createDefaultOpenAIProfile`、`isDefaultConfigOnlyEnabled`、默认模型和超时常量。
- 约束：锁定模式只从旧配置保留 `apiKey`，其他 profile 字段必须从部署默认配置重建。

## 3. 项目约定与可复用组件

- 命名：组件和类型使用 PascalCase，函数和变量使用 camelCase，环境变量使用 UPPER_SNAKE_CASE。
- 风格：2 空格、单引号、无分号、中文 UI 文案和中文注释。
- 文件组织：弹窗放 `src/components/`；配置纯逻辑放 `src/lib/`；环境类型放 `src/vite-env.d.ts`。
- 复用组件：`useStore.setSettings`、`getActiveApiProfile`、`usePreventBackgroundScroll`、`normalizeSettings`、`isDefaultConfigOnlyEnabled`。
- 不新增依赖，不新增构建脚本或格式化配置。

## 4. 依赖与集成点

```text
.env.production
  -> Vite import.meta.env
  -> apiProfiles 配置开关
  -> normalizeSettings 强制默认值
  -> Zustand persist/localStorage
  -> App 初始化完成
  -> ApiKeyPromptModal 读取/保存 API Key

URL 查询参数
  -> urlSettings
  -> 默认配置模式直接拒绝 API 字段覆盖
```

- 输入：生产环境变量、localStorage 中的 settings、URL 查询参数、用户输入的 API Key。
- 输出：单一默认 OpenAI profile；只保留用户 Key；弹窗提交后通过现有 store 持久化。
- 环境：React 19、Vite 6、TypeScript、Zustand persist、Vitest/jsdom。

## 5. 测试策略

- `src/lib/apiProfiles.test.ts`：用 `vi.stubEnv` 和动态导入验证旧持久化数据只保留 API Key。
- `src/lib/urlSettings.test.ts`：验证 `apiKey`、`model`、`apiMode`、流式参数等 URL 输入全部被忽略。
- 新增 jsdom 组件测试：验证空值不可提交、有效 Key 保存并关闭、已有 Key 不显示。
- 本地执行定向 Vitest、生产构建、完整 Vitest、Wrangler dry-run 和界面验证。

## 6. 充分性检查

- [x] 可以定义接口契约：弹窗输入非空字符串，输出为当前默认 profile 的 `apiKey` 更新。
- [x] 理解技术选型：复用统一归一化边界，避免仅靠 UI 禁用产生绕过路径。
- [x] 已识别风险：持久化恢复闪烁、URL 绕过、旧 profile 非默认值残留、空白输入。
- [x] 知道验证方式：沿用 Vitest 动态环境导入和 jsdom 组件测试，再执行构建与本地页面检查。
- [x] 已检查 `src/lib/` 和现有组件，不存在可直接复用的必填秘密输入弹窗。

## 7. 工具降级记录

仓库指定的 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7` 和 `github.search_code` 当前未提供。已使用结构化问题分解、计划工具、PowerShell 只读检索、至少三个仓库内现有实现和本地测试作为补偿。浏览器技能已读取，但其要求的浏览器运行工具当前未暴露；完成代码后优先检查可用的本地自动化途径，并如实记录结果。

## 8. 默认开启流式传输与 Base64

补充时间：2026-07-27 12:46:03 +08:00

- 新要求：生产锁定配置中 `streamImages` 与 `responseFormatB64Json` 默认且始终为 `true`。
- 数据入口：继续在 `normalizeSettings` 的生产锁定 profile 重建分支固化，旧持久化值不能关闭两项。
- UI 表达：`SettingsModal` 已依据 profile 值显示开关，并由 `apiSettingsLocked` 禁止修改，无需新增状态。
- 测试：更新 `apiProfiles.test.ts` 的生产归一化断言；Playwright 同时验证两个开关 `disabled=true`、`aria-checked=true`。
