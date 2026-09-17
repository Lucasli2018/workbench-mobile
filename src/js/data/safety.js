/* ============================================================
   数据安全：每日快照（最多 7 份）、一键回滚、容量监控与告警。
   回滚前会自动再存一份当前状态，所以回滚本身也可回滚。
   ============================================================ */

const SNAP_MAX = 7;             // 最多保留 7 份每日快照
const SNAP_BUDGET_KB = 1200;    // 快照总体积预算（超出则丢弃最旧的）
const SNAP_LEAN_KB = 500;       // 单份超过该体积时降级为「不含图片」快照
const CAP_KB = 5000;            // 浏览器 localStorage 常见上限的量级估算（约 5M 字符）
const META_KEYS = ["__trend","__avatar","__theme","__skin","__categories","__budgets",
  "__moneyTpl","__todoRollover","__todoArchive","__trash","__onboarded","__a2hsHidden"];

function snapshotList(){ return Array.isArray(data.__snapshots) ? data.__snapshots : []; }
function snapCore(){
  let core;
  try{ core = JSON.parse(JSON.stringify(data)); }catch(e){ return null; }
  delete core.__snapshots;                 // 快照不嵌套快照
  return core;
}

function snapStripMedia(core){
  // 图片/头像是体积大头，超预算时先丢媒体、保留全部文字记录
  delete core.__avatar;
  ["note","hot"].forEach(k=>{
    if(!Array.isArray(core[k])) return;
    core[k].forEach(x=>{ if(x && x.img){ delete x.img; x.__imgDropped = true; } });
  });
}

function pushSnapshot(day, force){
  if(!force && capInfo().level === "danger") return null;   // 空间已经很紧，自动快照让位给用户数据
  const core = snapCore();
  if(!core) return null;
  let json = "";
  try{ json = JSON.stringify(core); }catch(e){ return null; }
  let lean = false, kb = Math.round(json.length/1024);
  if(kb > SNAP_LEAN_KB){
    snapStripMedia(core);
    try{ json = JSON.stringify(core); }catch(e){ return null; }
    lean = true; kb = Math.round(json.length/1024);
  }
  const list = snapshotList().slice();
  list.push({ day: day, at: new Date().toISOString(), kb: kb, lean: lean, json: json });
  while(list.length > SNAP_MAX) list.shift();
  const totalKB = () => list.reduce((n,x)=> n + ((x && x.json ? x.json.length : 0)/1024), 0);
  while(list.length > 2 && totalKB() > SNAP_BUDGET_KB) list.shift();
  data.__snapshots = list;
  return list[list.length-1];
}

function ensureSnapshot(){
  const day = isoToday();
  const list = snapshotList();
  const last = list[list.length-1];
  if(last && last.day === day) return false;   // 今天已经存过
  return !!pushSnapshot(day);
}

async function restoreSnapshot(i){
  const list = snapshotList();
  const snap = list[i];
  if(!snap) return;
  let restored;
  try{ restored = JSON.parse(snap.json); }catch(e){ toast("这份快照已损坏，无法回滚", "error"); return; }
  const ok = await confirmBox({
    title: "回滚到该快照",
    sub: `将把数据恢复到 <b>${esc(snap.day)}</b> 的状态（约 ${snap.kb} KB${snap.lean?"，不含图片":""}）。
          回滚前会自动为当前状态存一份快照，可以再回滚回来。`,
    okText: "确认回滚",
    okClass: "btn danger",
  });
  if(!ok) return;
  pushSnapshot("回滚前", true);
  const keep = snapshotList();       // 保留历史列表（含刚才那份「回滚前」，回滚可再次回滚）
  data = restored;
  data.__snapshots = keep;
  try{ store.save(); }catch(e){ toast("本机空间不足，回滚可能未完全保存", "error"); }
  toast("已回滚，正在刷新…");
  setTimeout(() => location.reload(), 800);
}

function capInfo(){
  const kb = storageKB();
  const pct = Math.min(100, Math.round(kb / CAP_KB * 100));
  const level = pct >= 90 ? "danger" : pct >= 75 ? "warn" : "ok";
  return { kb: kb, cap: CAP_KB, pct: pct, level: level };
}

function moduleSizes(){
  const out = CONFIG.modules.map(m=>{
    let n = 0;
    try{ n = JSON.stringify(data[m.key] || []).length; }catch(e){}
    return { name: m.name, kb: Math.round(n/1024), n: (data[m.key]||[]).length };
  });
  let meta = 0;
  try{ meta = JSON.stringify(data.__snapshots || []).length + JSON.stringify(data.__trash || []).length; }catch(e){}
  let av = 0;
  try{ av = (data.__avatar || "").length; }catch(e){}
  out.push({ name: "回收站与快照", kb: Math.round(meta/1024), n: snapshotList().length });
  if(av > 512) out.push({ name: "头像", kb: Math.round(av/1024), n: 0 });
  return out.sort((a,b)=> b.kb - a.kb);
}

function capWarnOnce(){
  const c = capInfo();
  if(c.level === "ok") return;
  const day = isoToday();
  if(data.__capWarnDay === day) return;
  data.__capWarnDay = day;
  store.save();
  toast(`本机存储已用 ${c.kb} KB（约 ${c.pct}%），建议导出备份并清理旧图片`, "error");
}
