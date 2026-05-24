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
    newSpotLng: 0,
    newSpotImage: '',      // 新增时本地临时路径
    newSpotImageUrl: '',   // 新增时上传后云存储URL
    uploadingNewImage: false,
    // 编辑打卡点弹窗
    showEditModal: false,
    editSpotId: 0,
    editSpotName: '',
    editSpotRadius: 20,
    editSpotImage: '',     // 编辑时显示的图片（可能是已有URL或新选临时路径）
    editSpotImageUrl: '',  // 编辑时最终URL（新上传的或原有的）
    editSpotImageChanged: false, // 是否更换了图片
    uploadingEditImage: false
  },

  onLoad: function(options) {
    // 接收已选中的 spotIds，确保是数字数组
    if (options.selectedSpotIds) {
      const selectedSpotIds = JSON.parse(decodeURIComponent(options.selectedSpotIds))
        .map(id => parseInt(id))
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
          const selectedSpotIds = this.data.selectedSpotIds
          const spots = res.result.spots.map(spot => ({
            ...spot,
            isSelected: selectedSpotIds.includes(spot.spotId)
          }))
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
      newSpotRadius: 20,
      newSpotImage: '',
      newSpotImageUrl: ''
    })
  },

  // 点击"添加"按钮，使用地图中心坐标
  showAddModal: function() {
    // 获取地图中心坐标
    const mapCtx = wx.createMapContext('spotMap')
    mapCtx.getCenterLocation({
      success: res => {
        this.setData({
          showAddModal: true,
          newSpotLat: res.latitude,
          newSpotLng: res.longitude,
          newSpotName: '',
          newSpotRadius: 20,
          newSpotImage: '',
          newSpotImageUrl: ''
        })
      },
      fail: () => {
        this.setData({
          showAddModal: true,
          newSpotLat: this.data.mapLatitude,
          newSpotLng: this.data.mapLongitude,
          newSpotName: '',
          newSpotRadius: 20,
          newSpotImage: '',
          newSpotImageUrl: ''
        })
      }
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

  // 新增：选择样本图片（添加弹窗）
  chooseNewSpotImage: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ newSpotImage: path, newSpotImageUrl: '' })
      }
    })
  },

  // 新增：预览样本图片（添加弹窗）
  previewNewSpotImage: function() {
    const src = this.data.newSpotImage
    if (src) wx.previewImage({ urls: [src], current: src })
  },

  // 新增：移除样本图片（添加弹窗）
  removeNewSpotImage: function() {
    this.setData({ newSpotImage: '', newSpotImageUrl: '' })
  },

  // 确认添加打卡点
  confirmAddSpot: function() {
    const { newSpotName, newSpotLat, newSpotLng, newSpotRadius, newSpotImage } = this.data
    if (!newSpotName.trim()) {
      wx.showToast({ title: '请输入打卡点名称', icon: 'none' })
      return
    }

    const doAdd = (imageUrl) => {
      wx.cloud.callFunction({
        name: 'manageSpots',
        data: {
          action: 'add',
          name: newSpotName.trim(),
          latitude: newSpotLat,
          longitude: newSpotLng,
          radius: newSpotRadius,
          description: '',
          sampleImage: imageUrl
        },
        success: res => {
          this.setData({ uploadingNewImage: false })
          if (res.result.success) {
            wx.showToast({ title: '添加成功', icon: 'success' })
            this.setData({ showAddModal: false })
            this.loadSpots()
          } else {
            wx.showToast({ title: res.result.message, icon: 'none' })
          }
        },
        fail: () => {
          this.setData({ uploadingNewImage: false })
          wx.showToast({ title: '添加失败', icon: 'none' })
        }
      })
    }

    if (newSpotImage) {
      // 有图片，先上传到云存储
      this.setData({ uploadingNewImage: true })
      const ext = newSpotImage.split('.').pop() || 'jpg'
      const cloudPath = `spot-samples/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      wx.cloud.uploadFile({
        cloudPath,
        filePath: newSpotImage,
        success: upRes => {
          doAdd(upRes.fileID)
        },
        fail: () => {
          this.setData({ uploadingNewImage: false })
          wx.showToast({ title: '图片上传失败', icon: 'none' })
        }
      })
    } else {
      doAdd('')
    }
  },

  // 取消添加
  cancelAddSpot: function() {
    this.setData({ showAddModal: false })
  },

  // 编辑打卡点
  editSpot: function(e) {
    const spotId = parseInt(e.currentTarget.dataset.spotId)
    const spot = this.data.spots.find(s => s.spotId === spotId)
    if (!spot) return

    this.setData({
      showEditModal: true,
      editSpotId: spotId,
      editSpotName: spot.name,
      editSpotRadius: spot.radius || 20,
      editSpotImage: spot.sampleImage || '',
      editSpotImageUrl: spot.sampleImage || '',
      editSpotImageChanged: false
    })
  },

  // 输入编辑打卡点名称
  onEditSpotNameInput: function(e) {
    this.setData({ editSpotName: e.detail.value })
  },

  // 新增：选择样本图片（编辑弹窗）
  chooseEditSpotImage: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ editSpotImage: path, editSpotImageChanged: true })
      }
    })
  },

  // 新增：预览样本图片（编辑弹窗）
  previewEditSpotImage: function() {
    const src = this.data.editSpotImage
    if (src) wx.previewImage({ urls: [src], current: src })
  },

  // 新增：移除样本图片（编辑弹窗）
  removeEditSpotImage: function() {
    this.setData({ editSpotImage: '', editSpotImageUrl: '', editSpotImageChanged: true })
  },

  // 调整编辑打卡点范围
  changeEditSpotRadius: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.editSpotRadius + (action === 'plus' ? 5 : -5)
    if (val < 5) val = 5
    if (val > 200) val = 200
    this.setData({ editSpotRadius: val })
  },

  // 确认编辑打卡点
  confirmEditSpot: function() {
    const { editSpotId, editSpotName, editSpotRadius, editSpotImage, editSpotImageUrl, editSpotImageChanged } = this.data
    if (!editSpotName.trim()) {
      wx.showToast({ title: '请输入打卡点名称', icon: 'none' })
      return
    }

    const doUpdate = (imageUrl) => {
      wx.cloud.callFunction({
        name: 'manageSpots',
        data: {
          action: 'update',
          spotId: editSpotId,
          name: editSpotName.trim(),
          radius: editSpotRadius,
          sampleImage: imageUrl
        },
        success: res => {
          this.setData({ uploadingEditImage: false })
          if (res.result.success) {
            wx.showToast({ title: '修改成功', icon: 'success' })
            this.setData({ showEditModal: false })
            this.loadSpots()
          } else {
            wx.showToast({ title: res.result.message, icon: 'none' })
          }
        },
        fail: () => {
          this.setData({ uploadingEditImage: false })
          wx.showToast({ title: '修改失败', icon: 'none' })
        }
      })
    }

    if (editSpotImageChanged && editSpotImage && !editSpotImage.startsWith('cloud://')) {
      // 选了新图，需要上传
      this.setData({ uploadingEditImage: true })
      const ext = editSpotImage.split('.').pop() || 'jpg'
      const cloudPath = `spot-samples/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      wx.cloud.uploadFile({
        cloudPath,
        filePath: editSpotImage,
        success: upRes => {
          doUpdate(upRes.fileID)
        },
        fail: () => {
          this.setData({ uploadingEditImage: false })
          wx.showToast({ title: '图片上传失败', icon: 'none' })
        }
      })
    } else {
      // 没换图，用原有URL（或空）
      const finalUrl = editSpotImageChanged ? '' : editSpotImageUrl
      doUpdate(finalUrl)
    }
  },

  // 取消编辑
  cancelEditSpot: function() {
    this.setData({ showEditModal: false })
  },

  // 删除打卡点
  deleteSpot: function(e) {
    const spotId = parseInt(e.currentTarget.dataset.spotId)
    const spot = this.data.spots.find(s => s.spotId === spotId)
    if (!spot) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除打卡点"${spot.name}"吗？`,
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'manageSpots',
            data: {
              action: 'delete',
              spotId: spotId
            },
            success: res => {
              if (res.result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadSpots()
              } else {
                wx.showToast({ title: res.result.message, icon: 'none' })
              }
            }
          })
        }
      }
    })
  },

  // 切换打卡点选中状态
  toggleSpot: function(e) {
    const spotId = parseInt(e.currentTarget.dataset.spotId)  // 转换为数字
    const { spots, selectedSpotIds } = this.data
    
    // 更新spots中对应项的isSelected
    const updatedSpots = spots.map(spot => {
      if (spot.spotId === spotId) {
        return { ...spot, isSelected: !spot.isSelected }
      }
      return spot
    })
    
    // 重新计算selectedSpotIds
    const newSelectedSpotIds = updatedSpots
      .filter(spot => spot.isSelected)
      .map(spot => spot.spotId)
    
    this.setData({ 
      spots: updatedSpots, 
      selectedSpotIds: newSelectedSpotIds 
    })
  },

  // 全选/取消全选
  toggleSelectAll: function() {
    const { spots, selectedSpotIds } = this.data
    let newSelectedSpotIds
    let updatedSpots
    
    if (selectedSpotIds.length === spots.length) {
      // 取消全选
      newSelectedSpotIds = []
      updatedSpots = spots.map(spot => ({ ...spot, isSelected: false }))
    } else {
      // 全选
      newSelectedSpotIds = spots.map(s => s.spotId)
      updatedSpots = spots.map(spot => ({ ...spot, isSelected: true }))
    }
    
    this.setData({ 
      spots: updatedSpots, 
      selectedSpotIds: newSelectedSpotIds 
    })
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
