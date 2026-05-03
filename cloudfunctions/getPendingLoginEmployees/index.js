// cloudfunctions/getPendingLoginEmployees/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { keyword, department } = event

  try {
    let query = {
      lastLoginAt: db.command.exists(false) // 没有 lastLoginAt = 从未登录过
    }

    if (keyword) {
      const reg = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
      query = db.command.or([
        { employeeId: reg },
        { name: reg }
      ])
    }

    if (department) {
      query.department = department
    }

    const MAX_LIMIT = 100
    let employees = []

    let countRes = await db.collection('employees').where(query).count()
    const total = countRes.total
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

    return {
      success: true,
      employees: employees,
      departments: departments,
      deptMap: deptMap,
      total: total
    }
  } catch (err) {
    console.error('获取未登录员工失败:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    }
  }
}