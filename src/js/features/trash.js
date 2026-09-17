/* ============================================================
   回收站与批量操作：软删除、撤销、批量勾选、过期清理。
   ============================================================ */

const TRASH_DAYS = 30, TRASH_MAX = 200;

function trashPush(key, item){
  data.__trash = Array.isArray(data.__trash) ? data.__trash : [];
  data.__trash.unshift({ key:key, at:new Date().toISOString(), item:JSON.parse(JSON.stringify(item)) });
  const cut = Date.now() - TRASH_DAYS*86400000;
  data.__trash = data.__trash.filter(t=>(Date.parse(t.at)||Date.now()) >= cut).slice(0, TRASH_MAX);
}

function softDelete(key, id){
  const arr = data[key] || [];
  const i = arr.findIndex(x=>x.id==id);
  if(i<0) return null;
  const item = arr[i];
  trashPush(key, item);
  arr.splice(i,1);
  return { key:key, item:item, index:i };
}

function undoDelete(rec){
  if(!rec) return;
  const t = data.__trash || [];
  const i = t.findIndex(x=>x.item && x.item.id===rec.item.id);
  if(i>=0) t.splice(i,1);
  const arr = data[rec.key] = data[rec.key] || [];
  arr.splice(Math.min(rec.index, arr.length), 0, rec.item);
  persist();
  toast("已撤销删除");
}

function restoreTrash(idx){
  const t = (data.__trash||[])[idx]; if(!t) return;
  (data[t.key] = data[t.key] || []).unshift(t.item);
  data.__trash.splice(idx,1);
  store.save(); render();
  toast("已还原「"+esc(t.item.title||"记录")+"」");
}

function purgeOldTrash(){
  const t = data.__trash;
  if(!Array.isArray(t) || !t.length) return;
  const cut = Date.now() - TRASH_DAYS*86400000;
  const kept = t.filter(x=>(Date.parse(x.at)||Date.now()) >= cut).slice(0, TRASH_MAX);
  if(kept.length !== t.length){ data.__trash = kept; store.save(); }
}

function openTrash(){
  const list = Array.isArray(data.__trash) ? data.__trash : [];
  const rows = list.length
    ? list.map((t,i)=>{
        const m = modOf(t.key);
        return `<div class="cat-row"><span class="tpl-name">${esc(t.item.title||"未命名")}</span>
          <span class="tpl-amt">${esc(m?m.name:t.key)} · ${esc(String(t.at).slice(0,10))}</span>
          <button class="mini-act" data-rst="${i}">还原</button></div>`;
      }).join("")
    : `<div class="chart-empty">回收站是空的</div>`;
  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>回收站</h2>
    <div class="sub">删除的记录会在这里保留 ${TRASH_DAYS} 天，之后自动清理。</div>${rows}
    <div class="modal-actions">${list.length?`<button class="link-danger" id="trClear">清空回收站</button>`:""}
      <button class="btn ghost" id="trClose">关闭</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = e => { if(e.target===overlay) close(); };
  overlay.querySelector("#trClose").onclick = close;
  overlay.querySelectorAll("[data-rst]").forEach(b=>b.onclick=()=>{ close(); restoreTrash(+b.dataset.rst); });
  const cl = overlay.querySelector("#trClear");
  if(cl) cl.onclick = async () => {
    close();
    const ok = await confirmBox({ title:"清空回收站", sub:"清空后这些记录将无法找回，确定吗？", okText:"清空", okClass:"btn danger" });
    if(!ok) return;
    data.__trash = []; store.save(); render();
    toast("回收站已清空");
  };
}


function batchToggle(){
  batchMode = !batchMode; batchSel.clear();
  if(!batchMode) paintBatchBar();
  render();
}

