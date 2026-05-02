// pages/handbook/handbook.js
Page({
  data: {
    currentGame: null,
    poems: [],
    loading: true
  },

  onLoad: function() {
    this.checkLogin()
    this.loadPoems()
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ currentGame })
  },

  loadPoems: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getTeamPoems',
      data: {
        gameId: this.data.currentGame.gameId,
        teamNumber: this.data.currentGame.groupNumber
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({ poems: res.result.poems })
        } else {
          wx.showToast({ title: res.result.message || '加载失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 快来收集诗句线索！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
