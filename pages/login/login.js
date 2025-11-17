// pages/login/login.js
Page({
  data: {
    teamNumber: '',
    members: ['', '', '', '', ''],
    loading: false
  },

  onLoad: function() {
    // 检查是否已登录
    const app = getApp()
    if (app.globalData.isLoggedIn) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 输入组号
  onTeamNumberInput: function(e) {
    let value = e.detail.value
    // 限制输入1-12
    if (value) {
      value = parseInt(value)
      if (value < 1) value = 1
      if (value > 12) value = 12
    }
    this.setData({
      teamNumber: value.toString()
    })
  },

  // 输入成员姓名
  onMemberInput: function(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    const members = this.data.members
    members[index] = value
    this.setData({
      members: members
    })
  },

  // 登录
  handleLogin: function() {
    const { teamNumber, members } = this.data
    
    // 验证组号
    if (!teamNumber || teamNumber < 1 || teamNumber > 12) {
      wx.showToast({
        title: '请输入正确的组号（1-12）',
        icon: 'none'
      })
      return
    }

    // 验证成员
    const validMembers = members.filter(m => m.trim() !== '')
    if (validMembers.length === 0) {
      wx.showToast({
        title: '请至少输入一位成员姓名',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'teamLogin',
      data: {
        teamNumber: parseInt(teamNumber),
        members: validMembers
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          // 保存登录信息
          const teamInfo = res.result.teamInfo
          wx.setStorageSync('teamInfo', teamInfo)
          
          const app = getApp()
          app.globalData.isLoggedIn = true
          app.globalData.teamInfo = teamInfo

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          setTimeout(() => {
            wx.switchTab({ 
              url: '/pages/index/index' 
            })
          }, 1000)
        } else {
          wx.showToast({ 
            title: res.result.message || '登录失败', 
            icon: 'none' 
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
  }
})
