// pages/admin-location/admin-location.js
const { calculateDistance, formatDistance } = require('../../utils/distance')

Page({
  data: {
    userInfo: null,
    // 当前配置
    currentLocation: null,
    // 表单
    name: '',
    latitude: '',
    longitude: '',
    radius: 500,
    description: '',
    // 历史配置列表
    historyList: [],
    // 状态
    loading: true,
    submitting: false,
    // 地图相关
    showMap: false,
    mapLatitude: 22.75,
    mapLongitude: 113.62,
    markers: [],
    // 预设地点
    presetLocations: [
      { name: '南沙天后宫', latitude: 22.747206, longitude: 113.617671 },
      { name: '广州塔', latitude: 23.106574, longitude: 113.324520 },
      { name: '白云山', latitude: 23.184704, longitude: 113.298853 },
      { name: '越秀公园', latitude: 23.138830, longitude: 113.267490 },
      { name: '花城广场', latitude: 23.119590, longitude: 113.321730 }
    ]
  },

  onLoad: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ userInfo })
    this.loadData()
  },

  // 加载数据
  loadData: function() {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'activityLocation',
      data: { action: 'get' },
      success: res => {
        if (res.result.success && res.result.location) {
          const loc = res.result.location
          this.setData({
            currentLocation: loc,
            name: loc.name || '',
            latitude: String(loc.latitude || ''),
            longitude: String(loc.longitude || ''),
            radius: loc.radius || 500,
            description: loc.description || '',
            mapLatitude: loc.latitude || 22.75,
            mapLongitude: loc.longitude || 113.62,
            markers: [{
              id: 1,
              latitude: loc.latitude,
              longitude: loc.longitude,
              title: loc.name,
              width: 36,
              height: 36,
              iconPath: '/images/map-active.png'
            }]
          })
        }
      },
      complete: () => {
        this.loadHistory()
      }
    })
  },

  // 加载历史配置
  loadHistory: function() {
    wx.cloud.callFunction({
      name: 'activityLocation',
      data: { action: 'list' },
      success: res => {
        if (res.result.success) {
          this.setData({ historyList: res.result.locations })
        }
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 表单输入
  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  onLatitudeInput: function(e) {
    this.setData({ latitude: e.detail.value })
  },

  onLongitudeInput: function(e) {
    this.setData({ longitude: e.detail.value })
  },

  onRadiusInput: function(e) {
    this.setData({ radius: parseInt(e.detail.value) || 500 })
  },

  onDescInput: function(e) {
    this.setData({ description: e.detail.value })
  },

  // 选择预设地点
  selectPreset: function(e) {
    const idx = e.currentTarget.dataset.index
    const preset = this.data.presetLocations[idx]
    this.setData({
      name: preset.name,
      latitude: String(preset.latitude),
      longitude: String(preset.longitude),
      mapLatitude: preset.latitude,
      mapLongitude: preset.longitude,
      markers: [{
        id: 1,
        latitude: preset.latitude,
        longitude: preset.longitude,
        title: preset.name,
        width: 36,
        height: 36,
        iconPath: '/images/map-active.png'
      }],
      showMap: false
    })
  },

  // 使用当前位置
  useCurrentLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: String(res.latitude),
          longitude: String(res.longitude),
          mapLatitude: res.latitude,
          mapLongitude: res.longitude,
          markers: [{
            id: 1,
            latitude: res.latitude,
            longitude: res.longitude,
            title: '当前位置',
            width: 36,
            height: 36,
            iconPath: '/images/map-active.png'
          }]
        })
        wx.showToast({ title: '已获取当前位置', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' })
      }
    })
  },

  // 切换地图显示
  toggleMap: function() {
    const lat = parseFloat(this.data.latitude)
    const lng = parseFloat(this.data.longitude)
    if (lat && lng) {
      this.setData({
        showMap: !this.data.showMap,
        mapLatitude: lat,
        mapLongitude: lng
      })
    } else {
      this.setData({ showMap: !this.data.showMap })
    }
  },

  // 地图移动后更新坐标
  onRegionChange: function(e) {
    if (e.type === 'end' && e.causedBy !== 'bindregionchange') {
      // 获取地图中心点
      const mapCtx = wx.createMapContext('locationMap', this)
      mapCtx.getCenterLocation({
        success: (res) => {
          this.setData({
            latitude: String(res.latitude),
            longitude: String(res.longitude),
            markers: [{
              id: 1,
              latitude: res.latitude,
              longitude: res.longitude,
              title: '活动地点',
              width: 36,
              height: 36,
              iconPath: '/images/map-active.png'
            }]
          })
        }
      })
    }
  },

  // 快捷调整范围
  changeRadius: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.radius + (action === 'plus' ? 100 : -100)
    if (val < 50) val = 50
    if (val > 5000) val = 5000
    this.setData({ radius: val })
  },

  // 保存配置
  handleSave: function() {
    const { name, latitude, longitude, radius, description } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入地点名称', icon: 'none' })
      return
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      wx.showToast({ title: '请输入有效的经纬度', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    wx.cloud.callFunction({
      name: 'activityLocation',
      data: {
        action: 'set',
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        radius: radius,
        description: description.trim()
      },
      success: res => {
        this.setData({ submitting: false })
        if (res.result.success) {
          wx.showToast({
            title: '活动地点设置成功',
            icon: 'success'
          })
          this.loadData()
        } else {
          wx.showToast({
            title: res.result.message || '设置失败',
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: err => {
        this.setData({ submitting: false })
        console.error('设置活动地点失败:', err)
        wx.showToast({ title: '设置失败', icon: 'none' })
      }
    })
  },

  // 停用某个历史配置
  handleDisable: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认停用',
      content: '停用后该地点将不再作为登录限制',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.cloud.callFunction({
            name: 'activityLocation',
            data: { action: 'delete', locationId: id },
            success: res => {
              if (res.result.success) {
                wx.showToast({ title: '已停用', icon: 'success' })
                this.loadData()
              }
            }
          })
        }
      }
    })
  },

  // 应用历史配置
  applyHistory: function(e) {
    const loc = e.currentTarget.dataset.location
    this.setData({
      name: loc.name || '',
      latitude: String(loc.latitude || ''),
      longitude: String(loc.longitude || ''),
      radius: loc.radius || 500,
      description: loc.description || '',
      mapLatitude: loc.latitude || 22.75,
      mapLongitude: loc.longitude || 113.62,
      markers: [{
        id: 1,
        latitude: loc.latitude,
        longitude: loc.longitude,
        title: loc.name,
        width: 36,
        height: 36,
        iconPath: '/images/map-active.png'
      }]
    })
    wx.showToast({ title: '已加载配置', icon: 'success' })
  }
})
