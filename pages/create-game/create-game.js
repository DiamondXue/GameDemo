// pages/create-game/create-game.js
Page({
  data: {
    name: '',
    description: '',
    groupCount: 4,
    memberPerGroup: 5,
    spotsPerGroup: 3,
    employees: [],
    departments: [],
    deptMap: {},
    selectedIds: [],
    showDeptFilter: false,
    currentDept: '全部',
    keyword: '',
    loading: false,
    submitting: false,
    filteredEmployees: []
  },

  onLoad: function() {
    this.checkLogin()
    this.loadEmployees()
  },

  checkLogin: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ userInfo })
  },

  loadEmployees: function() {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getEmployeeList',
      data: {},
      success: res => {
        this.setData({ loading: false })
        if (res.result.success) {
          const { employees, departments, deptMap } = res.result
          this.setData({
            employees,
            departments,
            deptMap,
            filteredEmployees: employees
          })
        }
      },
      fail: err => {
        this.setData({ loading: false })
        console.error('加载员工列表失败:', err)
        wx.showToast({ title: '加载员工列表失败', icon: 'none' })
      }
    })
  },

  // 输入游戏名称
  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  // 输入描述
  onDescInput: function(e) {
    this.setData({ description: e.detail.value })
  },

  // 修改组数
  changeGroupCount: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.groupCount + (action === 'plus' ? 1 : -1)
    if (val < 1) val = 1
    if (val > 30) val = 30
    this.setData({ groupCount: val })
  },

  // 修改每组人数
  changeMemberPerGroup: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.memberPerGroup + (action === 'plus' ? 1 : -1)
    if (val < 1) val = 1
    if (val > 30) val = 30
    this.setData({ memberPerGroup: val })
  },

  // 修改每组景点数
  changeSpotsPerGroup: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.spotsPerGroup + (action === 'plus' ? 1 : -1)
    if (val < 1) val = 1
    if (val > 6) val = 6
    this.setData({ spotsPerGroup: val })
  },

  // 搜索员工
  onSearchInput: function(e) {
    this.setData({ keyword: e.detail.value })
    this.filterEmployees()
  },

  // 部门筛选
  toggleDeptFilter: function() {
    this.setData({ showDeptFilter: !this.data.showDeptFilter })
  },

  selectDept: function(e) {
    const dept = e.currentTarget.dataset.dept
    this.setData({
      currentDept: dept,
      showDeptFilter: false
    })
    this.filterEmployees()
  },

  filterEmployees: function() {
    const { employees, keyword, currentDept } = this.data
    let filtered = employees

    if (keyword) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.employeeId.includes(kw) || (emp.name && emp.name.toLowerCase().includes(kw))
      )
    }

    if (currentDept !== '全部') {
      filtered = filtered.filter(emp => emp.department === currentDept)
    }

    this.setData({ filteredEmployees: filtered })
  },

  // 选择/取消选择员工
  toggleEmployee: function(e) {
    const empId = e.currentTarget.dataset.id
    let { selectedIds } = this.data
    const index = selectedIds.indexOf(empId)

    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(empId)
    }

    this.setData({ selectedIds })
  },

  // 全选/取消全选当前筛选结果
  toggleSelectAll: function() {
    const { filteredEmployees, selectedIds } = this.data
    const filteredIds = filteredEmployees.map(e => e.employeeId)
    const allSelected = filteredIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      // 取消选中当前筛选的
      const newIds = selectedIds.filter(id => !filteredIds.includes(id))
      this.setData({ selectedIds: newIds })
    } else {
      // 选中当前筛选的
      const newIds = [...new Set([...selectedIds, ...filteredIds])]
      this.setData({ selectedIds: newIds })
    }
  },

  // 提交创建
  handleSubmit: function() {
    const { name, groupCount, memberPerGroup, spotsPerGroup, selectedIds, userInfo } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入游戏名称', icon: 'none' })
      return
    }
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择参与员工', icon: 'none' })
      return
    }

    const totalSlots = groupCount * memberPerGroup
    if (selectedIds.length > totalSlots) {
      wx.showToast({
        title: `参与人数超出容量(${totalSlots})`,
        icon: 'none',
        duration: 3000
      })
      return
    }

    this.setData({ submitting: true })

    wx.cloud.callFunction({
      name: 'createGame',
      data: {
        name: name.trim(),
        description: this.data.description.trim(),
        creatorId: userInfo.employeeId,
        participantIds: selectedIds,
        groupCount: groupCount,
        memberPerGroup: memberPerGroup,
        spotIds: [1, 2, 3, 4, 5, 6], // 默认6个景点
        spotsPerGroup: spotsPerGroup
      },
      success: res => {
        this.setData({ submitting: false })
        if (res.result.success) {
          wx.showToast({
            title: '创建成功！',
            icon: 'success'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        } else {
          wx.showToast({
            title: res.result.message || '创建失败',
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: err => {
        this.setData({ submitting: false })
        console.error('创建游戏失败:', err)
        wx.showToast({ title: '创建失败', icon: 'none' })
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: '六景寻密令',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
