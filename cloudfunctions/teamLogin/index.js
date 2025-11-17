// cloudfunctions/teamLogin/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { teamNumber, members } = event
  
  try {
    // 验证组号
    if (!teamNumber || teamNumber < 1 || teamNumber > 12) {
      return {
        success: false,
        message: '组号必须在1-12之间'
      }
    }

    // 验证成员
    if (!members || members.length === 0) {
      return {
        success: false,
        message: '至少需要一名成员'
      }
    }

    // 查询该组是否已存在
    const teamRes = await db.collection('teams')
      .where({ teamNumber })
      .get()

    let teamInfo = null

    if (teamRes.data.length > 0) {
      // 组已存在，更新成员信息
      teamInfo = teamRes.data[0]
      await db.collection('teams')
        .doc(teamInfo._id)
        .update({
          data: {
            members: members,
            lastLoginTime: new Date()
          }
        })
    } else {
      // 创建新组
      const addRes = await db.collection('teams').add({
        data: {
          teamNumber: teamNumber,
          members: members,
          createdTime: new Date(),
          lastLoginTime: new Date()
        }
      })
      
      teamInfo = {
        _id: addRes._id,
        teamNumber: teamNumber,
        members: members
      }
    }

    return {
      success: true,
      teamInfo: {
        teamNumber: teamNumber,
        members: members
      }
    }
  } catch (err) {
    console.error('登录失败:', err)
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    }
  }
}
