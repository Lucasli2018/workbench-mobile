Page({
  data: {
    bars: [
      { name: "今日任务", pct: 68, color: "#2563eb" },
      { name: "每日签到", pct: 100, color: "#10b981" },
      { name: "阅读进度", pct: 56, color: "#3b82f6" },
      { name: "运动打卡", pct: 30, color: "#f59e0b" },
      { name: "灵感时光机", pct: 80, color: "#8b5cf6" },
      { name: "能量账本", pct: 42, color: "#ef4444" }
    ],
    insightTip: "记录 → 执行 → 统计 → 反馈，形成闭环。"
  },
  onLoad() { console.log("洞察页面加载"); }
});
