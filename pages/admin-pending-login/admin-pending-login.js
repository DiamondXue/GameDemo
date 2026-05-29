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
  },

  // 复制当前列表到剪贴板
  exportList: function() {
    const list = this.data.filteredEmployees
    if (list.length === 0) {
      wx.showToast({ title: '列表为空', icon: 'none' })
      return
    }
    const lines = list.map((emp, i) =>
      `${i + 1}. ${emp.name || '未设置姓名'}  ${emp.employeeId}  ${emp.department || ''}`
    )
    const header = `未登录员工名单（共 ${list.length} 人）\n${'─'.repeat(30)}\n`
    wx.setClipboardData({
      data: header + lines.join('\n'),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
    })
  }
})