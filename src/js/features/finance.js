/* ============================================================
   记账模块：分类、预算、模板、周期聚合、CSV 导出、月度折叠分组、周期性账单结转。
   ============================================================ */

function renderFinanceGroups(m, it){
  const CHEV = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  const sumGroup = arr => {
    const inc = arr.filter(x=>x.type==="income").reduce((s,x)=>s+ +x.amount,0);
    const exp = arr.filter(x=>x.type==="expense").reduce((s,x)=>s+ +x.amount,0);
    return { inc, exp, bal: inc-exp };
  };
  const fmtMonth = mk => { const [y,mo]=mk.split("-"); return `${y}年${+mo}月`; };
  const fmtDay = dk => {
    const [y,mo,da]=dk.split("-");
    const w=["周日","周一","周二","周三","周四","周五","周六"][new Date(dk+"T00:00:00").getDay()];
    return `${+mo}月${+da}日 ${w}`;
  };
  const chip = (label,val,cls) => `<span class="gs ${cls}">${label}¥${val}</span>`;
  const sumChips = (s, level) => level==="month"
    ? chip("收 ",s.inc,"inc")+chip("支 ",s.exp,"exp")+chip("结 ",s.bal,"bal")
    : chip("收 ",s.inc,"inc")+chip("支 ",s.exp,"exp");

  const curMonth = today().slice(0,7);
  // 按 月份降序 → 日期降序 排序复制
  const sorted = it.slice().sort((a,b)=>{
    const da = a.date || "9999-99-99", db = b.date || "9999-99-99";
    if(da===db) return (b.id||0)-(a.id||0);
    return da<db ? 1 : -1;
  });
  // 嵌套分组： monthKey -> dayKey -> [items]
  const months = {};
  sorted.forEach(x=>{
    const mk = x.date ? x.date.slice(0,7) : "__nodate";
    const dk = x.date || "__nodate";
    (months[mk] = months[mk] || {});
    (months[mk][dk] = months[mk][dk] || []).push(x);
  });
  const monthKeys = Object.keys(months).sort((a,b)=>{
    if(a==="__nodate") return 1; if(b==="__nodate") return -1;
    return a<b ? 1 : -1;
  });

  return monthKeys.map(mk=>{
    const isCur = mk===curMonth;
    const monthAll = Object.values(months[mk]).flat();
    const ms = sumGroup(monthAll);
    const monthLabel = mk==="__nodate" ? "未标注日期" : fmtMonth(mk);
    const dayKeys = Object.keys(months[mk]).sort((a,b)=>{
      if(a==="__nodate") return 1; if(b==="__nodate") return -1;
      return a<b ? 1 : -1;
    });
    const daysHTML = dayKeys.map(dk=>{
      const arr = months[mk][dk];
      const ds = sumGroup(arr);
      const dayLabel = dk==="__nodate" ? "未标注" : fmtDay(dk);
      return `<div class="grp">
        <div class="grp-head day js-collapse">${CHEV}<span class="grp-title">${dayLabel}</span><span class="grp-sum">${sumChips(ds,"day")}</span></div>
        <div class="grp-body">${arr.map(x=>recHTML(m,x)).join("")}</div>
      </div>`;
    }).join("");
    const budgetRow = renderBudgetRow(ms.exp);
    return `<div class="grp">
      <div class="grp-head month js-collapse ${(data.__financeCollapsed && (mk in data.__financeCollapsed)) ? (data.__financeCollapsed[mk]?'collapsed':'') : (isCur?'':'collapsed')}" data-mk="${mk}">${CHEV}<span class="grp-title">${monthLabel}</span><span class="grp-sum">${sumChips(ms,"month")}</span></div>
      <div class="grp-body">${budgetRow}${daysHTML}</div>
    </div>`;
  }).join("");
}


function cats(){
  const c = data.__categories;
  if(Array.isArray(c) && c.length) return c.slice();
  return ((modOf("money")||{}).categories || []).slice();
}

function templates(){ return Array.isArray(data.__moneyTpl) ? data.__moneyTpl : []; }


let finRange = "month";

function finRangeBounds(){
  const n = new Date();
  if(finRange==="day"){ const k=dsKey(n); return { from:k, to:k, label:"今日" }; }
  if(finRange==="week"){ const s0=weekStart(n), e=new Date(s0); e.setDate(s0.getDate()+6); return { from:dsKey(s0), to:dsKey(e), label:"本周" }; }
  const k = n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0");
  return { from:k+"-01", to:k+"-31", label:"本月" };
}

