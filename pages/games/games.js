// pages/games/games.js
Page({
  data: {
    userInfo: null,
    games: [],
    loading: true
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
    const actionText = action === 'start' ? '开始' : action === 'finish' ? '结束' : '取消'
    const confirmText = action === 'finish'
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

  // 阻止事件冒泡
  stopProp: function () {},

  onShareAppMessage: function () {
    return {
      title: '六景寻密令 - 一起来探索六景之美！',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})