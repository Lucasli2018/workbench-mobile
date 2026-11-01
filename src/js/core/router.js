/* ============================================================
   视图路由：首页 / 洞察 / 模块页 / 全局搜索的切换与重绘。
   ============================================================ */

function go(v){
  if(batchMode){ batchMode=false; batchSel.clear(); paintBatchBar(); }
  view=v; closeDrawer(); render(); window.scrollTo({top:0});
}

function render(){
  clearLazy();
  delegateKey = null;
  if(view==="search"){ $("#topTitle").firstChild.textContent="搜索"; $("#topSub").textContent="跨模块查找记录"; $("#nav").querySelectorAll(".n").forEach(n=>n.classList.remove("active")); renderSearch(); return; }
  // top title
  if(view==="home"){ $("#topTitle").firstChild.textContent=CONFIG.owner; $("#topSub").textContent=CONFIG.slogan; }
  else if(view==="insight"){ $("#topTitle").firstChild.textContent="洞察"; $("#topSub").textContent="统计与复盘"; }
  else { const m=modOf(view); $("#topTitle").firstChild.textContent=m?m.name:CONFIG.owner; $("#topSub").textContent=m?m.desc:""; }
  // nav active
  $("#nav").querySelector('[data-nav="home"]').classList.toggle("active", view==="home");
  $("#nav").querySelector('[data-nav="money"]').classList.toggle("active", view==="money");
  $("#nav").querySelector('[data-nav="insight"]').classList.toggle("active", view==="insight");
  // render body
  if(view==="home") renderHome();
  else if(view==="insight") renderInsight();
  else renderModule(view);
}

/* ---------- 全局搜索（跨模块） ---------- */

function renderSearch(){
  $("#screen").innerHTML = `
    <div class="sec-title">搜索</div>
    <div class="search-box"><span class="s-ic">${icon("search",18)}</span>
      <input id="searchInput" type="search" placeholder="搜索任务、记账、笔记、灵感…" value="${attr(searchQuery)}" autocomplete="off" aria-label="跨模块搜索记录"/>
      ${searchQuery?`<button class="s-clear" id="sClear">${icon("close",16)}</button>`:""}</div>
    <div id="searchResults"></div>`;
  const inp=$("#searchInput");
  inp.focus();
  inp.oninput=()=>{ searchQuery=inp.value.trim(); renderSearchResults(); };
  const clr=$("#sClear"); if(clr) clr.onclick=()=>{ searchQuery=""; inp.value=""; inp.focus(); renderSearchResults(); };
  renderSearchResults();
}

function renderSearchResults(){
  const box=$("#searchResults"); if(!box) return;
  const q=searchQuery.toLowerCase();
  if(!q){ box.innerHTML=`<div class="empty"><span class="e">${icon("search",26)}</span><div>输入关键词，跨所有模块查找记录</div></div>`; return; }
  const groups=[];
  CONFIG.modules.forEach(m=>{
    const hits=(data[m.key]||[]).filter(x=>{
      const hay=[x.title,x.content,x.note,x.category,x.mood,x.priority,x.type,(x.tags||[]).join(" "),(x.subs||[]).map(s=>s.t).join(" "),(x.log&&typeof x.log==="object"?Object.keys(x.log).length+"":""),x.date]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    if(hits.length) groups.push({m,hits});
  });
  if(!groups.length){ box.innerHTML=`<div class="empty"><span class="e">${icon("search",26)}</span><div>没有找到匹配「${esc(searchQuery)}」的记录</div></div>`; return; }
  box.innerHTML=groups.map(({m,hits})=>`
    <div class="sec-title">${icon(m.icon,15)} ${m.name}<span class="more">${hits.length} 条</span></div>
    ${hits.map(x=>`<div class="search-rec" data-goto="${m.key}" data-rid="${x.id}">${recHTML(m,x)}</div>`).join("")}
  `).join("");
  box.querySelectorAll("[data-goto]").forEach(el=>el.onclick=()=>{
    const k=el.dataset.goto, rid=el.dataset.rid; view=k; render();
    setTimeout(()=>{ const t=document.querySelector(`[data-rid="${rid}"]`); if(t){ t.scrollIntoView({block:"center"}); t.classList.add("flash"); } },60);
  });
}