function addBatchBoxes(){
  const screen = $("#screen");
  screen.querySelectorAll(".rec[data-rid]").forEach(el=>{
    if(el.querySelector(".bsel")) return;
    const b = document.createElement("span");
    b.className = "bsel"; b.setAttribute("role","checkbox"); b.setAttribute("aria-label","选择这条记录");
    b.innerHTML = icon("check",11,3);
    b.onclick = e => {
      e.stopPropagation();
      const id = el.dataset.rid;
      if(batchSel.has(id)) batchSel.delete(id); else batchSel.add(id);
      el.classList.toggle("sel", batchSel.has(id));
      paintBatchBar();
    };
    el.appendChild(b);
    el.classList.toggle("sel", batchSel.has(el.dataset.rid));
  });
}

function paintBatchBar(){
  let bar = $("#batchBar");
  if(!batchMode){ if(bar) bar.remove(); return; }
  if(!bar){
    bar = document.createElement("div"); bar.id = "batchBar"; bar.className = "batchbar";
    document.body.appendChild(bar);
  }
  const m = modOf(view);
  bar.innerHTML = `<span class="bb-n">已选 ${batchSel.size}</span>
    <button class="mini-act" id="bAll">全选</button>
    ${(m && m.type==="todo")?`<button class="mini-act" id="bDone">标为完成</button>`:""}
    <button class="mini-act" id="bDel">删除</button>
    <button class="mini-act" id="bExit">退出</button>`;
  bar.querySelector("#bAll").onclick = () => {
    const els = [...$("#screen").querySelectorAll(".rec[data-rid]")];
    if(batchSel.size === els.length) batchSel.clear();
    else els.forEach(e=>batchSel.add(e.dataset.rid));
    els.forEach(e=>e.classList.toggle("sel", batchSel.has(e.dataset.rid)));
    paintBatchBar();
  };
  const bd = bar.querySelector("#bDone");
  if(bd) bd.onclick = () => batchMarkDone();
  bar.querySelector("#bDel").onclick = () => batchDelete();
  bar.querySelector("#bExit").onclick = () => { batchMode=false; batchSel.clear(); paintBatchBar(); render(); };
}

function batchMarkDone(){
  const key = view, arr = data[key] || [];
  let n = 0;
  arr.forEach(x=>{ if(batchSel.has(String(x.id))){ x.done = true; n++; } });
  batchMode = false; batchSel.clear(); paintBatchBar();
  toast(n ? `已标记 ${n} 项完成` : "没有选中任何记录");
  persist();
}
async function batchDelete(){
  const key = view, ids = [...batchSel];
  if(!ids.length){ toast("先选中要删除的记录","error"); return; }
  const ok = await confirmBox({
    title:"批量删除",
    sub:`将把选中的 ${ids.length} 条记录移入回收站，30 天内都可以还原。`,
    okText:"移入回收站", okClass:"btn danger",
  });
  if(!ok) return;
  let n = 0;
  ids.forEach(id=>{ if(softDelete(key, id)) n++; });
  batchMode = false; batchSel.clear(); paintBatchBar();
  toast(`已移入回收站 ${n} 条`);
  persist();
}

/* ---------- delete confirm ---------- */

function confirmDelete(key,id){
  const item=(data[key]||[]).find(i=>i.id==id); if(!item) return;
  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><div class="grab"></div><h2>删除记录</h2>
    <div class="sub">「${esc(item.title||'这条记录')}」会被移入回收站，${TRASH_DAYS} 天内可以还原。</div>
    <div class="modal-actions"><button class="btn ghost" id="c-cancel">取消</button><button class="btn danger" id="c-ok">移入回收站</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.onclick=e=>{ if(e.target===overlay) close(); };
  overlay.querySelector("#c-cancel").onclick=close;
  overlay.querySelector("#c-ok").onclick=()=>{
    bump(20);
    const removed = softDelete(key, id);
    persist(); close();
    if(removed) undoToast(`已删除「${esc(removed.item.title||"记录")}」`, ()=>undoDelete(removed));
  };
}
