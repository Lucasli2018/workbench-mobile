/* ============================================================
   通用小工具：DOM 选择器、模块查找、转义、金额格式化、容量估算、触感反馈。
   ============================================================ */

const $ = s => document.querySelector(s);

const modOf = k => CONFIG.modules.find(m=>m.key===k);

function avgProgress(list){
  if(!list||!list.length) return { value: 0, sub: "0" };
  const v = Math.round(list.reduce((s,x)=>s+Math.min(100,(x.current/x.target)*100||0),0)/list.length);
  return { value: v, sub: `${list.length} 项` };
}

function fmtMoney(v){ return "¥"+(Math.round((v||0)*100)/100); }

function storageKB(){
  // localStorage 按「字符数」估算容量（约 5M 字符量级），头像已包含在 data 内，不重复计算
  try{ return Math.round((localStorage.getItem(CONFIG.storageKey)||"").length/1024); }
  catch(e){ return 0; }
}
/* 标签云筛选条 */

function bump(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }


function esc(s){ return String(s??"").replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function attr(s){ return esc(s).replace(/"/g,'&quot;'); }
