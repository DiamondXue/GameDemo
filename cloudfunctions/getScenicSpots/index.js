// cloudfunctions/getScenicSpots/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { gameId, teamNumber } = event

  try {
    // 1. 获取该组在此游戏中的景点映射
    const mappingRes = await db.collection('team_spot_mapping')
      .where({ gameId: gameId, teamNumber: teamNumber })
      .orderBy('sequence', 'asc')
      .get()

    if (mappingRes.data.length === 0) {
      return { success: true, spots: [] }
    }

    const spotIds = mappingRes.data.map(m => m.spotId)

    // 2. 获取景点详情
    const spotsRes = await db.collection('scenic_spots')
      .where({
        spotId: db.command.in(spotIds)
      })
      .get()

    // 3. 获取打卡记录
    const recordsRes = await db.collection('checkin_records')
      .where({
        gameId: gameId,
        teamNumber: teamNumber
      })
      .get()

    const checkedSpotIds = recordsRes.data.map(r => r.spotId)

    // 4. 组装返回数据
    const spotsMap = {}
    spotsRes.data.forEach(spot => {
      spotsMap[spot.spotId] = spot
    })

    const spots = mappingRes.data.map(mapping => {
      const spot = spotsMap[mapping.spotId] || {}
      return {
        spotId: mapping.spotId,
        name: spot.name || '未知景点',
        description: spot.description || '',
        latitude: spot.geoPoint ? spot.geoPoint.latitude : 0,
        longitude: spot.geoPoint ? spot.geoPoint.longitude : 0,
        radius: spot.radius || 20,
        image: spot.image || '',
        checked: checkedSpotIds.includes(mapping.spotId),
        sequence: mapping.sequence
      }
    })

    return { success: true, spots: spots }
  } catch (err) {
    console.error('获取景点失败:', err)
    return { success: false, message: '服务器错误，请稍后重试', spots: [] }
  }
}
