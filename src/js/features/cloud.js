/* ============================================================
   云端同步层（参考 linguaverse-web）：注册 / 登录 + 双向同步。
   后端：Cloudflare Pages Functions + D1（wbm_users / wbm_sessions）。
   会话用 HttpOnly Cookie（wbm_sid），前端不直接持有 token。
   数据模型：整包 `data`（模块 + __* 元数据）作为单一 JSON 存云端。
   同步方向由用户主动选择：
     - 同步到云端：本地 data 整包覆盖云端副本；
     - 从云端同步：云端 data 整包覆盖本机（需二次确认，可能丢弃本机未备份改动）。
   ============================================================ */

const API_BASE = "";
let CLOUD = { on: false, syncing: false, lastErr: "" };
let cloudUser = (typeof data !== "undefined" && data && data.__cloudUser) || null;  // 当前登录用户名

function cloudOnline() { return CLOUD.on && (typeof navigator === "undefined" || navigator.onLine !== false); }

async function apiFetch(path, opts = {}) {
  if (typeof fetch !== "function") throw new Error("NETWORK");
  let r;
  try {
    r = await fetch(API_BASE + path, Object.assign({ credentials: "same-origin", headers: { "content-type": "application/json" } }, opts));
  } catch (e) { throw new Error("NETWORK"); }
  if (!r.ok) {
    let e = null;
    try { e = await r.json(); } catch (_) {}
    throw new Error((e && e.error) || ("HTTP " + r.status));
  }
  return r.json();
}

// 启动探测：401/200 = 有后端（200 表示已带会话）；404 / 网络 = 纯本地模式。
async function bootCloud() {
  try {
    const r = await fetch(API_BASE + "/api/me", { credentials: "same-origin" });
    if (r.status === 401 || r.status === 200) {
      CLOUD.on = true;
      if (r.status === 200) {
        const d = await r.json();
        if (d.user) { cloudUser = d.user.name; data.__cloudUser = cloudUser; store.save(); }
      }
      return;
    }
    CLOUD.on = false;
  } catch (e) { CLOUD.on = false; }
}

/* ---------- 账号操作 ---------- */
async function cloudRegister(name, pw) {
  const d = await apiFetch("/api/register", { method: "POST", body: JSON.stringify({ user: name, pw }) });
  cloudUser = d.user.name; data.__cloudUser = cloudUser; store.save();
  return d;
}
async function cloudLogin(name, pw) {
  const d = await apiFetch("/api/login", { method: "POST", body: JSON.stringify({ user: name, pw }) });
  cloudUser = d.user.name; data.__cloudUser = cloudUser; store.save();
  return d;
}
async function cloudLogout() {
  try { await apiFetch("/api/logout", { method: "POST" }); } catch (e) {}
  cloudUser = null; delete data.__cloudUser; store.save();
}

/* ---------- 双向同步 ---------- */
// 本地 → 云端：整包覆盖
async function cloudPush() {
  if (!cloudOnline()) { CLOUD.lastErr = "离线或云端不可用"; throw new Error(CLOUD.lastErr); }
  CLOUD.syncing = true;
  try {
    await apiFetch("/api/me", { method: "PUT", body: JSON.stringify({ data }) });
    CLOUD.lastErr = "";
    return true;
  } catch (e) { CLOUD.lastErr = String((e && e.message) || e); throw e; }
  finally { CLOUD.syncing = false; }
}

// 云端 → 本地：整包覆盖（会替换本机全部 data）
async function cloudPull() {
  if (!cloudOnline()) { CLOUD.lastErr = "离线或云端不可用"; throw new Error(CLOUD.lastErr); }
  CLOUD.syncing = true;
  try {
    const d = await apiFetch("/api/me");
    const incoming = (d.user && d.user.data) || {};
    data = incoming;                       // 整包替换（data 为全局 let）
    if (cloudUser) data.__cloudUser = cloudUser;
    store.save(); render();
    CLOUD.lastErr = "";
    return true;
  } catch (e) { CLOUD.lastErr = String((e && e.message) || e); throw e; }
  finally { CLOUD.syncing = false; }
}

