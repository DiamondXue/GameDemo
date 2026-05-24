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

    // 强制更新检查
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本')
        }
      })
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '版本更新',
          content: '新版本已就绪，点击确定重启应用',
          showCancel: false,
          success: () => {
            updateManager.applyUpdate()
          },
        })
      })
      updateManager.onUpdateFailed(() => {
        console.warn('新版本下载失败')
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
