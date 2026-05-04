// pages/spot-picker/spot-picker.js
const { calculateDistance } = require('../../utils/distance')

Page({
  data: {
    spots: [],
    selectedSpotIds: [],
    markers: [],
    mapLatitude: 22.75,
    mapLongitude: 113.62,
    // 新增打卡点弹窗
    showAddModal: false,
    newSpotName: '',
    newSpotRadius: 20,
    newSpotLat: 0,
    newSpotLng: 0
  },

  onLoad: function(options) {
    // 接收已选中的 spotIds
    if (options.selectedSpotIds) {
      const selectedSpotIds = JSON.parse(decodeURIComponent(options.selectedSpotIds))
      this.setData({ selectedSpotIds })
    }
    this.loadSpots()
  },

  // 加载所有打卡点
  loadSpots: function() {
    wx.cloud.callFunction({
      name: 'manageSpots',
      data: { action: 'list' },
      success: res => {
        if (res.result.success) {
          const spots = res.result.spots
          const markers = spots.map(spot => ({
            id: spot.spotId,
            latitude: spot.geoPoint.coordinates[1],
            longitude: spot.geoPoint.coordinates[0],
            title: spot.name,
            width: 32,
            height: 32,
            iconPath: '/images/map-active.png'
          }))
          this.setData({ spots, markers })
        }
      }
    })
  },

  // 点击地图选点（长按）
  onMapLongPress: function(e) {
    const { latitude, longitude } = e.detail
    this.setData({
      showAddModal: true,
      newSpotLat: latitude,
      newSpotLng: longitude,
      newSpotName: '',
      newSpotRadius: 20
    })
  },

  // 输入新打卡点名称
  onNewSpotNameInput: function(e) {
    this.setData({ newSpotName: e.detail.value })
  },

  // 调整新打卡点范围
  changeNewSpotRadius: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.newSpotRadius + (action === 'plus' ? 5 : -5)
    if (val < 5) val = 5
    if (val > 200) val = 200
    this.setData({ newSpotRadius: val })
  },

  // 确认添加打卡点
  confirmAddSpot: function() {
    const { newSpotName, newSpotLat, newSpotLng, newSpotRadius } = this.data
    if (!newSpotName.trim()) {
      wx.showToast({ title: '请输入打卡点名称', icon: 'none' })
      return
    }

    wx.cloud.callFunction({
      name: 'manageSpots',
      data: {
        action: 'add',
        name: newSpotName.trim(),
        latitude: newSpotLat,
        longitude: newSpotLng,
        radius: newSpotRadius,
        description: ''
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' })
          this.setData({ showAddModal: false })
          this.loadSpots()
        } else {
          wx.showToast({ title: res.result.message, icon: 'none' })
        }
      }
    })
  },

  // 取消添加
  cancelAddSpot: function() {
    this.setData({ showAddModal: false })
  },

  // 切换打卡点选中状态
  toggleSpot: function(e) {
    const spotId = e.currentTarget.dataset.spotId
    let { selectedSpotIds } = this.data
    const index = selectedSpotIds.indexOf(spotId)
    if (index > -1) {
      selectedSpotIds.splice(index, 1)
    } else {
      selectedSpotIds.push(spotId)
    }
    this.setData({ selectedSpotIds })
  },

  // 全选/取消全选
  toggleSelectAll: function() {
    const { spots, selectedSpotIds } = this.data
    if (selectedSpotIds.length === spots.length) {
      this.setData({ selectedSpotIds: [] })
    } else {
      this.setData({ selectedSpotIds: spots.map(s => s.spotId) })
    }
  },

  // 确认选择，返回创建页
  confirmSelection: function() {
    const { selectedSpotIds } = this.data
    if (selectedSpotIds.length === 0) {
      wx.showToast({ title: '请至少选择一个打卡点', icon: 'none' })
      return
    }

    // 通过页面栈将选中结果传回上一页
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.setData({ selectedSpotIds })
    }
    wx.navigateBack()
  }
})
