/* ============================================================
   洞察页：周期切换、完成度柱状图、支出构成环形、打卡热力图、进度墙、月度复盘。
   ============================================================ */

function periodBarHTML(){
  const opts=[["1m","本月"],["3m","近3月"],["6m","近6月"],["12m","近12月"],["all","全部"]];
  return `<div class="period-bar">${opts.map(o=>`<button class="pchip ${insightPeriod===o[0]?'on':''}" data-period="${o[0]}">${o[1]}</button>`).join("")}</div>`;
}
function sectionEmpty(title,msg){ return `<div class="sec-title">${esc(title)}</div><div class="panel"><div class="chart-empty">${esc(msg)}</div></div>`; }

function wireInsight(){
  $("#screen").querySelectorAll(".pchip").forEach(el=>el.onclick=()=>{ insightPeriod=el.dataset.period; renderInsight(); });
  $("#screen").querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>go(el.dataset.open));
  $("#screen").querySelectorAll(".copy-btn").forEach(el=>el.onclick=()=>{ try{ navigator.clipboard.writeText(el.dataset.copy); }catch(e){} toast("已复制周报"); });
}

/* ---- P1-1 账本趋势 ---- */

function insightTrend(){
  const months=periodMonths().map(mk=>({mk, ...monthAgg(mk)}));
  if(!months.length || months.every(x=>x.n===0)) return sectionEmpty("账本趋势","还没有记账数据");
  const svg=trendChartSVG(months);
  const last=months[months.length-1], prev=months[months.length-2];
  let delta="";
  if(prev && (prev.inc||prev.exp)){
    const de=last.exp-prev.exp, di=last.inc-prev.inc;
    const pe=prev.exp?Math.round(de/prev.exp*100):0, pi=prev.inc?Math.round(di/prev.inc*100):0;
    delta=`<div class="trend-delta">
      <span>支出 ${fmtMoney(last.exp)} <em class="${de>0?'up':'down'}">${de>0?'▲':'▼'}${Math.abs(pe)}%</em></span>
      <span>收入 ${fmtMoney(last.inc)} <em class="${di>0?'up':'down'}">${di>0?'▲':'▼'}${Math.abs(pi)}%</em></span>
      <span>结余 ${fmtMoney(last.bal)}</span></div>`;
  }
  return `<div class="sec-title">账本趋势</div>
    <div class="panel"><div class="ph">${icon("chart",15)} 收支趋势<span class="avg">${months.length} 个月</span></div>
      <div class="chart-box">${svg}</div>
      <div class="legend-inline"><span><i style="background:var(--module-1)"></i>收入</span><span><i style="background:var(--danger)"></i>支出</span><span><i style="background:var(--accent)"></i>结余</span></div>
      ${delta}</div>`;
}

/* ---- P1-2 账本构成 ---- */

function insightComposition(){
  const months=periodMonths();
  const money=(data.money||[]).filter(x=>x.date&&months.includes(x.date.slice(0,7)));
  const exps=money.filter(x=>x.type==="expense"), incs=money.filter(x=>x.type==="income");
  const totalExp=exps.reduce((s,x)=>s+ +x.amount,0), totalInc=incs.reduce((s,x)=>s+ +x.amount,0);
  const catList=cats();
  const palette=["#10b981","#ef4444","#2563eb","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#64748b"];
  const mkSegs=arr=>catList.map(c=>({cat:c,amount:arr.filter(x=>x.category===c).reduce((s,x)=>s+ +x.amount,0)}))
    .filter(s=>s.amount>0).sort((a,b)=>b.amount-a.amount);
  const expSegs=mkSegs(exps), incSegs=mkSegs(incs);
  expSegs.forEach((s,i)=>s.color=palette[i%palette.length]);
  incSegs.forEach((s,i)=>s.color=palette[i%palette.length]);
  if(!expSegs.length && !incSegs.length) return sectionEmpty("账本构成","该区间暂无记账");
  const donutExp=expSegs.length?donutSVG(expSegs):`<div class="donut-empty">${icon("wallet",22)}<span>暂无支出</span></div>`;
  const donutInc=incSegs.length?donutSVG(incSegs):`<div class="donut-empty">${icon("wallet",22)}<span>暂无收入</span></div>`;
  const legendOf=segs=>{ const t=segs.reduce((a,x)=>a+x.amount,0)||1; return segs.map(s=>`<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span><span class="legend-name">${esc(s.cat)}</span><span class="legend-amt">¥${s.amount}</span><span class="legend-pct">${Math.round(s.amount/t*100)}%</span></div>`).join(""); };
  const b=data.__budget?+data.__budget:0; const thisExp=monthAgg(today().slice(0,7)).exp;
  const budgetRow=b?`<div class="budget-mini">本月预算执行 <b style="color:${thisExp>b?'var(--danger)':'var(--module-1)'}">${Math.round(thisExp/b*100)}%</b> · ¥${thisExp}/¥${b}</div>`:"";
  const bud=data.__budgets||{};
  const budRows=Object.keys(bud).filter(k=>+bud[k]>0).map(k=>{
    const spent=exps.filter(x=>x.category===k).reduce((s,x)=>s+ +x.amount,0);
    const pct=Math.min(100,Math.round(spent/(+bud[k])*100)); const over=spent>+bud[k];
    return `<div class="catbud"><span class="cb-n">${esc(k)}</span>
      <div class="pbar"><i style="width:${pct}%;background:${over?'var(--danger)':'var(--module-1)'}"></i></div>
      <span class="cb-v ${over?'over':''}">¥${spent}/¥${bud[k]}</span></div>`;
  }).join("");
  const catbudBlock=budRows?`<div class="catbud-wrap"><div class="ph">${icon("target",14)} 分类预算执行（区间内）</div>${budRows}</div>`:"";
  return `<div class="sec-title">账本构成</div>
    <div class="panel"><div class="ph">${icon("wallet",15)} 支出构成<span class="avg">合计 ¥${totalExp}</span></div>
      <div class="donut-wrap"><div class="donut">${donutExp}</div><div class="donut-legend">${legendOf(expSegs)}</div></div>
      ${hbarSVG(expSegs.map(s=>({label:s.cat,value:s.amount,color:s.color,pct:Math.round(s.amount/(totalExp||1)*100)})))}
      ${catbudBlock}
      ${budgetRow}</div>
    <div class="panel" style="margin-top:12px"><div class="ph">${icon("wallet",15)} 收入构成<span class="avg">合计 ¥${totalInc}</span></div>
      <div class="donut-wrap"><div class="donut">${donutInc}</div><div class="donut-legend">${legendOf(incSegs)}</div></div></div>`;
}

