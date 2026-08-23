const MAX_UPLOAD_BYTES = 512 * 1024;
const SESSION_AGE = 60 * 60 * 24 * 7;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/login" && request.method === "POST") return login(request, env);
    if (!(await authenticated(request, env))) return page(loginForm(), 401);
    if (url.pathname === "/" && request.method === "GET") return page(uploadForm());
    if (url.pathname === "/upload" && request.method === "POST") return upload(request, env);
    return new Response("Not found", { status: 404 });
  },
};

async function login(request, env) {
  const password = (await request.formData()).get("password");
  if (password !== env.ADMIN_PASSWORD) return page(loginForm("密码不正确。"), 401);
  const stamp = Math.floor(Date.now() / 1000).toString();
  const signature = await sign(stamp, env.SESSION_SECRET);
  return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": `admin_session=${stamp}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE}` } });
}

async function authenticated(request, env) {
  const session = request.headers.get("Cookie")?.match(/(?:^|;\s*)admin_session=([^;]+)/)?.[1];
  const [stamp, signature] = session?.split(".") ?? [];
  return Boolean(stamp && signature && Date.now() / 1000 - Number(stamp) <= SESSION_AGE && await sign(stamp, env.SESSION_SECRET) === signature);
}

async function upload(request, env) {
  const form = await request.formData();
  const slug = String(form.get("slug") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return error("文件名只能使用小写字母、数字和连字符。");
  if (!title) return error("请填写页面标题。");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".html")) return error("只能上传 HTML 文件。");
  if (file.size > MAX_UPLOAD_BYTES) return error("单个页面不能超过 512KB。");

  const path = `pages/${slug}.html`;
  const url = `/pages/${slug}.html`;
  await put(env, path, await file.text(), `feat: add ${slug} page`);
  const index = await get(env, "pages/index.html");
  if (!index.content.includes(`href="${url}"`)) {
    const entry = `        <li><a href="${url}">${escape(title)}<br /><small>在线上传</small></a></li>`;
    const content = index.content.replace("        <!-- PAGE_ENTRIES -->", `${entry}\n        <!-- PAGE_ENTRIES -->`);
    await put(env, "pages/index.html", content, `docs: list ${slug} page`, index.sha);
  }
  return page(`<!doctype html><meta charset="UTF-8"><title>发布成功</title><p>“${escape(title)}” 已提交到 GitHub Pages。</p><p><a href="https://zongxi1115.github.io${url}">打开新页面</a> · <a href="https://zongxi1115.github.io/pages/">查看网页目录</a></p>`);
}

