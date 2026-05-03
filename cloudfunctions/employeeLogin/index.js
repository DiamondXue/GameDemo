// cloudfunctions/employeeLogin/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { employeeId } = event

  try {
    if (!employeeId || employeeId.length !== 8 || !/^\d{8}$/.test(employeeId)) {
      return { success: false, message: '请输入正确的8位员工号' }
    }

    const empRes = await db.collection('employees')
      .where({ employeeId: employeeId })
      .get()

    if (empRes.data.length === 0) {
      return { success: false, message: '员工号不存在，请联系管理员添加' }
    }

    const employee = empRes.data[0]

    return {
      success: true,
      userInfo: {
        employeeId: employee.employeeId,
        department: employee.department,
        name: employee.name || '',
        isAdmin: employee.isAdmin || false  // 新增：是否管理员
      }
    }
  } catch (err) {
    console.error('登录失败:', err)
    return { success: false, message: '服务器错误，请稍后重试' }
  }
}