function renderFinanceSummary(){
  const b = finRangeBounds();
  const it = (data.money||[]).filter(x=>x.date && x.date>=b.from && x.date<=b.to);
  const inc = it.filter(x=>x.type==="income").reduce((s,x)=>s+ +x.amount,0);
  const exp = it.filter(x=>x.type==="expense").reduce((s,x)=>s+ +x.amount,0);
  const chips = [["day","日"],["week","周"],["month","月"]]
    .map(([k,l])=>`<button class="fchip ${finRange===k?'on':''}" data-frange="${k}" aria-label="${l}聚合">${l}</button>`).join("");
  return `<div class="mod-summary">
      <div class="mini"><div class="l">${b.label}收入</div><div class="v" style="color:var(--module-1)">¥${inc}</div></div>
      <div class="mini"><div class="l">${b.label}支出</div><div class="v" style="color:var(--danger)">¥${exp}</div></div>
      <div class="mini"><div class="l">${b.label}结余</div><div class="v">¥${inc-exp}</div></div></div>
    <div class="fin-range">${chips}</div>`;
}

function renderTemplateChips(){
  const tpl = templates(); if(!tpl.length) return "";
  return `<div class="tpl-bar"><div class="tpl-hd">${icon("bolt",14)} 快捷记账<span class="more"><button class="mini-act js-tplman">管理</button></span></div>
    <div class="tpl-chips">${tpl.map((t,i)=>`<button class="tchip js-tpluse" data-i="${i}">
      <b>${esc(t.title||"未命名")}</b><span>${t.type==="income"?"+":"-"}¥${t.amount||0} · ${esc(t.category||"")}</span></button>`).join("")}</div></div>`;
}

function useTemplate(i){
  const t = templates()[i]; if(!t){ toast("模板不存在","error"); return; }
  const rec = Object.assign({}, t, { id: Date.now(), date: isoToday(), repeat: false });
  (data.money = data.money || []).unshift(rec);
  bump(15);
  toast(`已记一笔：${esc(rec.title)} ${rec.type==="income"?"+":"-"}¥${rec.amount}`);
  persist();
}

function saveAsTemplate(id){
  const x = (data.money||[]).find(i=>i.id==id); if(!x){ return; }
  const arr = templates().filter(t=>!(t.title===x.title && +t.amount===+x.amount && t.category===x.category && t.type===x.type));
  arr.unshift({ title:x.title, amount:+x.amount||0, category:x.category||"其他", type:x.type||"expense" });
  data.__moneyTpl = arr.slice(0,12);
  store.save(); render();
  toast(`「${esc(x.title)}」已存为快捷模板`);
}

function openTplManager(){
  const tpl = templates();
  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>快捷记账模板</h2>
    <div class="sub">点账本里任意一条记录上的「存模板」，就能把它收进来一键再记。</div>
    ${tpl.length ? tpl.map((t,i)=>`<div class="cat-row"><span class="tpl-name">${esc(t.title||"未命名")}</span>
      <span class="tpl-amt">${t.type==="income"?"+":"-"}¥${t.amount||0} · ${esc(t.category||"")}</span>
      <button class="mini-act" data-rmt="${i}">删除</button></div>`).join("") : `<div class="chart-empty">还没有模板</div>`}
    <div class="modal-actions"><button class="btn ghost" id="tplClose">关闭</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = e => { if(e.target===overlay) close(); };
  overlay.querySelector("#tplClose").onclick = close;
  overlay.querySelectorAll("[data-rmt]").forEach(b=>b.onclick=()=>{
    const arr = templates().slice(); arr.splice(+b.dataset.rmt,1);
    data.__moneyTpl = arr; store.save(); close(); render(); openTplManager();
  });
}

