/* ============================================================
   移动端手势：卡片左右滑（删除 / 置顶）、顶部下拉刷新、软键盘内缩适配。
   ============================================================ */

const SWIPE_MAX = 96;      // 卡片最大位移
const SWIPE_TRIGGER = 58;  // 触发阈值
const PTR_TRIGGER = 60;    // 下拉刷新触发阈值
let swipe = null;
let swipeSuppress = 0;     // 刚滑完时抑制随后的 click，避免误开编辑
let ptr = { y:0, dy:0, active:false };
let kbTimer = null;

/* ---- 滑动卡片：左滑删除 / 右滑置顶 ---- */

function swipeWrap(rec, pinned){
  if(rec.__slide) return rec.__slide;
  const slide = document.createElement("div"); slide.className = "rec-slide";
  while(rec.firstChild) slide.appendChild(rec.firstChild);
  const lb = document.createElement("div"); lb.className = "rec-bg lb";
  lb.innerHTML = icon("star",14) + (pinned ? "取消置顶" : "置顶");
  const rb = document.createElement("div"); rb.className = "rec-bg rb";
  rb.innerHTML = icon("trash",14) + "删除";
  rec.appendChild(lb); rec.appendChild(rb); rec.appendChild(slide);
  rec.__slide = slide; rec.__lb = lb; rec.__rb = rb;
  rec.classList.add("swiping");
  return slide;
}

function swipeUnwrap(rec){
  if(!rec || !rec.__slide) return;
  const slide = rec.__slide;
  while(slide.firstChild) rec.insertBefore(slide.firstChild, slide);
  slide.remove();
  if(rec.__lb) rec.__lb.remove();
  if(rec.__rb) rec.__rb.remove();
  rec.__slide = rec.__lb = rec.__rb = null;
  rec.classList.remove("swiping");
}

function swipePaint(rec, d){
  if(rec.__slide) rec.__slide.style.transform = `translateX(${d}px)`;
  if(rec.__lb) rec.__lb.style.opacity = d > 0 ? Math.min(1, d / 52) : 0;
  if(rec.__rb) rec.__rb.style.opacity = d < 0 ? Math.min(1, -d / 52) : 0;
}

function onSwipeDown(e){
  if(batchMode || delegateKey === null) return;
  if(e.pointerType === "mouse") return;                       // 桌面端保留鼠标原行为
  if(e.isPrimary === false) return;
  const rec = e.target && e.target.closest ? e.target.closest(".rec[data-rid]") : null;
  if(!rec) return;
  const guard = e.target.closest(".js-drag, .bsel, button, input, textarea, a");
  if(guard) return;                                           // 拖拽把手 / 勾选框 / 输入控件交给原逻辑
  swipe = { rec:rec, id:rec.dataset.rid, x:e.clientX, y:e.clientY, dx:0, axis:null, pid:e.pointerId };
}

function onSwipeMove(e){
  if(!swipe || e.pointerId !== swipe.pid) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if(swipe.axis === null){
    if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    swipe.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
    if(swipe.axis === "x"){
      const key = delegateKey;
      const x = (data[key]||[]).find(i=>i.id == swipe.id);
      swipeWrap(swipe.rec, !!(x && x.pinned));
    }
  }
  if(swipe.axis !== "x") return;
  const d = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
  swipe.dx = d;
  swipePaint(swipe.rec, d);
}

function onSwipeUp(e){
  if(!swipe || e.pointerId !== swipe.pid) return;
  const sw = swipe; swipe = null;
  if(sw.axis !== "x"){ return; }
  swipeSuppress = Date.now();
  const d = sw.dx;
  if(Math.abs(d) < SWIPE_TRIGGER){ swipeUnwrap(sw.rec); return; }
  bump(16);
  const key = delegateKey;
  const x = (data[key]||[]).find(i=>i.id == sw.id);
  if(!x){ swipeUnwrap(sw.rec); return; }
  if(d < 0){ swipeUnwrap(sw.rec); confirmDelete(key, sw.id); return; }
  x.pinned = !x.pinned;
  toast(x.pinned ? "已置顶" : "已取消置顶");
  persist();
}

function onSwipeCancel(){ if(swipe){ swipeUnwrap(swipe.rec); swipe = null; } }

/* ---- 下拉刷新 ---- */

function ptrEl(){
  let el = $("#ptr");
  if(!el){
    el = document.createElement("div");
    el.id = "ptr"; el.className = "ptr";
    el.setAttribute("role","status"); el.setAttribute("aria-live","polite");
    el.innerHTML = `<span class="spin"></span><span id="ptrTx">下拉刷新</span>`;
    document.body.appendChild(el);
  }
  return el;
}

function ptrHide(){
  const el = $("#ptr");
  if(el){ el.classList.remove("show", "ready", "busy"); el.style.transform = ""; }
  ptr = { y:0, dy:0, active:false };
}

function onPtrStart(e){
  if(e.touches.length !== 1 || swipe) return;
  if(window.scrollY > 0.5) return;
  if(document.querySelector(".overlay, .scrim.show")) return;   // 弹层 / 抽屉打开时不响应
  ptr = { y:e.touches[0].clientY, dy:0, active:false };
}

function onPtrMove(e){
  if(!ptr.y || e.touches.length !== 1) return;
  const dy = e.touches[0].clientY - ptr.y;
  if(dy <= 4 || window.scrollY > 0.5){ if(ptr.active) ptrHide(); return; }
  ptr.active = true;
  ptr.dy = Math.min(96, dy * 0.45);
  const el = ptrEl();
  el.classList.add("show");
  el.style.transform = `translate(-50%, ${Math.round(ptr.dy)}px)`;
  el.classList.toggle("ready", ptr.dy >= PTR_TRIGGER);
  const tx = el.querySelector("#ptrTx");
  if(tx) tx.textContent = ptr.dy >= PTR_TRIGGER ? "松开刷新" : "下拉刷新";
}

function onPtrEnd(){
  if(!ptr.active){ ptr = { y:0, dy:0, active:false }; return; }
  if(ptr.dy < PTR_TRIGGER){ ptrHide(); return; }
  const el = ptrEl();
  el.classList.add("busy");
  el.style.transform = "translate(-50%, 30px)";
  const tx = el.querySelector("#ptrTx"); if(tx) tx.textContent = "刷新中…";
  bump(18);
  setTimeout(() => { doRefresh(); ptrHide(); }, 420);
}

function doRefresh(){
  purgeOldTrash();
  ensureRecurring();
  ensureTodoRollover();
  if(ensureSnapshot()) store.save();
  render();
  const d = new Date();
  toast(`已刷新 · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
}

/* ---- 软键盘避让：跟随可视视口，把底部弹层顶上去 ---- */

function bindKeyboardInset(){
  const vv = window.visualViewport;
  if(!vv) return;
  const apply = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty("--kb", (kb > 80 ? kb : 0) + "px");
    const a = document.activeElement;
    if(kb > 80 && a && a.closest && a.closest(".modal")){
      clearTimeout(kbTimer);
      kbTimer = setTimeout(() => { try{ a.scrollIntoView({ block:"center" }); }catch(e){} }, 90);
    }
  };
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  apply();
}
