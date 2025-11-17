// pages/map/map.js
const { calculateDistance, formatDistance } = require('../../utils/distance.js')

Page({
  data: {
    teamInfo: null,
    spots: [],
    markers: [],
    centerLat: 23.1236,
    centerLon: 113.2347,
    userLocation: null
  },

  onLoad: function() {
    this.checkLogin()
    this.loadSpots()
    this.getUserLocation()
  },

  onShow: function() {
    if (this.data.teamInfo) {
      this.loadSpots()
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

  // 获取用户位置
  getUserLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
        this.calculateDistances()
      },
      fail: (err) => {
        console.log('获取位置失败:', err)
      }
    })
  },

  // 加载景点
  loadSpots: function() {
    wx.cloud.callFunction({
      name: 'getScenicSpots',
      data: {
        teamNumber: this.data.teamInfo.teamNumber
      },
      success: res => {
        if (res.result.success) {
          const spots = res.result.spots
          this.setData({ spots })
          this.createMarkers(spots)
          this.calculateDistances()
        }
      },
      fail: err => {
        console.error('加载景点失败:', err)
      }
    })
  },

  // 创建地图标记
  createMarkers: function(spots) {
    const markers = spots.map(spot => ({
      id: spot.spotId,
      latitude: spot.latitude,
      longitude: spot.longitude,
      title: spot.name,
      iconPath: spot.checked ? '/images/marker-checked.png' : '/images/marker.png',
      width: 30,
      height: 30
    }))
    
    this.setData({ markers })
  },

  // 计算距离
  calculateDistances: function() {
    const { spots, userLocation } = this.data
    if (!userLocation || !spots.length) return

    const updatedSpots = spots.map(spot => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        spot.latitude,
        spot.longitude
      )
      return {
        ...spot,
        distance: distance,
        distanceText: formatDistance(distance)
      }
    })

    this.setData({ spots: updatedSpots })
  },

  // 点击标记
  onMarkerTap: function(e) {
    const markerId = e.detail.markerId
    const spot = this.data.spots.find(s => s.spotId === markerId)
    
    if (spot) {
      wx.showModal({
        title: spot.name,
        content: `${spot.description}\n\n距离: ${spot.distanceText || '计算中...'}`,
        confirmText: '导航',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            this.navigateToSpot(spot)
          }
        }
      })
    }
  },

  // 导航到景点
  navigateToSpot: function(spot) {
    wx.openLocation({
      latitude: spot.latitude,
      longitude: spot.longitude,
      name: spot.name,
      address: spot.description,
      scale: 18
    })
  },

  // 刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '定位中...' })
    this.getUserLocation()
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '位置已更新',
        icon: 'success'
      })
    }, 1000)
  },

  // 分享到好友
  onShareAppMessage: function() {
    const teamNumber = this.data.teamInfo ? this.data.teamInfo.teamNumber : ''
    return {
      title: '六景寻密令 - 快来一起探索景点吧！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 景点探索之旅',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
