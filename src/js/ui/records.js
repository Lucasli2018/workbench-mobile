/* ============================================================
   记录层：模块页骨架、单条记录渲染、编辑器、事件委托、
   长列表分页与滚动加载（> 50 条自动分页）。
   ============================================================ */

function renderModule(key){
  clearLazy();
  const m=modOf(key); const it=data[key]||[];
  // P2-5 标签筛选失效时自动回到「全部」
  if(m.type==="note" && noteTag!=="all" && !it.some(x=>(x.tags||[]).includes(noteTag))) noteTag="all";
  const head = moduleHeadHTML(m, it);
  const extra = moduleExtraHTML(m, it);
  const viewIt = moduleView(key, m, it);
  const emptyHTML = `<div class="empty"><span class="e">${icon(m.icon,26)}</span><div>还没有记录，点上方「新建」添加第一条吧</div></div>`;
  let body;
  if(m.type==="finance"){
    body = viewIt.length ? renderFinanceGroups(m, viewIt) : emptyHTML;
    pageCtx = { key:key, shown: viewIt.length };     // 记账按月份分组折叠，不分页
  } else if(!viewIt.length){
    body = emptyHTML;
    pageCtx = { key:key, shown: 0 };
  } else {
    // P3-3 分页：置顶全展示，其余记录首屏 PAGE_SIZE 条，其余滚动加载
    const pin = viewIt.filter(x=>x.pinned), rest = viewIt.filter(x=>!x.pinned);
    const shown = Math.min(rest.length, PAGE_SIZE);
    const left = rest.length - shown;
    pageCtx = { key:key, shown: shown };
    body = `<div id="recList">`
      + pinSectionHTML(m, pin)
      + (pin.length && rest.length ? `<div class="sec-title">其余记录<span class="more">${rest.length}</span></div>` : "")
      + rest.slice(0, shown).map(x=>recHTML(m,x)).join("")
      + `</div>`
      + (left > 0 ? moreHTML(left) : "");
  }
  const filterBar = (m.type==="finance") ? renderFinanceFilter() : (m.type==="note" ? renderTagBar(key) : "");
  $("#screen").innerHTML = `<div class="greet"><div><h1>${m.name}</h1><p>${m.desc}</p></div>
      <button class="add-batch ${batchMode?'on':''}" id="btn-batch" title="批量操作" aria-label="批量操作">${icon("check",16,2.4)}</button>
      <button class="add" id="btn-add">${icon("plus",16,2.2)}新建</button></div>
    <div style="margin-top:16px"><div id="modHero">${head}</div><div id="modExtra">${extra}</div>
      ${filterBar}<div class="sec-title">记录</div>${body}</div>`;
  wireModule(key);
  setupLazy(key);
}


function filterFinance(it){
  return it.filter(x=>{
    if(financeFilter.type!=="all" && x.type!==financeFilter.type) return false;
    if(financeFilter.cat!=="all" && (x.category||"")!==financeFilter.cat) return false;
    return true;
  });
}

function renderFinanceFilter(){
  const types=[["all","全部"],["expense","支出"],["income","收入"]];
  const catList=[["all","全部"]].concat(cats().map(c=>[c,c]));
  const tChips=types.map(([k,l])=>`<button class="fchip ${financeFilter.type===k?'on':''}" data-ftype="${k}">${l}</button>`).join("");
  const cChips=catList.map(([k,l])=>`<button class="fchip ${financeFilter.cat===k?'on':''}" data-fcat="${k}">${esc(l)}</button>`).join("");
  return `<div class="filterbar"><div class="frow">${tChips}</div><div class="frow">${cChips}</div>
    <div class="frow"><button class="mini-act js-catman">${icon("grid",12)} 分类与预算</button>
      <button class="mini-act js-csv">${icon("download",12)} 导出 CSV</button></div></div>`;
}

/* per-module hero header: compact strip — icon + big number + label + optional progress bar */

function headHero(m, big, label, pct){
  const inner=`<div class="hero-ic" style="background:color-mix(in srgb, ${m.color} 16%, transparent);color:${m.color}">${icon(m.icon,20)}</div>
    <div style="flex:1;min-width:0"><div class="hero-tx"><span class="hero-v">${big}</span><span class="hero-l">${label}</span></div>
    ${pct!=null?`<div class="hero-bar"><i style="width:${Math.min(100,pct)}%;background:${m.color}"></i></div>`:''}</div>`;
  if(m.cover) return `<div class="hero has-cover"><div class="hero-bg" style="background-image:url('${attr(m.cover)}')"></div><div class="hero-inner">${inner}</div></div>`;
  return `<div class="hero">${inner}</div>`;
}