/* ---------- 云端同步面板 ---------- */
function openCloudPanel() {
  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div>
    <h2>云端同步</h2>
    <div class="sub" id="cloudSub"></div>
    <div id="cloudBody"></div>
    <div class="cl-status" id="cloudStatus"></div>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) close(); };

  const sub = overlay.querySelector("#cloudSub");
  const body = overlay.querySelector("#cloudBody");
  const statusEl = overlay.querySelector("#cloudStatus");
  const setStatus = (msg, ok) => {
    statusEl.textContent = msg || "";
    statusEl.className = "cl-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  };

  function paint() {
    if (!CLOUD.on) {
      sub.textContent = "未检测到云端服务（当前为纯本地模式，数据仅存本机）。部署 Pages Functions + D1 后即可启用云端同步。";
      body.innerHTML = "";
      setStatus("");
      return;
    }
    if (cloudUser) {
      sub.innerHTML = `已登录为 <b>${esc(cloudUser)}</b>。选择同步方向：「同步到云端」覆盖云端副本；「从云端同步」用云端数据覆盖本机（含本机未备份的改动）。`;
      body.innerHTML = `
        <div class="modal-actions cloud-actions">
          <button class="btn" id="clPush">${icon("upload", 18)} 同步到云端</button>
          <button class="btn ghost" id="clPull">${icon("download", 18)} 从云端同步</button>
        </div>
        <div class="modal-actions">
          <button class="link-danger" id="clLogout">退出登录</button>
        </div>`;
      body.querySelector("#clPush").onclick = async () => {
        setStatus("正在同步到云端…");
        try { await cloudPush(); setStatus("已同步到云端 ✓", true); }
        catch (e) { setStatus("同步失败：" + (e.message || e), false); }
      };
      body.querySelector("#clPull").onclick = async () => {
        const ok = await confirmBox({
          title: "从云端同步", sub: "这会用云端数据覆盖本机全部数据，本机未备份的改动将丢失。确定继续？",
          okText: "覆盖本机", okClass: "btn danger",
        });
        if (!ok) return;
        setStatus("正在从云端拉取…");
        try { await cloudPull(); setStatus("已从云端同步到本机 ✓", true); setTimeout(close, 900); }
        catch (e) { setStatus("同步失败：" + (e.message || e), false); }
      };
      body.querySelector("#clLogout").onclick = async () => {
        await cloudLogout(); buildDrawer(); close(); toast("已退出登录");
      };
    } else {
      sub.textContent = "注册一个云端账号，在多设备间同步你的工作台数据（数据存于你自己的 D1 数据库）。";
      body.innerHTML = `
        <div class="field"><label>用户名（2-16 字）</label><input id="clName" type="text" maxlength="16" autocomplete="username" placeholder="给自己起个名字" /></div>
        <div class="field"><label>密码（至少 6 位）</label><input id="clPw" type="password" autocomplete="current-password" placeholder="设个密码" /></div>
        <div class="modal-actions">
          <button class="btn ghost" id="clReg">注册</button>
          <button class="btn" id="clLogin">登录</button>
        </div>`;
      const nameEl = body.querySelector("#clName");
      const pwEl = body.querySelector("#clPw");
      const submit = async (mode) => {
        const n = nameEl.value.trim(), p = pwEl.value;
        if (n.length < 2 || n.length > 16) { setStatus("用户名需 2-16 个字符", false); return; }
        if (!p || p.length < 6) { setStatus("密码至少 6 位", false); return; }
        setStatus(mode === "reg" ? "正在注册…" : "正在登录…");
        try {
          if (mode === "reg") await cloudRegister(n, p); else await cloudLogin(n, p);
          buildDrawer(); setStatus("登录成功 ✓", true);
          setTimeout(() => { close(); paint(); }, 450);
        } catch (e) { setStatus((mode === "reg" ? "注册" : "登录") + "失败：" + (e.message || e), false); }
      };
      body.querySelector("#clReg").onclick = () => submit("reg");
      body.querySelector("#clLogin").onclick = () => submit("login");
      nameEl.addEventListener("keydown", e => { if (e.key === "Enter") pwEl.focus(); });
      pwEl.addEventListener("keydown", e => { if (e.key === "Enter") submit("login"); });
    }
  }
  paint();
}
