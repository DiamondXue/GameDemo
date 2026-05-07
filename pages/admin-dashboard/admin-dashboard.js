// pages/admin-dashboard/admin-dashboard.js
Page({
  data: {
    currentGame: null,
    loading: true,
    activeTab: 'leaderboard',   // 'leaderboard' | 'teams'
    teams: [],
    leaderboard: [],
    gameName: '',
    totalSpots: 3
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (this.data.currentGame) {
      this.loadDashboard()
    }
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/games/games' })
      return
    }
    this.setData({ currentGame })
    this.loadDashboard()
  },

  loadDashboard: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getAdminDashboard',
      data: { gameId: this.data.currentGame.gameId },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({
            teams: res.result.teams,
            leaderboard: res.result.leaderboard,
            gameName: res.result.gameName,
            totalSpots: res.result.totalSpots
          })
        } else {
          wx.showToast({ title: res.result.message || '加载失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载仪表盘失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  previewPhoto: function(e) {
    const fileID = e.currentTarget.dataset.photoid
    if (!fileID) return
    wx.previewImage({
      current: fileID,
      urls: [fileID]
    })
  },

  onPullDownRefresh: function() {
    this.loadDashboard()
    wx.stopPullDownRefresh()
  },

  onShareAppMessage: function() {
    return {
      title: '管理仪表盘 - 六景寻密令',
      path: '/pages/games/games'
    }
  }
})
