# 项目上下文摘要（对齐 Wrangler 远程部署配置）

生成时间：2026-08-17 10:58:23 +08:00

## 1. 现有实现与模式

- `wrangler.jsonc`：以本地配置作为 Worker 部署来源，已设置 `preview_urls: false` 和 `keep_vars: true`。
- `node_modules/wrangler/config-schema.json`：Wrangler 4.96.0 支持 `workers_dev`、`routes`、`custom_domain`、`enabled` 与 `previews_enabled`；`keep_vars: true` 保留 Dashboard 变量。
- `README.md:224-250`：使用 `npm run deploy:cf` 部署，并明确由 Dashboard 管理 `API_CONFIG_*` 变量。
- 用户提供的远程差异：线上使用 `img.api2cn.com` 自定义域、`workers_dev: false`，且包含 Dashboard 变量。

## 2. 依赖与集成点

- 输入：`wrangler.jsonc` 与 Dashboard 远程 Worker 配置。
- 路由输出：`img.api2cn.com` 自定义域。
- 变量策略：本地不声明 `API_CONFIG_*`，通过 `keep_vars: true` 或部署参数 `--keep-vars` 保留远程值。
- 静态资源：继续由 `dist` 和 `env.ASSETS` 提供。

## 3. 实现约定

- 使用 Wrangler 官方 schema 字段，不自定义部署脚本。
- 保持 JSONC 双引号、2 空格缩进和现有字段组织。
- 不把 Dashboard 变量复制到仓库，不执行未经确认的真实部署。

## 4. 验收条件与测试策略

- 本地显式设置 `workers_dev: false`。
- 本地声明 `img.api2cn.com` 自定义域，并关闭该域预览。
- 保留 `keep_vars: true`，Dashboard 变量不纳入版本控制。
- `npx wrangler types --check`、`npx wrangler deploy --dry-run --keep-vars` 和 `git diff --check` 全部通过。

## 5. 风险与回滚

- dry-run 不读取远程差异，最终是否仍出现提示只能在下一次真实部署时确认。
- 若自定义域需要迁移，必须先更新 `routes`，否则本地配置会继续以 `img.api2cn.com` 为部署目标。
- 回滚可删除 `workers_dev` 和 `routes`，但随后部署会再次出现覆盖远程配置的警告。