function recHTML(m,x){
  const pin=`<button class="pin-btn js-pin ${x.pinned?'on':''}" data-id="${x.id}" title="置顶">${icon("star",15)}</button>`;
  const del=`<button class="del js-del" data-id="${x.id}" title="删除">${icon("trash",16)}</button>`;
  const editBtn=`<button class="edit js-edit" data-id="${x.id}" title="编辑">${icon("pen",16)}</button>`;
  const acts=`<div class="acts">${pin}${editBtn}${del}</div>`;
  const chkMark=icon("check",14,2.4);
  const thumb=x.image?`<img class="thumb" src="${attr(x.image)}" alt="">`:'';
  const customMeta=(m.fields||[]).filter(f=>x[f.key]).map(f=>`<span class="meta-tag">${esc(x[f.key])}</span>`).join("");
  const customBlock=customMeta?`<div class="meta-line">${customMeta}</div>`:'';
  const layout=x.layout||'default';
  const layoutCls=`rec-layout-${layout}`;

  // feature layout: 大图在上 + 标题 + 正文 (适合有图记录)
  if(layout==='feature' && x.image){
    const body=(x.content||x.note||'').trim();
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top" data-edit="${x.id}" style="flex-direction:column">
      ${thumb}
      <div class="feat-title">${esc(x.title||'无标题')}</div>
      ${body?`<div class="feat-body">${esc(body)}</div>`:''}
      ${customBlock?`<div style="padding:0 12px 12px">${customBlock}</div>`:''}</div></div>`;
  }
  // quote layout: 大字居中 (适合短文本/灵感/金句)
  if(layout==='quote'){
    const text=(x.content||x.title||'').trim();
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top" data-edit="${x.id}" style="flex-direction:column;align-items:center;text-align:center">
      <div class="quote-text">${esc(text)}</div>
      ${x.mood?`<div class="quote-meta">${esc(x.mood)}${x.date?` · ${esc(x.date)}`:''}</div>`:(x.date?`<div class="quote-meta">${esc(x.date)}</div>`:'')}
      ${customBlock?`<div style="margin-top:8px">${customBlock}</div>`:''}</div></div>`;
  }

  // default layout (原有逻辑)
  if(m.type==="todo"){
    const p=(m.priorities||[]).find(p=>p.key===x.priority);
    const subs=x.subs||[]; const sDone=subs.filter(s=>s.done).length;
    const subBadge=subs.length?`<span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">${sDone}/${subs.length} 子项</span>`:'';
    const carried=(+x.carriedDays>0)?`<span class="badge" style="background:var(--surface-nested);color:var(--module-3)">${icon("repeat",11)} 顺延 ${x.carriedDays} 天</span>`:'';
    const focusBadge=x.focus?`<span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">${icon("clock",11)} 专注 ${x.focus} 次</span>`:'';
    const subsHTML=subs.length?`<div class="subs">${subs.map((sub,i)=>`<div class="sub js-sub ${sub.done?'done':''}" data-id="${x.id}" data-i="${i}"><span class="sbox">${icon("check",10,3)}</span><span class="stx">${esc(sub.t)}</span></div>`).join("")}<div class="subs-bar"><i style="width:${Math.round(sDone/subs.length*100)}%"></i></div></div>`:'';
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top">
      <button class="drag js-drag" title="长按拖动排序" aria-label="拖动排序" data-id="${x.id}">${icon("grip",16)}</button>
      <div class="chk js-chk ${x.done?'on':''}" data-id="${x.id}" role="checkbox" tabindex="0" aria-checked="${x.done?'true':'false'}" aria-label="标记「${attr(x.title)}」为完成">${chkMark}</div>
      ${thumb}
      <div class="body" data-edit="${x.id}"><div class="rname ${x.done?'done':''}">${esc(x.title)}</div>
      <div class="rmeta">${p?`<span class="badge" style="background:${p.color};color:${p.text}"><span class="dot"></span>${p.label}</span>`:''}${subBadge}${carried}${focusBadge}
        <button class="mini-act js-focus" data-id="${x.id}">${icon("play",10)} 专注</button></div>
      ${x.note?`<div class="rnote">${esc(x.note)}</div>`:''}${subsHTML}${customBlock}</div></div></div>`;
  }
  if(m.type==="checkin"){
    const goal=Math.max(1, +x.goal||1);
    const cnt=logCount(x.log, today());
    const on=cnt>0; const st=streak(x.log);
    const goalBadge=goal>1?`<span class="badge" style="background:var(--accent-muted);color:var(--accent)">${cnt}/${goal} ${esc(x.unit||"次")}</span>`:'';
    const minus=(goal>1 && cnt>0)?`<button class="mini-act js-ckminus" data-id="${x.id}" title="减一次">-1</button>`:'';
    const r7=rateDays(x.log,7);
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top">
      <div class="chk js-chk ${on?'on':''}" data-id="${x.id}" role="checkbox" tabindex="0" aria-checked="${on?'true':'false'}" aria-label="今日「${attr(x.title)}」打卡">${chkMark}</div>
      ${thumb}
      <div class="body" data-edit="${x.id}"><div class="rname">${esc(x.title)}</div>
      <div class="rmeta"><span class="streak">${icon("flame",13)} 连续 ${st} 天</span>${goalBadge}
        <span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">近7日 ${r7}/7</span>
        ${(on&&goal<=1)?'<span class="badge" style="background:var(--accent-muted);color:var(--accent)">今日已打卡</span>':''}${minus}</div>${customBlock}</div></div></div>`;
  }
  if(m.type==="progress"){
    const isWeek=x.period==="week";
    const unit=x.unit||m.unit||"";
    const cur = isWeek ? weekSum(x.log) : (+x.current||0);
    const tgt = Math.max(1,+x.target||1);
    const pct = Math.min(100,Math.round(cur/tgt*100));
    const step=progStep(x,m);
    const back=Math.min(step,cur);
    const isPinnedDone=pct>=100;
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top">${thumb}<div class="body" data-edit="${x.id}">
      <div class="rname">${esc(x.title)}</div>
      <div class="rmeta"><span style="color:var(--text-secondary);font-size:13px">${isWeek?"本周 ":""}${cur}/${tgt} ${unit} · ${pct}%</span>
        ${isWeek?`<span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">累计 ${(+x.current||0)} ${unit}</span>`:''}
        ${isPinnedDone?'<span class="badge" style="background:var(--accent-muted);color:var(--accent)">已达成</span>':''}
        <button class="mini-act js-prog" data-id="${x.id}" data-n="${step}" title="加 ${step} ${unit}">+${step}</button>
        ${back>0?`<button class="mini-act js-prog" data-id="${x.id}" data-n="${-back}" title="减 ${back} ${unit}">-${back}</button>`:''}</div>
      <div class="pbar"><i style="width:${pct}%;background:${m.color}"></i></div>
      ${x.note?`<div class="rnote">${esc(x.note)}</div>`:''}${customBlock}</div></div></div>`;
  }
  if(m.type==="finance"){
    const inc=x.type==="income";
    const rep = x.repeat ? `<span class="badge" style="background:var(--accent-muted);color:var(--accent)">${icon("repeat",11)} 每月</span>` : '';
    return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top">${thumb}<div class="body" data-edit="${x.id}">
      <div class="rname">${esc(x.title)}</div>
      <div class="rmeta"><span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">${esc(x.category||'其他')}</span>${rep}
        <button class="mini-act js-tplsave" data-id="${x.id}" title="存为快捷模板">${icon("bolt",10)} 存模板</button></div>${customBlock}</div>
      <div class="amt ${inc?'inc':'exp'}" style="margin-left:auto">${inc?'+':'-'}¥${x.amount}</div></div></div>`;
  }
  // note
  const tags=(x.tags||[]);
  const tagLine=tags.length?`<div class="tag-line">${tags.map(t=>`<span class="tag js-tag" data-tag="${attr(t)}">#${esc(t)}</span>`).join("")}</div>`:'';
  return `<div class="rec ${layoutCls}" data-rid="${x.id}">${acts}<div class="top">${thumb}<div class="body" data-edit="${x.id}">
    <div class="rname">${esc(x.title||'无标题')}</div>
    <div class="rmeta">${x.mood?`<span class="badge" style="background:var(--accent-muted);color:var(--accent)">${esc(x.mood)}</span>`:''}<span style="color:var(--text-secondary);font-size:12px">${x.date||''}</span></div>
    ${x.content?`<div class="rnote md">${mdLite(x.content)}</div>`:''}${tagLine}${customBlock}</div></div></div>`;
}

