// cloudfunctions/getAdminDashboard/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { gameId } = event

  if (!gameId) {
    return { success: false, message: '缺少 gameId' }
  }

  try {
    // 1. 获取游戏配置
    let totalSpots = 3
    let gameName = ''
    try {
      const gameRes = await db.collection('games').doc(gameId).get()
      if (gameRes.data) {
        totalSpots = gameRes.data.spotsPerGroup || 3
        gameName = gameRes.data.name || ''
      }
    } catch (e) {}

    // 2. 获取所有打卡记录
    const allRecordsRes = await db.collection('checkin_records')
      .where({ gameId: gameId })
      .orderBy('checkInTime', 'asc')
      .get()

    const allRecords = allRecordsRes.data

    // 3. 获取所有景点映射
    const allMappingsRes = await db.collection('team_spot_mapping')
      .where({ gameId: gameId })
      .get()

    const mappingMap = {}
    allMappingsRes.data.forEach(m => {
      const key = m.teamNumber + '_' + m.spotId
      mappingMap[key] = m
    })

    // 4. 获取景点名称
    const spotIdSet = {}
    allRecords.forEach(r => { spotIdSet[r.spotId] = true })
    const spotIds = Object.keys(spotIdSet).map(Number)
    let spotNameMap = {}
    if (spotIds.length > 0) {
      const spotsRes = await db.collection('scenic_spots')
        .where({ spotId: _.in(spotIds) })
        .get()
      spotsRes.data.forEach(s => {
        spotNameMap[s.spotId] = s.name
      })
    }

    // 5. 按组汇总
    const teamMap = {}

    allRecords.forEach(record => {
      const t = record.teamNumber
      if (!teamMap[t]) {
        teamMap[t] = {
          teamNumber: t,
          checkedSpots: {},
          firstCheckInTime: null,
          lastCheckInTime: null
        }
      }

      const tInfo = teamMap[t]
      tInfo.checkedSpots[record.spotId] = record

      const checkInTime = record.checkInTime.getTime ? record.checkInTime.getTime() : new Date(record.checkInTime).getTime()

      if (!tInfo.firstCheckInTime || checkInTime < tInfo.firstCheckInTime) {
        tInfo.firstCheckInTime = checkInTime
      }
      if (!tInfo.lastCheckInTime || checkInTime > tInfo.lastCheckInTime) {
        tInfo.lastCheckInTime = checkInTime
      }
    })

    // 6. 补全每组信息
    const teams = Object.values(teamMap).map(tInfo => {
      const checkedCount = Object.keys(tInfo.checkedSpots).length
      const isCompleted = checkedCount >= totalSpots
      let totalDuration = null
      if (isCompleted && tInfo.firstCheckInTime && tInfo.lastCheckInTime) {
        totalDuration = tInfo.lastCheckInTime - tInfo.firstCheckInTime
      }

      // 打卡详情列表（按 sequence 排序）
      const details = []
      for (let seq = 1; seq <= totalSpots; seq++) {
        const mapping = Object.values(mappingMap).find(
          m => m.teamNumber === tInfo.teamNumber && m.sequence === seq
        )
        if (mapping) {
          const record = tInfo.checkedSpots[mapping.spotId]
          details.push({
            sequence: seq,
            spotId: mapping.spotId,
            spotName: spotNameMap[mapping.spotId] || '景点' + mapping.spotId,
            checked: !!record,
            checkInTime: record ? formatTime(record.checkInTime) : '',
            unlockedDigit: record ? record.unlockedDigit : null,
            teamPhotoFileID: record ? record.teamPhotoFileID || '' : '',
            distance: record ? record.distance : null
          })
        }
      }

      return {
        teamNumber: tInfo.teamNumber,
        checkedCount,
        totalSpots,
        isCompleted,
        totalDuration,
        totalDurationText: totalDuration ? formatDuration(totalDuration) : '',
        firstCheckInTime: tInfo.firstCheckInTime ? formatTime(tInfo.firstCheckInTime) : '',
        lastCheckInTime: tInfo.lastCheckInTime,
        details
      }
    })

    // 7. 排行榜：已完成组按完成时间升序（最先验证成功的排第一）
    const leaderboard = teams
      .filter(t => t.isCompleted && t.lastCheckInTime)
      .sort((a, b) => a.lastCheckInTime - b.lastCheckInTime)
      .map((t, idx) => ({
        rank: idx + 1,
        teamNumber: t.teamNumber,
        completionTime: formatTime(t.lastCheckInTime),
        totalDuration: t.totalDuration,
        totalDurationText: t.totalDurationText,
        firstCheckInTime: t.firstCheckInTime
      }))

    // 8. 按组号排序
    teams.sort((a, b) => a.teamNumber - b.teamNumber)

    return {
      success: true,
      gameName,
      totalSpots,
      teams,
      leaderboard
    }

  } catch (err) {
    console.error('管理员仪表盘查询失败:', err)
    return { success: false, message: '服务器错误，请稍后重试' }
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

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return hours + '小时' + minutes + '分' + seconds + '秒'
  }
  return minutes + '分' + seconds + '秒'
}
