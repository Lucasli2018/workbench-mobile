// GET  /api/me -> 当前登录用户的云端整包数据
// PUT  /api/me -> 用本地整包数据覆盖云端（data 字段，拒绝任何账号相关字段注入）
import { json, parseUser } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const u = await parseUser(env, request);
  if (!u) return json({ error: "未登录" }, 401);
  let d = {};
  try { d = u.data ? JSON.parse(u.data) : {}; } catch (e) {}
  return json({ user: { name: u.name, data: d } });
}

export async function onRequestPut({ request, env }) {
  const u = await parseUser(env, request);
  if (!u) return json({ error: "未登录" }, 401);
  const body = await request.json().catch(() => ({}));
  // 只接受整包 data；即便前端误传 name / pw_hash 等字段也一律忽略，避免污染账号。
  const data = (body && typeof body.data === "object" && body.data !== null) ? body.data : {};
  await env.DB.prepare("UPDATE wbm_users SET data=? WHERE name=?").bind(JSON.stringify(data), u.name).run();
  return json({ ok: true });
}