function openCatManager(){
  let list = cats();
  const bmap = Object.assign({}, data.__budgets || {});
  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>分类与预算</h2>
    <div class="sub">顺序即筛选条与编辑器里的展示顺序；预算留空表示不限。</div>
    <div id="catWrap"></div>
    <div class="modal-actions"><button class="btn ghost" id="catCancel">取消</button><button class="btn" id="catSave">保存</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  const collect = () => {
    overlay.querySelectorAll(".cat-row").forEach((r,i)=>{
      const nm = (r.querySelector(".cat-name").value||"").trim();
      if(nm) list[i] = nm;
      const key = list[i]; if(!key) return;
      const n = +r.querySelector(".cat-bud").value;
      if(n>0) bmap[key] = n; else delete bmap[key];
    });
  };
  const paint = () => {
    overlay.querySelector("#catWrap").innerHTML =
      list.map((c,i)=>`<div class="cat-row" data-i="${i}">
        <input class="cat-name" value="${attr(c)}" aria-label="分类名称" placeholder="分类名"/>
        <input class="cat-bud" type="number" min="0" placeholder="预算" value="${bmap[c]||''}" aria-label="分类预算"/>
        <button class="mini-act" data-up="${i}"${i===0?" disabled":""}>↑</button>
        <button class="mini-act" data-dn="${i}"${i===list.length-1?" disabled":""}>↓</button>
        <button class="mini-act" data-rm="${i}">删除</button></div>`).join("")
      + `<button class="mini-act" id="catAdd">+ 新增分类</button>`;
    wire();
  };
  const wire = () => {
    overlay.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.up; collect(); if(i<=0) return; const t=list[i-1]; list[i-1]=list[i]; list[i]=t; paint(); });
    overlay.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.dn; collect(); if(i>=list.length-1) return; const t=list[i+1]; list[i+1]=list[i]; list[i]=t; paint(); });
    overlay.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.rm; collect(); const k=list[i]; list.splice(i,1); delete bmap[k]; paint(); });
    const add = overlay.querySelector("#catAdd");
    if(add) add.onclick = () => { collect(); list.push(""); paint(); const ins=overlay.querySelectorAll(".cat-name"); if(ins.length) ins[ins.length-1].focus(); };
  };
  paint();
  overlay.onclick = e => { if(e.target===overlay) close(); };
  overlay.querySelector("#catCancel").onclick = close;
  overlay.querySelector("#catSave").onclick = () => {
    collect();
    const cleaned = [];
    list.forEach(c=>{ const v=(c||"").trim(); if(v && cleaned.indexOf(v)<0) cleaned.push(v); });
    if(!cleaned.length){ toast("至少保留一个分类","error"); return; }
    const nb = {};
    Object.keys(bmap).forEach(k=>{ if(cleaned.indexOf(k)>=0 && bmap[k]>0) nb[k]=bmap[k]; });
    data.__categories = cleaned; data.__budgets = nb;
    store.save(); close(); render();
    toast("分类与预算已保存");
  };
}

function exportFinanceCSV(){
  const rows = filterFinance(data.money||[]).slice().sort((a,b)=> (a.date||"") < (b.date||"") ? -1 : 1);
  if(!rows.length){ toast("当前筛选下没有记录可导出","error"); return; }
  const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const lines = ["日期,类型,项目,分类,金额,周期"];
  rows.forEach(x=>lines.push([x.date||"", x.type==="income"?"收入":"支出", x.title||"", x.category||"", +x.amount||0, x.repeat?"每月":"单次"].map(q).join(",")));
  const csv = "\ufeff" + lines.join("\r\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `账本-${isoToday()}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1200);
  toast(`已导出 ${rows.length} 条记账`);
}


function renderBudgetRow(exp){
  const b = data.__budget ? +data.__budget : 0;
  if(!b) return `<div class="budget-row"><button class="set-budget js-budget">设置每月预算</button></div>`;
  const pct = Math.min(100, Math.round(exp/b*100));
  const over = exp>b;
  return `<div class="budget-row">
    <div class="bbar"><i style="width:${pct}%;background:${over?'var(--danger)':'var(--module-1)'}"></i></div>
    <span class="bl ${over?'over':''}">已用 ¥${exp} / 预算 ¥${b}${over?` · 超支 ¥${exp-b}`:''}</span>
  </div>`;
}


function ensureRecurring(){
  const cur = today().slice(0,7);
  if(data.__clonedMonth===cur) return;
  const fin = data.money||[];
  const prevs = [...new Set(fin.filter(x=>x.repeat && x.date && x.date.slice(0,7)<cur).map(x=>x.date.slice(0,7)))].sort();
  if(prevs.length){
    const srcMonth = prevs[prevs.length-1];
    fin.filter(x=>x.repeat && x.date && x.date.slice(0,7)===srcMonth).forEach(x=>{
      const day = x.date.slice(8);
      const clone = Object.assign({}, x, { id: Date.now()+Math.floor(Math.random()*1000), date: cur+"-"+day, repeat:true });
      fin.unshift(clone);
    });
  }
  data.__clonedMonth = cur;
  persist();
}
