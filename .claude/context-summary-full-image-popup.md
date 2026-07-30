# 项目上下文摘要（点击图片打开完整分辨率大图）

生成时间：2026-07-30 12:42:34 +08:00

## 1. 需求与验收条件

- 目标：用户点击任务卡片的图片区域时，直接打开完整分辨率的全屏大图，不再先打开包含半屏图片的任务详情弹窗。
- 范围：任务网格到 Lightbox 的点击路由、对应组件测试和本地验证；不改变图片生成、存储、下载或缩略图策略。
- 正常流程：已完成且含输出图片的任务，点击图片区域后设置 `lightboxImageId` 和完整的 `lightboxImageList`。
- 边界流程：点击提示词、参数等非图片区域时仍设置 `detailTaskId`；没有输出图片的任务仍打开详情。
- 原图保证：Lightbox 必须继续通过 `ensureImageCached` 从原图存储加载，不得调用 `ensureImageThumbnailCached`。

## 2. 相似实现分析

### 实现 1：`src/components/TaskCard.tsx:249`

- 模式：列表卡片只通过 `ensureImageThumbnailCached` 和 `subscribeImageThumbnail` 加载缩略图。
- 可复用：首张输出图 ID、完整 `task.outputImages` 列表，以及现有卡片点击冒泡链路。
- 约束：缩略图最长边上限为 720px，只适合列表，不能作为弹出大图的数据源。

### 实现 2：`src/components/DetailModal.tsx:183`

- 模式：详情弹窗通过 `getCachedImage` / `ensureImageCached` 加载输出原图，并在图片点击时调用 `setLightboxImageId(currentOutputImageId, task.outputImages)`。
- 可复用：Lightbox 的状态协议和同一任务多图导航列表。
- 约束：详情布局的图片区域只占弹窗左半侧，因此不是用户要求的直接大图体验。

### 实现 3：`src/components/Lightbox.tsx:46`

- 模式：Lightbox 根据 `lightboxImageId` 从原图缓存或 IndexedDB 原图记录读取资源，支持缩放、拖动、键盘和触控导航。
- 可复用：现有完整分辨率加载、全屏遮罩和多图导航，无需新增查看器。
- 约束：状态变化时会异步加载原图；组件在原图可用前不渲染，避免显示列表缩略图过渡。

### 实现 4：`src/lib/imageCache.ts:87`

- 模式：原图缓存 `imageCache` 与缩略图缓存 `thumbnailCache` 完全分离。
- 可复用：`ensureImageCached` 读取 `getImage(id).dataUrl` 的原始 Data URL。
- 约束：原图内存缓存限制为 8 项，未命中时需要 IndexedDB I/O，这是现有预期行为。

## 3. 项目约定

- 命名：组件和类型使用 PascalCase，函数与变量使用 camelCase，模块常量使用 UPPER_SNAKE_CASE。
- 文件组织：交互路由留在 `TaskGrid.tsx`，卡片 DOM 语义留在 `TaskCard.tsx`，不向大型 `store.ts` 增加逻辑。
- 代码风格：2 空格、单引号、无分号、箭头函数参数带括号、优先早返回。
- UI 文案和注释：使用简体中文；本次不需要新增可见文案。

## 4. 可复用组件清单

- `useStore().setLightboxImageId`：打开大图并传入导航图片列表。
- `Lightbox`：完整分辨率图片读取和全屏交互。
- `ensureImageCached`：从原图缓存或 IndexedDB 读取原始 Data URL。
- `TaskCard` 的 `task.outputImages`：首图和同任务多图导航来源。

## 5. 测试策略

- 测试框架：Vitest 4 + jsdom + React `act`，参考 `src/components/ApiKeyPromptModal.test.tsx`。
- 组件隔离：模拟 store 与 `TaskCard`，只验证 `TaskGrid` 的点击分流协议，避免 IndexedDB 和真实图片解码干扰。
- 覆盖：点击图片打开 Lightbox；点击非图片区域打开详情；无输出图片时回退详情。
- 回归：执行定向测试、全量 `npm test`、`npm run build` 和浏览器点击验证。

## 6. 依赖与集成点

- 外部依赖：React 19、Zustand 5、Vitest 4；不新增依赖。
- 内部依赖：`TaskGrid -> TaskCard`，`TaskGrid -> useStore.setLightboxImageId`，`App -> Lightbox`，`Lightbox -> imageCache -> db`。
- 输入协议：卡片点击事件的目标元素、任务状态和 `task.outputImages`。
- 输出协议：图片区域设置 Lightbox 状态；其他区域设置详情状态。
- 配置与环境：无需新增配置；浏览器需支持现有 IndexedDB 和 Data URL 图片加载。

## 7. 技术选型与风险

- 方案：复用现有 Lightbox，只增加稳定的图片区域 DOM 标记和点击分流。
- 优势：不重复实现弹窗、不复制原图数据、不改变缩略图性能优化，改动局部且可自动测试。
- 风险：卡片含比例徽标等覆盖元素，不能只判断 `img` 事件目标；因此应标记整个图片预览容器。
- 性能：点击时只触发既有一次原图缓存/IndexedDB 查询；列表继续只解码 720px 缩略图。
- 并发：Lightbox 既有 effect 使用 `cancelled` 标记处理快速切图，不新增竞态。

## 8. 工具与充分性检查

- 当前环境未提供 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、Context7、GitHub 代码搜索和 Claude Code 审查工具。
- 补偿方式：使用任务计划工具模拟任务管理，使用 PowerShell + `rg` 进行本地检索，使用 Git 历史核对实现来源，并以 Vitest、TypeScript 构建和浏览器自动化完成验证。
- 已确认至少三个相似实现、可复用接口、命名风格、测试方式、无重复实现、依赖与集成点，满足进入编码阶段的条件。
