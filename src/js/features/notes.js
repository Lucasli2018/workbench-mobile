/* ============================================================
   笔记模块：Markdown-lite 渲染、图片压缩（长边 ≤ 800px）、标签筛选条。
   ============================================================ */

function mdLite(src){
  let t = esc(String(src ?? ""));
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const lines = t.split("\n");
  let html = "", inList = false;
  lines.forEach(ln=>{
    const li = ln.match(/^\s*[-*+]\s+(.*)$/);
    if(li){
      if(!inList){ html += '<ul class="md-ul">'; inList = true; }
      html += '<li>' + li[1] + '</li>';
      return;
    }
    if(inList){ html += '</ul>'; inList = false; }
    const h = ln.match(/^(#{1,3})\s+(.*)$/);
    if(h){ html += '<div class="md-h">' + h[2] + '</div>'; return; }
    html += (ln ? ln + '<br>' : '<br>');
  });
  if(inList) html += '</ul>';
  return html.replace(/(<br>)+$/, "");
}
/* 图片压缩：长边缩到 maxSide，输出 JPEG dataURL */

function compressImage(file, maxSide, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        try{
          let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          const sc = Math.min(1, (maxSide||800) / Math.max(w,h));
          w = Math.max(1, Math.round(w*sc)); h = Math.max(1, Math.round(h*sc));
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,w,h);
          ctx.drawImage(img, 0, 0, w, h);
          let out = cv.toDataURL("image/jpeg", quality||0.78);
          if(out.length > 900*1024) out = cv.toDataURL("image/jpeg", 0.5);
          resolve(out);
        }catch(err){ reject(err); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
/* 本机占用估算（KB） */

function renderTagBar(key){
  const it = data[key]||[];
  const all = [...new Set(it.flatMap(x=>x.tags||[]))].sort();
  if(!all.length) return "";
  const chips = [`<button class="fchip ${noteTag==="all"?'on':''}" data-tagnav="all">全部</button>`]
    .concat(all.map(t=>`<button class="fchip ${noteTag===t?'on':''}" data-tagnav="${attr(t)}">#${esc(t)}</button>`));
  return `<div class="filterbar"><div class="frow">${chips.join("")}</div></div>`;
}
