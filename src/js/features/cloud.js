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
  cloudUser = null; delete data.__cloudUser;
  // 退出云端账号后，自动同步失去意义，关闭之（下次登录可重新开启）
  data.__cloudAutoSync = false;
  store.save();
}

/* ---------- 每日自动同步（抽屉开关控制） ---------- */
// 执行一次「本地 → 云端」同步；返回是否成功。离线 / 无后端 / 并发中静默失败返回 false，不弹错误。
let cloudAutoSyncRunning = false;
async function cloudAutoSyncRun() {
  if (cloudAutoSyncRunning) return false;
  if (!cloudOnline()) return false;          // 离线 / 未部署后端：静默跳过，下次再试
  cloudAutoSyncRunning = true;
  try {
    await cloudPush();
    data.__cloudAutoSyncLast = today();       // 记录今天已同步，避免重复推送
    store.save();
    return true;
  } catch (e) {
    return false;
  } finally {
    cloudAutoSyncRunning = false;
  }
}
// 启动 / 恢复联网时调用：仅在已开启、已登录、且今天还没同步过时执行。
async function ensureCloudAutoSync() {
  if (data.__cloudAutoSync !== true) return;
  if (!cloudUser) return;                              // 未登录不自动同步
  if (data.__cloudAutoSyncLast === today()) return;     // 今天已同步过
  const ok = await cloudAutoSyncRun();
  if (ok) toast("已自动同步到云端 ✓");
  else if (cloudOnline()) toast("自动同步未成功，稍后重试", "error");
}
// 抽屉开关：开启 / 关闭每日自动同步（开启前须先登录云端账号）。
function toggleAutoSync() {
  const cur = (data.__cloudAutoSync === true);
  if (!cur) {
    if (!cloudUser) { toast("请先在「云端同步」里登录账号，才能开启自动同步"); return; }
    data.__cloudAutoSync = true; store.save(); buildDrawer();
    toast("已开启：每天打开时自动同步到云端");
    // 立即同步一次，给出即时反馈
    cloudAutoSyncRun().then(ok => { if (ok) toast("已自动同步到云端 ✓"); else toast("首次同步失败，将于下次打开时重试", "error"); });
  } else {
    data.__cloudAutoSync = false; store.save(); buildDrawer();
    toast("已关闭每日自动同步");
  }
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
      sub.textContent = "尚未部署云端后端，当前为纯本地模式（数据仅存本机）。仓库已配好 wrangler.toml（已绑定 dev 库，database_id 已预填）与 schema.sql，按 README「云端同步」章节部署 Cloudflare Pages Functions + D1 后，即可在此用账号名 + 密码登录并多设备同步。";
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
