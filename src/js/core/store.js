/* ============================================================
   持久化与全局状态：localStorage 读写、种子数据、全局视图状态。
   data 是唯一数据源，persist() = 保存 + 重绘。
   ============================================================ */

const store = {
  load(){
    const raw = localStorage.getItem(CONFIG.storageKey);
    if(raw){ try { return JSON.parse(raw); } catch(e){} }
    const d = {};
    CONFIG.modules.forEach(m => d[m.key] = structuredClone(m.seed||[]));
    return d;
  },
  save(){
    try{ localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); return true; }
    catch(e){
      toast("本机存储已满，这次改动没有保存成功：请先「导出备份」，再清理旧图片或回收站", "error");
      return false;
    }
  },
};

let data = store.load();
let view = "home";
let searchQuery = "";
let insightPeriod = "6m";            // 洞察页时间范围：1m/3m/6m/12m/all
let noteTag = "all";                 // P2-5 笔记标签筛选
let batchMode = false;               // P2-6 批量选择模式
const batchSel = new Set();          // P2-6 已选记录 id

  let financeFilter = { type:"all", cat:"all" };            // home | insight | <moduleKey>
function persist(){ store.save(); render(); }
