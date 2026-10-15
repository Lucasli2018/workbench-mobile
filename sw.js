/* 汪汪时间管理局 · Service Worker
   策略：导航请求网络优先（保证拿到最新 index.html），静态资源缓存优先 + 后台更新。
   注意：Service Worker 只在 https 或 localhost 下生效；用 file:// 直接打开时不受影响。 */
const CACHE = "workbench-doggy-v7";

// 预缓存清单：页面 + 清单 + 图标 + 拆分后的样式与脚本。
// 改动 src/ 下的文件结构时，记得同步这里并升级 CACHE 版本号。
const STYLE = [
  "01-tokens.css", "02-base.css", "03-components.css", "04-features.css", "05-system.css",
].map((f) => "./src/css/" + f);

const SCRIPT = [
  "core/date.js", "core/utils.js", "config.js", "core/store.js",
  "ui/charts.js", "ui/overlays.js", "ui/records.js", "ui/drawer.js", "ui/gestures.js", "ui/panels.js",
  "features/stats.js", "features/home.js", "features/insight.js",
  "features/finance.js", "features/notes.js", "features/todo.js", "features/trash.js", "features/cloud.js",
  "data/safety.js", "data/transfer.js",
  "core/router.js",
  "system/a11y.js", "system/theme.js", "system/pwa.js",
  "boot.js",
].map((f) => "./src/js/" + f);

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./workbench-assets/greet-banner.jpg",
  "./workbench-assets/avatar.jpg",
  "./workbench-assets/icon-192.png",
  "./workbench-assets/icon-512.png",
  "./workbench-assets/icon-maskable-512.png",
  "./workbench-assets/apple-touch-icon.png",
].concat(STYLE, SCRIPT);

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 单个资源失败不影响整体安装
    await Promise.all(CORE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function putSafe(cache, req, res) {
  try { if (res && res.ok && res.type === "basic") await cache.put(req, res.clone()); } catch (err) { /* 忽略配额等异常 */ }
}

// 页面（导航请求 / index.html / 根路径）：网络优先，离线回落缓存
async function pageFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    await putSafe(c, "./index.html", res);
    return res;
  } catch (err) {
    return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // API 请求（/api/*）一律走网络、不经过缓存，避免拿到过期的会话态或同步结果
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(req));
    return;
  }

  // 导航请求，以及任何形态的 index.html / 根路径，都走网络优先
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(pageFirst(req));
    return;
  }

  // 其它同源静态资源：缓存优先 + 后台更新
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    const net = fetch(req).then(async (res) => { await putSafe(c, req, res); return res; }).catch(() => null);
    if (hit) return hit;
    const res = await net;
    return res || Response.error();
  })());
});
