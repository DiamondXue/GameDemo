// pages/games/games.js
Page({
  data: {
    userInfo: null,
    games: [],
    loading: true,
    testRunning: false,
    testResult: null
  },

  onLoad: function () {
    this.checkLogin()
    this.loadGames()
  },

  onShow: function () {
    if (this.data.userInfo) {
      this.loadGames()
    }
  },

  checkLogin: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ userInfo })
  },

  loadGames: function () {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getMyGames',
      data: { employeeId: this.data.userInfo.employeeId },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({ games: res.result.games })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载游戏列表失败:', err)
      }
    })
  },

  // 进入游戏
  enterGame: function (e) {
    const game = e.currentTarget.dataset.game
    if (game.status !== 'active') {
      wx.showToast({ title: game.status === 'pending' ? '游戏未开始' : '该游戏已结束', icon: 'none' })
      return
    }
    wx.setStorageSync('currentGame', game)
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 管理员操作游戏状态
  onGameAction: function (e) {
    const { gameid, action } = e.currentTarget.dataset
    const actionText = action === 'start' ? '开始' : action === 'finish' ? '结束' : action === 'cancel' ? '取消' : '删除'
    const confirmText = action === 'delete'
      ? '确定删除该游戏？删除后无法恢复'
      : action === 'finish'
      ? '确定结束游戏？结束后参与者将不能继续打卡'
      : action === 'cancel'
      ? '确定取消游戏？取消后无法恢复'
      : '确定开始游戏？开始后参与者即可打卡'

    wx.showModal({
      title: '确认' + actionText,
      content: confirmText,
      success: async res => {
        if (!res.confirm) return

        wx.cloud.callFunction({
          name: 'updateGameStatus',
          data: { gameId: gameid, action: action, employeeId: this.data.userInfo.employeeId },
          success: res2 => {
            if (res2.result.success) {
              wx.showToast({ title: res2.result.message, icon: 'success' })
              this.loadGames()
            } else {
              wx.showToast({ title: res2.result.message || '操作失败', icon: 'none' })
            }
          },
          fail: err => {
            wx.showToast({ title: '操作失败', icon: 'none' })
            console.error('更新游戏状态失败:', err)
          }
        })
      }
    })
  },

  // 前往创建游戏（仅管理员）
  goToCreateGame: function () {
    wx.navigateTo({ url: '/pages/create-game/create-game' })
  },

  // 前往未登录员工页面（仅管理员）
  goToPendingLogin: function () {
    wx.navigateTo({ url: '/pages/admin-pending-login/admin-pending-login' })
  },

  // 前往数据面板（全局入口，需选择游戏）
  goToDashboard: function () {
    var activeGame = null
    for (var i = 0; i < this.data.games.length; i++) {
      if (this.data.games[i].status === 'active') {
        activeGame = this.data.games[i]
        break
      }
    }
    if (!activeGame) {
      wx.showToast({ title: '没有进行中的游戏', icon: 'none' })
      return
    }
    wx.setStorageSync('currentGame', activeGame)
    wx.navigateTo({ url: '/pages/admin-dashboard/admin-dashboard' })
  },

  // 查看指定游戏的数据面板
  viewDashboard: function (e) {
    var game = e.currentTarget.dataset.game
    if (!game) return
    wx.setStorageSync('currentGame', game)
    wx.navigateTo({ url: '/pages/admin-dashboard/admin-dashboard' })
  },

  // 阻止事件冒泡
  stopProp: function () {},

  // 性能测试
  runPerformanceTest: function () {
    if (this.data.testRunning) return

    wx.showModal({
      title: '性能测试',
      content: '模拟200个员工登录并创建游戏分组，可能需要1-2分钟。确认执行？',
      success: res => {
        if (!res.confirm) return
        this.setData({ testRunning: true, testResult: null })
        wx.showLoading({ title: '测试中...', mask: true })

        wx.cloud.callFunction({
          name: 'performanceTest',
          data: { secret: 'gamedemo-test-2026', action: 'full' },
          success: cloudRes => {
            wx.hideLoading()
            this.setData({ testRunning: false })
            if (cloudRes.result.success) {
              this.setData({ testResult: cloudRes.result })
              wx.showToast({ title: '测试完成', icon: 'success' })
            } else {
              wx.showToast({ title: cloudRes.result.message || '测试失败', icon: 'none', duration: 3000 })
            }
          },
          fail: err => {
            wx.hideLoading()
            this.setData({ testRunning: false })
            console.error('性能测试失败:', err)
            wx.showToast({ title: '调用失败，请确认云函数已部署', icon: 'none', duration: 3000 })
          }
        })
      }
    })
  },

  dismissTestResult: function () {
    this.setData({ testResult: null })
  },

  onShareAppMessage: function () {
    return {
      title: '六景寻密令 - 一起来探索六景之美！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})