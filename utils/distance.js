/**
 * 计算两个经纬度坐标之间的距离
 * @param {number} lat1 - 第一个点的纬度
 * @param {number} lon1 - 第一个点的经度
 * @param {number} lat2 - 第二个点的纬度
 * @param {number} lon2 - 第二个点的经度
 * @returns {number} 距离（米）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // 地球半径（米）
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance)
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * 格式化距离显示
 * @param {number} distance - 距离（米）
 * @returns {string} 格式化的距离字符串
 */
function formatDistance(distance) {
  if (distance < 1000) {
    return distance + '米'
  } else {
    return (distance / 1000).toFixed(1) + '公里'
  }
}

module.exports = {
  calculateDistance,
  formatDistance
}
