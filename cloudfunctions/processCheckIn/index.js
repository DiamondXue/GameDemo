// cloudfunctions/processCheckIn/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { teamNumber, spotId, location } = event
  
  try {
    // 1. 获取景点信息
    const spotRes = await db.collection('scenic_spots')
      .where({ spotId: spotId })
      .get()
    
    if (spotRes.data.length === 0) {
      return { success: false, message: '景点不存在' }
    }
    
    const spot = spotRes.data[0]
    
    // 2. 计算距离
    const distance = calculateDistance(
      location.lat, 
      location.lon,
      spot.geoPoint.latitude,
      spot.geoPoint.longitude
    )
    
    // 3. 验证是否在有效范围内
    const validRadius = spot.radius || 10
    if (distance > validRadius) {
      return { 
        success: false, 
        message: `您距离景点还有${distance}米，请靠近景点后再打卡（需在${validRadius}米范围内）` 
      }
    }
    
    // 4. 检查是否已打卡过
    const existingRecord = await db.collection('checkin_records')
      .where({
        teamNumber: teamNumber,
        spotId: spotId
      })
      .get()
    
    if (existingRecord.data.length > 0) {
      return { success: false, message: '该景点已打卡，不可重复打卡' }
    }
    
    // 5. 获取该组在该景点的数字映射
    const mappingRes = await db.collection('team_spot_mapping')
      .where({
        teamNumber: teamNumber,
        spotId: spotId
      })
      .get()
    
    if (mappingRes.data.length === 0) {
      return { success: false, message: '该景点不在您的寻密路线中' }
    }
    
    const mapping = mappingRes.data[0]
    const unlockedDigit = mapping.digit
    
    // 6. 记录打卡
    await db.collection('checkin_records').add({
      data: {
        teamNumber: teamNumber,
        spotId: spotId,
        checkInTime: new Date(),
        location: new db.Geo.Point(location.lon, location.lat),
        distance: distance,
        unlockedDigit: unlockedDigit,
        sequence: mapping.sequence
      }
    })
    
    // 7. 检查已收集数字数量
    const allRecords = await db.collection('checkin_records')
      .where({ teamNumber: teamNumber })
      .orderBy('sequence', 'asc')
      .get()
    
    let finalCode = null
    if (allRecords.data.length === 3) {
      // 按顺序组合密令
      finalCode = allRecords.data
        .map(r => r.unlockedDigit)
        .join('')
    }
    
    return {
      success: true,
      unlockedDigit: unlockedDigit,
      collectedCount: allRecords.data.length,
      finalCode: finalCode
    }
    
  } catch (err) {
    console.error('打卡失败:', err)
    return { success: false, message: '服务器错误，请稍后重试' }
  }
}

// Haversine距离计算函数
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}
