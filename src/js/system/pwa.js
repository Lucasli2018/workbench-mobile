/* ============================================================
   PWA：添加到主屏引导、Service Worker 注册、安装状态识别。
   ============================================================ */

let a2hsEvent = null;
function isStandalone(){
  try{
    return window.matchMedia("(display-mode: standalone)").matches
        || window.matchMedia("(display-mode: minimal-ui)").matches
        || navigator.standalone === true;
  }catch(e){ return false; }
}

function hideA2HS(remember){
  const bar = $("#a2hs");
  if(bar){ bar.classList.remove("show"); setTimeout(()=>{ if(bar.parentNode) bar.remove(); }, 340); }
  if(remember){ data.__a2hsHidden = true; store.save(); }
}

function showA2HS(){
  if(data.__a2hsHidden || isStandalone() || $("#a2hs")) return;
  const ua = navigator.userAgent || "";
  const ios = /iPad|iPhone|iPod/.test(ua);
  const msg = a2hsEvent
    ? "把汪汪工作台装到桌面，离线也能用"
    : (ios ? "点底部「分享」→「添加到主屏幕」，就能离线打开"
           : "手机浏览器里选「添加到主屏幕」，可离线使用");
  const bar = document.createElement("div");
  bar.id = "a2hs"; bar.className = "a2hs"; bar.setAttribute("role","dialog");
  bar.innerHTML = `<span class="a2hs-tx">${msg}</span>`
    + (a2hsEvent ? `<button class="a2hs-go" id="a2hsGo">安装</button>` : "")
    + `<button class="a2hs-x" id="a2hsX" aria-label="不再提示">${icon("close",14)}</button>`;
  document.body.appendChild(bar);
  requestAnimationFrame(()=>bar.classList.add("show"));
  const go = $("#a2hsGo");
  if(go) go.onclick = async () => {
    if(!a2hsEvent) return;
    const ev = a2hsEvent; a2hsEvent = null;
    try{ ev.prompt(); await ev.userChoice; }catch(e){}
    hideA2HS(true);
  };
  const x = $("#a2hsX"); if(x) x.onclick = () => hideA2HS(true);
}

function initPWA(){
  if("serviceWorker" in navigator && location.protocol !== "file:"){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(()=>{});
    });
  }
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    a2hsEvent = e;
    hideA2HS(false);
    setTimeout(showA2HS, 400);
  });
  window.addEventListener("appinstalled", () => { a2hsEvent = null; hideA2HS(true); });
  if(location.protocol !== "file:") setTimeout(showA2HS, 4200);
}
