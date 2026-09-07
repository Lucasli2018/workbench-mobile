Page({
  data: {
    greeting: "早上好",
    quote: "时间像骨头，啃一口少一口，珍惜每一口。",
    overview: [
      { label: "今日任务", pct: 68, sub: "3/5 项", color: "#2563eb" },
      { label: "签到", pct: 100, sub: "3/3 项", color: "#10b981" },
      { label: "阅读", pct: 45, sub: "2 项", color: "#3b82f6" },
      { label: "运动", pct: 30, sub: "1 项", color: "#f59e0b" }
    ],
    pinned: [
      { id: 101, title: "完成核心工作 30min 专注", meta: "今日任务 · 紧急", color: "#2563eb", done: false },
      { id: 201, title: "喝够 8 杯水", meta: "每日签到 · 连续 5 天", color: "#10b981", done: true },
    ],
    quickAdd: [
      { label: "记运动", module: "sport", tint: "#fef3c7" },
      { label: "记签到", module: "checkin", tint: "#d1fae5" },
      { label: "记一笔", module: "money", tint: "#fee2e2" },
      { label: "记灵感", module: "note", tint: "#ede9fe" },
    ]
  },
  onLoad() {
    const hour = new Date().getHours();
    this.setData({
      greeting: hour < 5 ? "夜深了" : hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好"
    });
  },
  quickTap(e) {
    const mod = e.currentTarget.dataset.module;
    wx.navigateTo({ url: `/pages/module/module?type=${mod}` });
  },
  togglePin(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.pinned;
    const item = list.find(i => i.id == id);
    if (item) {
      item.done = !item.done;
      this.setData({ pinned: list });
    }
  }
});
