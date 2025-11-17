// pages/handbook/handbook.js
Page({
  data: {
    teamInfo: null,
    poems: [],
    loading: true
  },

  onLoad: function() {
    this.checkLogin()
    this.loadPoems()
  },

  onShow: function() {
    if (this.data.teamInfo) {
      this.loadPoems()
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

  // 加载诗句线索
  loadPoems: function() {
    const teamNumber = this.data.teamInfo.teamNumber
    
    this.setData({ loading: true })
    
    wx.cloud.callFunction({
      name: 'getTeamPoems',
      data: { teamNumber },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({
            poems: res.result.poems
          })
        } else {
          wx.showToast({
            title: res.result.message || '加载失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载诗句失败:', err)
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      }
    })
  }
})
