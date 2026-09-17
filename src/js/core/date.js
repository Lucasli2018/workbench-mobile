/* ============================================================
   日期与周期工具：今日串、月键序列、周起始、聚合边界。
   纯函数，不依赖业务状态。
   ============================================================ */

function isoToday(){ return new Date().toISOString().slice(0,10); }
function today(){ return isoToday(); }

function toDate(s){ return new Date(s+"T00:00:00"); }

function monthKeysBack(n){
  const now=new Date(); const arr=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); arr.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")); }
  return arr;
}

function allMonthKeys(){
  const set=new Set((data.money||[]).filter(x=>x.date).map(x=>x.date.slice(0,7)));
  return [...set].sort();
}

function monthAgg(mk){
  const arr=(data.money||[]).filter(x=>x.date&&x.date.slice(0,7)===mk);
  const inc=arr.filter(x=>x.type==="income").reduce((s,x)=>s+ +x.amount,0);
  const exp=arr.filter(x=>x.type==="expense").reduce((s,x)=>s+ +x.amount,0);
  return { inc, exp, bal: inc-exp, n: arr.length };
}

function periodMonths(){
  if(insightPeriod==="all") return allMonthKeys();
  const n={"1m":1,"3m":3,"6m":6,"12m":12}[insightPeriod]||6;
  return monthKeysBack(n);
}

function shortMonth(mk){ const p=mk.split("-"); return (+p[1])+"月"; }

/* 收支趋势：分组柱状(收入/支出) + 结余折线 */

function weekStart(d){ const x=new Date(d); const dow=(x.getDay()+6)%7; x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x; }

function dsKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
