App({
  onLaunch() {
    const raw = wx.getStorageSync("workbench-doggy-v1") || "{}";
    try { this.globalData.storage = JSON.parse(raw); } catch(e) { this.globalData.storage = {}; }
  },
  globalData: { storage: {} }
});
