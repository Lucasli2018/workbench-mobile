/* ============================================================
   CONFIG 是唯一需要定制的地方：品牌、每日一句、概览规则、快速记录、模块定义。
   ICONS 为内联单色线性图标库（Lucide 规范），不依赖图标字体或网络。
   ============================================================ */

const CONFIG = {
  storageKey: "workbench-doggy-v1",   // 换 key 可强制重置
  owner: "汪汪时间管理局",              // 抽屉顶部标题
  slogan: "Daily Doggy Dispatch · 今日狗狗日程报",
  brand: "🐕",                         // 抽屉左上角字符标（品牌缩写）

  // 每日一句（一周七天各一句，按星期轮换：周一→周日）
  quotes: [
    "新的一周，汪汪队长已就位，出发！",           // 周一
    "时间像骨头，啃一口少一口，珍惜每一口。",     // 周二
    "把大目标拆成小骨头，今天啃一块就好。",       // 周三
    "坚持到一半最难，但摇着尾巴也要继续。",       // 周四
    "收个尾，把这周的骨头都归置好。",             // 周五
    "允许自己打个盹，好好休息也是任务。",         // 周六
    "复盘一下，给下周的时间旅行定个航向。",       // 周日
  ],

  // 今日概览环形（value 为 0-100 的完成度，calc 返回 {value, sub}）
  overview: [
    { key: "todo",  label: "今日任务", icon: "list", color: "var(--accent)",
      calc: d => { const it=d.todo||[]; const done=it.filter(x=>x.done).length; return { value: it.length?Math.round(done/it.length*100):0, sub: `${done}/${it.length} 项` }; } },
    { key: "checkin", label: "签到", icon: "leaf", color: "var(--module-1)",
      calc: d => { const it=d.checkin||[]; const t=today(); const done=it.filter(x=>x.log&&x.log[t]).length; return { value: it.length?Math.round(done/it.length*100):0, sub: `${done}/${it.length} 项` }; } },
    { key: "read", label: "阅读", icon: "book", color: "var(--module-2)",
      calc: d => avgProgress(d.read) },
    { key: "sport", label: "运动", icon: "activity", color: "var(--module-3)",
      calc: d => avgProgress(d.sport) },
  ],

  // 本周状态趋势（真实数据：读取用户填写的 __trend，7 个数字；没有就留空）
  trend: {
    title: "本周状态趋势", unit: "分",
    series: d => (Array.isArray(d.__trend) && d.__trend.length===7) ? d.__trend : [],
  },

  // 快速记录按钮（点了直接给对应模块新建）
  quickAdd: [
    { label: "记运动", icon: "activity", module: "sport",   tint: "#fef3c7", color: "var(--module-3)" },
    { label: "记签到", icon: "check",    module: "checkin", tint: "#d1fae5", color: "var(--module-1)" },
    { label: "记一笔", icon: "wallet",   module: "money",   tint: "#fee2e2", color: "var(--module-4)" },
    { label: "记灵感", icon: "pen",      module: "note",    tint: "#ede9fe", color: "var(--module-5)" },
  ],

  // ============ 模块定义 ============
  modules: [
    {
      key: "todo", name: "今日任务", icon: "list", tint: "#dbeafe", color: "var(--accent)",
      type: "todo", desc: "时间管理局派发的今日作战清单",
      priorities: [
        { key: "P0", label: "紧急", color: "#fee2e2", text: "#ef4444" },
        { key: "P1", label: "重要", color: "#fef3c7", text: "#d97706" },
        { key: "P2", label: "随手", color: "#d1fae5", text: "#059669" },
      ],
      seed: [
        { id: 11, title: "完成核心工作 30min 专注", priority: "P0", done: false, note: "像啃骨头一样，一口一口来" },
        { id: 12, title: "发布 1 条内容 / 笔记", priority: "P1", done: false, note: "" },
        { id: 13, title: "整理今日时间线纪要", priority: "P2", done: true, note: "" },
      ],
    },
    {
      key: "checkin", name: "每日签到", icon: "leaf", tint: "#d1fae5", color: "var(--module-1)",
      type: "checkin", desc: "喝水·早睡·补品等每日打卡",
      seed: [
        { id: 21, title: "喝够 8 杯水", log: {}, goal: 8, unit: "杯" },
        { id: 22, title: "23:30 前睡觉", log: {}, goal: 1, unit: "次" },
        { id: 23, title: "维生素 / 补品", log: {}, goal: 1, unit: "次" },
      ],
    },
    {
      key: "read", name: "阅读进度", icon: "book", tint: "#dbeafe", color: "var(--module-2)",
      type: "progress", unit: "页", desc: "知识能量站 · 书籍进度与想法",
      seed: [
        { id: 31, title: "《认知觉醒》", current: 168, target: 300, unit: "页", note: "第 7 章：习惯的复利" },
        { id: 32, title: "《原子习惯》", current: 90, target: 260, unit: "页", note: "" },
      ],
    },
    {
      key: "sport", name: "运动打卡", icon: "activity", tint: "#fef3c7", color: "var(--module-3)",
      type: "progress", unit: "分钟", desc: "活力运动舱 · 跑步·力量·拉伸",
      seed: [
        { id: 41, title: "力量训练", current: 12, target: 20, unit: "分钟", note: "20 分钟核心", period: "total" },
        { id: 42, title: "每周跑步", current: 30, target: 120, unit: "分钟", note: "每周累计 120 分钟", period: "week", log: {} },
      ],
    },
    {
      key: "money", name: "能量账本", icon: "wallet", tint: "#fee2e2", color: "var(--module-4)",
      type: "finance", desc: "时间管理局的能量收支 · 收入·支出·占比",
      categories: ["餐饮", "交通", "购物", "居家", "娱乐", "工资", "其他"],
      seed: [
        { id: 51, title: "午餐", type: "expense", amount: 32, category: "餐饮", date: isoToday() },
        { id: 52, title: "地铁", type: "expense", amount: 6, category: "交通", date: isoToday() },
        { id: 53, title: "稿费", type: "income", amount: 400, category: "工资", date: isoToday() },
      ],
    },
    {
      key: "note", name: "灵感时光机", icon: "pen", tint: "#ede9fe", color: "var(--module-5)",
      type: "note", desc: "把闪念装进时光胶囊 · 文字·摘录·心情",
      moods: ["开心", "平静", "低落", "焦虑", "疲惫"],
      seed: [
        { id: 61, title: "今天的小确幸", content: "阳台的多肉冒出了新芽，顺手拍了张照片。\n\n**记一笔**：情绪好的时候，效率会自己找上门。", mood: "开心", date: isoToday(), tags: ["生活", "心情"] },
      ],
    },
    {
      key: "hot", name: "时光收藏夹", icon: "flame", tint: "#fee2e2", color: "var(--danger)",
      type: "note", desc: "热点内容·收藏·稍后阅读",
      moods: ["收藏", "稍后读", "已读"],
      seed: [
        { id: 71, title: "AI 提示词技巧合集", content: "- 角色 + 目标 + 约束三段式\n- 先给例子再提要求\n- 输出格式写死", mood: "收藏", date: isoToday(), tags: ["AI", "方法论"] },
      ],
    },
  ],
};

