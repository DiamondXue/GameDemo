// cloudfunctions/exportUnchecked/index.js
// 导出未签到名单（支持全部/按组导出）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { gameId, groupNumber } = event

  if (!gameId) {
    return { success: false, message: '缺少 gameId' }
  }

  try {
    // 1. 获取游戏配置
    let totalSpots = 3
    try {
      const gameRes = await db.collection('games').doc(gameId).get()
      if (gameRes.data) {
        totalSpots = gameRes.data.spotsPerGroup || 3
      }
    } catch (e) {}

    // 2. 获取所有参与队员
    const participantsRes = await db.collection('game_participants')
      .where({ gameId: gameId })
      .limit(500)
      .get()

    if (!participantsRes.data || participantsRes.data.length === 0) {
      return { success: true, data: { headers: [], rows: [], title: '暂无参与人员' } }
    }

    // 3. 按组分组队员
    const allGroups = {}
    participantsRes.data.forEach(p => {
      const g = p.groupNumber
      if (!allGroups[g]) allGroups[g] = []
      allGroups[g].push({
        employeeId: p.employeeId,
        name: p.name || p.employeeId,
        department: p.department || '未设置'
      })
    })

    // 4. 如果指定了 groupNumber，只处理该组
    let targetGroups = allGroups
    if (groupNumber) {
      if (allGroups[groupNumber]) {
        targetGroups = {}
        targetGroups[groupNumber] = allGroups[groupNumber]
      } else {
        return { success: true, data: { headers: [], rows: [], title: `第 ${groupNumber} 组无参与人员` } }
      }
    }

    // 5. 获取所有打卡记录
    const allRecordsRes = await db.collection('checkin_records')
      .where({ gameId: gameId })
      .get()
    const checkedMap = {} // key: teamNumber_spotId
    allRecordsRes.data.forEach(r => {
      checkedMap[r.teamNumber + '_' + r.spotId] = true
    })

    // 6. 获取景点映射
    const mappingRes = await db.collection('team_spot_mapping')
      .where({ gameId: gameId })
      .get()
    const mappingMap = {}
    mappingRes.data.forEach(m => {
      const key = m.teamNumber + '_' + m.sequence
      mappingMap[key] = m.spotId
    })

    // 7. 获取景点名称
    const spotIdSet = {}
    mappingRes.data.forEach(m => { spotIdSet[m.spotId] = true })
    const spotIds = Object.keys(spotIdSet).map(Number)
    let spotNameMap = {}
    if (spotIds.length > 0) {
      const spotsRes = await db.collection('scenic_spots')
        .where({ spotId: _.in(spotIds) })
        .get()
      spotsRes.data.forEach(s => { spotNameMap[s.spotId] = s.name })
    }

    // 8. 构建未签到名单
    const headers = ['组号', '工号', '姓名', '部门', '未签到景点']
    const rows = []

    const sortedGroups = Object.keys(targetGroups).sort((a, b) => Number(a) - Number(b))

    for (const gNum of sortedGroups) {
      const members = targetGroups[gNum]
      // 找出该组未签到的景点
      const uncheckedSpots = []
      for (let seq = 1; seq <= totalSpots; seq++) {
        const spotId = mappingMap[gNum + '_' + seq]
        if (spotId && !checkedMap[gNum + '_' + spotId]) {
          uncheckedSpots.push(spotNameMap[spotId] || ('景点' + spotId))
        }
      }

      if (uncheckedSpots.length > 0) {
        // 该组有未签到景点，列出所有队员
        members.forEach(m => {
          rows.push([
            '第 ' + gNum + ' 组',
            m.employeeId,
            m.name,
            m.department,
            uncheckedSpots.join('、')
          ])
        })
      }
    }

    const title = groupNumber
      ? `第 ${groupNumber} 组未签到名单（共 ${rows.length} 人）`
      : `全部未签到名单（共 ${rows.length} 人，共 ${sortedGroups.length} 组）`

    // 生成纯文本格式（方便复制到剪贴板）
    let text = title + '\n'
    text += '导出时间：' + formatTime(new Date()) + '\n'
    text += '━━━━━━━━━━━━━━━━━━━━\n\n'

    if (rows.length === 0) {
      text += '🎉 所有人员均已签到完毕！\n'
    } else {
      // 按组分组输出
      let currentGroup = ''
      rows.forEach((row, idx) => {
        if (row[0] !== currentGroup) {
          currentGroup = row[0]
          text += '【' + currentGroup + '】\n'
        }
        text += '  ' + (idx + 1) + '. ' + row[1] + '  ' + row[2] + '  ' + row[3] + '\n'
        text += '    未签到：' + row[4] + '\n'
      })
    }

    return {
      success: true,
      data: {
        title,
        headers,
        rows,
        text,
        total: rows.length
      }
    }

  } catch (err) {
    console.error('导出未签到名单失败:', err)
    return { success: false, message: '服务器错误：' + err.message }
  }
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + sec
}
