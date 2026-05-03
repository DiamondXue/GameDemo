// pages/admin-pending-login/admin-pending-login.js
Page({
  data: {
    employees: [],
    departments: [],
    deptMap: {},
    filteredEmployees: [],
    currentDept: '全部',
    keyword: '',
    loading: false,
    total: 0,
    loggedInCount: 0
  },

  onLoad: function() {
    this.checkAdmin()
    this.loadData()
  },

  checkAdmin: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ userInfo })
  },

  loadData: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getPendingLoginEmployees',
      data: {
        keyword: this.data.keyword,
        department: this.data.currentDept !== '全部' ? this.data.currentDept : ''
      },
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          this.setData({
            employees: res.result.employees,
            departments: res.result.departments,
            deptMap: res.result.deptMap,
            total: res.result.total,
            filteredEmployees: res.result.employees,
            loggedInCount: res.result.loggedInCount || 0
          })
        } else {
          console.error('加载失败:', res.result)
          wx.showToast({ title: res.result.message || '加载失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载未登录员工失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  onSearchInput: function(e) {
    this.setData({ keyword: e.detail.value })
    this.loadData()
  },

  selectDept: function(e) {
    const dept = e.currentTarget.dataset.dept
    this.setData({ currentDept: dept })
    this.loadData()
  }
})