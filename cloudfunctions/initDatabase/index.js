const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const data = require('./init_data.json')

  const results = {}
  const collections = ['employees', 'games', 'game_participants']

  try {
    for (const colName of collections) {
      const records = data.collections[colName]
      if (!records || records.length === 0) {
        results[colName] = { success: true, count: 0, message: '无数据' }
        continue
      }

      // 逐条插入，避免 _id 冲突
      let inserted = 0
      let skipped = 0

      for (const record of records) {
        try {
          await db.collection(colName).add({ data: record })
          inserted++
        } catch (e) {
          // _id 重复就跳过
          if (e.errCode === -1 && e.errMsg.includes('duplicate')) {
            skipped++
          } else {
            throw e
          }
        }
      }

      results[colName] = {
        success: true,
        count: inserted,
        skipped
      }
    }

    return { success: true, results }
  } catch (err) {
    console.error('导入失败:', err)
    return { success: false, message: err.message, results }
  }
}
