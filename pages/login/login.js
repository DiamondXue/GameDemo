// pages/login/login.js
const { calculateDistance, formatDistance } = require('../../utils/distance')

Page({
  data: {
    employeeId: '',
    loading: false,
    locationStatus: 'init',
    locationText: '点击下方按钮获取位置',
    userLatitude: null,
    userLongitude: null,
    activityLocation: null,
    distance: null,
    locationRadius: 500
  },

  onLoad: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      wx.switchTab({ url: '/pages/games/games' })
      return
    }
    this.getActivityLocation()
  },

  getActivityLocation: function () {
    wx.cloud.callFunction({
      name: 'activityLocation',
      data: { action: 'get' },
      success: res => {
        console.log('[活动地点] 云函数返回:', res.result)
        if (res.result.success && res.result.location) {
          console.log('[活动地点] 配置:', res.result.location)
          this.setData({
            activityLocation: res.result.location,
            locationRadius: res.result.location.radius || 500,
            locationText: '点击下方按钮获取位置'
          })
        } else {
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

  getCurrentLocation: function () {
    this.setData({
      locationStatus: 'locating',
      locationText: '定位中...'
    })

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res
        const { activityLocation, locationRadius } = this.data

        console.log('[定位] 用户位置:', latitude, longitude)
        console.log('[定位] 活动地点:', activityLocation)

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

        console.log('[定位] 活动地点坐标:', activityLocation.latitude, activityLocation.longitude)

        const distance = calculateDistance(
          latitude, longitude,
          activityLocation.latitude, activityLocation.longitude
        )

        console.log('[定位] 计算距离:', distance, '米')

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
        wx.showToast({ title: errorMsg, icon: 'none' })
      }
    })
  },

  onEmployeeIdInput: function (e) {
    let value = e.detail.value.replace(/\D/g, '')
    if (value.length > 8) value = value.slice(0, 8)
    this.setData({ employeeId: value })
  },

  handleLogin: function () {
    const { employeeId } = this.data

    if (!employeeId || employeeId.length !== 8) {
      wx.showToast({ title: '请输入8位员工号', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    // 测试账号特殊处理
    if (employeeId === '00000000') {
      const userInfo = {
        employeeId: '00000000',
        name: '测试用户',
        department: '测试部',
        isAdmin: true
      }
      wx.setStorageSync('userInfo', userInfo)
      this.setData({ loading: false })
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/games/games' })
      }, 1000)
      return
    }

    // 先登录获取用户信息（判断是否是管理员）
    wx.cloud.callFunction({
      name: 'employeeLogin',
      data: { employeeId: employeeId },
      success: res => {
        if (res.result.success) {
          const userInfo = res.result.userInfo

          // 管理员跳过定位验证
          if (userInfo.isAdmin) {
            wx.setStorageSync('userInfo', userInfo)
            this.setData({ loading: false })
            wx.showToast({ title: '管理员登录成功', icon: 'success' })
            setTimeout(() => {
              wx.switchTab({ url: '/pages/games/games' })
            }, 1000)
            return
          }

          // 非管理员需要验证定位
          this.validateLocationAndLogin(userInfo)
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: res.result.message || '登录失败',
            icon: 'none', duration: 3000
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('登录失败:', err)
        wx.showToast({ title: '登录失败，请检查网络', icon: 'none' })
      }
    })
  },

  // 验证定位并登录（非管理员）
  validateLocationAndLogin: function (userInfo) {
    const { locationStatus, activityLocation } = this.data

    if (activityLocation && locationStatus !== 'located' && locationStatus !== 'disabled') {
      this.setData({ loading: false })
      if (locationStatus === 'not_in_range') {
        wx.showToast({
          title: `请前往${activityLocation.name}附近再登录`,
          icon: 'none', duration: 3000
        })
      } else {
        wx.showToast({ title: '请先完成定位', icon: 'none' })
      }
      return
    }

    // 定位验证通过，保存登录状态
    wx.setStorageSync('userInfo', userInfo)
    this.setData({ loading: false })
    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/games/games' })
    }, 1000)
  },

  onShareAppMessage: function () {
    return {
      title: '六景寻密令 - 探索六景，收集密令！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  onShareTimeline: function () {
    return {
      title: '六景寻密令 - 寻密探索游戏',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})