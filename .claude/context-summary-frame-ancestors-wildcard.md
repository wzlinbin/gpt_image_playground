# 项目上下文摘要（允许 api2cn.com 全部子域名嵌入）

生成时间：2026-08-17 10:47:03 +08:00

## 1. 相似实现分析

- `public/_headers:1-3`：使用 Cloudflare Pages `_headers` 语法为全部路径设置 CSP，并显式移除 `X-Frame-Options`，本次复用同一规则，仅调整 `frame-ancestors` 主机源。
- `README.md:254`：集中说明嵌入来源与重新构建要求，本次同步更新，避免文档与部署配置不一致。
- `vite.config.ts` 与 Vite 默认公共目录约定：`public/` 内容随构建复制到 `dist/`，无需新增复制脚本。
- `wrangler.jsonc:8-13`：Cloudflare Worker 从 `dist` 提供静态资源，`dist/_headers` 是部署集成点。

## 2. 项目约定

- 配置文件保持原有缩进和单行 CSP 格式。
- 中文说明沿用 README 既有表述。
- 不手工修改 `dist/`，由 `npm run build` 生成并验证。

## 3. 可复用组件清单

- `public/_headers`：现有 CSP 配置入口。
- Vite `public/` 复制机制：现有构建能力。
- Wrangler `assets.directory`：现有静态资源部署入口。

## 4. 测试策略

- 运行 `npm run build`，确认 TypeScript 与 Vite 构建成功。
- 检查 `dist/_headers` 精确包含 `https://*.api2cn.com`，且不再包含两个旧的显式子域名。
- 运行 `git diff --check` 检查空白错误。

## 5. 依赖和集成点

- 输入：浏览器父页面来源。
- 配置：`public/_headers` 的 `Content-Security-Policy`。
- 构建输出：`dist/_headers`。
- 部署：Wrangler 从 `dist` 提供静态资源。
- 输出协议：同源和任意 HTTPS `api2cn.com` 子域名可作为 iframe 父页面；裸域 `https://api2cn.com` 不在通配范围内。

## 6. 技术选型理由

使用 CSP 标准通配主机源 `https://*.api2cn.com`，直接替换逐个维护的子域名列表，不新增运行时代码或依赖。

## 7. 关键风险点

- `https://*.api2cn.com` 仅匹配 HTTPS 子域名，不匹配裸域。
- 这是 iframe 嵌入策略，不影响 API CORS。
- 必须重新构建和部署后才会在线上生效。

## 8. 上下文充分性检查

- 能定义接口契约：是，输入为父页面来源，输出为 CSP 嵌入许可。
- 理解技术选型：是，复用标准 CSP 主机源语法和现有 `_headers` 配置。
- 已识别风险：是，明确通配范围、协议和部署生效条件。
- 知道验证方式：是，构建后检查 `dist/_headers` 并执行空白检查。
