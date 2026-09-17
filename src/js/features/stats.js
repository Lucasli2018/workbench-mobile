/* ============================================================
   打卡与进度统计：连击、周期求和、完成率、里程碑。
   ============================================================ */

function streak(log){
  if(!log) return 0; let n=0; const d=new Date();
  for(;;){ const key=d.toISOString().slice(0,10); if(log[key]){ n++; d.setDate(d.getDate()-1); } else break; }
  return n;
}

/* P2-3 进度：周起点（周一）与本地日期键 */

function weekSum(log){
  if(!log) return 0;
  const s0=weekStart(new Date()); let t=0;
  for(let i=0;i<7;i++){ const d=new Date(s0); d.setDate(s0.getDate()+i); t+= (+log[dsKey(d)]||0); }
  return t;
}

function weekSeries(log,n){
  const out=[], s0=weekStart(new Date());
  for(let w=n-1;w>=0;w--){
    const s=new Date(s0); s.setDate(s0.getDate()-7*w); let t=0;
    for(let i=0;i<7;i++){ const d=new Date(s); d.setDate(s.getDate()+i); t+= (+log[dsKey(d)]||0); }
    out.push(t);
  }
  return out;
}

function progStep(x,m){
  const u=x.unit||m.unit||"";
  if(u==="页") return 10;
  if(String(u).indexOf("分钟")>=0) return 20;
  return Math.max(1,+x.step||10);
}
/* P2-3 进度增减：同步维护累计值与本周日志，跨 25/50/75/100% 给一次鼓励 */

const PROG_MILESTONES=[25,50,75,100];

function progPct(x){
  const cur = (x.period==="week") ? weekSum(x.log) : (+x.current||0);
  return Math.min(100, Math.round(cur/Math.max(1,+x.target||1)*100));
}

function bumpProgress(key, x, delta){
  const before=progPct(x);
  x.current=Math.max(0,(+x.current||0)+delta);
  if(x.period==="week"){
    x.log=x.log||{}; const k=dsKey(new Date());
    const nv=Math.max(0,(+x.log[k]||0)+delta);
    if(nv<=0) delete x.log[k]; else x.log[k]=nv;
  }
  const after=progPct(x);
  const hit=PROG_MILESTONES.find(v=>before<v && after>=v && before<100);
  if(hit){ x.milestone=hit; bump([20,40,20]); toast(`${icon("target",14)} 进度 ${hit}% · ${esc(x.title||"")}`); }
  else if(delta>0) bump(8);
  persist();
}

/* P2-2 近 n 日完成天数 */

function rateDays(log, n){
  if(!log) return 0;
  let c=0; const d=new Date();
  for(let i=0;i<n;i++){ if(log[d.toISOString().slice(0,10)]) c++; d.setDate(d.getDate()-1); }
  return c;
}
/* P2-2 历史最长连击 */

function bestStreak(log){
  if(!log) return 0;
  const keys=Object.keys(log).filter(k=>log[k]).sort();
  if(!keys.length) return 0;
  let best=1, cur=1;
  for(let i=1;i<keys.length;i++){
    const gap=Math.round((new Date(keys[i]+"T00:00:00") - new Date(keys[i-1]+"T00:00:00"))/86400000);
    cur = gap===1 ? cur+1 : 1;
    if(cur>best) best=cur;
  }
  return best;
}
/* P2-2 打卡计数（兼容旧的 true/false 记录） */

function logCount(log, ds){ return log && log[ds] ? (+log[ds]||1) : 0; }
