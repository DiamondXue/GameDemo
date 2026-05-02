// cloudfunctions/activityLocation/index.js
// 管理活动地点配置：获取、设置、更新
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * action: 'get' | 'set' | 'update' | 'delete'
 * 
 * get    - 获取当前活动地点配置（所有用户可调用）
 * set    - 设置活动地点配置（管理员）
 * update - 更新活动地点配置（管理员）
 * delete - 删除活动地点配置（管理员）
 */
exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'get': {
        const res = await db.collection('activity_location')
          .where({ isActive: true })
          .orderBy('updatedAt', 'desc')
          .limit(1)
          .get()

        if (res.data.length === 0) {
          return {
            success: true,
            location: null,
            message: '暂无活动地点配置'
          }
        }

        return {
          success: true,
          location: res.data[0]
        }
      }

      case 'set': {
        const { name, latitude, longitude, radius, description } = event

        if (!latitude || !longitude) {
          return { success: false, message: '请提供活动地点坐标' }
        }

        // 先停用所有已有的活动地点（用 where + update 必须带 query）
        await db.collection('activity_location').where({ isActive: true }).update({
          data: { isActive: false }
        })

        const now = new Date()
        const newLocation = {
          name: name || '活动地点',
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius) || 500,
          description: description || '',
          isActive: true,
          createdBy: wxContext.OPENID,
          createdAt: now,
          updatedAt: now
        }

        const addRes = await db.collection('activity_location').add({
          data: newLocation
        })

        return {
          success: true,
          location: { _id: addRes._id, ...newLocation },
          message: '活动地点设置成功'
        }
      }

      case 'update': {
        const { locationId, name, latitude, longitude, radius, description } = event

        if (!locationId) {
          return { success: false, message: '缺少地点ID' }
        }

        const updateData = { updatedAt: new Date() }
        if (name !== undefined) updateData.name = name
        if (latitude !== undefined) updateData.latitude = parseFloat(latitude)
        if (longitude !== undefined) updateData.longitude = parseFloat(longitude)
        if (radius !== undefined) updateData.radius = parseInt(radius)
        if (description !== undefined) updateData.description = description

        await db.collection('activity_location').doc(locationId).update({
          data: updateData
        })

        return {
          success: true,
          message: '活动地点更新成功'
        }
      }

      case 'delete': {
        const { locationId } = event

        if (!locationId) {
          return { success: false, message: '缺少地点ID' }
        }

        await db.collection('activity_location').doc(locationId).update({
          data: { isActive: false, updatedAt: new Date() }
        })

        return {
          success: true,
          message: '活动地点已停用'
        }
      }

      case 'list': {
        // 获取所有历史配置（管理员用）
        const res = await db.collection('activity_location')
          .orderBy('updatedAt', 'desc')
          .limit(20)
          .get()

        return {
          success: true,
          locations: res.data
        }
      }

      default:
        return { success: false, message: '未知操作: ' + action }
    }
  } catch (err) {
    console.error('活动地点操作失败:', err)
    return {
      success: false,
      message: '操作失败: ' + err.message
    }
  }
}
