// cloudfunctions/performanceTest/index.js
// 性能测试：模拟200用户登录 + 查看分组情况
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  if (event.secret !== 'gamedemo-test-2026') {
    return { success: false, message: '无权限' }
  }

  try {
    const loginResult = await testLoginPerformance()
    const groupingResult = await testGrouping()
    return { success: true, loginTest: loginResult, groupingTest: groupingResult }
  } catch (err) {
    console.error('性能测试失败:', err)
    return { success: false, message: err.message }
  }
}

/**
 * 模拟200个员工登录 - 直接操作数据库，不嵌套调云函数
 */
async function testLoginPerformance() {
  const COUNT = 200
  console.log('[性能测试] 开始登录测试，人数:', COUNT)

  // 1. 确保员工存在
  const employeeIds = []
  for (let i = 1; i <= COUNT; i++) {
    employeeIds.push(String(i).padStart(8, '0'))
  }

  const existingRes = await db.collection('employees')
    .where({ employeeId: _.in(employeeIds) })
    .limit(300)
    .get()
  const existingMap = {}
  existingRes.data.forEach(e => { existingMap[e.employeeId] = e })

  const toCreate = employeeIds.filter(id => !existingMap[id]).map(id => ({
    employeeId: id,
    name: `员工${id}`,
    department: ['技术部', '产品部', '运营部', '设计部'][Math.floor(Math.random() * 4)],
    isAdmin: false,
    createdAt: new Date(),
  }))

  if (toCreate.length > 0) {
    console.log(`[性能测试] 创建 ${toCreate.length} 个测试员工...`)
    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100)
      await Promise.all(batch.map(e => db.collection('employees').add({ data: e })))
    }
  }

  // 2. 模拟登录：直接更新 lastLoginAt（与 employeeLogin 云函数逻辑一致）
  const loginTimes = []
  const startTime = Date.now()
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < employeeIds.length; i += 20) {
    const batch = employeeIds.slice(i, i + 20)
    const batchStart = Date.now()

    await Promise.all(batch.map(async (id) => {
      const t0 = Date.now()
      try {
        // 直接模拟 employeeLogin 的核心逻辑
        await db.collection('employees')
          .where({ employeeId: id })
          .update({ data: { lastLoginAt: new Date() } })
        loginTimes.push(Date.now() - t0)
        successCount++
      } catch (err) {
        loginTimes.push(Date.now() - t0)
        failCount++
      }
    }))

    console.log(`[性能测试] 登录进度: ${Math.min(i + 20, COUNT)}/${COUNT}`)
  }

  const totalTime = Date.now() - startTime
  loginTimes.sort((a, b) => a - b)
  const avgTime = Math.round(loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length)
  const p50 = loginTimes[Math.floor(loginTimes.length * 0.5)]
  const p95 = loginTimes[Math.floor(loginTimes.length * 0.95)]
  const p99 = loginTimes[Math.floor(loginTimes.length * 0.99)]

  return {
    totalTime,
    successCount,
    failCount,
    avgTime,
    minTime: loginTimes[0],
    maxTime: loginTimes[loginTimes.length - 1],
    p50, p95, p99,
  }
}

/**
 * 测试分组：创建游戏并查看分组结果
 */
async function testGrouping() {
  console.log('[性能测试] 开始分组测试...')
  const COUNT = 200
  const employeeIds = []
  for (let i = 1; i <= COUNT; i++) {
    employeeIds.push(String(i).padStart(8, '0'))
  }

  // 获取景点
  const spotsRes = await db.collection('scenic_spots').limit(10).get()
  const spotIds = spotsRes.data.map(s => s.spotId)
  if (spotIds.length === 0) {
    return { success: false, message: '请先添加景点' }
  }

  // 创建测试游戏
  const groupCount = Math.ceil(COUNT / 3)
  const startTime = Date.now()

  const res = await cloud.callFunction({
    name: 'createGame',
    data: {
      name: `测试游戏_${new Date().toLocaleTimeString()}`,
      description: '性能测试自动创建',
      creatorId: '00000000',
      participantIds: employeeIds,
      groupCount,
      memberPerGroup: 3,
      spotIds: spotIds.slice(0, 3),
      spotsPerGroup: 3,
    }
  })

  const createTime = Date.now() - startTime

  if (!res.result.success) {
    return { success: false, createTime, message: res.result.message }
  }

  const gameId = res.result.gameId

  // 查询分组结果
  const participantsRes = await db.collection('game_participants')
    .where({ gameId })
    .limit(300)
    .get()

  const groups = {}
  participantsRes.data.forEach(p => {
    if (!groups[p.groupNumber]) groups[p.groupNumber] = []
    groups[p.groupNumber].push(p.employeeId)
  })

  const groupSizes = Object.values(groups).map(m => m.length)
  const avgSize = groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length
  const variance = groupSizes.reduce((a, b) => a + (b - avgSize) ** 2, 0) / groupSizes.length

  // 完整分组列表（数组格式，方便前端渲染）
  const fullGrouping = Object.keys(groups)
    .sort((a, b) => +a - +b)
    .map(g => ({
      groupNumber: +g,
      count: groups[g].length,
      members: groups[g],
    }))

  return {
    success: true,
    gameId,
    createTime,
    groupCount: Object.keys(groups).length,
    participantCount: participantsRes.data.length,
    groupSizes: {
      min: Math.min(...groupSizes),
      max: Math.max(...groupSizes),
      avg: Math.round(avgSize * 10) / 10,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    },
    fullGrouping,
  }
}
