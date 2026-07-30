# 项目上下文摘要（Lightbox 原图下载按钮）

生成时间：2026-07-30 13:32:49 +08:00

## 1. 需求与验收条件

- 在 Lightbox 显示的原图右上角叠加下载图标按钮，视觉参考用户提供的深色小型图标按钮。
- 点击按钮下载当前 Lightbox 图片的原始文件，不使用任务卡片缩略图。
- 下载成功和失败均显示现有 Toast；下载期间禁用重复点击。
- 按钮点击不得关闭 Lightbox、触发图片拖拽或随图片缩放而放大。
- 切换多图后按钮必须下载当前 `lightboxImageId`。

## 2. 相似实现分析

- `src/components/DetailModal.tsx:357`：使用 `downloadImageIds([imageId], fileNameBase)` 下载当前输出图，并统一显示“下载成功/下载失败”Toast。
- `src/components/DetailModal.tsx:464`：图片右上角使用半透明黑色背景、`DownloadIcon` 和 ViewportTooltip，视觉与用户示例一致。
- `src/components/ImageContextMenu.tsx:102`：根据图片是否属于任务选择 `task-{id}` 或 `image-{id}` 文件名，覆盖输出图和输入图场景。
- `src/components/TooltipButton.tsx:5`：封装图标按钮的 aria-label、悬浮提示、禁用态与点击提示关闭，可直接复用。
- `src/lib/downloadImages.ts:25`：统一从原图缓存读取 Blob、推断扩展名并触发浏览器下载，不应新增平行下载逻辑。

## 3. 项目约定与实现边界

- 代码遵循 2 空格、单引号、无分号、camelCase、早返回和中文提示。
- 下载动作保留在 Lightbox 外层组件，内部展示组件只接收 `onDownload` 与 `downloading`，不访问 store。
- 按钮作为缩放容器的兄弟覆盖层，锚定图片布局右上角，不参与 translate/scale。
- Lightbox 的原图读取、屏幕适配、导航和触控逻辑保持不变。

## 4. 测试策略、依赖与风险

- Vitest + jsdom 模拟 `downloadImageIds`，覆盖成功、零成功结果和 Lightbox 保持打开。
- 断言按钮 aria-label、图标覆盖层位置，以及按钮不位于 transform 容器内。
- 依赖：现有 `downloadImageIds`、`DownloadIcon`、`TooltipButton`、store Toast；不新增依赖或配置。
- 性能：单次点击只执行既有一次原图 Blob 读取；下载状态防止并发重复操作。
- 事件风险：缩放状态下根层原生 mousedown 监听可能拦截按钮，需明确忽略 `button` 控件。

## 5. 工具与充分性检查

- 当前环境未提供 sequential-thinking、shrimp-task-manager、desktop-commander、Context7、GitHub 代码搜索和 Claude Code 审查工具。
- 使用计划工具、PowerShell、`rg`、现有代码、Vitest、Vite 构建和开发服务器检查补偿。
- 已确认三个以上相似实现、输入输出协议、下载工具、按钮组件、测试方式和事件风险，满足编码条件。
