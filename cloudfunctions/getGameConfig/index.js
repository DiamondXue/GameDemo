// cloudfunctions/getGameConfig/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取游戏配置
    const configRes = await db.collection('game_config')
      .limit(1)
      .get()
    
    let config = {
      isActive: true,
      totalSpots: 6,
      checkInRadius: 50
    }
    
    if (configRes.data.length > 0) {
      config = configRes.data[0]
    }
    
    return {
      success: true,
      config: config
    }
    
  } catch (err) {
    console.error('获取配置失败:', err)
    return {
      success: false,
      message: '服务器错误',
      config: {
        isActive: true,
        totalSpots: 6,
        checkInRadius: 50
      }
    }
  }
}
