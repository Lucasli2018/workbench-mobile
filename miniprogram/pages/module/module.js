Page({
  data: { type: "note", title: "灵感时光机", desc: "把闪念装进时光胶囊", items: [] },
  onLoad(opts) {
    const types = {
      todo: { title: "今日任务", desc: "时间管理局派发的作战清单", seed: [
        { id: 11, title: "完成核心工作 30min 专注", priority: "紧急", done: false, note: "像啃骨头一样，一口一口来" },
        { id: 12, title: "发布 1 条内容 / 笔记", priority: "重要", done: false, note: "" },
        { id: 13, title: "整理今日时间线纪要", priority: "随手", done: true, note: "" }
      ]},
      checkin: { title: "每日签到", desc: "喝水·早睡·每日打卡", seed: [
        { id: 21, title: "喝够 8 杯水", done: false },
        { id: 22, title: "23:30 前睡觉", done: false },
        { id: 23, title: "维生素 / 补品", done: true }
      ]},
      read: { title: "阅读进度", desc: "知识能量站 · 书籍进度", seed: [
        { id: 31, title: "《认知觉醒》", current: 168, target: 300, unit: "页", note: "第 7 章：习惯的复利" },
        { id: 32, title: "《原子习惯》", current: 90, target: 260, unit: "页", note: "" }
      ]},
      sport: { title: "运动打卡", desc: "活力运动舱 · 跑步·力量", seed: [
        { id: 41, title: "力量训练", current: 12, target: 20, unit: "分钟", note: "20 分钟核心" },
        { id: 42, title: "跑步", current: 30, target: 40, unit: "分钟", note: "" }
      ]},
      money: { title: "能量账本", desc: "时间管理局的收支统计", seed: [
        { id: 51, title: "午餐", type: "expense", amount: 32, category: "餐饮" },
        { id: 52, title: "地铁", type: "expense", amount: 6, category: "交通" },
        { id: 53, title: "稿费", type: "income", amount: 400, category: "工资" }
      ]},
      note: { title: "灵感时光机", desc: "把闪念装进时光胶囊", seed: [
        { id: 61, title: "今天的小确幸", content: "阳台的多肉冒出了新芽，顺手拍了张照片。", mood: "开心" },
        { id: 62, title: "提示词技巧合集", content: "整理常用提示词模板，方便复用。", mood: "收藏" }
      ]},
      hot: { title: "时光收藏夹", desc: "热点内容 · 收藏 · 稍后阅读", seed: [
        { id: 71, title: "AI 提示词技巧合集", content: "整理常用提示词模板，方便复用。", mood: "收藏" }
      ]}
    };
    const t = (opts.type || "note");
    const info = types[t] || types.note;
    this.setData({ type: t, title: info.title, desc: info.desc, items: info.seed || [] });
  },
  addItem() { wx.showToast({ title: "已添加到模块", icon: "success" }); }
});