/* finance 折叠分组：按 月份 → 日期 两级可折叠 */

const PAGE_SIZE = 50;                 // 单模块首屏渲染条数，其余滚动加载
let pageCtx = { key:null, shown:0 };  // 当前模块已渲染的「其余记录」条数
let recObserver = null;               // 滚动加载观察器
let delegateKey = null;               // 事件委托当前生效的模块 key


function skeletonHTML(n){
  let out = `<div class="sk">`;
  for(let i=0;i<n;i++) out += `<div class="sk-row"></div>`;
  return out + `</div>`;
}

function moduleView(key, m, it){
  if(m.type==="finance") return filterFinance(it);
  if(m.type==="note" && noteTag!=="all") return it.filter(x=>(x.tags||[]).includes(noteTag));
  return it;
}

function moduleHeadHTML(m, it){
  const t = today();
  if(m.type==="finance") return renderFinanceSummary();
  if(m.type==="todo"){
    const done=it.filter(x=>x.done).length; const pct=it.length?Math.round(done/it.length*100):0;
    return headHero(m, `${done}/${it.length}`, "今日已完成", pct);
  }
  if(m.type==="checkin"){
    const done=it.filter(x=>x.log&&x.log[t]).length; const pct=it.length?Math.round(done/it.length*100):0;
    return headHero(m, `${done}/${it.length}`, "今日已打卡", pct);
  }
  if(m.type==="progress"){ const p=avgProgress(it); return headHero(m, `${p.value}%`, `平均进度 · ${it.length} 项`, p.value); }
  if(m.type==="note"){ const todayN=it.filter(x=>x.date===t).length; return headHero(m, `${it.length}`, `条记录 · 今日 ${todayN} 条`, null); }
  return "";
}

