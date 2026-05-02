// pages/games/games.js
Page({
  data: {
    userInfo: null,
    games: [],
    loading: true
  },

  onLoad: function() {
    this.checkLogin()
    this.loadGames()
  },

  onShow: function() {
    if (this.data.userInfo) {
      this.loadGames()
    }
  },

  checkLogin: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({ userInfo })
  },

  loadGames: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getMyGames',
      data: { employeeId: this.data.userInfo.employeeId },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({ games: res.result.games })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载游戏列表失败:', err)
      }
    })
  },

  // 进入游戏
  enterGame: function(e) {
    const game = e.currentTarget.dataset.game
    if (game.status !== 'active') {
      wx.showToast({ title: '该游戏已结束', icon: 'none' })
      return
    }
    // 将当前游戏信息存入 storage
    wx.setStorageSync('currentGame', game)
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 前往创建游戏
  goToCreateGame: function() {
    wx.navigateTo({
      url: '/pages/create-game/create-game'
    })
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 一起来探索六景之美！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
