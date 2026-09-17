/* ============================================================
   设置面板：存储与安全（空间占用 / 快照 / 回滚）、按模块导出。
   ============================================================ */

function openDataPanel(){
  const cap = capInfo();
  const sizes = moduleSizes();
  const maxKB = Math.max(1, ...sizes.map(x=>x.kb));
  const sizeRows = sizes.map(x=>`<div class="size-row"><span class="sname">${esc(x.name)}</span>
      <span class="sbar"><i style="width:${Math.max(3, Math.round(x.kb/maxKB*100))}%"></i></span>
      <span class="skb">${x.kb} KB</span></div>`).join("");
  const snaps = snapshotList();
  const snapRows = snaps.length
    ? snaps.slice().reverse().map((x,k)=>{
        const idx = snaps.length - 1 - k;
        return `<div class="snap-row"><div><div class="sday">${esc(x.day)}</div>
          <div class="smeta">${esc(String(x.at||"").slice(11,16))} 存 · ${x.kb} KB${x.lean?" · 不含图片":""}</div></div>
          <button class="mini-act sact" data-snap="${idx}">回滚</button></div>`;
      }).join("")
    : `<div class="chart-empty">还没有快照，明天打开时会自动存一份</div>`;

  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>存储与安全</h2>
    <div class="sub">数据只存在本机浏览器，换设备或清缓存会丢。快照每天自动存一份，最多保留 ${SNAP_MAX} 份。</div>
    <div class="cap-top"><b>${cap.kb}</b><span>KB 已用 · 约占上限 ${cap.pct}%</span></div>
    <div class="cap-bar"><i class="${cap.level}" style="width:${Math.max(2, cap.pct)}%"></i></div>
    <div class="cap-note">${cap.level === "ok"
      ? "空间充足，放心记录。"
      : "已接近浏览器上限，建议先「导出备份」，再清理旧图片或回收站。"}</div>
    <div class="snap-sec"><h3>空间占用</h3>${sizeRows}</div>
    <div class="snap-sec"><h3>每日快照</h3>${snapRows}</div>
    <div class="modal-actions">
      ${snaps.length > 1 ? `<button class="link-danger" id="dpClear">清空快照</button>` : ""}
      <button class="btn ghost" id="dpSnap">立即快照</button>
      <button class="btn" id="dpExport">导出备份</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = e => { if(e.target === overlay) close(); };
  overlay.querySelector("#dpSnap").onclick = () => {
    const r = pushSnapshot(isoToday() + " 手动", true);
    store.save();
    toast(r ? `已存快照（${r.kb} KB${r.lean?"，不含图片":""}）` : "快照失败：本机空间可能已满", r ? "info" : "error");
    close(); openDataPanel();
  };
  overlay.querySelector("#dpExport").onclick = () => {
    close();
    exportData(null, true);
  };
  overlay.querySelectorAll("[data-snap]").forEach(b=>b.onclick = () => { close(); restoreSnapshot(+b.dataset.snap); });
  const cl = overlay.querySelector("#dpClear");
  if(cl) cl.onclick = async () => {
    close();
    const ok = await confirmBox({ title:"清空快照", sub:"清空后这些回滚点将不可恢复，确定吗？", okText:"清空", okClass:"btn danger" });
    if(!ok) return;
    data.__snapshots = []; store.save();
    toast("快照已清空");
  };
}

function openExportPanel(){
  const mods = CONFIG.modules;
  const sel = new Set(mods.map(m=>m.key));
  let withMeta = true;
  const overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grab"></div><h2>导出数据</h2>
    <div class="sub">勾选要备份的模块。导入时只覆盖导出的模块，其余不受影响。</div>
    <div class="seg" id="epQuick"><div class="opt on" data-q="all">全选</div><div class="opt" data-q="none">全不选</div></div>
    <div class="snap-sec" id="epList"></div>
    <div class="modal-actions"><button class="btn ghost" id="epCancel">取消</button>
      <button class="btn" id="epGo">导出</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  const paint = () => {
    overlay.querySelector("#epList").innerHTML = mods.map(m=>{
      const n = (data[m.key]||[]).length;
      return `<div class="chk-line ${sel.has(m.key)?"on":""}" data-k="${m.key}">
        <span class="cbox">${icon("check",12)}</span>${esc(m.name)}<span class="cnum">${n} 条</span></div>`;
    }).join("")
      + `<div class="chk-line ${withMeta?"on":""}" id="epMeta"><span class="cbox">${icon("check",12)}</span>包含外观与设置<span class="cnum">主题 · 分类 · 模板</span></div>`;
    overlay.querySelectorAll("#epList .chk-line").forEach(el=>el.onclick = () => {
      if(el.id === "epMeta"){ withMeta = !withMeta; paint(); return; }
      const k = el.dataset.k;
      if(sel.has(k)) sel.delete(k); else sel.add(k);
      paint();
    });
  };
  overlay.querySelectorAll("#epQuick .opt").forEach(o=>o.onclick = () => {
    overlay.querySelectorAll("#epQuick .opt").forEach(x=>x.classList.remove("on"));
    o.classList.add("on");
    sel.clear();
    if(o.dataset.q === "all") mods.forEach(m=>sel.add(m.key));
    paint();
  });
  overlay.onclick = e => { if(e.target === overlay) close(); };
  overlay.querySelector("#epCancel").onclick = close;
  overlay.querySelector("#epGo").onclick = () => {
    const keys = mods.map(m=>m.key).filter(k=>sel.has(k));
    if(!keys.length){ toast("至少选择一个模块", "error"); return; }
    close();
    exportData(keys, withMeta);
  };
  paint();
}
