// pages/result/result.js
Page({
  data: {
    currentGame: null,
    finalCode: '',
    inputCode: '',
    verified: false,
    verifying: false,
    collectedDigits: []
  },

  onLoad: function() {
    this.checkLogin()
    this.loadFinalCode()
  },

  checkLogin: function() {
    const currentGame = wx.getStorageSync('currentGame')
    if (!currentGame) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ currentGame })
  },

  loadFinalCode: function() {
    const { currentGame } = this.data

    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: {
        gameId: currentGame.gameId,
        teamNumber: currentGame.groupNumber
      },
      success: res => {
        if (res.result.success) {
          this.setData({
            finalCode: res.result.finalCode || '',
            collectedDigits: res.result.collectedDigits || []
          })

          if (!res.result.finalCode) {
            wx.showModal({
              title: '提示',
              content: '您还未收集完所有数字，请先完成打卡',
              showCancel: false,
              success: () => {
                wx.navigateBack()
              }
            })
          }
        }
      },
      fail: err => {
        console.error('加载密令失败:', err)
      }
    })
  },

  onCodeInput: function(e) {
    this.setData({ inputCode: e.detail.value })
  },

  verifyCode: function() {
    const { inputCode, currentGame } = this.data

    if (!inputCode) {
      wx.showToast({ title: '请输入密令', icon: 'none' })
      return
    }

    this.setData({ verifying: true })

    wx.cloud.callFunction({
      name: 'verifyFinalCode',
      data: {
        gameId: currentGame.gameId,
        teamNumber: currentGame.groupNumber,
        submittedCode: inputCode
      },
      success: res => {
        this.setData({ verifying: false })
        if (res.result.success) {
          this.setData({ verified: true })
          wx.showModal({
            title: '恭喜！',
            content: '密令正确！您已成功完成寻密游戏！',
            showCancel: false,
            confirmText: '太棒了'
          })
        } else {
          wx.showModal({
            title: '密令错误',
            content: res.result.message || '请检查密令是否正确',
            showCancel: false,
            confirmText: '重试'
          })
        }
      },
      fail: err => {
        this.setData({ verifying: false })
        wx.showToast({ title: '验证失败，请重试', icon: 'none' })
      }
    })
  },

  onShareAppMessage: function() {
    const { verified } = this.data
    return {
      title: verified ? '六景寻密令 - 我已成功破解密令！' : '六景寻密令 - 来挑战密令验证！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
