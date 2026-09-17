/* ============================================================
   可访问性：三档字号、语义补齐、弹窗栈与键盘 Esc 关闭。
   ============================================================ */

const FS_LABEL = { small:"小", mid:"标准", large:"大" };
function fsPref(){ return data.__fs || "mid"; }
function setFs(v){
  data.__fs = (v==="small"||v==="large") ? v : "mid";
  store.save();
  document.documentElement.setAttribute("data-fs", data.__fs);
  buildDrawer();
}

function applyFs(){ document.documentElement.setAttribute("data-fs", fsPref()); }

// 给渲染出来的通用控件补语义：分段选择器=radio，方块=checkbox，当前项=aria-current

function stampA11y(root){
  const box = root || $("#screen"); if(!box) return;
  box.querySelectorAll(".seg .opt").forEach(o=>{
    o.setAttribute("role","radio");
    o.setAttribute("tabindex","0");
    o.setAttribute("aria-checked", o.classList.contains("on") ? "true" : "false");
  });
  box.querySelectorAll(".chk-line").forEach(o=>{
    o.setAttribute("role","checkbox");
    o.setAttribute("tabindex","0");
    o.setAttribute("aria-checked", o.classList.contains("on") ? "true" : "false");
  });
  box.querySelectorAll(".fchip").forEach(o=>o.setAttribute("aria-pressed", o.classList.contains("on") ? "true" : "false"));
  box.querySelectorAll(".rec .chk, .pin-chk").forEach(o=>{
    o.setAttribute("aria-checked", o.classList.contains("on") ? "true" : "false");
    if(!o.getAttribute("aria-label")) o.setAttribute("aria-label","切换完成状态");
    o.setAttribute("tabindex","0");
  });
  box.querySelectorAll(".js-del").forEach(o=>{ if(!o.getAttribute("aria-label")) o.setAttribute("aria-label","删除这条记录"); });
  box.querySelectorAll(".js-pin").forEach(o=>{ if(!o.getAttribute("aria-label")) o.setAttribute("aria-label","置顶这条记录"); });
}

function stampNav(){
  const cur = (view==="home") ? "home" : (view==="insight") ? "insight" : view;
  $("#nav").querySelectorAll(".n").forEach(n=>{
    const on = n.dataset.nav === cur;
    n.classList.toggle("active", on);
    if(on) n.setAttribute("aria-current","page"); else n.removeAttribute("aria-current");
  });
  $("#drawerList").querySelectorAll(".ditem").forEach(el=>{
    if(el.dataset.go === cur) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
  });
}

/* ---- 弹层语义：所有 .overlay 自动获得 dialog 角色 + Esc 关闭 ---- */

const dialogStack = [];

function stampOverlays(){
  document.querySelectorAll(".overlay").forEach(ov=>{
    if(ov.__a11y) return;
    ov.__a11y = 1;
    const box = ov.querySelector(".modal") || ov;
    box.setAttribute("role","dialog");
    box.setAttribute("aria-modal","true");
    box.setAttribute("tabindex","-1");
    ov.__a11yBox = box;
    if(!ov.querySelector(".grab")) ov.setAttribute("aria-label","对话框");
    dialogStack.push(ov);
    setTimeout(()=>{ try{ box.focus({ preventScroll:true }); }catch(e){} }, 60);
  });
}
// 找出弹层里最合适的「关闭 / 取消」按钮：优先点它，这样 Promise 才会被正确 resolve

const DIALOG_DISMISS_IDS = ["cb-cancel","c-cancel","epCancel","trClose","thDone","dpDone","ob-ok","cu-close"];

function findDismiss(ov){
  for(const id of DIALOG_DISMISS_IDS){ const b = ov.querySelector("#" + id); if(b) return b; }
  const cands = ov.querySelectorAll(".modal-actions button, .modal-actions .link-danger");
  for(const b of cands){
    const id = (b.id || "").toLowerCase();
    const tx = (b.textContent || "").trim();
    if(/cancel|close|exit/.test(id) || /取消|关闭|退出|完成|好的/.test(tx)) return b;
  }
  return null;
}

function closeTopDialog(){
  for(let i=dialogStack.length-1;i>=0;i--){
    const ov = dialogStack[i];
    if(!ov.isConnected){ dialogStack.splice(i,1); continue; }
    const btn = findDismiss(ov);
    if(btn){ btn.click(); } else { ov.remove(); }
    dialogStack.splice(i,1);
    return true;
  }
  return false;
}
/* ---- 键盘：Esc 关闭弹层；Enter / 空格 激活自定义按钮 ---- */

function onGlobalKeydown(e){
  if(e.key === "Escape"){
    if(closeTopDialog()){ e.preventDefault(); return; }
    if($("#drawer").classList.contains("show")){ closeDrawer(); e.preventDefault(); }
    return;
  }
  if(e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
  const t = e.target;
  if(!t || !t.closest) return;
  const tag = (t.tagName || "").toLowerCase();
  if(tag === "input" || tag === "textarea" || tag === "select") return;
  const el = t.closest('[role="button"], [role="radio"], [role="checkbox"], .ditem, .chk-line, .js-tag, .mini-act, .btn');
  if(!el) return;
  e.preventDefault();
  el.click();
}

function initA11y(){
  applyFs();
  $("#topTitle").setAttribute("role","heading");
  $("#topTitle").setAttribute("aria-level","1");
  $("#brandCam").setAttribute("aria-hidden","true");
  $("#drawerBrand").setAttribute("role","button");
  $("#drawerBrand").setAttribute("tabindex","0");
  $("#drawerBrand").setAttribute("aria-label","更换头像");
  $("#screen").setAttribute("role","main");
  $("#nav").setAttribute("role","navigation");
  $("#nav").setAttribute("aria-label","主导航");
  stampOverlays();
  stampNav();
  document.addEventListener("keydown", onGlobalKeydown);
  // 弹层是各处动态创建的，用观察器统一补语义（iOS 只对可见元素播报）
  try{
    new MutationObserver(stampOverlays).observe(document.body, { childList:true });
  }catch(e){}
}
