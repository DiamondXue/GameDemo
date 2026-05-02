// cloudfunctions/getMyGames/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { employeeId } = event

  try {
    if (!employeeId) {
      return { success: false, message: '未登录' }
    }

    // 查询该员工参与的所有游戏
    const partRes = await db.collection('game_participants')
      .where({ employeeId: employeeId })
      .orderBy('joinedAt', 'desc')
      .get()

    if (partRes.data.length === 0) {
      return { success: true, games: [] }
    }

    // 去重获取所有 gameId
    const gameIds = [...new Set(partRes.data.map(p => p.gameId))]

    // 批量查询游戏，用 where + in，避免某个游戏不存在导致整次查询失败
    const gameRes = await db.collection('games')
      .where({
        _id: db.command.in(gameIds)
      })
      .get()

    // 转为 map，方便快速查找
    const gameMap = {}
    ;(gameRes.data || []).forEach(game => {
      gameMap[game._id] = game
    })

    // 组装数据，只保留实际存在的游戏
    const games = partRes.data
      .map(p => {
        const game = gameMap[p.gameId]
        if (!game) return null  // 游戏已被删除，跳过

        return {
          gameId: game._id,
          name: game.name,
          description: game.description || '',
          status: game.status,
          groupNumber: p.groupNumber || 0,
          creatorId: game.creatorId,
          participantCount: game.participantCount || 0,
          groupCount: game.groupCount || 0,
          spotsPerGroup: game.spotsPerGroup || 3,
          createdAt: formatTime(game.createdAt)
        }
      })
      .filter(g => g !== null)

    return {
      success: true,
      games: games
    }
  } catch (err) {
    console.error('[getMyGames] 错误:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    }
  }
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
