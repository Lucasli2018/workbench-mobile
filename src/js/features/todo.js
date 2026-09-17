/* ============================================================
   任务模块：25 分钟番茄钟、拖拽排序、每日自动结转与归档。
   ============================================================ */

const POMO_MIN = 25;
let pomo = { key:null, id:null, title:"", total:POMO_MIN*60, left:POMO_MIN*60, running:false, timer:null };

function pomoEl(){
  let el=$("#pomo"); if(el) return el;
  el=document.createElement("div"); el.id="pomo"; el.className="pomo";
  el.innerHTML=`<span id="pomoRing"></span>
    <div class="pomo-tx"><b id="pomoTime">${POMO_MIN}:00</b><span id="pomoTitle">专注</span></div>
    <button class="pomo-btn" id="pomoToggle" title="暂停 / 继续" aria-label="暂停或继续"></button>
    <button class="pomo-btn" id="pomoStop" title="结束专注" aria-label="结束专注">${icon("close",14)}</button>`;
  document.body.appendChild(el);
  el.querySelector("#pomoToggle").onclick=()=>{ pomo.running=!pomo.running; if(pomo.running) pomoTick(); paintPomo(); };
  el.querySelector("#pomoStop").onclick=()=>stopPomo();
  return el;
}

function paintPomo(){
  const el=$("#pomo"); if(!el) return;
  const left=Math.max(0,pomo.left);
  const mm=String(Math.floor(left/60)).padStart(2,"0"), ss=String(left%60).padStart(2,"0");
  el.querySelector("#pomoTime").textContent=`${mm}:${ss}`;
  el.querySelector("#pomoTitle").textContent=(pomo.running?"专注中 · ":"已暂停 · ")+(pomo.title||"");
  el.querySelector("#pomoRing").innerHTML=pomoRing(1-pomo.left/pomo.total);
  el.querySelector("#pomoToggle").innerHTML=icon(pomo.running?"pause":"play",13);
}

function pomoTick(){
  clearInterval(pomo.timer);
  pomo.timer=setInterval(()=>{
    if(!pomo.running) return;
    pomo.left--;
    if(pomo.left<=0){ pomoFinish(); return; }
    paintPomo();
  },1000);
}

function startPomo(key,item){
  if(pomo.running && pomo.key===key && pomo.id===item.id){ toast("这一项正在专注中"); return; }
  clearInterval(pomo.timer);
  pomo={ key:key, id:item.id, title:item.title||"专注", total:POMO_MIN*60, left:POMO_MIN*60, running:true, timer:null };
  pomoEl().classList.add("show");
  paintPomo(); pomoTick();
  toast(`开始专注 ${POMO_MIN} 分钟 · ${esc(item.title||"")}`);
}

function pomoFinish(){
  clearInterval(pomo.timer);
  const k=pomo.key, id=pomo.id;
  pomo={ key:null, id:null, title:"", total:POMO_MIN*60, left:POMO_MIN*60, running:false, timer:null };
  const x=(data[k]||[]).find(i=>i.id==id);
  if(x) x.focus=(x.focus||0)+1;
  bump([30,60,30]);
  const el=$("#pomo"); if(el) el.classList.remove("show");
  toast(`${icon("clock",14)} 专注完成！已累计 ${x?(x.focus||1):1} 次`);
  persist();
}

function stopPomo(){
  clearInterval(pomo.timer);
  pomo={ key:null, id:null, title:"", total:POMO_MIN*60, left:POMO_MIN*60, running:false, timer:null };
  const el=$("#pomo"); if(el) el.classList.remove("show");
}


