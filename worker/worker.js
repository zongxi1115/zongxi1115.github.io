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
function loginForm(error = "") { return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>页面上传管理</title><style>${styles()}</style><h1>页面上传管理</h1><p>仅限站点管理员使用。</p>${error ? `<p>${escape(error)}</p>` : ""}<form method="post" action="/login"><input name="password" type="password" placeholder="管理密码" required autofocus><button>登录</button></form></html>`; }
function uploadForm() { return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>上传新网页</title><style>${styles()}</style><h1>上传新网页</h1><p>文件将发布至 <code>/pages/</code>，并自动加入网页目录。</p><form method="post" action="/upload" enctype="multipart/form-data"><label>页面标题<input name="title" required></label><label>URL 文件名<input name="slug" pattern="[a-z0-9][a-z0-9-]{0,80}" placeholder="operating-systems" required></label><label>HTML 文件<input name="file" type="file" accept="text/html,.html" required></label><button>上传并发布</button></form></html>`; }
function styles() { return "body{max-width:620px;margin:10vh auto;padding:24px;font-family:system-ui;background:#101114;color:#f5f7fa}input,button{box-sizing:border-box;display:block;width:100%;padding:12px;margin:8px 0 18px;border-radius:8px;border:1px solid #3a414c}button{background:#76a7ff;color:#08111f;font-weight:700}"; }
