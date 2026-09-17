/* ============================================================
   主题与皮肤：浅色 / 深色 / 跟随系统 三态，科技蓝 · 珊瑚橙 · 翠绿 三套主色。
   ============================================================ */

const THEME_LABEL = { auto:"跟随系统", light:"浅色", dark:"深色" };
const SKIN_LABEL = { blue:"科技蓝", coral:"珊瑚橙", green:"翠绿" };
function themePref(){ return data.__theme || "auto"; }
function skinPref(){ return data.__skin || "blue"; }
function prefersDark(){ try{ return window.matchMedia("(prefers-color-scheme: dark)").matches; }catch(e){ return false; } }
function resolvedTheme(){ const p=themePref(); return p==="auto" ? (prefersDark() ? "dark" : "light") : p; }
function applyTheme(){
  const rt = resolvedTheme();
  const e = document.documentElement;
  e.setAttribute("data-theme", rt);
  e.setAttribute("data-skin", skinPref());
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta){
    const bar = rt==="dark" ? "#0a121f"
      : (skinPref()==="coral" ? "#9a3412" : skinPref()==="green" ? "#065f46" : "#1e3a5f");
    meta.setAttribute("content", bar);
  }
}

function setTheme(v){ data.__theme = v; store.save(); applyTheme(); buildDrawer(); }
function setSkin(v){ data.__skin = v; store.save(); applyTheme(); buildDrawer(); }

function bindThemeMedia(){
  try{
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => { if(themePref()==="auto") applyTheme(); };
    if(mq.addEventListener) mq.addEventListener("change", h);
    else if(mq.addListener) mq.addListener(h);
  }catch(e){}
}

function openThemePanel(){
  const themes=[["auto","跟随系统"],["light","浅色"],["dark","深色"]];
  const skins=[["blue","科技蓝"],["coral","珊瑚橙"],["green","翠绿"]];
  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><div class="grab"></div><h2>主题与外观</h2>
    <div class="sub">外观与主题色只影响显示，不会动到你的数据。</div>
    <div class="field"><label>外观</label><div class="seg" id="thTheme">${themes.map(([k,l])=>`<div class="opt ${themePref()===k?'on':''}" data-v="${k}">${l}</div>`).join("")}</div></div>
    <div class="field"><label>主题色</label><div class="seg" id="thSkin">${skins.map(([k,l])=>`<div class="opt ${skinPref()===k?'on':''}" data-v="${k}">${l}</div>`).join("")}</div></div>
    <div class="field"><label>字号</label><div class="seg" id="thFs">${[["small","小"],["mid","标准"],["large","大"]].map(([k,l])=>`<div class="opt ${fsPref()===k?'on':''}" data-v="${k}">${l}</div>`).join("")}</div></div>
    <div class="field"><label>预览</label><div class="th-prev" id="thPrev"></div></div>
    <div class="modal-actions"><button class="btn" id="thDone">完成</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  const paintPrev=()=>{
    const box=overlay.querySelector("#thPrev"); if(!box) return;
    box.innerHTML=`<div class="th-row">
        <span class="th-chip" style="background:var(--accent);color:var(--on-accent)">主色</span>
        <span class="th-chip" style="background:var(--accent-muted);color:var(--accent)">浅底</span>
        <span class="th-chip" style="background:var(--surface-nested);color:var(--text)">次级面</span>
        <span class="th-chip" style="background:var(--surface-card);color:var(--text);border:1px solid var(--border)">卡片</span></div>
      <div class="th-row">${["--module-1","--module-2","--module-3","--module-4","--module-5"].map(v=>`<span class="th-dot" style="background:var(${v})"></span>`).join("")}</div>`;
  };
  overlay.querySelectorAll("#thTheme .opt").forEach(o=>o.onclick=()=>{
    overlay.querySelectorAll("#thTheme .opt").forEach(x=>x.classList.remove("on")); o.classList.add("on");
    setTheme(o.dataset.v); paintPrev();
  });
  overlay.querySelectorAll("#thSkin .opt").forEach(o=>o.onclick=()=>{
    overlay.querySelectorAll("#thSkin .opt").forEach(x=>x.classList.remove("on")); o.classList.add("on");
    setSkin(o.dataset.v); paintPrev();
  });
  overlay.querySelectorAll("#thFs .opt").forEach(o=>o.onclick=()=>{
    overlay.querySelectorAll("#thFs .opt").forEach(x=>x.classList.remove("on")); o.classList.add("on");
    setFs(o.dataset.v); stampA11y(overlay);
  });
  overlay.onclick=e=>{ if(e.target===overlay) close(); };
  overlay.querySelector("#thDone").onclick=close;
  paintPrev();
}
