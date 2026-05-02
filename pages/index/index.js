// pages/index/index.js
Page({
  data: {
    userInfo: null,
    currentGame: null,
    progress: 0,
    collectedCount: 0,
    totalSpots: 3,
    isGameActive: true
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    // 每次显示页面时，从 storage 重新读取 currentGame，避免缓存问题
    const currentGame = wx.getStorageSync('currentGame')
    if (currentGame) {
      this.setData({ currentGame })
      this.loadProgress()
    } else {
      wx.switchTab({ url: '/pages/games/games' })
    }
  },

  checkLogin: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }

    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.switchTab({ url: '/pages/games/games' })
      return
    }

    this.setData({ userInfo, currentGame })
  },

  loadProgress: function() {
    const { currentGame, userInfo } = this.data

    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: {
        gameId: currentGame.gameId,
        teamNumber: currentGame.groupNumber
      },
      success: res => {
        if (res.result.success) {
          const collectedCount = res.result.collectedCount
          const totalSpots = currentGame.spotsPerGroup || res.result.totalSpots || 3
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

  goToCheckIn: function() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },

  goToHandbook: function() {
    wx.navigateTo({ url: '/pages/handbook/handbook' })
  },

  goToMap: function() {
    wx.switchTab({ url: '/pages/map/map' })
  },

  goToProgress: function() {
    wx.switchTab({ url: '/pages/progress/progress' })
  },

  // 返回游戏列表
  backToGames: function() {
    wx.switchTab({ url: '/pages/games/games' })
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 一起来探索六景之美！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 探索六景之美',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
