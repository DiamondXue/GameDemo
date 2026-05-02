// cloudfunctions/getTeamProgress/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, teamNumber } = event

  try {
    // 1. 获取该组在该游戏中的打卡记录
    const records = await db.collection('checkin_records')
      .where({ gameId: gameId, teamNumber: teamNumber })
      .orderBy('sequence', 'asc')
      .get()

    // 2. 获取景点信息
    const spotIds = records.data.map(r => r.spotId)
    let spotsMap = {}

    if (spotIds.length > 0) {
      const spotsRes = await db.collection('scenic_spots')
        .where({ spotId: db.command.in(spotIds) })
        .get()

      spotsRes.data.forEach(spot => {
        spotsMap[spot.spotId] = spot.name
      })
    }

    // 3. 获取游戏配置中的 spotsPerGroup
    let totalSpots = 3
    try {
      const gameRes = await db.collection('games').doc(gameId).get()
      if (gameRes.data && gameRes.data.spotsPerGroup) {
        totalSpots = gameRes.data.spotsPerGroup
      }
    } catch (e) {
      // game doc might not exist yet
    }

    // 4. 组装已收集数字
    const collectedDigits = records.data.map(record => ({
      spotId: record.spotId,
      spotName: spotsMap[record.spotId] || '未知景点',
      digit: record.unlockedDigit,
      sequence: record.sequence,
      checkInTime: formatTime(record.checkInTime)
    }))

    // 5. 计算最终密令
    let finalCode = null
    if (collectedDigits.length === totalSpots) {
      finalCode = collectedDigits.map(d => d.digit).join('')
    }

    return {
      success: true,
      collectedDigits: collectedDigits,
      collectedCount: collectedDigits.length,
      totalSpots: totalSpots,
      finalCode: finalCode
    }
  } catch (err) {
    console.error('获取进度失败:', err)
    return { success: false, message: '服务器错误，请稍后重试' }
  }
}

function formatTime(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