function moduleExtraHTML(m, it){
  if(m.type==="checkin") return renderCalendar(m, it);
  if(m.type==="todo") return renderTodoArchive();
  if(m.type==="finance") return renderTemplateChips();
  return "";
}

function pinSectionHTML(m, pin){
  if(!pin.length) return "";
  return `<div class="sec-title">${icon("star",15)} 置顶<span class="more">${pin.length}</span></div>`
       + pin.map(x=>recHTML(m,x)).join("");
}

function moreHTML(left){
  return `<div class="rec-more" id="recMore" role="button" tabindex="0">${icon("chevron",14,2)} 继续加载 ${left} 条</div>`;
}

function clearLazy(){
  if(recObserver){ try{ recObserver.disconnect(); }catch(e){} recObserver = null; }
}

function setupLazy(key){
  clearLazy();
  const more = $("#recMore"); if(!more) return;
  more.onclick = () => loadMore(key);
  more.onkeydown = e => { if(e.key==="Enter" || e.key===" ") { e.preventDefault(); loadMore(key); } };
  if("IntersectionObserver" in window){
    recObserver = new IntersectionObserver(es => { es.forEach(e => { if(e.isIntersecting) loadMore(key); }); }, { rootMargin:"320px 0px" });
    recObserver.observe(more);
  }
}

function loadMore(key){
  if(pageCtx.key !== key) return;
  const m = modOf(key); if(!m) return;
  const viewIt = moduleView(key, m, data[key]||[]);
  const rest = viewIt.filter(x=>!x.pinned);
  const next = Math.min(rest.length, pageCtx.shown + PAGE_SIZE);
  if(next <= pageCtx.shown) return;
  const list = $("#recList"); if(!list) return;
  const host = document.createElement("div");
  host.className = "pg";
  host.innerHTML = rest.slice(pageCtx.shown, next).map(x=>recHTML(m,x)).join("");
  list.appendChild(host);
  pageCtx.shown = next;
  const left = rest.length - next;
  const more = $("#recMore");
  if(left > 0){ if(more) more.innerHTML = `${icon("chevron",14,2)} 继续加载 ${left} 条`; }
  else { clearLazy(); if(more) more.remove(); }
  if(m.type==="todo") wireDrag(key);
}

/* ---- 局部刷新：只重建被改动的那条记录 + 顶部统计 ---- */

function refreshRecord(key, id){
  const m = modOf(key); if(!m) return false;
  const x = (data[key]||[]).find(i=>i.id==id);
  const node = $("#screen").querySelector(`.rec[data-rid="${String(id).replace(/"/g,"")}"]`);
  if(!x || !node) return false;
  const tmp = document.createElement("div");
  tmp.innerHTML = recHTML(m, x);
  const fresh = tmp.firstElementChild;
  if(!fresh) return false;
  node.replaceWith(fresh);
  return true;
}

function refreshHead(key){
  const m = modOf(key); if(!m) return;
  const it = data[key]||[];
  const h = $("#modHero"), e = $("#modExtra");
  if(h) h.innerHTML = moduleHeadHTML(m, it);
  if(e) e.innerHTML = moduleExtraHTML(m, it);
}
// 保存 + 局部重建：命中当前列表就只换一条，否则退回整页重绘

function softRefresh(key, id){
  store.save();
  if(view !== key){ render(); return; }
  if(id == null || !refreshRecord(key, id)){ render(); return; }
  refreshHead(key);
  wireModule(key);              // 只重绑交互，列表 DOM 与分页进度都保留
}

/* ---- 事件委托：记录级交互统一在 #screen 上处理（只挂一次） ---- */

const REC_ROUTES = [
  { sel:".js-sub",     act:"sub" },
  { sel:".js-chk",     act:"chk" },
  { sel:".js-del",     act:"del" },
  { sel:".js-pin",     act:"pin" },
  { sel:".js-edit",    act:"edit" },
  { sel:".js-focus",   act:"focus" },
  { sel:".js-prog",    act:"prog" },
  { sel:".js-ckminus", act:"ckminus" },
  { sel:".js-tplsave", act:"tplsave" },
  { sel:".js-tag",     act:"tag" },
  { sel:".js-drag",    act:"none" },      // 拖拽把手只负责拖动，不触发编辑
  { sel:"[data-edit]", act:"edit" },
];
// 返回最先命中的动作：越靠前的选择器越优先（子项 / 小按钮 优先于整张卡片）

function pickRecordAct(hit){
  for(const r of REC_ROUTES){
    const el = hit(r.sel);
    if(el) return { act:r.act, sel:r.sel, el:el };
  }
  return null;
}

