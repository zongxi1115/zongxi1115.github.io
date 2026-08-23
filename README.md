# zongxi1115.github.io

个人 GitHub Pages 站点。

## 目录约定

- `/`：当前个人主页。根目录的 `index.html`、`assets/` 与 `CNAME` 是线上主页所需文件。
- `res/`：仍在使用的独立网页；除非用户明确要求，不要移动、删除或重构它。
- `pages/`：新加入、适合公开展示的独立网页。每新增一个 HTML 页面，都要在 `pages/index.html` 添加入口。
- `archive/`：历史页面和旧实验代码，只作保留，不要在没有明确要求时修改其内部引用或重构。

## 维护规则

1. 新页面应放入 `pages/`，使用相对完整的静态资源路径，并在 `pages/index.html` 中展示。
2. 不要把旧页面重新放回仓库根目录。
3. 变更前确认不会影响根目录主页和 `res/`；本仓库是静态 Pages，通常无需构建。
4. 不要运行 `pnpm build` 或启动开发服务器，除非用户明确允许。
5. 提交前检查 `git status`；只有在用户明确要求时才提交或推送。

## 在线更新的边界

GitHub Pages 只托管仓库中的静态文件。若要从站内上传并更新文件，需要单独的受控服务（例如 GitHub App / OAuth 与服务端或 Worker）代表用户调用 GitHub API；不要把具有写权限的 GitHub Token 放进前端代码。
