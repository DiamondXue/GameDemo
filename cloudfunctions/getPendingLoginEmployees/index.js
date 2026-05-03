// cloudfunctions/getPendingLoginEmployees/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { keyword, department } = event

  try {
    // 未登录条件：lastLoginAt 不存在 OR lastLoginAt 为 null
    let baseCondition = _.or([
      { lastLoginAt: _.exists(false) },
      { lastLoginAt: null },
      { lastLoginAt: '' }
    ])

    let query

    if (keyword) {
      const reg = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
      // 合并：未登录 AND (employeeId匹配 OR name匹配)
      query = _.and([
        baseCondition,
        _.or([
          { employeeId: reg },
          { name: reg }
        ])
      ])
    } else {
      query = baseCondition
    }

    if (department) {
      query = _.and([
        query,
        { department: department }
      ])
    }

    console.log('[未登录员工] 查询条件:', JSON.stringify(query))

    const MAX_LIMIT = 100
    let employees = []

    let countRes = await db.collection('employees').where(query).count()
    const total = countRes.total
    console.log('[未登录员工] 查询结果数量:', total)

    const batchTimes = Math.ceil(total / MAX_LIMIT)

    for (let i = 0; i < batchTimes; i++) {
      const batch = await db.collection('employees')
        .where(query)
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .orderBy('department', 'asc')
        .get()
      employees = employees.concat(batch.data)
    }

    // 按部门分组
    const deptMap = {}
    employees.forEach(emp => {
      const dept = emp.department || '未分配'
      if (!deptMap[dept]) {
        deptMap[dept] = []
      }
      deptMap[dept].push(emp)
    })

    const departments = Object.keys(deptMap).sort()

    // 同时获取已登录员工数量
    let loggedInRes = await db.collection('employees').where({
      lastLoginAt: _.neq(null)
    }).count()

    return {
      success: true,
      employees: employees,
      departments: departments,
      deptMap: deptMap,
      total: total,
      loggedInCount: loggedInRes.total
    }
  } catch (err) {
    console.error('获取未登录员工失败:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试',
      error: err.message
    }
  }
}