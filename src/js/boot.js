/* ============================================================
   启动装配：chrome 图标与事件绑定、头像上传、启动序列。
   必须最后加载。
   ============================================================ */

/* ---------- chrome icons ---------- */
$("#btn-menu").innerHTML = icon("menu", 20);
$("#btn-menu").setAttribute("aria-label", "打开菜单");
$("#btn-search").setAttribute("aria-label", "搜索");
$("#drawerClose").innerHTML = icon("close", 16);
(function(){
  const now = new Date();
  const wd = "日一二三四五六"[now.getDay()];
  $("#dateChip").innerHTML = `${icon("calendar",13)} ${now.getMonth()+1}/${String(now.getDate()).padStart(2,'0')} 周${wd}`;
})();
$("#btn-search").innerHTML = icon("search",20);
$("#btn-search").onclick = ()=>{ view = (view==="search")?"home":"search"; render(); };
document.querySelectorAll('#nav .n').forEach(n=>{
  const t=n.dataset.nav;
  const label = t==="home" ? "首页" : t==="insight" ? "洞察" : "模块";
  n.innerHTML = icon(t==="home"?"home":t==="insight"?"chart":"grid",21)+"<span>"+label+"</span>";
  n.setAttribute("role","button");          // P3-6 底部导航可被读屏与键盘识别
  n.setAttribute("tabindex","0");
  n.setAttribute("aria-label", t==="drawer" ? "打开模块列表" : label);
});
$("#drawerClose").setAttribute("aria-label", "关闭菜单");

/* ---------- wire chrome ---------- */
$("#btn-menu").onclick=openDrawer;
$("#drawerClose").onclick=closeDrawer;
$("#scrim").onclick=closeDrawer;
$("#nav").querySelectorAll(".n").forEach(n=>n.onclick=()=>{
  const t=n.dataset.nav;
  if(t==="drawer") openDrawer();
  else go(t);
});
$("#screen").addEventListener("click", onScreenClick);   // P3-3 记录级事件委托（全局只挂一次）
// P3-5 手势：滑动卡片用指针事件（带方向判定），下拉刷新用触摸事件
$("#screen").addEventListener("pointerdown", onSwipeDown);
document.addEventListener("pointermove", onSwipeMove);
document.addEventListener("pointerup", onSwipeUp);
document.addEventListener("pointercancel", onSwipeCancel);
document.addEventListener("touchstart", onPtrStart, { passive:true });
document.addEventListener("touchmove", onPtrMove, { passive:true });
document.addEventListener("touchend", onPtrEnd, { passive:true });

/* ---------- avatar upload ---------- */
$("#brandCam").innerHTML = icon("camera",18);
if(data.__avatar) $("#brandImg").src = data.__avatar;
$("#drawerBrand").onclick = () => $("#avatarInput").click();
$("#avatarInput").onchange = e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => { data.__avatar = reader.result; $("#brandImg").src = reader.result; store.save(); };
  reader.readAsDataURL(f);
  e.target.value = "";
};

applyTheme();
bindThemeMedia();
purgeOldTrash();
try{ if(ensureSnapshot()) store.save(); }catch(e){}   // P3-4 先给「今天打开前」的状态留一份快照
ensureRecurring();
ensureTodoRollover();
buildDrawer();
render();
initPWA();
capWarnOnce();
bindKeyboardInset();
initA11y();
if(!data.__onboarded) showOnboarding();
if($("#bootSk")) $("#bootSk").remove();
