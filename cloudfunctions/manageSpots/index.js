// cloudfunctions/manageSpots/index.js
// 打卡点管理：list（全部）、add（新增）、update（更新）、delete（删除）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'list': {
        const res = await db.collection('scenic_spots')
          .orderBy('spotId', 'asc')
          .get()
        return { success: true, spots: res.data }
      }

      case 'add': {
        const { name, description, latitude, longitude, radius, image, sampleImage } = event

        if (!name || latitude === undefined || longitude === undefined) {
          return { success: false, message: '请提供名称 and 坐标' }
        }

        // 生成新 spotId（取当前最大值 +1）
        const maxRes = await db.collection('scenic_spots')
          .orderBy('spotId', 'desc')
          .limit(1)
          .get()
        const maxSpotId = maxRes.data.length > 0 ? maxRes.data[0].spotId : 0
        const newSpotId = maxSpotId + 1

        const newSpot = {
          spotId: newSpotId,
          name: name,
          description: description || '',
          geoPoint: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          radius: radius || 20,
          image: image || '',
          sampleImage: sampleImage || '',
          isCustom: true,
          createdAt: new Date()
        }

        const addRes = await db.collection('scenic_spots').add({ data: newSpot })
        return {
          success: true,
          message: '打卡点添加成功',
          spotId: newSpotId,
          _id: addRes._id
        }
      }

      case 'update': {
        const { spotId, name, description, latitude, longitude, radius, image, sampleImage } = event

        if (!spotId) {
          return { success: false, message: '请提供 spotId' }
        }

        const updateData = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (latitude !== undefined && longitude !== undefined) {
          updateData.geoPoint = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          }
        }
        if (radius !== undefined) updateData.radius = radius
        if (image !== undefined) updateData.image = image
        if (sampleImage !== undefined) updateData.sampleImage = sampleImage

        await db.collection('scenic_spots')
          .where({ spotId: spotId })
          .update({ data: updateData })

        return { success: true, message: '打卡点更新成功' }
      }

      case 'delete': {
        const { spotId } = event
        if (!spotId) {
          return { success: false, message: '请提供 spotId' }
        }

        await db.collection('scenic_spots')
          .where({ spotId: spotId })
          .remove()

        return { success: true, message: '打卡点已删除' }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('manageSpots 错误:', err)
    return { success: false, message: '服务器错误：' + (err.message || '') }
  }
}