/* ---- P1-3 习惯热力图 ---- */

function insightHeatmap(){
  const items=(data.checkin||[]);
  if(!items.length) return sectionEmpty("习惯热力图","还没有打卡项");
  const weeks=12;
  const heat=items.map(it=>`<div class="heat-item"><div class="heat-head"><span>${esc(it.title)}</span><span class="heat-streak">${icon("flame",12)} 连${streak(it.log)}天</span></div>${heatmapSVG(it.log,weeks)}</div>`).join("");
  return `<div class="sec-title">习惯热力图</div>
    <div class="panel"><div class="ph">${icon("leaf",15)} 打卡热力<span class="avg">近 ${weeks} 周</span></div>${heat}</div>`;
}

/* ---- P1-4 / P1-5 占位（后续填充） ---- */

function insightProgressWall(){
  const read=(data.read||[]), sport=(data.sport||[]);
  if(!read.length && !sport.length) return sectionEmpty("进度墙","还没有阅读 / 运动记录");
  const readDone=read.reduce((s,x)=>s+(+x.current||0),0);
  const readTarget=read.reduce((s,x)=>s+(+x.target||0),0);
  const sportDone=sport.reduce((s,x)=>s+(+x.current||0),0);
  const readList=read.map(x=>{ const pct=Math.min(100,Math.round((x.current/x.target)*100||0));
    return `<div class="rank-row"><span class="rank-name">${esc(x.title)}</span>
      <div class="pbar"><i style="width:${pct}%;background:var(--module-2)"></i></div>
      <span class="rank-val">${x.current}/${x.target}${x.unit||''}</span></div>`; }).join("");
  const sportStats=sport.map(x=>`<div class="mini-stat"><span>${esc(x.title)}</span><b>${x.current}/${x.target}${x.unit||''}</b></div>`).join("");
  let html=`<div class="sec-title">进度墙</div>`;
  if(read.length) html+=`<div class="panel"><div class="ph">${icon("book",15)} 阅读进度<span class="avg">累计 ${readDone}/${readTarget} 页</span></div>${readList}</div>`;
  if(sport.length) html+=`<div class="panel" style="margin-top:12px"><div class="ph">${icon("activity",15)} 运动累计<span class="avg">${sportDone} ${sport[0].unit||'分钟'}</span></div><div class="mini-stats">${sportStats}</div></div>`;
  // P2-3 近 12 周趋势（仅对开启每周记录的项目）
  const weekly=[...read,...sport].filter(x=>x.period==="week" || (x.log && Object.keys(x.log).length));
  if(weekly.length){
    const rows=weekly.map(x=>{
      const unit=x.unit||"";
      const tgt=Math.max(1,+x.target||1), cur=weekSum(x.log);
      const pct=Math.min(100,Math.round(cur/tgt*100));
      return `<div class="wk-row"><div class="wk-top"><span class="rank-name">${esc(x.title)}</span>
        <span class="rank-val">本周 ${cur}/${tgt}${unit} · ${pct}%</span></div>
        ${sparkSVG(weekSeries(x.log,12))}
        <div class="wk-x"><span>12 周前</span><span>本周</span></div></div>`;
    }).join("");
    html+=`<div class="panel" style="margin-top:12px"><div class="ph">${icon("chart",15)} 近 12 周趋势<span class="avg">每周完成量</span></div>${rows}</div>`;
  }
  return html;
}