async function get(env, path) {
  const response = await github(env, path, { method: "GET" });
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`);
  const data = await response.json();
  return { sha: data.sha, content: new TextDecoder().decode(fromBase64(data.content.replace(/\n/g, ""))) };
}

async function put(env, path, content, message, sha) {
  const body = { message, content: base64(new TextEncoder().encode(content)), branch: "main" };
  if (sha) body.sha = sha;
  const response = await github(env, path, { method: "PUT", body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`GitHub write failed: ${response.status}`);
}

function github(env, path, init) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodedPath}`, { ...init, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2026-03-10" } });
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function base64(bytes) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function fromBase64(value) { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }
function escape(value) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function page(html, status = 200) { return new Response(html, { status, headers: { "Content-Type": "text/html; charset=UTF-8" } }); }
function error(message) { return page(`<!doctype html><meta charset="UTF-8"><p>${escape(message)}</p><p><a href="/">返回管理页</a></p>`, 400); }
function loginForm(error = "") { return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面上传管理</title>${uiHead()}</head><body><main class="shell narrow"><div class="brand"><span class="brand-mark">↥</span><span>Pages Uploader</span></div><sl-card class="panel"><div class="panel-body"><p class="eyebrow">管理员入口</p><h1>发布一个新网页</h1><p class="lead">登录后，将 HTML 直接发布到你的 GitHub Pages。</p>${error ? `<sl-alert variant="danger" open><strong>登录失败</strong><br>${escape(error)}</sl-alert>` : ""}<form method="post" action="/login"><label for="password">管理密码</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><sl-button variant="primary" type="submit" size="large">进入上传管理</sl-button></form></div></sl-card></main></body></html>`; }
function uploadForm() { return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>上传新网页</title>${uiHead()}</head><body><main class="shell"><header class="topbar"><div class="brand"><span class="brand-mark">↥</span><span>Pages Uploader</span></div><a href="https://zongxi1115.github.io/pages/" target="_blank" rel="noopener">查看网页目录 ↗</a></header><section class="hero"><p class="eyebrow">在线发布</p><h1>拖进来，立即上线。</h1><p class="lead">选择一个 HTML 文件，标题和 URL 会自动根据文件名生成，你随时可以修改。</p></section><sl-card class="panel"><div class="panel-body"><form method="post" action="/upload" enctype="multipart/form-data" id="upload-form"><input id="file" name="file" type="file" accept="text/html,.html" required><label class="dropzone" for="file" id="dropzone"><span class="upload-icon" aria-hidden="true">⇧</span><strong>拖入 HTML 文件</strong><span>或点击这里选择文件</span></label><p id="file-status" class="file-status" role="status" aria-live="polite">还没有选择文件</p><div class="fields"><div><label for="title">页面标题</label><input id="title" name="title" required placeholder="文件名会自动填入这里"></div><div><label for="slug">URL 文件名</label><div class="suffix-input"><input id="slug" name="slug" pattern="[a-z0-9][a-z0-9-]{0,80}" required placeholder="my-page"><span>.html</span></div><p class="hint">仅小写字母、数字和连字符</p></div></div><div class="actions"><sl-button variant="primary" type="submit" size="large">上传并发布</sl-button><span>最大 512KB</span></div></form></div></sl-card></main><script>${uploadScript()}</script></body></html>`; }
function uiHead() { return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css"><script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script><style>${styles()}</style>`; }
function uploadScript() { return `const fileInput=document.getElementById('file');const dropzone=document.getElementById('dropzone');const title=document.getElementById('title');const slug=document.getElementById('slug');const status=document.getElementById('file-status');const applyFile=file=>{if(!file)return;const base=file.name.replace(/\.html?$/i,'');title.value=base;slug.value=base.toLowerCase().replace(/[_\\s]+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');status.textContent='已选择：'+file.name;dropzone.classList.add('has-file')};fileInput.addEventListener('change',()=>applyFile(fileInput.files[0]));['dragenter','dragover'].forEach(type=>dropzone.addEventListener(type,event=>{event.preventDefault();dropzone.classList.add('is-dragging')}));['dragleave','drop'].forEach(type=>dropzone.addEventListener(type,event=>{event.preventDefault();dropzone.classList.remove('is-dragging')}));dropzone.addEventListener('drop',event=>{const file=event.dataTransfer.files[0];if(!file)return;fileInput.files=event.dataTransfer.files;applyFile(file)});`; }
function styles() { return `:root{--sl-color-primary-600:#5b44ff;--sl-color-primary-500:#715cff;--sl-focus-ring-color:#715cff}*{box-sizing:border-box}body{min-height:100vh;margin:0;background:radial-gradient(circle at top left,#e8e4ff 0,transparent 32rem),#f7f7fb;color:#1d1c29;font:16px/1.5 Inter,ui-sans-serif,system-ui,"Microsoft YaHei",sans-serif}.shell{width:min(100% - 32px,760px);margin:0 auto;padding:56px 0 80px}.shell.narrow{width:min(100% - 32px,460px);padding-top:13vh}.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:68px;font-size:.9rem}.topbar a{color:#4d3ad4;text-decoration:none;font-weight:700}.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.02em}.brand-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:11px;background:#5b44ff;color:#fff;font-size:1.25rem}.hero{max-width:590px;margin-bottom:32px}.eyebrow{margin:0 0 8px;color:#5b44ff;font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.hero h1,h1{margin:0;letter-spacing:-.045em;line-height:1.08;font-size:clamp(2.2rem,6vw,4.25rem)}.narrow h1{font-size:2.25rem}.lead{margin:16px 0 0;color:#68667a;font-size:1.05rem}.panel::part(base){border:1px solid #e5e3ee;border-radius:24px;background:#fff;box-shadow:0 22px 60px rgb(38 27 92 / .1)}.panel-body{padding:30px}.narrow .panel{margin-top:28px}form{margin-top:26px}label{display:block;margin:0 0 8px;font-size:.88rem;font-weight:750;color:#333043}input{width:100%;min-height:48px;border:1px solid #d9d6e5;border-radius:12px;background:#fff;padding:0 14px;color:#1d1c29;font:inherit;outline:0;transition:border-color .15s,box-shadow .15s}input:focus-visible{border-color:#715cff;box-shadow:0 0 0 3px rgb(113 92 255 / .22)}sl-button{width:100%;margin-top:20px}sl-button::part(base){border-radius:12px;font-weight:800}.dropzone{display:flex;min-height:220px;align-items:center;justify-content:center;flex-direction:column;gap:6px;border:1.5px dashed #c7c2df;border-radius:18px;background:#faf9ff;color:#706d80;cursor:pointer;transition:border-color .16s,background .16s,transform .16s}.dropzone strong{color:#2d2a3c;font-size:1.1rem}.dropzone:hover,.dropzone.is-dragging,.dropzone.has-file{border-color:#715cff;background:#f0eeff}.dropzone.is-dragging{transform:scale(1.01)}.upload-icon{display:grid;place-items:center;width:48px;height:48px;margin-bottom:5px;border-radius:16px;background:#ded9ff;color:#5b44ff;font-size:1.8rem;font-weight:800}.file-status{min-height:24px;margin:10px 0 24px;color:#68667a;font-size:.9rem}.fields{display:grid;grid-template-columns:1fr 1fr;gap:18px}.suffix-input{position:relative}.suffix-input input{padding-right:54px}.suffix-input span{position:absolute;right:14px;top:12px;color:#868296;font-size:.9rem}.hint{margin:6px 0 0;color:#868296;font-size:.78rem}.actions{display:flex;align-items:center;gap:18px;margin-top:28px}.actions sl-button{flex:1;margin:0}.actions span{color:#868296;font-size:.82rem;white-space:nowrap}sl-alert{margin-top:20px}#file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}@media (max-width:580px){.shell{padding-top:32px}.topbar{margin-bottom:48px}.fields{grid-template-columns:1fr}.actions{align-items:stretch;flex-direction:column}.actions span{text-align:center}.panel-body{padding:20px}}@media (prefers-reduced-motion:reduce){*{transition:none!important}}`; }
