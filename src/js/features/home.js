/* ============================================================
   首页：问候、今日概览环形、置顶任务、快速记录、本周趋势，以及打卡月历与补签。
   ============================================================ */

function renderHome(){
  const now = new Date();
  const dow = (now.getDay()+6)%7;               // 周一=0 … 周日=6
  const q = CONFIG.quotes[dow % CONFIG.quotes.length];
  const hour = now.getHours();
  const hi = hour<5?"夜深了":hour<11?"早上好":hour<13?"中午好":hour<18?"下午好":"晚上好";

  // overview rings
  const rings = CONFIG.overview.map(o=>{
    const r=o.calc(data);
    return `<div class="ring" data-open="${o.key}"><div class="dial">${ringSVG(r.value,o.color)}<span class="mid" style="color:${o.color}">${icon(o.icon,23)}</span></div>
      <div class="pct">${r.value}%</div><div class="lbl">${o.label}</div><div class="sub">${r.sub}</div></div>`;
  }).join("");

  // pinned tasks (置顶) — 跨模块收集 item.pinned；就地交互，不跳转
  const pins=[];
  CONFIG.modules.forEach(m=>(data[m.key]||[]).forEach(x=>{ if(x.pinned) pins.push({m,x}); }));
  const chkMark=icon("check",13,2.6);
  const pinSub=(m,x)=>{
    if(m.type==="checkin") return `${m.name} · 连续 ${streak(x.log)} 天`;
    if(m.type==="progress"){ const pct=Math.round((x.current/x.target)*100||0); return `${m.name} · ${x.current}/${x.target} ${x.unit||m.unit||''} · ${Math.min(100,pct)}%`; }
    return m.name;
  };
  const pinCtl=(m,x)=>{
    if(m.type==="checkin"){ const on=!!(x.log&&x.log[today()]); return `<div class="pin-chk js-pin-chk ${on?'on':''}" data-mkey="${m.key}" data-id="${x.id}" role="checkbox" tabindex="0" aria-checked="${on?'true':'false'}" aria-label="今日「${attr(x.title)}」打卡">${chkMark}</div>`; }
    if(m.type==="todo"){ return `<div class="pin-chk js-pin-chk ${x.done?'on':''}" data-mkey="${m.key}" data-id="${x.id}" role="checkbox" tabindex="0" aria-checked="${x.done?'true':'false'}" aria-label="完成「${attr(x.title)}」">${chkMark}</div>`; }
    if(m.type==="progress"){ return `<div class="pin-step"><button class="js-pin-dec" data-mkey="${m.key}" data-id="${x.id}" aria-label="减">−</button><button class="js-pin-inc" data-mkey="${m.key}" data-id="${x.id}" aria-label="加">+</button></div>`; }
    return `<span class="arw">${icon("chevron",14,2)}</span>`;
  };
  const pinned = pins.length ? pins.map(({m,x})=>`<div class="pin">
      <span class="pin-ic" style="color:${m.color}">${icon(m.icon,17)}</span>
      <div class="pin-b js-pin-open" data-mkey="${m.key}" data-id="${x.id}"><div class="pin-t ${(m.type==='todo'&&x.done)?'done':''}">${esc(x.title)}</div><div class="pin-m">${pinSub(m,x)}</div></div>
      ${pinCtl(m,x)}</div>`).join("")
    : `<div class="pin-empty">在任意模块点击 <span class="mini-star">${icon("star",13)}</span> 即可把重要任务置顶到这里</div>`;

  // trend
  const series = CONFIG.trend.series(data);
  const hasTrend = series.length>0;
  const avg = hasTrend ? Math.round(series.reduce((a,b)=>a+b,0)/series.length) : 0;
  const trend = hasTrend ? trendSVG(series)
    : `<div class="trend-empty">${icon("chart",22)}<span>暂无本周数据</span></div>`;

  const quick = CONFIG.quickAdd.map(q=>`<button class="qbtn" data-quick="${q.module}"><span class="e" style="background:color-mix(in srgb, ${q.color} 16%, transparent);color:${q.color}">${icon(q.icon,20)}<i class="qplus">${icon("plus",10,3)}</i></span><span class="l">${q.label}</span></button>`).join("");

  $("#screen").innerHTML = `
    <div class="greet"><div><h1>${hi}</h1><p>欢迎回到${CONFIG.owner}</p></div></div>
    <div class="quote"><span class="tag">${icon("quote",13)} 今日一句</span><div class="txt">${esc(q)}</div></div>
    <div class="sec-title">今日概览</div>
    <div class="card rings">${rings}</div>
    <div class="sec-title">置顶任务</div>
    <div class="pin-list">${pinned}</div>
    <div class="sec-title">快速记录</div>
    <div class="quick-grid">${quick}</div>
    <div class="panel trend-panel"><div class="ph">${icon("chart",15)} ${CONFIG.trend.title}${hasTrend?`<span class="avg">均 ${avg}${CONFIG.trend.unit}</span>`:''}</div>
      ${trend}${hasTrend?`<div class="trend-x"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>`:''}</div>`;

  wireHome();
}


