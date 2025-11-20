// cloudfunctions/getScenicSpots/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { teamNumber } = event
  
  try {
    // 1. 获取所有景点
    const spotsRes = await db.collection('scenic_spots')
      .get()
    
    // 2. 获取该组的打卡记录
    const recordsRes = await db.collection('checkin_records')
      .where({ teamNumber: teamNumber })
      .get()
    
    const checkedSpotIds = recordsRes.data.map(r => r.spotId)
    
    // 3. 组装景点信息
    const spots = spotsRes.data.map(spot => ({
      spotId: spot.spotId,
      name: spot.name,
      description: spot.description,
      latitude: spot.geoPoint.latitude,
      longitude: spot.geoPoint.longitude,
      radius: spot.radius || 20,
      image: spot.image || '',
      checked: checkedSpotIds.includes(spot.spotId)
    }))
    
    return {
      success: true,
      spots: spots
    }
    
  } catch (err) {
    console.error('获取景点失败:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试',
      spots: []
    }
  }
}
