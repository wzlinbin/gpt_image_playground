# 项目上下文摘要（Lightbox 原图屏幕适配）

生成时间：2026-07-30 13:11:31 +08:00

## 1. 最终需求与验收条件

- Lightbox 继续读取完整分辨率原图，不使用任务卡片缩略图。
- 初始显示必须在视口范围内完整可见，保持原图宽高比，四周保留基本安全间距。
- 初始倍率不允许无意义拖拽；滚轮、双击或双指主动放大后才允许平移。
- 桌面和移动端均不得因大图产生页面滚动条或内容超屏不可达。

## 2. 相似实现分析

- `src/components/Lightbox.tsx:46`：通过 `ensureImageCached` 读取 IndexedDB 原始 Data URL，可直接复用原图来源。
- `src/components/Lightbox.tsx:729`：当前 `max-w-none max-h-none` 使固有尺寸直接超出视口，是本次需要调整的展示约束。
- `src/components/DetailModal.tsx:511`：使用最大宽高与 `object-contain` 在容器中完整显示图片，证明项目已有等比适配模式。
- `src/components/MaskEditorModal.tsx:884`：根视口使用 `overflow-hidden` 阻止内部内容扩张页面，可继续复用该边界原则。

## 3. 项目约定与测试策略

- 代码保持 2 空格、单引号、无分号、camelCase 和早返回风格。
- 修改限定在 `Lightbox.tsx` 及其组件测试，不新增 store 字段、依赖、配置或数据迁移。
- Vitest + jsdom 测试应断言视口最大尺寸类、原图 URL、初始不可拖拽，以及主动放大后仍可拖拽。
- 执行定向测试、全量测试、生产构建、构建 CSS 检查和 `git diff --check`。

## 4. 依赖、集成点与风险

- 依赖链保持 `TaskGrid/DetailModal -> setLightboxImageId -> Lightbox -> ensureImageCached -> db.images`。
- 图片以 `width: auto; height: auto; object-fit: contain` 配合视口最大宽高，输出协议仍为现有 Lightbox DOM。
- 移动端使用动态视口高度，避免浏览器地址栏导致 `100vh` 与真实可视区域不一致。
- 性能影响为零级别 CSS 布局变化，不增加图片解码、网络请求或持久化 I/O。

## 5. 工具与充分性检查

- 当前环境未提供 sequential-thinking、shrimp-task-manager、desktop-commander、Context7、GitHub 代码搜索和 Claude Code 审查工具。
- 使用计划工具、PowerShell、`rg`、现有实现、Vitest、Vite 构建和开发服务器检查补偿。
- 已确认三个以上相关实现、原图输入协议、展示输出、测试方式、边界与风险，满足编码条件。
