// pages/progress/progress.js
Page({
  data: {
    currentGame: null,
    collectedDigits: [],
    totalSpots: 3,
    finalCode: null,
    loading: true
  },

  onLoad: function() {
    this.checkLogin()
    this.loadProgress()
  },

  onShow: function() {
    if (this.data.currentGame) {
      this.loadProgress()
    }
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ currentGame })
  },

  loadProgress: function() {
    const { currentGame } = this.data
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: {
        gameId: currentGame.gameId,
        teamNumber: currentGame.groupNumber
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          const totalSpots = currentGame.spotsPerGroup || res.result.totalSpots || 3
          this.setData({
            collectedDigits: res.result.collectedDigits || [],
            totalSpots,
            finalCode: res.result.finalCode
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      }
    })
  },

  goToResult: function() {
    if (!this.data.finalCode) {
      wx.showToast({ title: '请先收集完所有数字', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/result/result' })
  },

  goToCheckIn: function() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },

  onShareAppMessage: function() {
    const { collectedDigits, totalSpots } = this.data
    const count = collectedDigits.length
    return {
      title: `六景寻密令 - 我已收集 ${count}/${totalSpots} 个密令数字！`,
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
