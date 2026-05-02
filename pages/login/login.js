// pages/login/login.js
const { calculateDistance, formatDistance } = require('../../utils/distance')

Page({
  data: {
    employeeId: '',
    loading: false,
    // 地理位置相关
    locationStatus: 'init', // init | locating | located | not_in_range | error | disabled
    locationText: '点击下方按钮获取位置',
    userLatitude: null,
    userLongitude: null,
    activityLocation: null,
    distance: null,
    locationRadius: 500
  },

  onLoad: function() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      wx.switchTab({
        url: '/pages/games/games'
      })
      return
    }
    // 自动获取活动地点配置
    this.getActivityLocation()
  },

  // 获取管理员配置的活动地点
  getActivityLocation: function() {
    wx.cloud.callFunction({
      name: 'activityLocation',
      data: { action: 'get' },
      success: res => {
        if (res.result.success && res.result.location) {
          this.setData({
            activityLocation: res.result.location,
            locationRadius: res.result.location.radius || 500,
            locationText: '点击下方按钮获取位置'
          })
        } else {
          // 没有配置活动地点，不做位置限制
          this.setData({
            locationStatus: 'disabled',
            locationText: '未配置活动地点，无需定位'
          })
        }
      },
      fail: err => {
        console.error('获取活动地点失败:', err)
        this.setData({
          locationStatus: 'disabled',
          locationText: '未配置活动地点，无需定位'
        })
      }
    })
  },

  // 获取当前位置
  getCurrentLocation: function() {
    this.setData({
      locationStatus: 'locating',
      locationText: '定位中...'
    })

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res
        const { activityLocation, locationRadius } = this.data

        this.setData({
          userLatitude: latitude,
          userLongitude: longitude
        })

        if (!activityLocation) {
          this.setData({
            locationStatus: 'located',
            locationText: '定位成功'
          })
          return
        }

        // 计算距离
        const distance = calculateDistance(
          latitude, longitude,
          activityLocation.latitude, activityLocation.longitude
        )

        this.setData({ distance })

        if (distance <= locationRadius) {
          this.setData({
            locationStatus: 'located',
            locationText: `${activityLocation.name}（${formatDistance(distance)}）`
          })
        } else {
          this.setData({
            locationStatus: 'not_in_range',
            locationText: `距离${activityLocation.name}${formatDistance(distance)}，需在${formatDistance(locationRadius)}内`
          })
        }
      },
      fail: (err) => {
        console.error('获取位置失败:', err)
        let errorMsg = '定位失败'
        if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
          errorMsg = '请授权位置权限后重试'
        }
        this.setData({
          locationStatus: 'error',
          locationText: errorMsg
        })
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        })
      }
    })
  },

  // 输入员工号
  onEmployeeIdInput: function(e) {
    let value = e.detail.value.replace(/\D/g, '') // 只允许数字
    if (value.length > 8) value = value.slice(0, 8)
    this.setData({ employeeId: value })
  },

  // 登录
  handleLogin: function() {
    const { employeeId, locationStatus, activityLocation, locationRadius } = this.data

    // 验证员工号
    if (!employeeId || employeeId.length !== 8) {
      wx.showToast({
        title: '请输入8位员工号',
        icon: 'none'
      })
      return
    }

    // 地理位置校验：如果已配置活动地点且尚未成功定位
    if (activityLocation && locationStatus !== 'located' && locationStatus !== 'disabled') {
      if (locationStatus === 'not_in_range') {
        wx.showToast({
          title: `请前往${activityLocation.name}附近再登录`,
          icon: 'none',
          duration: 3000
        })
      } else {
        wx.showToast({
          title: '请先完成定位',
          icon: 'none'
        })
      }
      return
    }

    this.setData({ loading: true })

    // 测试账号 00000000 跳过云函数验证
    if (employeeId === '00000000') {
      const userInfo = {
        employeeId: '00000000',
        name: '测试用户',
        department: '测试部'
      }
      wx.setStorageSync('userInfo', userInfo)
      this.setData({ loading: false })
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/games/games' })
      }, 1000)
      return
    }

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'employeeLogin',
      data: {
        employeeId: employeeId
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          // 保存登录信息
          const userInfo = res.result.userInfo
          wx.setStorageSync('userInfo', userInfo)

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/games/games'
            })
          }, 1000)
        } else {
          wx.showToast({
            title: res.result.message || '登录失败',
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('登录失败:', err)
        wx.showToast({
          title: '登录失败，请检查网络',
          icon: 'none'
        })
      }
    })
  },

  // 分享到好友
  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 探索六景，收集密令！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 寻密探索游戏',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
