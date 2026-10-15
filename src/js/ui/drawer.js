/* ============================================================
   侧边抽屉：模块导航、数据与设置入口。
   ============================================================ */

function buildDrawer(){
  $("#drawerName").textContent=CONFIG.owner;
  $("#drawerSlogan").textContent=CONFIG.slogan;
  const items=[`<div class="ditem" data-go="home" role="button" tabindex="0">${icon("home",20)}首页</div>`]
    .concat(CONFIG.modules.map(m=>`<div class="ditem" data-go="${m.key}" role="button" tabindex="0">${icon(m.icon,20)}${m.name}</div>`))
    .concat([`<div class="ditem" data-go="insight" role="button" tabindex="0">${icon("chart",20)}洞察</div>`]);
  $("#drawerList").innerHTML=items.join("");
  $("#drawerList").querySelectorAll("[data-go]").forEach(el=>el.onclick=()=>go(el.dataset.go));

  // 数据工具：导出 / 导入 / 帮助
  $("#drawerTools").setAttribute("role", "group");
  $("#drawerTools").setAttribute("aria-label", "数据与设置");
  $("#drawerTools").innerHTML = [
    `<div class="ditem" data-tool="data">${icon("database",20)}存储与安全<span class="dstate">${storageKB()} KB</span></div>`,
    `<div class="ditem" data-tool="export">${icon("download",20)}导出数据</div>`,
    `<div class="ditem" data-tool="import">${icon("upload",20)}导入数据</div>`,
    `<div class="ditem" data-tool="cloud">${icon("cloud",20)}云端同步<span class="dstate">${cloudUser?esc(cloudUser):(CLOUD.on?"未登录":"不可用")}</span></div>`,
    `<div class="ditem" data-tool="rollover">${icon("repeat",20)}每日自动结转<span class="dstate">${data.__todoRollover===false?"已关闭":"已开启"}</span></div>`,
    `<div class="ditem" data-tool="theme">${icon("moon",20)}主题与外观<span class="dstate">${THEME_LABEL[themePref()]} · ${SKIN_LABEL[skinPref()]} · 字号${FS_LABEL[fsPref()]}</span></div>`,
    `<div class="ditem" data-tool="trash">${icon("trash",20)}回收站<span class="dstate">${(Array.isArray(data.__trash)?data.__trash.length:0) || ""}</span></div>`,
    `<div class="ditem" data-tool="help">${icon("book",20)}玩法 / 帮助</div>`,
  ].join("");
  $("#drawerTools").querySelectorAll("[data-tool]").forEach(el=>{
    el.onclick = () => {
      const t = el.dataset.tool;
      closeDrawer();
      setTimeout(() => {
        if(t==="data") openDataPanel();
        else if(t==="export") openExportPanel();
        else if(t==="import") $("#importInput").click();
        else if(t==="cloud") openCloudPanel();
        else if(t==="rollover"){
          const cur=(data.__todoRollover!==false);
          data.__todoRollover=!cur; store.save(); buildDrawer();
          toast(data.__todoRollover?"已开启：未完成任务次日自动顺延":"已关闭每日自动结转");
        }
        else if(t==="trash") openTrash();
        else if(t==="theme") openThemePanel();
        else if(t==="help") showOnboarding();
      }, 180);
    };
  });
  // P3-6 数据工具条目在 innerHTML 之后补语义（必须放在这里，否则会盖到上一批旧节点上）
  $("#drawerTools").querySelectorAll(".ditem").forEach(el=>{
    el.setAttribute("role","button");
    el.setAttribute("tabindex","0");
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g," ").trim());
  });
}
function openDrawer(){
  $("#drawerList").querySelectorAll(".ditem").forEach(el=>el.classList.toggle("active", el.dataset.go===view));
  $("#drawer").classList.add("show"); $("#scrim").classList.add("show");
}
function closeDrawer(){ $("#drawer").classList.remove("show"); $("#scrim").classList.remove("show"); }