const ICONS = {
  home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10.5V19h12v-8.5"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4"/><path d="M12 16v-7"/><path d="M16 16v-2"/>',
  user:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  menu:'<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  calendar:'<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9.5h16"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  list:'<path d="M8.5 6h11"/><path d="M8.5 12h11"/><path d="M8.5 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  leaf:'<path d="M20 4C10 4 4 9 4 17c0 1 .1 2 .5 3 5.5-9 9-9.5 15.5-16z"/><path d="M4.5 20c3-6 7-9.5 13-11.5"/>',
  book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z"/><path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19v4H7.5A2.5 2.5 0 0 1 5 19.5z"/>',
  activity:'<path d="M3 12h4l2.5 6L14 5l2.5 7H21"/>',
  wallet:'<path d="M4 8a2 2 0 0 1 2-2h11a1.5 1.5 0 0 1 1.5 1.5V8"/><rect x="3.5" y="7.5" width="17" height="11.5" rx="2.5"/><circle cx="16.5" cy="13.2" r="1.3"/>',
  pen:'<path d="M4 20l1.2-4L16 5.2l2.8 2.8L8 19z"/><path d="M14.2 7l2.8 2.8"/>',
  camera:'<path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z"/><circle cx="12" cy="13" r="3.2"/>',
  flame:'<path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.6 2.6-4.6C9 10.4 10.4 6.2 12 3z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  star:'<path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z"/>',
  bolt:'<path d="M13 3 5 13h5l-1 8 8-11h-5z"/>',
  quote:'<path d="M9.5 7C7.6 7.9 6.5 9.6 6.5 12v5h5v-6H8.5c0-1.7.7-2.7 2.2-3.4zM19 7c-1.9.9-3 2.6-3 5v5h5v-6h-3c0-1.7.7-2.7 2.2-3.4z"/>',
  chevron:'<path d="M9 5l7 7-7 7"/>',
  check:'<path d="M5 12.5 10 17 19 7"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  download:'<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  upload:'<path d="M12 16V5"/><path d="M8 8l4-4 4 4"/><path d="M5 19h14"/>',
  cloud:'<path d="M7 18a4 4 0 0 1 .5-7.96 5 5 0 0 1 9.6-1.04A3.5 3.5 0 0 1 17.5 18z"/>',
  database:'<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  sync:'<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 21v-5h-5"/>',
  grip:'<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4V12l3.2 1.9"/>',
  play:'<path d="M7.5 4.8 19 12 7.5 19.2z"/>',
  pause:'<path d="M9.2 5v14"/><path d="M14.8 5v14"/>',
  archive:'<rect x="3.5" y="4.6" width="17" height="4.2" rx="1.4"/><path d="M5.6 8.8V19h12.8V8.8"/><path d="M10 12.6h4"/>',
};
function icon(name, size=22, sw=1.7){
  const path = ICONS[name] || ICONS.grid;
  // P3-6 图标是纯装饰，读屏一律跳过；语义由外层元素的 aria-label / 文本提供
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}
