// pages/map/map.js
const { calculateDistance, formatDistance } = require('../../utils/distance.js')

Page({
  data: {
    currentGame: null,
    spots: [],
    markers: [],
    centerLat: 22.75398,
    centerLon: 113.622984,
    userLocation: null
  },

  onLoad: function() {
    this.checkLogin()
    this.loadSpots()
    this.getUserLocation()
  },

  onShow: function() {
    if (this.data.currentGame) {
      this.loadSpots()
    }
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ currentGame })
  },

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

  loadSpots: function() {
    wx.cloud.callFunction({
      name: 'getScenicSpots',
      data: {
        gameId: this.data.currentGame.gameId,
        teamNumber: this.data.currentGame.groupNumber
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
      return { ...spot, distance, distanceText: formatDistance(distance) }
    })
    this.setData({ spots: updatedSpots })
  },

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
          if (res.confirm) this.navigateToSpot(spot)
        }
      })
    }
  },

  navigateToSpot: function(e) {
    const spot = e.currentTarget.dataset.spot || e
    wx.openLocation({
      latitude: spot.latitude,
      longitude: spot.longitude,
      name: spot.name,
      address: spot.description,
      scale: 18
    })
  },

  refreshLocation: function() {
    wx.showLoading({ title: '定位中...' })
    this.getUserLocation()
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '位置已更新', icon: 'success' })
    }, 1000)
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 快来一起探索景点吧！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
