# 项目上下文摘要（API 配置测试期可编辑）

生成时间：2026-07-27 14:39:05 +08:00

## 1. 需求与验收条件

- 目标：测试期间解除 API 配置页各配置选项的只读或禁用状态。
- 范围：生产测试环境开关、`SettingsModal` 表单锁定条件、既有浏览器验收脚本。
- 交付物：代码、自动化验证结果、审查报告。
- 审查要点：首次 API Key 弹窗继续存在；配置名称、服务商、API URL、API 接口、模型、流式和其他高级选项可编辑；部署端强制代理仍保持禁用。

## 2. 相似实现分析

### 实现 1：`src/components/SettingsModal.tsx:1431`

- 模式：API Key 输入框不附加 `readOnly`，直接通过 `updateActiveProfile` 与 `commitActiveProfilePatch` 更新草稿和持久化设置。
- 可复用：现有输入框的 `onChange`、`onBlur` 与 Tailwind 样式。
- 需注意：不能只移除视觉透明度，必须同步移除原生 `readOnly` 或 `disabled`。

### 实现 2：`src/components/Select.tsx:160`

- 模式：`disabled` 同时阻止菜单打开并应用不可用样式。
- 可复用：解除调用处的 `disabled` 后即可恢复完整选择行为，无需修改公共组件。
- 需注意：部署端强制代理属于独立约束，仍由 `apiProxyLocked` 控制。

### 实现 3：`src/components/settings/AgentSettingsTab.tsx:41`

- 模式：设置页普通选择框、数字输入框和开关直接提交草稿，不额外设置只读状态。
- 可复用：继续沿用 `Select`、`commitSettings` 和现有开关结构。
- 需注意：本次不引入新的表单抽象或状态层。

## 3. 项目约定与可复用组件

- 命名：组件和类型使用 PascalCase，变量和函数使用 camelCase。
- 格式：2 空格、单引号、无分号、ESM import。
- 文件组织：UI 状态留在组件，配置归一化留在 `src/lib/apiProfiles.ts`。
- 可复用组件：`Select`、`updateActiveProfile`、`commitActiveProfilePatch`、`apiProxyLocked`。
- 注释和界面文案使用简体中文。

## 4. 测试策略

- 测试框架：Vitest；项目命令为 `npm test`。
- 编译验证：`npm run build`，覆盖 TypeScript 与 Vite 生产构建。
- 界面验证：复用 `.claude/verify-api-key-prompt.mjs`，断言首次 API Key 弹窗仍显示，并检查 API 配置控件均可编辑。
- 覆盖：正常流程为控件可编辑；边界条件为流式关闭时中间图像数仍按业务规则禁用；强制代理仍由 `apiProxyLocked` 保护。

## 5. 依赖与集成点

```text
.env.production
  ├─ VITE_REQUIRE_API_KEY_PROMPT → 首次 API Key 弹窗
  └─ VITE_SHOW_DEFAULT_CONFIG_ONLY → 默认配置归一化与配置页锁定

SettingsModal
  ├─ Zustand settings 草稿/提交
  ├─ Select 与原生 input/button
  └─ apiProxyLocked → 部署端强制代理约束
```

- 输入协议：Vite 字符串环境变量与 Zustand `AppSettings`。
- 输出协议：更新后的 `ApiProfile` 继续使用既有字段，不改变请求结构。
- 外部依赖：React、Zustand、Vite；本次不新增依赖。
- 配置来源：`.env.production`、运行时环境读取与浏览器持久化状态。

## 6. 技术选型与风险

- 方案：保留 `VITE_REQUIRE_API_KEY_PROMPT=true`，移除生产测试环境的固定默认配置开关，并停止用首次弹窗条件锁定设置表单。
- 理由：弹窗和表单编辑是两个独立需求；把两者继续绑定会导致用户填写 Key 后仍不能调整接口和模型。
- 性能：只减少条件判断与禁用属性，不增加渲染、内存或 I/O 成本。
- 边界：API URL 在代理实际开启时仍禁用；流式关闭时中间步骤图像数仍禁用。
- 回滚：恢复 `.env.production` 的固定配置开关和 `SettingsModal` 的 `apiSettingsLocked` 条件。

## 7. 检索限制与补偿

- 当前环境未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、`context7` 与 `github.search_code`。
- 以 PowerShell、`rg`、仓库内源码/测试和现有 Playwright 脚本完成等价检索与验证。
- 本次不涉及新库 API、通用算法或设计模式，官方文档与开源实现缺失不会影响既有表单属性的判断。

## 8. 上下文充分性结论

- [x] 能定义清晰接口契约。
- [x] 理解两个环境开关与表单锁定的技术选型。
- [x] 已识别持久化覆盖、代理锁定和条件禁用风险。
- [x] 已确定构建、完整测试和浏览器验收方式。
- [x] 已确认至少 3 个相似实现与可复用组件。
- [x] 已检查公共组件和设置子页，未发现需要新增的重复能力。

