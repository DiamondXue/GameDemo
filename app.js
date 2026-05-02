// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-1gq713wp159fb741',
        traceUser: true,
      })
    }

    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      this.globalData.isLoggedIn = false
    } else {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
    }
  },

  globalData: {
    isLoggedIn: false,
    userInfo: null
  }
})