function wireDrag(key){
  const screen=$("#screen");
  const rows=()=>[...screen.querySelectorAll(".rec[data-rid]")].filter(n=>n.querySelector(".js-drag"));
  screen.querySelectorAll(".js-drag").forEach(h=>{
    if(h.dataset.dw) return;                  // 已挂过就跳过（软刷新会重复调用）
    h.dataset.dw = "1";
    h.addEventListener("pointerdown", ev=>{
      if(ev.button && ev.button!==0) return;
      ev.preventDefault(); ev.stopPropagation();
      const el=h.closest("[data-rid]"); if(!el) return;
      el.classList.add("dragging");
      try{ h.setPointerCapture(ev.pointerId); }catch(e){}
      const onMove=e2=>{
        const list=rows(); if(!list.length) return;
        const y=e2.clientY;
        let target=list.findIndex(n=>{ const r=n.getBoundingClientRect(); return y < r.top + r.height*0.55; });
        if(target<0) target=list.length-1;
        const cur=list.indexOf(el); if(cur<0 || target<0 || target===cur) return;
        const ref = target>cur ? list[target].nextElementSibling : list[target];
        el.parentNode.insertBefore(el, ref);
      };
      const onUp=()=>{
        h.removeEventListener("pointermove",onMove);
        h.removeEventListener("pointerup",onUp);
        h.removeEventListener("pointercancel",onUp);
        el.classList.remove("dragging");
        const ids=rows().map(n=>n.dataset.rid);
        const arr=data[key]||[];
        arr.sort((a,b)=>{
          const ia=ids.findIndex(v=>v==String(a.id)), ib=ids.findIndex(v=>v==String(b.id));
          return (ia<0?9999:ia)-(ib<0?9999:ib);
        });
        persist();
        toast("顺序已保存");
      };
      h.addEventListener("pointermove",onMove);
      h.addEventListener("pointerup",onUp);
      h.addEventListener("pointercancel",onUp);
    });
  });
}


function ensureTodoRollover(){
  const t=today();
  if(data.__todoLastDay===t) return;
  const prev=data.__todoLastDay;
  if(data.__todoRollover===false){ data.__todoLastDay=t; store.save(); return; }
  if(prev && prev<t){
    const list=data.todo||[];
    const done=list.filter(x=>x.done);
    const undone=list.filter(x=>!x.done);
    if(done.length){
      data.__todoArchive=data.__todoArchive||{};
      data.__todoArchive[prev]=(data.__todoArchive[prev]||[]).concat(done.map(x=>({ id:x.id, title:x.title, focus:x.focus||0 })));
      const keys=Object.keys(data.__todoArchive).sort();
      while(keys.length>30){ delete data.__todoArchive[keys.shift()]; }
    }
    undone.forEach(x=>{ x.carriedDays=(x.carriedDays||0)+1; });
    data.todo=undone;
    if(done.length||undone.length){
      setTimeout(()=>toast(`昨日归档 ${done.length} 项完成记录，${undone.length} 项顺延到今天`), 800);
    }
  }
  data.__todoLastDay=t;
  store.save();
}


function renderTodoArchive(){
  const arch=data.__todoArchive||{};
  const keys=Object.keys(arch).sort().reverse().slice(0,7);
  if(!keys.length) return "";
  const CHEV='<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  const rows=keys.map(dk=>{
    const arr=arch[dk]||[];
    const items=arr.map(x=>`<div class="rec arch-rec"><div class="top"><div class="body" style="padding-right:0">`
      + `<div class="rname done">${esc(x.title)}</div>`
      + `${x.focus?`<div class="rmeta"><span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">${icon("clock",11)} 专注 ${x.focus} 次</span></div>`:''}`
      + `</div></div></div>`).join("");
    return `<div class="grp">
      <div class="grp-head js-collapse collapsed">${CHEV}<span class="grp-title">${esc(dk)}</span><span class="grp-sum"><span class="gs">完成 ${arr.length} 项</span></span></div>
      <div class="grp-body">${items}</div>
    </div>`;
  }).join("");
  return `<div class="sec-title">${icon("archive",15)} 已完成归档<span class="more">近 7 天</span></div><div class="rec-arch">${rows}</div>`;
}