function onScreenClick(e){
  if(Date.now() - swipeSuppress < 350) return;   // P3-5 刚完成滑动，别把这次抬手当成点击
  const key = delegateKey;
  if(!key || batchMode) return;
  const m = modOf(key); if(!m) return;
  const pick = pickRecordAct(sel => (e.target && e.target.closest) ? e.target.closest(sel) : null);
  if(!pick) return;
  const el = pick.el, id = el.dataset.id;
  const find = () => (data[key]||[]).find(i=>i.id==id);
  switch(pick.act){
    case "sub": {
      e.stopPropagation();
      const x = find(); if(!x || !x.subs) return;
      const sub = x.subs[+el.dataset.i]; if(!sub) return;
      sub.done = !sub.done;
      if(x.subs.length && x.subs.every(t=>t.done)) x.done = true;
      else if(x.subs.some(t=>!t.done)) x.done = false;
      bump(10); softRefresh(key, id);
      return;
    }
    case "chk": {
      e.stopPropagation();
      const x = find(); if(!x) return;
      if(m.type==="todo"){ x.done = !x.done; }
      else if(m.type==="checkin"){
        x.log = x.log || {};
        const tt = today(); const goal = Math.max(1, +x.goal||1);
        if(goal<=1){ x.log[tt] ? delete x.log[tt] : x.log[tt]=1; }
        else { x.log[tt] = Math.min(goal, logCount(x.log, tt)+1); }
        bump(10);
      }
      else return;
      softRefresh(key, id);
      return;
    }
    case "del":     { e.stopPropagation(); confirmDelete(key, id); return; }
    case "pin":     { e.stopPropagation(); const x=find(); if(!x) return; x.pinned=!x.pinned; persist(); return; }
    case "focus":   { e.stopPropagation(); const x=find(); if(!x) return; startPomo(key, x); return; }
    case "prog":    { e.stopPropagation(); const x=find(); if(!x) return; bumpProgress(key, x, +el.dataset.n||0); return; }
    case "ckminus": {
      e.stopPropagation();
      const x = find(); if(!x) return;
      x.log = x.log || {}; const tt = today();
      const c = logCount(x.log, tt) - 1;
      if(c<=0) delete x.log[tt]; else x.log[tt] = c;
      softRefresh(key, id);
      return;
    }
    case "tplsave": { e.stopPropagation(); saveAsTemplate(id); return; }
    case "tag":     { e.stopPropagation(); noteTag = el.dataset.tag; renderModule(key); return; }
    case "edit":    { const x = find(); if(x) openEditor(key, x); return; }
    default:        return;
  }
}


function wireModule(key){
  // 注意：这里不清理滚动加载观察器——软刷新只重绑交互、不重建列表，观察器必须继续有效
  const m=modOf(key);
  delegateKey = batchMode ? null : key;      // P3-3 事件委托只在业务模块生效
  // P2-6 批量模式：只保留筛选 / 标签 / 日历与批量交互
  if(batchMode){
    $("#screen").classList.add("batch");
    const bb=$("#btn-batch"); if(bb) bb.onclick=()=>batchToggle();
    $("#screen").querySelectorAll("[data-tagnav]").forEach(el=>el.onclick=()=>{ noteTag=el.dataset.tagnav; renderModule(key); });
    $("#screen").querySelectorAll(".fchip").forEach(el=>el.onclick=()=>{
      if(el.dataset.ftype!==undefined) financeFilter.type=el.dataset.ftype;
      if(el.dataset.fcat!==undefined) financeFilter.cat=el.dataset.fcat;
      if(el.dataset.frange!==undefined) finRange=el.dataset.frange;
      renderModule(key);
    });
    $("#screen").querySelectorAll(".js-collapse").forEach(el=>el.onclick=()=>el.classList.toggle("collapsed"));
    if(m.type==="checkin") wireCalendar(key, data[key]||[]);
    addBatchBoxes(); paintBatchBar();
    return;
  }
  $("#screen").classList.remove("batch");   // 退出批量模式：清掉残留类，否则行内小按钮会一直隐藏
  paintBatchBar();
  const bb0=$("#btn-batch"); if(bb0) bb0.onclick=()=>batchToggle();
  // P3-3 记录级交互（勾选 / 删除 / 置顶 / 子项 / 进度 / 番茄钟 / 编辑 …）统一走 #screen 事件委托
  const add=$("#btn-add"); if(add) add.onclick=()=>openEditor(key,null);
  if(m.type==="checkin") wireCalendar(key, data[key]||[]);
  $("#screen").querySelectorAll(".js-collapse").forEach(el=>el.onclick=()=>{
    el.classList.toggle("collapsed");
    if(el.classList.contains("month")){
      const mk=el.dataset.mk; data.__financeCollapsed=data.__financeCollapsed||{}; data.__financeCollapsed[mk]=el.classList.contains("collapsed"); store.save();
    }
  });
  $("#screen").querySelectorAll(".fchip").forEach(el=>el.onclick=()=>{
    if(el.dataset.ftype!==undefined) financeFilter.type=el.dataset.ftype;
    if(el.dataset.fcat!==undefined) financeFilter.cat=el.dataset.fcat;
    renderModule(key);
  });
  $("#screen").querySelectorAll(".js-budget").forEach(el=>el.onclick=()=>{
    const v=window.prompt("设置每月支出预算（元，0 表示不限制）：", data.__budget||"");
    if(v===null) return; const n=Math.max(0, +v||0); data.__budget=n; persist();
  });
  // P2-5 笔记标签筛选（标签条在记录列表之外，仍逐元素绑定）
  $("#screen").querySelectorAll("[data-tagnav]").forEach(el=>el.onclick=()=>{ noteTag=el.dataset.tagnav; renderModule(key); });
  // P2-4 记账：区间聚合 / 模板 / 分类管理 / CSV
  $("#screen").querySelectorAll("[data-frange]").forEach(el=>el.onclick=()=>{ finRange=el.dataset.frange; renderModule(key); });
  $("#screen").querySelectorAll(".js-tpluse").forEach(el=>el.onclick=()=>useTemplate(+el.dataset.i));
  $("#screen").querySelectorAll(".js-tplman").forEach(el=>el.onclick=()=>openTplManager());
  $("#screen").querySelectorAll(".js-catman").forEach(el=>el.onclick=()=>openCatManager());
  $("#screen").querySelectorAll(".js-csv").forEach(el=>el.onclick=()=>exportFinanceCSV());
  // P2-1 拖拽排序（仅 todo）
  if(m.type==="todo") wireDrag(key);
  stampA11y($("#screen"));   // P3-6 渲染后补语义
}

