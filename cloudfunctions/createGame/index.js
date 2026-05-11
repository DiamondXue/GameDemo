// cloudfunctions/createGame/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { name, description, creatorId, participantIds, groupCount, memberPerGroup, spotIds, spotsPerGroup } = event

  try {
    // 验证参数
    if (!name || !creatorId || !participantIds || participantIds.length === 0) {
      return { success: false, message: '请填写完整信息' }
    }
    if (!groupCount || groupCount < 1) {
      return { success: false, message: '组数至少为1' }
    }
    if (!memberPerGroup || memberPerGroup < 1) {
      return { success: false, message: '每组人数至少为1' }
    }

    // 查询参与员工信息（分批查询，每批20条，突破默认limit限制）
    const participants = []
    for (let i = 0; i < participantIds.length; i += 20) {
      const batch = participantIds.slice(i, i + 20)
      const empRes = await db.collection('employees')
        .where({ employeeId: db.command.in(batch) })
        .get()
      participants.push(...empRes.data)
    }

    // 检查是否有员工号不存在
    const foundIds = new Set(participants.map(e => e.employeeId))
    const missingIds = participantIds.filter(id => !foundIds.has(id))
    if (missingIds.length > 0) {
      return { success: false, message: `以下员工号不存在: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? ' 等' + missingIds.length + '人' : ''}` }
    }
    const totalSlots = groupCount * memberPerGroup

    // 检查参与者人数
    if (participants.length > totalSlots) {
      return {
        success: false,
        message: `参与人数(${participants.length})超出容量(${totalSlots})，请减少参与员工或增加组数/每组人数`
      }
    }

    // 自动分组算法：轮询均匀分配
    const groups = autoGroup(participants, groupCount, memberPerGroup)

    console.log('[createGame] 分组结果:', JSON.stringify(groups.map(g => ({
      groupNumber: g.groupNumber,
      count: g.members.length,
      members: g.members.map(m => m.employeeId + '/' + m.name)
    }))))

    // 创建游戏记录
    const gameData = {
      name: name,
      description: description || '',
      creatorId: creatorId,
      status: 'pending', // pending: 待开始, active: 进行中, finished: 已结束, cancelled: 已取消
      groupCount: groupCount,
      memberPerGroup: memberPerGroup,
      spotIds: spotIds || [], // 关联的景点ID列表
      spotsPerGroup: spotsPerGroup || 3, // 每组需要打卡的景点数
      participantCount: participants.length,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const addRes = await db.collection('games').add({ data: gameData })
    const gameId = addRes._id

    // 创建参与者记录
    const participantRecords = participants.map(emp => {
      // 找到该员工所在的组
      const groupInfo = groups.find(g =>
        g.members.some(m => m.employeeId === emp.employeeId)
      )

      return {
        gameId: gameId,
        employeeId: emp.employeeId,
        department: emp.department,
        name: emp.name || '',
        groupNumber: groupInfo ? groupInfo.groupNumber : 0,
        joinedAt: new Date()
      }
    })

    console.log('[createGame] 参与者记录样例:', JSON.stringify(participantRecords.slice(0, 3)))

    // 批量写入参与者（云数据库每次最多添加100条）
    const batchSize = 100
    for (let i = 0; i < participantRecords.length; i += batchSize) {
      const batch = participantRecords.slice(i, i + batchSize)
      const promises = batch.map(record => db.collection('game_participants').add({ data: record }))
      await Promise.all(promises)
    }

    // 如果有指定景点，生成组-景点映射
    if (spotIds && spotIds.length > 0) {
      await generateTeamSpotMappings(gameId, groups, spotIds, spotsPerGroup || 3)
    }

    return {
      success: true,
      message: '游戏创建成功',
      gameId: gameId,
      groupCount: groupCount,
      participantCount: participants.length
    }
  } catch (err) {
    console.error('创建游戏失败:', err)
    return {
      success: false,
      message: '创建失败：' + (err.message || '服务器错误')
    }
  }
}

/**
 * 自动分组算法
 * 轮询均匀分配，确保每组人数不超过 memberPerGroup
 * @param {Array} participants - 参与者列表
 * @param {Number} groupCount - 组数
 * @param {Number} memberPerGroup - 每组最大人数
 * @returns {Array} 分组结果
 */
function autoGroup(participants, groupCount, memberPerGroup) {
  const groups = []
  for (let i = 0; i < groupCount; i++) {
    groups.push({
      groupNumber: i + 1,
      members: []
    })
  }

  // 轮询分配：每个参与者轮流加入当前人数最少且未满的组
  for (const member of participants) {
    // 找到当前人数最少且未满的组
    let minGroup = null
    for (const group of groups) {
      if (group.members.length < memberPerGroup) {
        if (!minGroup || group.members.length < minGroup.members.length) {
          minGroup = group
        }
      }
    }
    if (minGroup) {
      minGroup.members.push(member)
    }
  }

  return groups
}

/**
 * 为每组生成景点-数字映射
 */
async function generateTeamSpotMappings(gameId, groups, spotIds, spotsPerGroup) {
  const mappingPromises = []

  groups.forEach(group => {
    // 为每组从景点池中选择 spotsPerGroup 个景点
    // 使用固定策略：基于组号错开起始位置，确保不同组路线不同
    const selectedSpots = []
    const startIndex = (group.groupNumber - 1) % spotIds.length

    for (let i = 0; i < spotsPerGroup && i < spotIds.length; i++) {
      const spotIndex = (startIndex + i) % spotIds.length
      selectedSpots.push({
        spotId: spotIds[spotIndex],
        sequence: i + 1,
        digit: i + 1 // 简化：第1个景点对应数字1，以此类推
      })
    }

    // 保存映射到数据库
    selectedSpots.forEach(spot => {
      mappingPromises.push(
        db.collection('team_spot_mapping').add({
          data: {
            gameId: gameId,
            teamNumber: group.groupNumber,
            spotId: spot.spotId,
            digit: spot.digit,
            sequence: spot.sequence
          }
        })
      )
    })
  })

  await Promise.all(mappingPromises)
}
