# 项目上下文摘要（Lightbox 原始像素比例）

> 状态：已被 `.claude/context-summary-lightbox-viewport-fit.md` 取代。用户随后确认初始大图必须限制在屏幕范围内；本文件仅保留为需求演变记录。

生成时间：2026-07-30 12:57:54 +08:00

## 1. 需求与验收条件

- 目标：Lightbox 的 `100%` 必须对应图片固有像素尺寸，不再自动缩小到视口范围。
- 正常流程：打开 1024×1536 图片时，图片元素以固有宽高渲染；超出视口部分通过拖拽查看。
- 边界流程：小于视口的图片保持居中且不可无意义拖拽；窗口尺寸变化后重新判断是否溢出。
- 交互保持：滚轮、双击和双指缩放从原始尺寸继续放大，最小倍率为原始尺寸的 100%；背景点击关闭、多图导航和图片操作继续可用。

## 2. 相似实现分析

### 实现 1：`src/components/Lightbox.tsx:357`

- 模式：`scaleRef`、`txRef`、`tyRef` 管理缩放和平移，`scale = 1` 是当前最小倍率。
- 可复用：现有滚轮焦点缩放、鼠标拖拽、触控拖拽、双击复位和倍率徽标。
- 约束：当前 `apply` 在倍率小于等于 1 时强制清零平移，默认假定 100% 图片一定不溢出视口。

### 实现 2：`src/components/Lightbox.tsx:708`

- 模式：图片通过 `max-w-[90vw] max-h-[70vh]` / 响应式上限适应视口。
- 可复用：原图 `src`、遮罩叠加和相对定位容器。
- 约束：该 CSS 上限是本次问题根因；虽然资源是原图，视觉尺寸仍被压缩。

### 实现 3：`src/components/MaskEditorModal.tsx:884`

- 模式：固定视口使用 `overflow-hidden`，内部画布通过变换和平移查看超出区域。
- 可复用：视口裁剪而不是页面滚动的交互原则，以及 `grab` / `grabbing` 光标反馈。
- 约束：Lightbox 已有自己的触控和缩放逻辑，只复用交互原则，不引入编辑器状态模型。

### 实现 4：`src/lib/viewportTransform.test.ts:10`

- 模式：以纯变换状态验证初始倍率、点位缩放、平移和坐标映射。
- 可复用：测试应明确区分“100% 基准”和“适应视口”，并覆盖溢出与非溢出边界。
- 约束：Lightbox 当前逻辑与 DOM 固有尺寸相关，适合使用 jsdom 组件测试验证类名、光标与拖拽变换。

## 3. 项目约定与可复用组件

- 代码风格：2 空格、单引号、无分号、camelCase、优先早返回。
- 文件职责：缩放与拖拽逻辑继续保留在 `Lightbox.tsx`，不向 store 或新工具模块迁移一次性 DOM 判断。
- 可复用：`scaleRef`、`apply`、`rerender`、现有鼠标/触控监听器和 `usePreventBackgroundScroll`。
- 测试模式：参考 `ApiKeyPromptModal.test.tsx` 和 `TaskGrid.test.tsx`，使用 Vitest + jsdom + React `act`。

## 4. 依赖与集成点

- 输入：图片 `naturalWidth` / `naturalHeight`、Lightbox 视口尺寸、当前倍率和平移量。
- 输出：图片固有尺寸 CSS、是否可平移、光标状态和变换值。
- 依赖链：`TaskGrid/DetailModal -> setLightboxImageId -> Lightbox -> ensureImageCached`。
- 配置与数据：不新增配置，不修改 IndexedDB，不改变原图和缩略图存储。

## 5. 风险与性能

- 大图会超出视口，这是需求本身；根容器必须裁剪溢出并提供拖拽，避免页面滚动条和不可达区域。
- 触控端原图溢出时应优先拖拽图片，不再把横向手势解释为切图；导航按钮仍保留。
- 溢出判断为常数时间，只读取 DOM 尺寸；图片加载和窗口变化时触发一次重渲染，没有持续监听或额外图片解码。

## 6. 工具与充分性检查

- 当前环境仍未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、Context7、GitHub 代码搜索和 Claude Code 审查工具。
- 使用计划工具、PowerShell、`rg`、本地代码与 Git 历史完成补偿检索；外部库用法未变化，不需要新增第三方方案。
- 已确认三个以上相关实现、输入输出协议、依赖、测试方式、性能与边界风险，满足编码条件。
