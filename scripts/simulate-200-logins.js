// scripts/simulate-200-logins.js
// 模拟200个员工登录并测试性能
// 运行方式: node scripts/simulate-200-logins.js

const cloud = require('wx-server-sdk')

// 初始化云环境 - 请替换为你的环境ID
cloud.init({
  env: 'your-env-id', // ← 改成你的云开发环境ID
  traceUser: true
})

const db = cloud.database()

// 模拟的200个员工号（8位数字）
// 如果数据库里已有员工，从这里选200个；否则先批量创建
const EMPLOYEE_IDS = []
for (let i = 1; i <= 200; i++) {
  EMPLOYEE_IDS.push(String(i).padStart(8, '0')) // 00000001 ~ 00000200
}

// 颜色输出
const colors = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
}

async function ensureEmployees() {
  console.log(colors.cyan('[1/4] 检查员工数据...'))
  const existing = await db.collection('employees').limit(200).get()
  const existingIds = new Set(existing.data.map(e => e.employeeId))

  const toCreate = EMPLOYEE_IDS.filter(id => !existingIds.has(id)).map(id => ({
    employeeId: id,
    name: `员工${id}`,
    department: ['技术部', '产品部', '运营部', '设计部'][Math.floor(Math.random() * 4)],
    isAdmin: false,
    createdAt: new Date(),
  }))

  if (toCreate.length > 0) {
    console.log(colors.yellow(`  需创建 ${toCreate.length} 个员工记录...`))
    // 分批插入，每批100条
    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100)
      await Promise.all(batch.map(e => db.collection('employees').add({ data: e })))
    }
    console.log(colors.green(`  ✓ 已创建 ${toCreate.length} 个员工`))
  } else {
    console.log(colors.green(`  ✓ 200个员工已存在`))
  }
  return EMPLOYEE_IDS
}

async function simulateLogins(employeeIds) {
  console.log(colors.cyan('\n[2/4] 模拟登录（并发调用 employeeLogin）...'))
  const results = []
  const startTime = Date.now()

  // 并发调用云函数，每批20个
  const CONCURRENCY = 20
  for (let i = 0; i < employeeIds.length; i += CONCURRENCY) {
    const batch = employeeIds.slice(i, i + CONCURRENCY)
    const promises = batch.map(id =>
      cloud.callFunction({
        name: 'employeeLogin',
        data: { employeeId: id }
      }).then(res => ({
        employeeId: id,
        success: res.result.success,
        time: res.result.usedTime || 0,
        error: null,
      })).catch(err => ({
        employeeId: id,
        success: false,
        time: 0,
        error: err.message,
      }))
    )

    const batchResults = await Promise.all(promises)
    results.push(...batchResults)

    const pct = Math.round((i + CONCURRENCY) / employeeIds.length * 100)
    process.stdout.write(`\r  进度: ${Math.min(pct, 100)}% (${results.length}/${employeeIds.length})`)
  }

  const totalTime = Date.now() - startTime
  console.log('\n')

  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount
  const times = results.filter(r => r.time > 0).map(r => r.time)
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const maxTime = times.length > 0 ? Math.max(...times) : 0

  console.log(colors.green(`  ✓ 登录成功: ${successCount}`))
  if (failCount > 0) console.log(colors.red(`  ✗ 登录失败: ${failCount}`))
  console.log(colors.cyan(`  总耗时: ${totalTime}ms`))
  console.log(colors.cyan(`  平均响应: ${avgTime}ms`))
  console.log(colors.cyan(`  最慢响应: ${maxTime}ms`))

  return results
}

async function createTestGame(employeeIds) {
  console.log(colors.cyan('\n[3/4] 创建测试游戏并分组...'))
  const groupCount = Math.ceil(employeeIds.length / 3) // 每组约3人
  const startTime = Date.now()

  try {
    const res = await cloud.callFunction({
      name: 'createGame',
      data: {
        name: '200人压力测试游戏',
        description: '自动创建用于性能测试',
        creatorId: '00000000', // 管理员账号
        participantIds: employeeIds,
        groupCount: groupCount,
        memberPerGroup: 3,
        spotIds: [1, 2, 3], // 假设有3个景点
        spotsPerGroup: 3,
      }
    })

    const elapsed = Date.now() - startTime
    if (res.result.success) {
      console.log(colors.green(`  ✓ 游戏创建成功! gameId: ${res.result.gameId}`))
      console.log(colors.cyan(`  分组数: ${res.result.groupCount}`))
      console.log(colors.cyan(`  参与人数: ${res.result.participantCount}`))
      console.log(colors.cyan(`  创建耗时: ${elapsed}ms`))
      return res.result.gameId
    } else {
      console.log(colors.red(`  ✗ 创建失败: ${res.result.message}`))
      return null
    }
  } catch (err) {
    console.log(colors.red(`  ✗ 调用失败: ${err.message}`))
    return null
  }
}

async function showGrouping(gameId) {
  console.log(colors.cyan('\n[4/4] 查看分组结果...'))
  if (!gameId) {
    console.log(colors.yellow('  跳过（游戏未创建）'))
    return
  }

  const participants = await db.collection('game_participants')
    .where({ gameId })
    .get()

  // 按 groupNumber 分组
  const groups = {}
  participants.data.forEach(p => {
    if (!groups[p.groupNumber]) groups[p.groupNumber] = []
    groups[p.groupNumber].push(p.employeeId)
  })

  const groupNumbers = Object.keys(groups).map(Number).sort((a, b) => a - b)
  console.log(colors.green(`  ✓ 共 ${groupNumbers.length} 组:`))

  let totalDeviation = 0
  const sizes = []
  for (const g of groupNumbers) {
    const members = groups[g]
    sizes.push(members.length)
    const line = `    第${String(g).padStart(3)}组: ${members.length}人 [${members.join(', ')}]`
    console.log(line.length > 120 ? line.slice(0, 117) + '...]' : line)
  }

  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length
  const variance = sizes.reduce((a, b) => a + (b - avg) ** 2, 0) / sizes.length
  console.log(colors.cyan(`\n  每组人数: 最少${Math.min(...sizes)}，最多${Math.max(...sizes)}，平均${avg.toFixed(1)}，标准差${Math.sqrt(variance).toFixed(2)}`))
}

async function main() {
  console.log(colors.cyan('=== GameDemo 200人登录模拟测试 ===\n'))

  try {
    const employeeIds = await ensureEmployees()
    await simulateLogins(employeeIds)
    const gameId = await createTestGame(employeeIds)
    await showGrouping(gameId)

    console.log(colors.green('\n=== 测试完成 ==='))
    console.log(colors.yellow('提示: 请在云开发控制台查看云函数调用日志以获取更详细的性能数据'))
  } catch (err) {
    console.error(colors.red('\n错误:'), err)
  }
}

main()
