/* ============================================================
   导入导出：按模块勾选备份、v1 → v2 迁移、覆盖前二次确认。
   ============================================================ */

const EXPORT_APP = "workbench-mobile";
const EXPORT_VERSION = 2;   // v2：新增按模块导出 / 设置字段随备份 / 导入迁移


const IMPORT_MIGRATIONS = {
  // v1 → v2：打卡布尔值归一为数值计数；补齐分类 / 预算 / 模板 / 回收站等新字段
  1: d => {
    CONFIG.modules.forEach(m=>{
      if(!Array.isArray(d[m.key])) return;
      d[m.key].forEach(x=>{
        if(!x || typeof x !== "object") return;
        if(x.log && typeof x.log === "object"){
          Object.keys(x.log).forEach(k=>{
            if(x.log[k] === true) x.log[k] = 1;
            else if(x.log[k] === false) delete x.log[k];
          });
        }
        if(m.type === "progress" && x.period === undefined) x.period = null;
        if(m.type === "note" && !Array.isArray(x.tags)) x.tags = [];
      });
      if(m.type === "finance") d.__categories = d.__categories || m.categories.slice();
    });
    d.__moneyTpl = d.__moneyTpl || [];
    d.__budgets  = d.__budgets  || {};
    d.__trash    = d.__trash    || [];
    return "打卡布尔值转为数值、补齐分类与预算等字段";
  },
};
function migrateIncoming(obj, fromVersion){
  const notes = [];
  let v = Math.max(1, Number(fromVersion) || 1);
  while(v < EXPORT_VERSION){
    const fn = IMPORT_MIGRATIONS[v];
    if(fn){ const n = fn(obj); if(n) notes.push(`v${v}→v${v+1}：${n}`); }
    v++;
  }
  return notes;
}

function exportData(keys, withMeta){
  if(!data || Object.keys(data).length===0){
    toast("当前没有数据可以导出", "error");
    return;
  }
  const all = CONFIG.modules.map(m=>m.key);
  const list = (Array.isArray(keys) && keys.length) ? all.filter(k=>keys.includes(k)) : all;
  const picked = {};
  list.forEach(k=>{ if(data[k] !== undefined) picked[k] = data[k]; });
  if(withMeta !== false){
    META_KEYS.forEach(k=>{ if(data[k] !== undefined) picked[k] = data[k]; });
  }
  const payload = {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    storageKey: CONFIG.storageKey,
    exportedAt: new Date().toISOString(),
    owner: CONFIG.owner,
    modules: list,
    data: picked,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ds = isoToday().replaceAll("-","");
  a.href = url;
  a.download = `workbench-backup-${ds}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`已导出 ${list.length} 个模块${withMeta === false ? "" : "（含设置）"}`);
}

$("#importInput").onchange = async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if(!f) return;
  if(f.size > 16 * 1024 * 1024){
    toast("文件过大，请确认是否为正确的备份文件", "error");
    return;
  }
  let parsed;
  try{
    parsed = JSON.parse(await f.text());
  }catch(err){
    toast("文件不是有效的 JSON，导入失败", "error");
    return;
  }
  const isBackup = !!(parsed && typeof parsed==="object" && parsed.app===EXPORT_APP && parsed.data && typeof parsed.data==="object");
  const incoming = isBackup
    ? parsed.data
    : (parsed && typeof parsed==="object" && !Array.isArray(parsed) ? parsed : null);
  if(!incoming){
    toast("未识别到可导入的数据结构", "error");
    return;
  }
  const fromV = Number(parsed && parsed.version) || 1;
  const migNotes = migrateIncoming(incoming, fromV);
  // 备份里声明的模块范围：没声明（v1 旧备份 / 裸数据）视为全量
  const partKeys = (isBackup && Array.isArray(parsed.modules) && parsed.modules.length)
    ? CONFIG.modules.map(m=>m.key).filter(k=>parsed.modules.includes(k))
    : CONFIG.modules.map(m=>m.key);
  const partial = partKeys.length < CONFIG.modules.length;
  const ok = await confirmBox({
    title: "导入数据",
    sub: (partial
        ? `将导入 <b>${partKeys.length}</b> 个模块（${partKeys.map(k=>esc((modOf(k)||{}).name||k)).join("、")}），未包含的模块保持原样。<br>`
        : `将用备份内容覆盖当前全部模块。<br>`)
      + `导入前会自动存一份快照，可以回滚。`
      + (migNotes.length ? `<br>已自动迁移：${migNotes.join("；")}` : ""),
    okText: "确认导入",
    okClass: "btn danger",
  });
  if(!ok) return;
  pushSnapshot("导入前", true);           // 保险：导入前的状态留档
  const merged = JSON.parse(JSON.stringify(data));   // 以当前数据为底，避免误删未导入的模块
  CONFIG.modules.forEach(m => {
    if(!partKeys.includes(m.key)) return;
    merged[m.key] = Array.isArray(incoming[m.key]) ? incoming[m.key] : (structuredClone(m.seed||[]));
  });
  META_KEYS.forEach(k => { if(incoming[k] !== undefined) merged[k] = incoming[k]; });
  merged.__snapshots = Array.isArray(data.__snapshots) ? data.__snapshots : [];  // 快照历史始终保留本机的
  data = merged;
  try{ store.save(); }catch(e){ toast("本机空间不足，导入可能未完整保存", "error"); }
  if(merged.__avatar) $("#brandImg").src = merged.__avatar;
  toast("导入成功，正在刷新…");
  setTimeout(() => location.reload(), 800);
};
