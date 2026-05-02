// pages/login/login.js
Page({
  data: {
    employeeId: '',
    loading: false
  },

  onLoad: function() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      wx.switchTab({
        url: '/pages/games/games'
      })
    }
  },

  // 输入员工号
  onEmployeeIdInput: function(e) {
    let value = e.detail.value.replace(/\D/g, '') // 只允许数字
    if (value.length > 8) value = value.slice(0, 8)
    this.setData({ employeeId: value })
  },

  // 登录
  handleLogin: function() {
    const { employeeId } = this.data

    // 验证员工号
    if (!employeeId || employeeId.length !== 8) {
      wx.showToast({
        title: '请输入8位员工号',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    // 测试账号 00000000 跳过云函数验证
    if (employeeId === '00000000') {
      const userInfo = {
        employeeId: '00000000',
        name: '测试用户',
        department: '测试部'
      }
      wx.setStorageSync('userInfo', userInfo)
      this.setData({ loading: false })
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/games/games' })
      }, 1000)
      return
    }

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'employeeLogin',
      data: {
        employeeId: employeeId
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          // 保存登录信息
          const userInfo = res.result.userInfo
          wx.setStorageSync('userInfo', userInfo)

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/games/games'
            })
          }, 1000)
        } else {
          wx.showToast({
            title: res.result.message || '登录失败',
            icon: 'none',
            duration: 3000
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
  },

  // 分享到好友
  onShareAppMessage: function() {
    return {
      title: '六景寻密令 - 探索六景，收集密令！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '六景寻密令 - 寻密探索游戏',
      query: '',
      imageUrl: '/images/logo.png'
    }
  }
})
