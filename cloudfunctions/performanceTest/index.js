// cloudfunctions/performanceTest/index.js
// 性能测试：模拟200用户登录 + 查看分组情况
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  // 简单鉴权：需要传入正确的 secret
  if (event.secret !== 'gamedemo-test-2026') {
    return { success: false, message: '无权限（需要 secret token）' }
  }

  const { action = 'full' } = event

  try {
    if (action === 'login only') {
      return await testLoginPerformance()
    } else if (action === 'grouping only') {
      return await testGrouping()
    } else {
      // 完整测试
      const loginResult = await testLoginPerformance()
      const groupingResult = await testGrouping()
      return {
        success: true,
        loginTest: loginResult,
        groupingTest: groupingResult,
      }
    }
  } catch (err) {
    console.error('性能测试失败:', err)
    return { success: false, message: err.message }
  }
}

/**
 * 模拟200个员工登录，测试性能
 */
async function testLoginPerformance() {
  console.log('[性能测试] 开始登录性能测试...')
  const EMPLOYEE_IDS = []
  for (let i = 1; i <= 200; i++) {
    EMPLOYEE_IDS.push(String(i).padStart(8, '0'))
  }

  // 1. 确保员工存在
  const existingRes = await db.collection('employees').limit(300).get()
  const existingIds = new Set(existingRes.data.map(e => e.employeeId))
  const toCreate = EMPLOYEE_IDS.filter(id => !existingIds.has(id)).map(id => ({
    employeeId: id,
    name: `员工${id}`,
    department: ['技术部', '产品部', '运营部', '设计部'][Math.floor(Math.random() * 4)],
    isAdmin: false,
    createdAt: new Date(),
    lastLoginAt: null,
  }))

  if (toCreate.length > 0) {
    console.log(`[性能测试] 创建 ${toCreate.length} 个测试员工...`)
    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100)
      await Promise.all(batch.map(e => db.collection('employees').add({ data: e })))
    }
  }

  // 2. 并发登录测试（每批20个）
  const CONCURRENCY = 20
  const results = []
  const startTime = Date.now()

  for (let i = 0; i < EMPLOYEE_IDS.length; i += CONCURRENCY) {
    const batch = EMPLOYEE_IDS.slice(i, i + CONCURRENCY)
    const batchStart = Date.now()
    await Promise.all(batch.map(async (id) => {
      const t0 = Date.now()
      try {
        const res = await cloud.callFunction({
          name: 'employeeLogin',
          data: { employeeId: id }
        })
        results.push({
          employeeId: id,
          success: res.result.success,
          time: Date.now() - t0,
        })
      } catch (err) {
        results.push({
          employeeId: id,
          success: false,
          time: Date.now() - t0,
          error: err.message,
        })
      }
    }))
    const batchTime = Date.now() - batchStart
    console.log(`[性能测试] 登录进度: ${Math.min(i + CONCURRENCY, 200)}/200，本批耗时: ${batchTime}ms`)
  }

  const totalTime = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount
  const times = results.map(r => r.time)
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const maxTime = Math.max(...times)
  const minTime = Math.min(...times)

  // 百分位
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]

  console.log('[性能测试] 登录测试完成:', {
    totalTime,
    successCount,
    failCount,
    avgTime,
    p50, p95, p99,
  })

  return {
    totalTime,
    successCount,
    failCount,
    avgTime: Math.round(avgTime),
    minTime,
    maxTime,
    p50, p95, p99,
    details: results,
  }
}

/**
 * 测试分组：创建游戏，查看分组结果
 */
async function testGrouping() {
  console.log('[性能测试] 开始分组测试...')
  const EMPLOYEE_IDS = []
  for (let i = 1; i <= 200; i++) {
    EMPLOYEE_IDS.push(String(i).padStart(8, '0'))
  }

  // 1. 获取景点列表（用于分组映射）
  const spotsRes = await db.collection('scenic_spots').limit(10).get()
  const spotIds = spotsRes.data.map(s => s.spotId)
  if (spotIds.length === 0) {
    return { success: false, message: '请先添加景点' }
  }

  // 2. 创建测试游戏
  const groupCount = Math.ceil(200 / 3) // 每组约3人
  const startTime = Date.now()
  const createRes = await cloud.callFunction({
    name: 'createGame',
    data: {
      name: `200人测试游戏_${Date.now()}`,
      description: '自动性能测试',
      creatorId: '00000000',
      participantIds: EMPLOYEE_IDS,
      groupCount,
      memberPerGroup: 3,
      spotIds: spotIds.slice(0, 3),
      spotsPerGroup: 3,
    }
  })

  const createTime = Date.now() - startTime

  if (!createRes.result.success) {
    return {
      success: false,
      createTime,
      message: createRes.result.message,
    }
  }

  const gameId = createRes.result.gameId
  console.log(`[性能测试] 游戏创建成功: ${gameId}，耗时: ${createTime}ms`)

  // 3. 查询分组结果
  const participantsRes = await db.collection('game_participants').where({ gameId }).get()
  const groups = {}
  participantsRes.data.forEach(p => {
    if (!groups[p.groupNumber]) groups[p.groupNumber] = []
    groups[p.groupNumber].push(p.employeeId)
  })

  const groupSizes = Object.values(groups).map(m => m.length)
  const avgSize = groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length
  const variance = groupSizes.reduce((a, b) => a + (b - avgSize) ** 2, 0) / groupSizes.length

  // 分组详情（前10组）
  const preview = {}
  Object.keys(groups).slice(0, 10).forEach(g => {
    preview[`第${g}组`] = {
      count: groups[g].length,
      members: groups[g].slice(0, 5), // 只显示前5个
    }
  })

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
    groupingPreview: preview,
    // 完整分组（仅返回前50组避免数据过大）
    fullGrouping: Object.keys(groups).slice(0, 50).reduce((acc, g) => {
      acc[g] = { count: groups[g].length, members: groups[g] }
      return acc
    }, {}),
  }
}