function insightRecap(){
  const mk=today().slice(0,7);
  const money=(data.money||[]).filter(x=>x.date&&x.date.slice(0,7)===mk);
  const exp=money.filter(x=>x.type==="expense").reduce((s,x)=>s+ +x.amount,0);
  const inc=money.filter(x=>x.type==="income").reduce((s,x)=>s+ +x.amount,0);
  let best=0; (data.checkin||[]).forEach(x=>{ best=Math.max(best, streak(x.log)); });
  const books=(data.read||[]).length, notes=(data.note||[]).length;
  const line=`本月记账 ${money.length} 笔（收 ¥${inc} / 支 ¥${exp}），最长打卡连续 ${best} 天，在读 ${books} 本、灵感 ${notes} 条。`;
  const anoms=[];
  const b=data.__budget?+data.__budget:0;
  if(b && exp>b) anoms.push(`本月支出 ¥${exp} 已超预算 ¥${b}`);
  const lm=(function(){ const d=new Date(); d.setDate(0); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); })();
  const curC={}, lastC={};
  (data.money||[]).filter(x=>x.type==="expense").forEach(x=>{ const k=x.date.slice(0,7);
    if(k===mk) curC[x.category]=(curC[x.category]||0)+ +x.amount;
    if(k===lm) lastC[x.category]=(lastC[x.category]||0)+ +x.amount; });
  let topCat=null, topAmt=0; Object.entries(curC).forEach(([c,v])=>{ if(v>topAmt){ topAmt=v; topCat=c; } });
  if(topCat && lastC[topCat] && topAmt>lastC[topCat]*1.5) anoms.push(`「${topCat}」支出较上月增 ${Math.round((topAmt-lastC[topCat])/lastC[topCat]*100)}%`);
  const report=`【${CONFIG.owner}·月度复盘】本月记账 ${money.length} 笔（收 ¥${inc} / 支 ¥${exp}），最长打卡连续 ${best} 天，在读 ${books} 本、灵感 ${notes} 条。`+(anoms.length?" 提醒："+anoms.join("；"):"");
  return `<div class="sec-title">智能复盘</div>
    <div class="panel"><div class="ph">${icon("chart",15)} 本月一句话</div>
      <p class="recap-line">${esc(line)}</p>
      ${anoms.length?`<div class="anomaly">${icon("bolt",13)} ${anoms.map(esc).join("；")}</div>`:''}
      <button class="btn ghost copy-btn" data-copy="${esc(report)}">复制周报</button></div>`;
}



function renderInsight(){
  setTimeout(()=>{ stampA11y($("#screen")); stampNav(); }, 0);
  // 模块完成度柱状条
  const bars = CONFIG.modules.map(m=>{
    const it=data[m.key]||[]; let pct=0, label="";
    if(m.type==="todo"){ const d=it.filter(x=>x.done).length; pct=it.length?Math.round(d/it.length*100):0; label=`${d}/${it.length}`; }
    else if(m.type==="checkin"){ const t=today(); const d=it.filter(x=>x.log&&x.log[t]).length; pct=it.length?Math.round(d/it.length*100):0; label=`${d}/${it.length}`; }
    else if(m.type==="progress"){ pct=avgProgress(it).value; label=`${pct}%`; }
    else if(m.type==="finance"){ const e=it.filter(x=>x.type==="expense").reduce((s,x)=>s+ +x.amount,0); label=`¥${e}`; }
    else { label=`${it.length} 条`; }
    return {m, pct, label};
  });
  const barAvg = bars.length ? Math.round(bars.reduce((s,b)=>s+b.pct,0)/bars.length) : 0;
  const barList = bars.map(b=>`<div class="bar-row" data-open="${b.m.key}" role="button" tabindex="0">
    <span class="bar-ic" style="color:${b.m.color}">${icon(b.m.icon,17)}</span>
    <span class="bar-name">${b.m.name}</span>
    <div class="pbar"><i style="width:${Math.min(100,b.pct)}%;background:${b.m.color}"></i></div>
    <span class="bar-pct">${b.label}</span></div>`).join("");

  let html = `<div class="greet"><div><h1>洞察</h1><p>数据会说话 · 趋势 · 构成 · 习惯 · 复盘</p></div></div>`;
  html += periodBarHTML();
  html += `<div class="sec-title">模块完成度</div><div class="panel"><div class="ph">${icon("chart",15)} 模块完成度<span class="avg">均 ${barAvg}%</span></div><div class="bar-list">${barList}</div></div>`;
  html += insightTrend();
  html += insightComposition();
  html += insightHeatmap();
  html += insightProgressWall();
  html += insightRecap();
  $("#screen").innerHTML = html;
  wireInsight();
}
