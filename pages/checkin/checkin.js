// pages/checkin/checkin.js
const { calculateDistance } = require('../../utils/distance.js')

Page({
  data: {
    currentGame: null,
    spots: [],
    selectedSpotId: null,
    loading: false,
    checking: false,
    teamPhoto: null,
    teamPhotoTempPath: null,
    uploadingPhoto: false,
    showPhotoSection: false,
    selectedSpotChecked: false
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
    const spot = this.data.spots.find(s => s.spotId === spotId)
    this.setData({
      selectedSpotId: spotId,
      showPhotoSection: !!spot && !spot.checked,
      selectedSpotChecked: !!spot && spot.checked,
      teamPhoto: null,
      teamPhotoTempPath: null
    })
  },

  choosePhoto: function() {
    const { selectedSpotId } = this.data
    if (!selectedSpotId) {
      wx.showToast({ title: '请先选择景点', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({
          teamPhotoTempPath: tempFilePath,
          teamPhoto: null
        })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          console.error('选择照片失败:', err)
          wx.showToast({ title: '选择照片失败', icon: 'none' })
        }
      }
    })
  },

  previewPhoto: function() {
    if (this.data.teamPhoto || this.data.teamPhotoTempPath) {
      const url = this.data.teamPhotoTempPath || this.data.teamPhoto
      wx.previewImage({
        current: url,
        urls: [url]
      })
    }
  },

  removePhoto: function() {
    this.setData({
      teamPhoto: null,
      teamPhotoTempPath: null
    })
  },

  handleCheckIn: function() {
    const { selectedSpotId, currentGame, teamPhoto, teamPhotoTempPath } = this.data

    if (!selectedSpotId) {
      wx.showToast({ title: '请先选择景点', icon: 'none' })
      return
    }

    if (!teamPhoto && !teamPhotoTempPath) {
      wx.showToast({ title: '请先上传团队合照', icon: 'none' })
      return
    }

    this.setData({ checking: true })
    wx.showLoading({ title: '打卡中...' })

    // 如果照片还没上传到云存储，先上传
    const uploadPromise = teamPhoto
      ? Promise.resolve(teamPhoto)
      : new Promise((resolve, reject) => {
          this.setData({ uploadingPhoto: true })
          const spot = this.data.spots.find(s => s.spotId === selectedSpotId)
          const spotName = spot ? spot.name : selectedSpotId
          const fileExtension = teamPhotoTempPath.split('.').pop() || 'jpg'
          const cloudPath = `checkin-photos/${currentGame.gameId}/${currentGame.groupNumber}/${selectedSpotId}_${Date.now()}.${fileExtension}`

          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: teamPhotoTempPath,
            success: (res) => {
              this.setData({ uploadingPhoto: false })
              resolve(res.fileID)
            },
            fail: (err) => {
              this.setData({ uploadingPhoto: false })
              reject(err)
            }
          })
        })

    uploadPromise.then((fileID) => {
      this.setData({ teamPhoto: fileID })

      wx.getLocation({
        type: 'gcj02',
        success: (locRes) => {
          wx.cloud.callFunction({
            name: 'processCheckIn',
            data: {
              gameId: currentGame.gameId,
              teamNumber: currentGame.groupNumber,
              spotId: selectedSpotId,
              location: { lat: locRes.latitude, lon: locRes.longitude },
              teamPhotoFileID: fileID
            },
            success: (res) => {
              wx.hideLoading()
              this.setData({ checking: false })

              if (res.result.success) {
                const totalSpots = currentGame.spotsPerGroup || 3
                this.showUnlockSuccess(res.result.unlockedDigit, res.result.collectedCount, res.result.finalCode, totalSpots)
                this.setData({
                  teamPhoto: null,
                  teamPhotoTempPath: null,
                  showPhotoSection: false,
                  selectedSpotChecked: true,
                  selectedSpotId: null
                })
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
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ checking: false })
      console.error('上传照片失败:', err)
      wx.showToast({ title: '上传照片失败，请重试', icon: 'none' })
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
