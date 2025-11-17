// cloudfunctions/verifyFinalCode/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { teamNumber, submittedCode } = event
  
  try {
    // 1. 获取该组的打卡记录
    const records = await db.collection('checkin_records')
      .where({ teamNumber: teamNumber })
      .orderBy('sequence', 'asc')
      .get()
    
    if (records.data.length < 3) {
      return {
        success: false,
        message: `您还未收集完所有数字，当前进度：${records.data.length}/3`
      }
    }
    
    // 2. 生成正确密令
    const correctCode = records.data
      .map(r => r.unlockedDigit)
      .join('')
    
    // 3. 验证密令
    if (submittedCode === correctCode) {
      return {
        success: true,
        message: '密令正确！恭喜完成游戏！',
        correctCode: correctCode
      }
    } else {
      return {
        success: false,
        message: '密令错误，请检查后重试'
      }
    }
    
  } catch (err) {
    console.error('验证失败:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    }
  }
}
