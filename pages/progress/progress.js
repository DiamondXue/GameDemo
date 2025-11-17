// pages/progress/progress.js
Page({
  data: {
    teamInfo: null,
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
    if (this.data.teamInfo) {
      this.loadProgress()
    }
  },

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

  // 加载进度
  loadProgress: function() {
    const teamNumber = this.data.teamInfo.teamNumber
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: { teamNumber },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({
            collectedDigits: res.result.collectedDigits || [],
            totalSpots: res.result.totalSpots || 3,
            finalCode: res.result.finalCode
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载进度失败:', err)
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 前往验证
  goToResult: function() {
    if (!this.data.finalCode) {
      wx.showToast({
        title: '请先收集完所有数字',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/result/result'
    })
  },

  // 前往打卡
  goToCheckIn: function() {
    wx.navigateTo({
      url: '/pages/checkin/checkin'
    })
  },

  // 分享到好友
  onShareAppMessage: function() {
    const { collectedDigits, totalSpots } = this.data
    const count = collectedDigits.length
    return {
      title: `六景寻密令 - 我已收集 ${count}/${totalSpots} 个密令数字！`,
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 寻密探索挑战',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
