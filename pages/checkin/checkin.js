// pages/checkin/checkin.js
const { calculateDistance } = require('../../utils/distance.js')

Page({
  data: {
    teamInfo: null,
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
    const teamInfo = wx.getStorageSync('teamInfo')
    if (!teamInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({ teamInfo })
  },

  // 加载景点列表
  loadSpots: function() {
    this.setData({ loading: true })
    
    wx.cloud.callFunction({
      name: 'getScenicSpots',
      data: {
        teamNumber: this.data.teamInfo.teamNumber
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({
            spots: res.result.spots
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载景点失败:', err)
      }
    })
  },

  // 选择景点
  selectSpot: function(e) {
    const spotId = e.currentTarget.dataset.spotId
    this.setData({
      selectedSpotId: spotId
    })
  },

  // 打卡
  handleCheckIn: function() {
    const { selectedSpotId, teamInfo } = this.data
    
    if (!selectedSpotId) {
      wx.showToast({
        title: '请先选择景点',
        icon: 'none'
      })
      return
    }

    this.setData({ checking: true })
    wx.showLoading({ title: '定位中...' })

    // 获取用户位置
    wx.getLocation({
      type: 'gcj02',
      success: (locRes) => {
        const userLat = locRes.latitude
        const userLon = locRes.longitude

        // 调用云函数验证打卡
        wx.cloud.callFunction({
          name: 'processCheckIn',
          data: {
            teamNumber: teamInfo.teamNumber,
            spotId: selectedSpotId,
            location: { lat: userLat, lon: userLon }
          },
          success: (res) => {
            wx.hideLoading()
            this.setData({ checking: false })
            
            if (res.result.success) {
              // 打卡成功
              this.showUnlockSuccess(res.result.unlockedDigit, res.result.collectedCount, res.result.finalCode)
              this.loadSpots() // 刷新景点列表
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
            console.error('打卡失败:', err)
            wx.showToast({
              title: '打卡失败，请重试',
              icon: 'none'
            })
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
            if (modalRes.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 显示解锁成功动画
  showUnlockSuccess: function(digit, collectedCount, finalCode) {
    wx.showModal({
      title: '🎉 打卡成功！',
      content: `解锁数字：${digit}\n已收集：${collectedCount}/3`,
      showCancel: false,
      confirmText: '好的',
      success: (res) => {
        if (collectedCount === 3 && finalCode) {
          // 已收集完所有数字
          wx.showModal({
            title: '🎊 恭喜完成！',
            content: `您已收集完所有数字！\n最终密令：${finalCode}`,
            confirmText: '去验证',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: '/pages/result/result'
                })
              }
            }
          })
        }
      }
    })
  },

  // 分享到好友
  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 快来一起打卡探索吧！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 景点打卡挑战',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
