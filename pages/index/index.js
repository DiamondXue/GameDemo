// pages/index/index.js
Page({
  data: {
    teamInfo: null,
    gameConfig: null,
    progress: 0,
    collectedCount: 0,
    totalSpots: 3,
    isGameActive: true
  },

  onLoad: function() {
    this.checkLogin()
    this.loadGameData()
  },

  onShow: function() {
    if (this.data.teamInfo) {
      this.loadProgress()
    }
  },

  // 检查登录状态
  checkLogin: function() {
    const teamInfo = wx.getStorageSync('teamInfo')
    if (!teamInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({ teamInfo })
  },

  // 加载游戏数据
  loadGameData: function() {
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'getGameConfig',
      success: res => {
        wx.hideLoading()
        if (res.result.success) {
          this.setData({
            gameConfig: res.result.config,
            isGameActive: res.result.config.isActive
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('加载游戏配置失败:', err)
      }
    })
  },

  // 加载进度
  loadProgress: function() {
    const teamNumber = this.data.teamInfo.teamNumber
    
    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: { teamNumber },
      success: res => {
        if (res.result.success) {
          const collectedCount = res.result.collectedCount
          const totalSpots = res.result.totalSpots || 3
          const progress = Math.round((collectedCount / totalSpots) * 100)
          
          this.setData({
            collectedCount,
            totalSpots,
            progress
          })
        }
      },
      fail: err => {
        console.error('加载进度失败:', err)
      }
    })
  },

  // 前往打卡
  goToCheckIn: function() {
    wx.navigateTo({
      url: '/pages/checkin/checkin'
    })
  },

  // 查看手册
  goToHandbook: function() {
    wx.switchTab({
      url: '/pages/handbook/handbook'
    })
  },

  // 查看地图
  goToMap: function() {
    wx.switchTab({
      url: '/pages/map/map'
    })
  },

  // 查看进度
  goToProgress: function() {
    wx.switchTab({
      url: '/pages/progress/progress'
    })
  },

  // 分享到好友
  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 一起来探索六景之美！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 探索六景之美',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
