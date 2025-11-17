// pages/result/result.js
Page({
  data: {
    teamInfo: null,
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
    const teamInfo = wx.getStorageSync('teamInfo')
    if (!teamInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({ teamInfo })
  },

  // 加载最终密令
  loadFinalCode: function() {
    const teamNumber = this.data.teamInfo.teamNumber

    wx.cloud.callFunction({
      name: 'getTeamProgress',
      data: { teamNumber },
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

  // 输入密令
  onCodeInput: function(e) {
    this.setData({
      inputCode: e.detail.value
    })
  },

  // 验证密令
  verifyCode: function() {
    const { inputCode, teamInfo } = this.data

    if (!inputCode) {
      wx.showToast({
        title: '请输入密令',
        icon: 'none'
      })
      return
    }

    if (inputCode.length !== 3) {
      wx.showToast({
        title: '密令必须是3位数字',
        icon: 'none'
      })
      return
    }

    this.setData({ verifying: true })

    wx.cloud.callFunction({
      name: 'verifyFinalCode',
      data: {
        teamNumber: teamInfo.teamNumber,
        submittedCode: inputCode
      },
      success: res => {
        this.setData({ verifying: false })
        
        if (res.result.success) {
          this.setData({ verified: true })
          
          wx.showModal({
            title: '🎊 恭喜！',
            content: '密令正确！您已成功完成寻密游戏！',
            showCancel: false,
            confirmText: '太棒了',
            success: () => {
              // 可以跳转到成功页面或返回首页
            }
          })
        } else {
          wx.showModal({
            title: '❌ 密令错误',
            content: res.result.message || '请检查密令是否正确',
            showCancel: false,
            confirmText: '重试'
          })
        }
      },
      fail: err => {
        this.setData({ verifying: false })
        console.error('验证失败:', err)
        wx.showToast({
          title: '验证失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 查看答案
  showAnswer: function() {
    wx.showModal({
      title: '密令答案',
      content: `正确密令：${this.data.finalCode}`,
      showCancel: false
    })
  }
})
