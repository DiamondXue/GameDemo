// pages/checkin/checkin.js
const { calculateDistance } = require('../../utils/distance.js')

Page({
  data: {
    currentGame: null,
    spots: [],
    selectedSpotId: null,
    loading: false,
    checking: false
  },

  onLoad: function() {
    this.checkLogin()
    this.loadSpots()
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ currentGame })
  },

  loadSpots: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getScenicSpots',
      data: {
        gameId: this.data.currentGame.gameId,
        teamNumber: this.data.currentGame.groupNumber
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({ spots: res.result.spots })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载景点失败:', err)
      }
    })
  },

  selectSpot: function(e) {
    const spotId = e.currentTarget.dataset.spotId
    this.setData({ selectedSpotId: spotId })
  },

  handleCheckIn: function() {
    const { selectedSpotId, currentGame } = this.data

    if (!selectedSpotId) {
      wx.showToast({ title: '请先选择景点', icon: 'none' })
      return
    }

    this.setData({ checking: true })
    wx.showLoading({ title: '定位中...' })

    wx.getLocation({
      type: 'gcj02',
      success: (locRes) => {
        wx.cloud.callFunction({
          name: 'processCheckIn',
          data: {
            gameId: currentGame.gameId,
            teamNumber: currentGame.groupNumber,
            spotId: selectedSpotId,
            location: { lat: locRes.latitude, lon: locRes.longitude }
          },
          success: (res) => {
            wx.hideLoading()
            this.setData({ checking: false })

            if (res.result.success) {
              const totalSpots = currentGame.spotsPerGroup || 3
              this.showUnlockSuccess(res.result.unlockedDigit, res.result.collectedCount, res.result.finalCode, totalSpots)
              this.loadSpots()
            } else {
              wx.showToast({
                title: res.result.message,
                icon: 'none',
                duration: 3000
              })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            this.setData({ checking: false })
            wx.showToast({ title: '打卡失败，请重试', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ checking: false })
        wx.showModal({
          title: '需要位置权限',
          content: '打卡需要获取您的位置信息，请授权',
          success: (modalRes) => {
            if (modalRes.confirm) wx.openSetting()
          }
        })
      }
    })
  },

  showUnlockSuccess: function(digit, collectedCount, finalCode, totalSpots) {
    wx.showModal({
      title: '打卡成功！',
      content: `解锁数字：${digit}\n已收集：${collectedCount}/${totalSpots}`,
      showCancel: false,
      confirmText: '好的',
      success: (res) => {
        if (collectedCount === totalSpots && finalCode) {
          wx.showModal({
            title: '恭喜完成！',
            content: `您已收集完所有数字！\n最终密令：${finalCode}`,
            confirmText: '去验证',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/result/result' })
              }
            }
          })
        }
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 快来一起打卡探索吧！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