let calMonth=null, calItemId=null;

function renderCalendar(m, it){
  if(!it.length) return "";
  const now=new Date();
  const cm=calMonth||{y:now.getFullYear(),m:now.getMonth()};
  const item=it.find(x=>x.id===calItemId)||it[0]; calItemId=item.id;
  const y=cm.y, mo=cm.m;
  const startDow=new Date(y,mo,1).getDay();
  const days=new Date(y,mo+1,0).getDate();
  const todayIso=isoToday();
  const log=item.log||{};
  const chips=it.map(x=>`<button type="button" class="cal-chip ${x.id===item.id?'on':''}" data-calitem="${x.id}">${esc(x.title)}</button>`).join("");
  let cells="", monthCount=0;
  for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell blank"></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const on=!!log[ds]; if(on) monthCount++;
    cells+=`<button type="button" class="cal-cell ${on?'on':''} ${ds===todayIso?'today':''}" data-date="${ds}"${on?` style="background:${m.color};border-color:${m.color}"`:''}>${d}</button>`;
  }
  return `<div class="panel cal-panel">
    <div class="cal-hd"><button class="cal-nav" data-cal="prev" aria-label="上月">${icon("chevron",16,2)}</button>
      <span class="cal-title">${y}年${mo+1}月</span>
      <button class="cal-nav" data-cal="next" aria-label="下月">${icon("chevron",16,2)}</button></div>
    <div class="cal-chips">${chips}</div>
    <div class="cal-dow">${"日一二三四五六".split("").map(x=>`<span>${x}</span>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-foot">${icon("flame",13)} 连续 ${streak(log)} 天 · 最长 ${bestStreak(log)} 天 · 本月 ${monthCount}/${days} 天</div>
    <div class="cal-foot">${icon("target",13)} 近7日 ${rateDays(log,7)}/7 · 近30日 ${rateDays(log,30)}/30</div></div>`;
}

function wireCalendar(key, it){
  const block=$("#screen").querySelector(".cal-panel"); if(!block) return;
  block.querySelectorAll("[data-cal]").forEach(el=>el.onclick=()=>{
    const now=new Date(); let y=calMonth?calMonth.y:now.getFullYear(), mo=calMonth?calMonth.m:now.getMonth();
    if(el.dataset.cal==="prev"){ mo--; if(mo<0){mo=11;y--;} }
    else { mo++; if(mo>11){mo=0;y++;} }
    calMonth={y,m:mo}; render();
  });
  block.querySelectorAll("[data-calitem]").forEach(el=>el.onclick=()=>{ calItemId=+el.dataset.calitem; render(); });
  block.querySelectorAll(".cal-cell[data-date]").forEach(el=>el.onclick=()=>{
    const item=it.find(x=>x.id===calItemId)||it[0]; if(!item) return;
    const ds=el.dataset.date; item.log=item.log||{};
    const wasOn=!!item.log[ds];
    const todayIso=isoToday();
    // 今天之前的日期取消打卡：高风险（会断连续），先确认
    if(wasOn && ds<todayIso){
      confirmCalUncheck(item, ds);
      return;
    }
    if(wasOn) delete item.log[ds]; else item.log[ds]=true;
    persist();
    if(wasOn) showCalUndo(item, ds);
  });
}

let calToastTimer=null;
/* P2-6 通用「撤销」提示（复用于删除 / 取消打卡） */

function undoToast(msg, fn, ms){
  let t=$("#calToast");
  if(!t){ t=document.createElement("div"); t.id="calToast"; t.className="cal-toast"; document.body.appendChild(t); }
  t.innerHTML=`${msg}<button type="button" id="calUndo">撤销</button>`;
  t.classList.add("show");
  const u=$("#calUndo"); if(u) u.onclick=()=>{ hideCalToast(); if(fn) fn(); };
  clearTimeout(calToastTimer);
  calToastTimer=setTimeout(hideCalToast, ms||5000);
}

function showCalUndo(item, ds){
  undoToast(`已取消 ${ds.slice(5)} 打卡`, ()=>{ item.log=item.log||{}; item.log[ds]=true; persist(); }, 4000);
}

function hideCalToast(){ const t=$("#calToast"); if(t) t.classList.remove("show"); }

function confirmCalUncheck(item, ds){
  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><div class="grab"></div><h2>取消打卡</h2>
    <div class="sub">取消 ${ds} 的打卡可能会中断连续天数，确定吗？</div>
    <div class="modal-actions"><button class="btn ghost" id="cu-cancel">保留</button><button class="btn danger" id="cu-ok">取消打卡</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.onclick=e=>{ if(e.target===overlay) close(); };
  overlay.querySelector("#cu-cancel").onclick=close;
  overlay.querySelector("#cu-ok").onclick=()=>{ delete item.log[ds]; persist(); close(); showCalUndo(item, ds); };
}


function wireHome(){
  setTimeout(()=>{ stampA11y($("#screen")); stampNav(); }, 0);
  $("#screen").querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>go(el.dataset.open));
  $("#screen").querySelectorAll("[data-quick]").forEach(el=>el.onclick=()=>{ go(el.dataset.quick); openEditor(el.dataset.quick,null); });
  const find=el=>(data[el.dataset.mkey]||[]).find(i=>i.id==el.dataset.id);
  // 置顶卡：就地打卡 / 完成
  $("#screen").querySelectorAll(".js-pin-chk").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); const m=modOf(el.dataset.mkey), x=find(el); if(!x) return;
    if(m.type==="todo"){ x.done=!x.done; }
    else if(m.type==="checkin"){
      x.log=x.log||{};
      const tt=today(); const goal=Math.max(1,+x.goal||1);
      if(goal<=1){ x.log[tt]?delete x.log[tt]:x.log[tt]=1; }
      else { x.log[tt]=Math.min(goal, logCount(x.log,tt)+1); }
      bump(10);
    }
    persist();
  });
  // 置顶卡：就地改数字
  $("#screen").querySelectorAll(".js-pin-inc").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); const m=modOf(el.dataset.mkey), x=find(el); if(!x) return;
    bumpProgress(el.dataset.mkey, x, progStep(x,m));
  });
  $("#screen").querySelectorAll(".js-pin-dec").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); const m=modOf(el.dataset.mkey), x=find(el); if(!x) return;
    bumpProgress(el.dataset.mkey, x, -Math.min(progStep(x,m), +x.current||0));
  });
  // 置顶卡：点标题区查看详情 / 改状态
  $("#screen").querySelectorAll(".js-pin-open").forEach(el=>el.onclick=()=>openEditor(el.dataset.mkey, find(el)));
}
