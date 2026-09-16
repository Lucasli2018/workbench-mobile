/* 汪汪时间管理局 · Service Worker
   策略：导航请求网络优先（保证拿到最新 index.html），静态资源缓存优先 + 后台更新。
   注意：Service Worker 只在 https 或 localhost 下生效；用 file:// 直接打开时不受影响。 */
const CACHE = "workbench-doggy-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./workbench-assets/greet-banner.webp",
  "./workbench-assets/avatar.webp",
  "./workbench-assets/icon-192.png",
  "./workbench-assets/icon-512.png",
  "./workbench-assets/icon-maskable-512.png",
  "./workbench-assets/apple-touch-icon.png",
];

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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // 导航请求：网络优先，离线回落缓存
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        await putSafe(c, "./index.html", res);
        return res;
      } catch (err) {
        return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
      }
    })());
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
