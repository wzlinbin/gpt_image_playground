# 项目上下文摘要（Wrangler Preview URLs）

生成时间：2026-07-30 13:50:00 +08:00

## 1. 需求与验收条件

- 消除部署时因 preview_urls 缺失而由 Wrangler 自动启用 Preview URLs 的警告。
- 保留现有 workers.dev 正式访问入口，不引入自定义域名或 route。
- 在 wrangler.jsonc 中显式禁用每版本 Preview URL。
- Wrangler 配置解析、类型生成检查、部署 dry-run、构建和测试全部通过。

## 2. 现有实现与依据

- wrangler.jsonc：当前只有 Worker 名称、入口、兼容日期、变量保留和静态资源绑定，没有 routes、workers_dev 或 preview_urls。
- node_modules/wrangler/config-schema.json:65：Wrangler 4.96.0 将 workers_dev 定义为顶层布尔字段，默认 true。
- node_modules/wrangler/config-schema.json:71：preview_urls 是顶层布尔字段，用于控制版本化 workers.dev 预览地址。
- node_modules/wrangler/wrangler-dist/cli.js:297576：只有 preview_urls 缺失且部署状态变化时才产生用户看到的默认值警告。
- package.json：Cloudflare 部署使用现有 npm run build && wrangler deploy，无需修改脚本。

## 3. 技术选型与风险

- 选择顶层 preview_urls: false，直接采用本地安装版本的官方 schema 字段。
- 不设置 workers_dev: false：项目无自定义 routes，关闭 workers.dev 会移除当前公开入口，不符合本次需求。
- 不新增环境分支：当前只有默认部署环境，顶层字段覆盖实际部署路径。
- 性能、运行时和数据均不受影响；只改变部署版本预览 URL 的发布行为。

## 4. 测试策略与工具

- npx wrangler --version 确认使用 4.96.0。
- 使用 node_modules/wrangler/config-schema.json 验证字段类型与位置。
- 执行 npx wrangler types --check、npx wrangler deploy --dry-run、npm run build、npm test 和 git diff --check。
- 当前环境未提供 sequential-thinking、shrimp-task-manager、desktop-commander、Context7、GitHub 代码搜索和 Claude Code 审查工具；使用计划工具、PowerShell、本地 schema、Wrangler CLI 和 Cloudflare 官方页面补偿。

## 5. 充分性检查

- 已确认配置输入、Wrangler 解析协议、部署输出和环境要求。
- 已分析三个以上相关模式：当前配置、schema 字段、CLI 警告分支和部署脚本。
- 已确认无重复配置、无新增依赖、无数据迁移，并定义可重复本地验证方式。
