/* ============================================================
   SVG 图表助手：环形、趋势线、堆叠条、环形构成、热力图、迷你曲线。
   全部返回可直接 innerHTML 的 SVG 字符串，无第三方图表库。
   ============================================================ */

function ringSVG(pct, color){
  const r=25, c=2*Math.PI*r, off=c*(1-Math.min(100,pct)/100);
  return `<svg class="gauge" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--border)" stroke-width="5.5"/>
    <circle cx="30" cy="30" r="${r}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
}

/* ---------- HOME ---------- */

function trendSVG(series){
  const w=320, h=120, padX=10, padTop=14, padBot=18;
  const max=Math.max(...series), min=Math.min(...series);
  const rng=(max-min)||1;
  const innerW=w-2*padX, innerH=h-padTop-padBot;
  const pts=series.map((v,i)=>{
    const x=padX+innerW*i/(series.length-1);
    const y=padTop+innerH*(1-(v-min)/rng);
    return [x,y];
  });
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${padX+innerW} ${h-padBot} L ${padX} ${h-padBot} Z`;
  const dots=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--surface-card)" stroke="var(--module-2)" stroke-width="2"/>`).join('');
  return `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--module-2)" stop-opacity=".22"/><stop offset="1" stop-color="var(--module-2)" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#tg)"/><path d="${line}" fill="none" stroke="var(--module-2)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

/* ---------- donut chart (支出占比) ---------- */

function donutSVG(segs){
  const total=segs.reduce((s,x)=>s+x.amount,0)||1;
  const r=42, c=2*Math.PI*r; let acc=0; const out=[];
  segs.forEach(s=>{
    const len=(s.amount/total)*c;
    out.push(`<circle cx="52" cy="52" r="${r}" fill="none" stroke="${s.color}" stroke-width="14"
      stroke-dasharray="${len.toFixed(2)} ${(c-len).toFixed(2)}" stroke-dashoffset="${(c-acc).toFixed(2)}" transform="rotate(-90 52 52)"/>`);
    acc+=len;
  });
  return `<svg viewBox="0 0 104 104" width="104" height="104">${out.join("")}</svg>`;
}

/* ---------- calendar grid (打卡月视图) ---------- */

function trendChartSVG(months){
  const W=320,H=180, pl=12,pr=12,pt=14,pb=24;
  const plotW=W-pl-pr, plotH=H-pt-pb;
  const m=months.length; if(!m) return "";
  const maxV=Math.max(1, ...months.map(x=>Math.max(x.inc,x.exp)));
  const band=plotW/m, bw=Math.min(13, band*0.32);
  const bals=months.map(x=>x.bal);
  let bmin=Math.min(...bals), bmax=Math.max(...bals);
  if(bmin===bmax){ bmin-=1; bmax+=1; }
  const yB = v => (pt+plotH) - ((v-bmin)/(bmax-bmin))*(plotH-14) - 7;
  let bars="", line="";
  months.forEach((x,i)=>{
    const cx = pl + band*i + band/2;
    const hi=(x.inc/maxV)*plotH, he=(x.exp/maxV)*plotH;
    bars+=`<rect x="${(cx-bw-1).toFixed(1)}" y="${(pt+plotH-hi).toFixed(1)}" width="${bw}" height="${hi.toFixed(1)}" rx="2" fill="var(--module-1)"/>`;
    bars+=`<rect x="${(cx+1).toFixed(1)}" y="${(pt+plotH-he).toFixed(1)}" width="${bw}" height="${he.toFixed(1)}" rx="2" fill="var(--danger)"/>`;
    line += (i?"L":"M")+(cx).toFixed(1)+" "+yB(x.bal).toFixed(1)+" ";
    if(m<=8 || i===0 || i===m-1 || i%2===0) bars+=`<text x="${cx.toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">${shortMonth(x.mk)}</text>`;
  });
  const base=`<line x1="${pl}" y1="${pt+plotH}" x2="${W-pr}" y2="${pt+plotH}" stroke="var(--border)" stroke-width="0.5"/>`;
  const pline=`<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${base}${bars}${pline}</svg>`;
}
/* 横向条形排行 */

function hbarSVG(rows){
  if(!rows||!rows.length) return `<div class="chart-empty">暂无数据</div>`;
  const max=Math.max(1,...rows.map(r=>r.value));
  return `<div class="rank-list">`+rows.map(r=>`<div class="rank-row"><span class="rank-name">${esc(r.label)}</span>
    <div class="pbar"><i style="width:${Math.min(100,r.value/max*100).toFixed(1)}%;background:${r.color}"></i></div>
    <span class="rank-val">${r.pct!=null?r.pct+"% · ":""}¥${r.value}</span></div>`).join("")+`</div>`;
}
/* GitHub 风格热力方格（近 weeks 周） */

function heatmapSVG(log, weeks){
  weeks=weeks||12; const cell=12, gap=4, pad=2;
  const total=weeks*7; const todayI=toDate(today());
  let cells="";
  for(let c=0;c<weeks;c++) for(let r=0;r<7;r++){
    const idx=c*7+r; const d=new Date(todayI); d.setDate(d.getDate()-(total-1-idx));
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const on=!!(log&&log[ds]);
    const x=pad+c*(cell+gap), y=pad+r*(cell+gap);
    cells+=`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${on?'var(--module-1)':'var(--surface-nested)'}"/>`;
  }
  const W=pad*2+weeks*(cell+gap)-gap, H=pad*2+7*(cell+gap)-gap;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block">${cells}</svg>`;
}

function sparkSVG(vals){
  if(!vals||vals.length<2) return "";
  const W=120,H=32, max=Math.max(...vals,1), min=Math.min(...vals,0), rng=(max-min)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*W).toFixed(1)},${(H-4-((v-min)/rng)*(H-8)).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:32px;display:block"><polyline points="${pts}" fill="none" stroke="var(--module-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function pomoRing(pct){
  const R=15, C=2*Math.PI*R, p=Math.max(0,Math.min(1,pct));
  return `<svg viewBox="0 0 34 34" width="34" height="34"><circle cx="17" cy="17" r="${R}" fill="none" stroke="var(--border)" stroke-width="3"/>`
    + `<circle cx="17" cy="17" r="${R}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" `
    + `stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-p)).toFixed(1)}" transform="rotate(-90 17 17)"/></svg>`;
}
