/* ============================================================
   浮层反馈：toast 轻提示、确认弹窗、首次引导。
   ============================================================ */

let toastTimer = null;
function toast(msg, kind="info"){
  let t = $("#wbToast");
  if(!t){ t = document.createElement("div"); t.id="wbToast"; t.className="cal-toast";
    t.setAttribute("role","status"); t.setAttribute("aria-live","polite"); document.body.appendChild(t); }
  t.innerHTML = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), kind==="error" ? 5000 : 2800);
}

/* ---------- confirm modal ---------- */
function confirmBox({ title="确认", sub="", okText="确定", okClass="btn", cancelText="取消" }){
  return new Promise(resolve => {
    const overlay = document.createElement("div"); overlay.className="overlay";
    overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>${esc(title)}</h2>
      ${sub?`<div class="sub">${sub}</div>`:''}
      <div class="modal-actions"><button class="btn ghost" id="cb-cancel">${esc(cancelText)}</button>
      <button class="${okClass}" id="cb-ok">${esc(okText)}</button></div></div>`;
    document.body.appendChild(overlay);
    const close = v => { overlay.remove(); resolve(v); };
    overlay.onclick = e => { if(e.target===overlay) close(false); };
    overlay.querySelector("#cb-cancel").onclick = () => close(false);
    overlay.querySelector("#cb-ok").onclick = () => close(true);
  });
}

/* ---------- data import / export ---------- */

function showOnboarding(){
  const mods = CONFIG.modules.map(m=>`<div class="ob-mod">${icon(m.icon,18)}<div><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></div></div>`).join("");
  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal ob">
    <div class="grab"></div>
    <h2>欢迎来到 ${esc(CONFIG.owner)}</h2>
    <div class="sub">${esc(CONFIG.slogan)}</div>
    <div class="ob-mods">${mods}</div>
    <p class="ob-warn">${icon("database",15)} 所有数据只保存在本机浏览器，清缓存或换设备会丢失，记得常点「导出数据」备份。</p>
    <div class="modal-actions"><button class="btn" id="ob-ok">开始使用</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#ob-ok").onclick=()=>{ data.__onboarded=true; store.save(); overlay.remove(); };
}
