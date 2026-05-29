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
          // 转换照片链接
          this.resolvePhotoUrls(res.result.teams)
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
    const url = e.currentTarget.dataset.photoid
    if (!url) return
    wx.previewImage({
      current: url,
      urls: [url]
    })
  },

  resolvePhotoUrls: function(teams) {
    // 收集所有需要转换的 fileID（teamPhotoUrl 为空但原始数据可能有 fileID）
    // 云函数已用 getTempFileURL 转换，这里作为 fallback
    // 如果照片仍显示不出来，用小程序端再转一次
    const photoFileIDs = []
    teams.forEach(team => {
      team.details.forEach(spot => {
        if (spot.teamPhotoUrl && spot.teamPhotoUrl.indexOf('cloud://') === 0) {
          photoFileIDs.push(spot.teamPhotoUrl)
        }
      })
    })

    if (photoFileIDs.length === 0) return

    wx.cloud.getTempFileURL({
      fileList: photoFileIDs,
      success: res => {
        const urlMap = {}
        res.fileList.forEach(item => {
          if (item.tempFileURL) {
            urlMap[item.fileID] = item.tempFileURL
          }
        })
        const updatedTeams = this.data.teams.map(team => {
          const details = team.details.map(spot => {
            if (spot.teamPhotoUrl && urlMap[spot.teamPhotoUrl]) {
              return Object.assign({}, spot, { teamPhotoUrl: urlMap[spot.teamPhotoUrl] })
            }
          })
          return Object.assign({}, team, { details })
        })
        this.setData({ teams: updatedTeams })
      }
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
