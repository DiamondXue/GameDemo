// pages/create-game/create-game.js
Page({
  data: {
    name: '',
    description: '',
    groupMode: 'random',       // 'random' | 'custom'
    groupCount: 4,
    memberPerGroup: 5,
    spotsPerGroup: 3,
    customGroupCount: 4,       // 自定义模式下的组数
    groupAssignments: {},      // { employeeId: groupNumber }
    selectedSpotIds: [],
    employees: [],
    departments: [],
    deptMap: {},
    selectedIds: [],
    selectedEmployees: [],     // 已选员工完整信息
    customGroupSummary: [],    // [{groupNumber, count}]
    showDeptFilter: false,
    currentDept: '全部',
    keyword: '',
    loading: false,
    submitting: false,
    filteredEmployees: [],
    // 批量分配相关
    batchMode: false,          // 是否处于批量选择模式
    batchSelectedIds: [],      // 批量选中的员工ID列表
    showGroupPicker: false,    // 是否显示组号选择器
    batchAssignGroup: 1,      // 批量分配的目标组号
    // 组别颜色（用于区分不同组）
    groupColors: [
      '', // index 0 不用
      '#ff6b6b', // 组1：红色
      '#4ecdc4', // 组2：青色
      '#feca57', // 组3：黄色
      '#a29bfe', // 组4：紫色
      '#ff9ff3', // 组5：粉色
      '#54a0ff', // 组6：蓝色
      '#5f27cd', // 组7：深紫
      '#01a3a4', // 组8：深青
      '#f368e0', // 组9：洋红
      '#ff6348', // 组10：橙红
      '#7bed9f', // 组11：绿色
      '#70a1ff', // 组12：浅蓝
    ]
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
    this.updateSelectedEmployees()
    this.updateCustomGroupData()
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
    this.updateSelectedEmployees()
    this.updateCustomGroupData()
  },

  // 切换分组模式
  switchMode: function(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ groupMode: mode })
    if (mode === 'custom') {
      this.updateCustomGroupData()
    }
  },

  // 自定义模式修改组数
  changeCustomGroupCount: function(e) {
    const action = e.currentTarget.dataset.action
    let val = this.data.customGroupCount + (action === 'plus' ? 1 : -1)
    if (val < 1) val = 1
    if (val > 30) val = 30
    this.setData({ customGroupCount: val })
    this.updateCustomGroupData()
  },

  // 自定义模式修改某人的分组
  changeGroupAssignment: function(e) {
    const { id, action } = e.currentTarget.dataset
    const max = this.data.customGroupCount
    let val = (this.data.groupAssignments[id] || 1) + (action === 'plus' ? 1 : -1)
    if (val < 1) val = 1
    if (val > max) val = max

    const groupAssignments = { ...this.data.groupAssignments, [id]: val }
    this.setData({ groupAssignments })
    this.updateCustomGroupData()
  },

  // 更新已选员工列表（完整信息）
  updateSelectedEmployees: function() {
    const { selectedIds, employees } = this.data
    const selectedEmployees = employees.filter(e => selectedIds.includes(e.employeeId))
    this.setData({ selectedEmployees })
  },

  // 更新自定义分组的摘要和分配
  updateCustomGroupData: function() {
    const { selectedIds, customGroupCount, groupAssignments } = this.data
    const summary = []
    for (let i = 1; i <= customGroupCount; i++) {
      const count = selectedIds.filter(id => groupAssignments[id] === i).length
      summary.push({ groupNumber: i, count })
    }
    this.setData({ customGroupSummary: summary })
  },

  // ========== 批量分配相关方法 ==========
  
  // 切换批量选择模式
  toggleBatchMode: function() {
    const batchMode = !this.data.batchMode
    this.setData({
      batchMode: batchMode,
      batchSelectedIds: [] // 退出时清空选择
    })
  },

  // 切换单个员工的批量选择状态
  toggleBatchSelect: function(e) {
    const empId = e.currentTarget.dataset.id
    const { batchSelectedIds } = this.data
    const index = batchSelectedIds.indexOf(empId)

    let newSelected
    if (index > -1) {
      newSelected = batchSelectedIds.filter((_, i) => i !== index)
    } else {
      newSelected = batchSelectedIds.concat([empId])
    }

    this.setData({ batchSelectedIds: newSelected })
  },

  // 全选/取消全选（批量模式）
  selectAllForBatch: function() {
    const { selectedEmployees, batchSelectedIds } = this.data
    const allIds = selectedEmployees.map(e => e.employeeId)
    const allSelected = allIds.every(id => batchSelectedIds.includes(id))

    if (allSelected) {
      // 取消全选
      this.setData({ batchSelectedIds: [] })
    } else {
      // 全选
      this.setData({ batchSelectedIds: allIds })
    }
  },

  // 显示组号选择器
  showBatchAssign: function() {
    if (this.data.batchSelectedIds.length === 0) {
      wx.showToast({ title: '请先选择员工', icon: 'none' })
      return
    }
    this.setData({
      showGroupPicker: true,
      batchAssignGroup: 1 // 默认分配到第1组
    })
  },

  // 隐藏组号选择器
  hideGroupPicker: function() {
    this.setData({ showGroupPicker: false })
  },

  // 选择目标组号
  selectBatchGroup: function(e) {
    const group = e.currentTarget.dataset.group
    this.setData({ batchAssignGroup: group })
  },

  // 确认批量分配
  confirmBatchAssign: function() {
    const { batchSelectedIds, batchAssignGroup, groupAssignments } = this.data
    
    if (batchSelectedIds.length === 0) {
      wx.showToast({ title: '请先选择员工', icon: 'none' })
      return
    }

    // 更新分组分配
    const newAssignments = { ...groupAssignments }
    batchSelectedIds.forEach(empId => {
      newAssignments[empId] = batchAssignGroup
    })

    this.setData({
      groupAssignments: newAssignments,
      showGroupPicker: false,
      batchSelectedIds: [], // 清空批量选择
    })

    this.updateCustomGroupData()

    wx.showToast({
      title: `已分配 ${batchSelectedIds.length} 人到第 ${batchAssignGroup} 组`,
      icon: 'success'
    })
  },

  // 阻止冒泡
  stopProp: function() {
    // 空函数，用于 catchtap 阻止冒泡
  },

  // 提交创建
  handleSubmit: function() {
    const { name, groupMode, groupCount, memberPerGroup, spotsPerGroup, selectedIds, userInfo, customGroupCount, groupAssignments } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入游戏名称', icon: 'none' })
      return
    }
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择参与员工', icon: 'none' })
      return
    }

    if (groupMode === 'random') {
      const totalSlots = groupCount * memberPerGroup
      if (selectedIds.length > totalSlots) {
        wx.showToast({
          title: `参与人数超出容量(${totalSlots})`,
          icon: 'none',
          duration: 3000
        })
        return
      }
    }

    this.setData({ submitting: true })

    const cloudData = {
      name: name.trim(),
      description: this.data.description.trim(),
      creatorId: userInfo.employeeId,
      participantIds: selectedIds,
      spotIds: this.data.selectedSpotIds.length > 0 ? this.data.selectedSpotIds : [1, 2, 3, 4, 5, 6],
      spotsPerGroup: spotsPerGroup,
      groupMode: groupMode
    }

    if (groupMode === 'random') {
      cloudData.groupCount = groupCount
      cloudData.memberPerGroup = memberPerGroup
    } else {
      cloudData.groupCount = customGroupCount
      cloudData.groupAssignments = groupAssignments
    }

    wx.cloud.callFunction({
      name: 'createGame',
      data: cloudData,
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

  // 跳转到活动地点管理
  goToLocationAdmin: function() {
    wx.navigateTo({
      url: '/pages/admin-location/admin-location'
    })
  },

  // 选择打卡点
  goToSpotPicker: function() {
    const selectedSpotIds = encodeURIComponent(JSON.stringify(this.data.selectedSpotIds))
    wx.navigateTo({
      url: `/pages/spot-picker/spot-picker?selectedSpotIds=${selectedSpotIds}`
    })
  },

  // 分享到好友
  onShareAppMessage: function() {
    return {
      title: '六景寻密令',
      path: '/pages/login/login',
      imageUrl: '/images/logo.png'
    }
  }
})
