// cloudfunctions/getTeamPoems/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, teamNumber } = event

  try {
    // 获取该组在此游戏中的景点映射
    const mappingRes = await db.collection('team_spot_mapping')
      .where({ gameId: gameId, teamNumber: teamNumber })
      .orderBy('sequence', 'asc')
      .get()

    if (mappingRes.data.length === 0) {
      return { success: false, message: '未找到该组的寻密路线' }
    }

    // 获取景点详细信息
    const spotIds = mappingRes.data.map(m => m.spotId)
    const spotsRes = await db.collection('scenic_spots')
      .where({ spotId: db.command.in(spotIds) })
      .get()

    const spotsMap = {}
    spotsRes.data.forEach(spot => {
      spotsMap[spot.spotId] = spot.name
    })

    const poems = mappingRes.data.map(mapping => ({
      spotId: mapping.spotId,
      spotName: spotsMap[mapping.spotId] || '未知景点',
      sequence: mapping.sequence,
      poem: mapping.poem || ''
    }))

    return { success: true, poems: poems }
  } catch (err) {
    console.error('获取诗句失败:', err)
    return { success: false, message: '服务器错误，请稍后重试' }
  }
}
