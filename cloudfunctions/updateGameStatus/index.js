// cloudfunctions/updateGameStatus/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, action, employeeId } = event

  try {
    if (!gameId || !action) {
      return { success: false, message: '参数错误' }
    }

    // 查询游戏
    const gameRes = await db.collection('games').doc(gameId).get()
    if (!gameRes.data) {
      return { success: false, message: '游戏不存在' }
    }

    const game = gameRes.data

    // 验证操作者身份：必须是管理员或是创建者
    const isAdmin = await checkIsAdmin(employeeId)
    if (!isAdmin && game.creatorId !== employeeId) {
      return { success: false, message: '只有管理员或创建者可以操作' }
    }

    // 解析操作
    let newStatus = null
    if (action === 'start') {
      if (game.status === 'active') {
        return { success: false, message: '游戏已经开始' }
      }
      newStatus = 'active'
    } else if (action === 'finish') {
      if (game.status === 'finished') {
        return { success: false, message: '游戏已结束' }
      }
      newStatus = 'finished'
    } else if (action === 'cancel') {
      newStatus = 'cancelled'
    } else {
      return { success: false, message: '未知操作' }
    }

    await db.collection('games').doc(gameId).update({
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    })

    const statusText = newStatus === 'active' ? '已开始' : newStatus === 'finished' ? '已结束' : '已取消'
    return {
      success: true,
      message: '游戏' + statusText,
      status: newStatus
    }
  } catch (err) {
    console.error('[updateGameStatus] 错误:', err)
    return { success: false, message: '服务器错误' }
  }
}

/**
 * 检查员工是否为管理员
 */
async function checkIsAdmin(employeeId) {
  try {
    const res = await db.collection('employees')
      .where({ employeeId: employeeId, isAdmin: true })
      .limit(1)
      .get()
    return res.data.length > 0
  } catch (err) {
    return false
  }
}