/* ---------- EDITOR MODAL (per type) ---------- */

function openEditor(key, item){
  const m=modOf(key); const editing=!!item;
  const d = item || newItem(m);
  let fields="";
  if(m.type==="todo"){
    fields=`<div class="field"><label>任务</label><input id="f-title" value="${attr(d.title)}" placeholder="要做什么？"/></div>
      <div class="field"><label>优先级</label><div class="seg" id="f-prio">${(m.priorities||[]).map(p=>`<div class="opt ${p.key===d.priority?'on':''}" data-v="${p.key}">${p.label}</div>`).join("")}</div></div>
      <div class="field"><label>子任务（每行一个）</label><textarea id="f-subs" placeholder="拆成小步，一行一个：&#10;查资料&#10;写初稿&#10;校对一遍">${esc((d.subs||[]).map(sub=>sub.t).join("\n"))}</textarea></div>
      <div class="field"><label>备注</label><textarea id="f-note" placeholder="补充说明">${esc(d.note||'')}</textarea></div>`;
  } else if(m.type==="checkin"){
    fields=`<div class="field"><label>打卡项</label><input id="f-title" value="${attr(d.title)}" placeholder="例如：喝够 8 杯水"/></div>
      <div class="frow"><div class="field"><label>每日目标</label><input id="f-goal" type="number" min="1" value="${Math.max(1,+d.goal||1)}"/></div>
      <div class="field"><label>单位</label><input id="f-unit" value="${attr(d.unit||"次")}" placeholder="杯 / 次 / 组"/></div></div>
      <p class="sub" style="margin:0">目标 = 1 即为「打 / 不打」式打卡；目标 &gt; 1 时点方块每次 +1、可累计到目标。月历里点过去的日期可以直接补签。</p>`;
  } else if(m.type==="progress"){
    fields=`<div class="field"><label>名称</label><input id="f-title" value="${attr(d.title)}" placeholder="书名 / 目标"/></div>
      <div class="frow"><div class="field"><label>当前</label><input id="f-cur" type="number" value="${d.current??0}"/></div>
      <div class="field"><label>目标</label><input id="f-tgt" type="number" value="${d.target??1}"/></div>
      <div class="field"><label>单位</label><input id="f-unit" value="${attr(d.unit||m.unit||'')}"/></div></div>
      <div class="field"><label>目标周期</label><div class="seg" id="f-period">
        <div class="opt ${d.period!=='week'?'on':''}" data-v="total">累计目标</div>
        <div class="opt ${d.period==='week'?'on':''}" data-v="week">每周目标</div></div>
        <p class="sub" style="margin:8px 0 0">每周目标会按周一到周日累计本周完成量，并在洞察里出近 12 周趋势。</p></div>
      <div class="field"><label>摘录 / 想法</label><textarea id="f-note" placeholder="随手记">${esc(d.note||'')}</textarea></div>`;
  } else if(m.type==="finance"){
    fields=`<div class="field"><label>类型</label><div class="seg" id="f-ftype">
        <div class="opt ${d.type!=='income'?'on':''}" data-v="expense">支出</div>
        <div class="opt ${d.type==='income'?'on':''}" data-v="income">收入</div></div></div>
      <div class="frow"><div class="field"><label>项目</label><input id="f-title" value="${attr(d.title)}" placeholder="午餐 / 稿费"/></div>
      <div class="field"><label>金额 ¥</label><input id="f-amt" type="number" value="${d.amount??''}" placeholder="0"/></div></div>
      <div class="field"><label>分类</label><div class="seg" style="flex-wrap:wrap" id="f-cat">${cats().map(c=>`<div class="opt ${c===d.category?'on':''}" data-v="${attr(c)}" style="flex:0 0 auto">${esc(c)}</div>`).join("")}</div></div>
      <div class="field"><label>周期记账</label><div class="seg" id="f-repeat">
        <div class="opt ${d.repeat?'on':''}" data-v="repeat">每月重复</div>
        <div class="opt ${!d.repeat?'on':''}" data-v="once">单次</div></div></div>
      <div class="field"><label>日期</label><input id="f-date" type="date" value="${d.date||isoToday()}"/></div>`;
  } else { // note
    fields=`<div class="field"><label>标题</label><input id="f-title" value="${attr(d.title)}" placeholder="给这条起个名"/></div>
      ${(m.moods&&m.moods.length)?`<div class="field"><label>标签 / 心情</label><div class="seg" style="flex-wrap:wrap" id="f-mood">${m.moods.map(md=>`<div class="opt ${md===d.mood?'on':''}" data-v="${attr(md)}" style="flex:0 0 auto">${md}</div>`).join("")}</div></div>`:''}
      <div class="field"><label>标签（空格或逗号分隔）</label><input id="f-tags" value="${attr((d.tags||[]).join(" "))}" placeholder="读书 方法论 待整理"/></div>
      <div class="field"><label>内容</label><textarea id="f-content" placeholder="写点什么…支持 **粗体**、行内代码、- 列表、链接">${esc(d.content||'')}</textarea></div>
      <div class="field"><label>日期</label><input id="f-date" type="date" value="${d.date||isoToday()}"/></div>`;
  }

  // layout variant selector
  const layoutOpts=[{v:'default',l:'标准'},{v:'feature',l:'大图'},{v:'quote',l:'引文'}];
  fields=`<div class="field"><label>卡片样式</label><div class="seg" id="f-layout">${layoutOpts.map(o=>`<div class="opt ${o.v===(d.layout||'default')?'on':''}" data-v="${o.v}">${o.l}</div>`).join("")}</div></div>`+fields;

  // custom fields (from m.fields config) — rendered after type-specific fields
  (m.fields||[]).forEach(f=>{
    const v=d[f.key]||"";
    if(f.type==="select") fields+=`<div class="field"><label>${esc(f.label)}</label><div class="seg" style="flex-wrap:wrap" id="f-cf-${f.key}">${(f.options||[]).map(o=>`<div class="opt ${o===v?'on':''}" data-v="${attr(o)}" style="flex:0 0 auto">${esc(o)}</div>`).join("")}</div></div>`;
    else if(f.type==="textarea") fields+=`<div class="field"><label>${esc(f.label)}</label><textarea id="f-cf-${f.key}" placeholder="${attr(f.placeholder||'')}">${esc(v)}</textarea></div>`;
    else if(f.type==="number") fields+=`<div class="field"><label>${esc(f.label)}</label><input id="f-cf-${f.key}" type="number" value="${attr(v)}" placeholder="${attr(f.placeholder||'')}"/></div>`;
    else fields+=`<div class="field"><label>${esc(f.label)}</label><input id="f-cf-${f.key}" value="${attr(v)}" placeholder="${attr(f.placeholder||'')}"/></div>`;
  });
  // shared image URL field (all types)
  fields+=`<div class="field"><label>图片 URL（可选）</label><input id="f-image" value="${attr(d.image||'')}" placeholder="https://..."/></div>
    <div class="field"><label>或本机图片（自动压缩）</label>
      <div class="img-pick"><button type="button" class="mini-act" id="f-imgbtn">${icon("camera",12)} 选择图片</button>
        <span class="img-hint" id="f-imghint">长边压到 800px 后存本机 · 已用 ${storageKB()} KB</span></div>
      <input type="file" id="f-imgfile" accept="image/*" hidden/>
      <div class="img-prev" id="f-imgprev">${d.image?`<img src="${attr(d.image)}" alt="图片预览"/>`:''}</div></div>`;

  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><div class="grab"></div>
    <h2>${editing?'编辑':'新建'} · ${m.name}</h2><div class="sub">${m.desc}</div>
    ${fields}
    <div class="modal-actions">${editing?'<button class="link-danger" id="m-del">删除</button>':''}
      <button class="btn ghost" id="m-cancel">取消</button><button class="btn" id="m-save">保存</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.onclick=e=>{ if(e.target===overlay) close(); };
  overlay.querySelector("#m-cancel").onclick=close;
  // segmented pickers
  overlay.querySelectorAll(".seg").forEach(seg=>seg.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{
    seg.querySelectorAll(".opt").forEach(x=>x.classList.remove("on")); o.classList.add("on");
  }));
  // P2-5 本机图片：压缩后写入 dataURL
  const imgBtn=overlay.querySelector("#f-imgbtn"), imgFile=overlay.querySelector("#f-imgfile");
  if(imgBtn && imgFile){
    imgBtn.onclick=()=>imgFile.click();
    imgFile.onchange=e=>{
      const f=e.target.files && e.target.files[0];
      e.target.value="";
      if(!f) return;
      imgBtn.textContent="压缩中…";
      compressImage(f, 800, 0.78).then(url=>{
        overlay.querySelector("#f-image").value=url;
        overlay.querySelector("#f-imgprev").innerHTML=`<img src="${url}" alt="图片预览"/>`;
        const kb=Math.round(url.length/1024);
        overlay.querySelector("#f-imghint").textContent=`已压缩为约 ${kb} KB · 本机已用 ${storageKB()} KB`;
        if(kb>500 || storageKB()>3800) toast("本机存储接近上限，建议导出备份后清理旧图","error");
      }).catch(()=>toast("图片处理失败，换一张试试","error"))
        .finally(()=>{ imgBtn.innerHTML=icon("camera",12)+" 重新选择"; });
    };
  }
  if(editing) overlay.querySelector("#m-del").onclick=()=>{ close(); confirmDelete(key, d.id); };
  overlay.querySelector("#m-save").onclick=()=>{
    const val=id=>{ const el=overlay.querySelector(id); return el?el.value:undefined; };
    const seg=id=>{ const el=overlay.querySelector(id+" .on"); return el?el.dataset.v:undefined; };
    d.title=(val("#f-title")||"").trim()||"未命名";
    d.layout=seg("#f-layout")||'default';
    if(m.type==="checkin"){ d.goal=Math.max(1,+val("#f-goal")||1); d.unit=(val("#f-unit")||"次").trim()||"次"; }
    if(m.type==="todo"){
      d.priority=seg("#f-prio")||d.priority; d.note=(val("#f-note")||"").trim();
      const oldSubs=d.subs||[];
      d.subs=(val("#f-subs")||"").split("\n").map(t=>t.trim()).filter(Boolean)
        .map(t=>{ const prev=oldSubs.find(o=>o.t===t); return { t:t, done: prev?!!prev.done:false }; });
      if(d.subs.length && d.subs.every(t=>t.done)) d.done=true;
    }
    else if(m.type==="progress"){ d.current=Math.max(0,+val("#f-cur")||0); d.target=Math.max(1,+val("#f-tgt")||1);
      d.unit=(val("#f-unit")||"").trim(); d.note=(val("#f-note")||"").trim(); d.period=seg("#f-period")||"total"; }
    else if(m.type==="finance"){ d.type=seg("#f-ftype")||"expense"; d.amount=Math.max(0,+val("#f-amt")||0); d.category=seg("#f-cat")||cats()[0]||"其他"; d.date=val("#f-date"); d.repeat=(seg("#f-repeat")==="repeat"); }
    else if(m.type==="note"){
      d.mood=seg("#f-mood")||d.mood||"";
      d.content=(val("#f-content")||"").trim();
      d.date=val("#f-date");
      d.tags=(val("#f-tags")||"").split(/[\s,，、]+/).map(t=>t.replace(/^#+/,"").trim()).filter(Boolean).slice(0,8);
    }
    // save custom fields
    (m.fields||[]).forEach(f=>{
      if(f.type==="select") d[f.key]=seg("#f-cf-"+f.key)||d[f.key]||"";
      else if(f.type==="number") d[f.key]=Math.max(0,+val("#f-cf-"+f.key)||0);
      else d[f.key]=(val("#f-cf-"+f.key)||"").trim();
    });
    // save image
    d.image=(val("#f-image")||"").trim();
    if(!editing) (data[key]=data[key]||[]).unshift(d);
    persist(); close();
  };
}


function newItem(m){
  const base={ id: Date.now() };
  let item;
  if(m.type==="todo") item={...base, title:"", priority:(m.priorities&&m.priorities[1]?m.priorities[1].key:"P1"), done:false, note:"", subs:[]};
  else if(m.type==="checkin") item={...base, title:"", log:{}, goal:1, unit:"次"};
  else if(m.type==="progress") item={...base, title:"", current:0, target: (m.unit==="页"?100:20), unit:m.unit||"", note:"", period:"total", log:{}};
  else if(m.type==="finance") item={...base, title:"", type:"expense", amount:"", category:cats()[0]||"其他", date:isoToday(), repeat:false};
  else item={...base, title:"", content:"", mood:(m.moods&&m.moods[0])||"", date:isoToday(), tags:[]};
  // initialize custom fields
  (m.fields||[]).forEach(f=>{ if(!(f.key in item)) item[f.key]= f.type==="select"?(f.options&&f.options[0]||""):""; });
  return item;
}
