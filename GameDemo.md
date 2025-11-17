# 项目名称：《六景寻密令》游戏辅助小程序

## 核心功能
1.  参与者身份认证
    ◦   组号登录（1-12组）
    
    ◦   自动关联组员信息（组号、成员名单）

2.  景点打卡签到
    ◦   到达6个指定景点时自动解锁对应数字
    
    ◦   实时显示已收集的数字和进度

3.  密令生成与验证
    ◦   收集3个景点数字后自动组成最终密令
    
    ◦   密令正确性验证

4.  景点地图导航
    ◦   展示6个景点的位置和导航路线（集成腾讯地图API）
    
    ◦   显示当前位置与各景点的距离

5.  地理位置签到
    ◦   获取用户精确定位，并校验是否在景点50米范围内
    
    ◦   防止作弊，确保真实到达景点

6.  游戏规则展示
    ◦   展示寻密手册内容
    
    ◦   诗句线索提示

## 技术栈与配置
├── 前端框架
│   ├── 微信小程序原生
│   ├── Vant Weapp UI组件库 (v2.x)
│   └── 主色：#ff6b6b (游戏红)，辅助色：#4ecdc4 (青色)
├── 后端服务
│   ├── 微信云开发 (CloudBase)
│   ├── 云函数：Node.js
│   └── 数据库：CloudDB (组队表、景点表、打卡记录表、密令配置表)
├── 地图服务
│   └── 腾讯地图API (景点导航与位置校验) 
├── 权限配置
│   ├── `app.json` 中需声明 `requiredPrivateInfos: ["getLocation"]`
│   └── 地理位置用途说明 (用于景点打卡验证)

## 开发约定
1.  **样式**：使用 `rpx` 单位，禁止使用 CSS 变量。
2.  **组件**：命名使用 kebab-case。
3.  **API**：所有网络请求使用 `wx.cloud` 云函数。
4.  **数据加载**：页面数据在 `onLoad` 生命周期中请求。

## 界面设计规范 (UI/UX)

1.  色彩体系：主色 #ff6b6b (游戏红)，辅助色 #4ecdc4 (青色)、#feca57 (金色-已解锁)、#dfe6e9 (灰色-未解锁)。
2.  字体规范：重点信息 18px Medium，正文 14px Regular，诗句 16px Italic。
3.  组件库：优先使用 Vant Weapp 组件，保持统一性。
4.  游戏化设计：使用卡片翻转动画、解锁特效、进度条等元素增强趣味性。

## 重要提醒
- 小程序不支持 `document` 等浏览器 BOM/DOM API。
- 布局优先使用 Flex。
- 地理位置获取需要用户授权，首次使用需引导授权。
- 景点数字映射关系需加密存储，防止作弊。

## 特别提醒
1.  app.json 中必须声明地理位置权限：
    {
      "requiredPrivateInfos": ["getLocation"],
      "permission": {
        "scope.userLocation": {
          "desc": "需要获取您的位置信息，用于景点打卡验证"
        }
      }
    }
    
2.  腾讯地图密钥配置：在 app.json 中正确配置 permission 和 plugins。
3.  用户体验：
    ◦   首次获取地理位置时需清晰提示用户授权目的。
    
    ◦   打卡成功后应有明确的反馈（成功动画、数字解锁展示）。
    
    ◦   景点地图应提供清晰的导航指引和距离显示。
    
    ◦   提供离线模式，即使网络不佳也能查看已解锁内容。

4.  错误处理：网络请求、云函数调用、地理位置获取等操作需有完善的 fail 回调处理。

## 安全与性能
1.  密令验证：密令验证必须在云函数中完成，防止前端篡改。
2.  位置校验：距离计算在云端完成，打卡操作必须在云函数中验证，防止GPS欺骗。
3.  景点数字映射：每组的景点-数字映射关系加密存储在云数据库，前端不暴露完整映射表。
4.  打卡防重复：同一景点只能打卡一次，云函数需验证打卡记录。
5.  权限控制：敏感接口（如获取位置、验证密令）需妥善处理授权逻辑和失败情况。

## 页面路由规划
pages/
├── login/           // 组队登录页
├── index/           // 游戏首页 (规则说明、进度展示)
├── handbook/        // 寻密手册页 (展示本组的诗句线索)
├── checkin/         // 景点打卡页 (地理位置获取与校验)
├── map/             // 景点地图页 (6个景点位置与导航)
├── progress/        // 我的进度页 (已解锁数字、密令状态)
└── result/          // 结果页 (密令验证结果)

## 数据库设计 (CloudDB集合结构)

// teams 组队表
{
  _id: string,
  teamNumber: number,        // 组号 (1-12)
  members: array,            // 成员签名列表
  createdTime: date,         // 创建时间
  finalCode: string          // 最终密令 (3位数字)
}

// scenic_spots 景点表
{
  _id: string,
  spotId: number,            // 景点编号 (1-6)
  name: string,              // 景点名称
  description: string,       // 景点描述
  geoPoint: GeoPoint,        // 景点经纬度
  radius: number,            // 有效打卡半径 (米，默认50)
  image: string              // 景点图片URL
}

// team_spot_mapping 组队景点映射表 (加密存储)
{
  _id: string,
  teamNumber: number,        // 组号
  spotId: number,            // 景点编号
  digit: number,             // 对应数字 (1-6)
  sequence: number,          // 在密令中的位置 (1-3)
  poem: string               // 对应诗句
}

// checkin_records 打卡记录表
{
  _id: string,
  teamNumber: number,        // 组号
  spotId: number,            // 景点编号
  checkInTime: date,         // 打卡时间
  location: GeoPoint,        // 打卡位置
  distance: number,          // 与景点距离 (米)
  unlockedDigit: number      // 解锁的数字
}

// game_config 游戏配置表
{
  _id: string,
  gameStartTime: date,       // 游戏开始时间
  gameEndTime: date,         // 游戏结束时间
  isActive: boolean,         // 游戏是否进行中
  checkInRadius: number,     // 打卡有效半径 (米)
  totalSpots: number         // 景点总数 (6)
}

## 关键功能实现指南

### 1. 组队登录认证

```javascript
// pages/login/login.js
Page({
  data: { 
    teamNumber: '', 
    members: ['', '', '', '', '']  // 最多5个成员
  },
  
  handleLogin: function() {
    wx.cloud.callFunction({
      name: 'teamLogin',
      data: {
        teamNumber: this.data.teamNumber,
        members: this.data.members.filter(m => m.trim() !== '')
      },
      success: res => {
        if (res.result.success) {
          wx.setStorageSync('teamInfo', res.result.teamInfo)
          wx.switchTab({ url: '/pages/index/index' })
        } else {
          wx.showToast({ title: res.result.message, icon: 'none' })
        }
      },
      fail: err => {
        wx.showToast({ title: '登录失败，请检查网络', icon: 'none' })
      }
    })
  }
})
```

### 2. 景点打卡与数字解锁

```javascript
// pages/checkin/checkin.js
const checkInSpot = (spotId) => {
  wx.showLoading({ title: '定位中...' })
  
  // 1. 获取用户当前位置
  wx.getLocation({
    type: 'gcj02',
    success: (locRes) => {
      const userLat = locRes.latitude
      const userLon = locRes.longitude
      
      // 2. 调用云函数验证打卡
      wx.cloud.callFunction({
        name: 'processCheckIn',
        data: {
          teamNumber: wx.getStorageSync('teamInfo').teamNumber,
          spotId: spotId,
          location: { lat: userLat, lon: userLon }
        },
        success: (res) => {
          wx.hideLoading()
          if (res.result.success) {
            // 3. 打卡成功，展示解锁的数字
            showUnlockAnimation(res.result.unlockedDigit)
            wx.showToast({ title: '打卡成功！' })
            
            // 4. 检查是否已收集完所有数字
            if (res.result.collectedCount === 3) {
              wx.showModal({
                title: '恭喜！',
                content: `您已收集完所有数字！最终密令：${res.result.finalCode}`,
                confirmText: '去验证',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.navigateTo({ url: '/pages/result/result' })
                  }
                }
              })
            }
          } else {
            wx.showToast({ 
              title: res.result.message, 
              icon: 'none',
              duration: 3000
            })
          }
        },
        fail: (err) => {
          wx.hideLoading()
          wx.showToast({ title: '打卡失败，请重试', icon: 'none' })
        }
      })
    },
    fail: (err) => {
      wx.hideLoading()
      wx.showModal({
        title: '需要位置权限',
        content: '打卡需要获取您的位置信息，请授权',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.openSetting()
          }
        }
      })
    }
  })
}

// 解锁数字动画
function showUnlockAnimation(digit) {
  // 使用动画API展示解锁效果
  wx.showToast({
    title: `解锁数字：${digit}`,
    icon: 'success',
    duration: 2000
  })
}
```

### 3. 距离计算函数 (Haversine公式)

```javascript
// utils/distance.js
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

module.exports = {
  calculateDistance
}
```

### 4. 景点地图展示

```xml
<!-- pages/map/map.wxml -->
<view class="map-container">
  <map 
    id="scenicMap" 
    longitude="{{centerLon}}" 
    latitude="{{centerLat}}" 
    scale="14" 
    markers="{{markers}}" 
    show-location="{{true}}"
    bindmarkertap="onMarkerTap"
    style="width: 100%; height: 600rpx;">
  </map>
  
  <view class="spot-list">
    <view class="spot-item" wx:for="{{spots}}" wx:key="spotId">
      <view class="spot-info">
        <text class="spot-name">{{item.name}}</text>
        <text class="spot-distance">距离: {{item.distance}}米</text>
      </view>
      <view class="spot-status">
        <text wx:if="{{item.checked}}" class="checked">已打卡 ✓</text>
        <button wx:else size="mini" bindtap="navigateToSpot" data-spot="{{item}}">
          导航
        </button>
      </view>
    </view>
  </view>
</view>
```

### 5. 密令验证

```javascript
// pages/result/result.js
Page({
  data: {
    finalCode: '',
    verified: false
  },
  
  onLoad: function() {
    const teamInfo = wx.getStorageSync('teamInfo')
    // 从打卡记录中获取已收集的数字
    this.loadCollectedDigits()
  },
  
  verifyCode: function() {
    wx.cloud.callFunction({
      name: 'verifyFinalCode',
      data: {
        teamNumber: wx.getStorageSync('teamInfo').teamNumber,
        submittedCode: this.data.finalCode
      },
      success: res => {
        if (res.result.success) {
          this.setData({ verified: true })
          wx.showToast({ 
            title: '密令正确！恭喜完成寻密！', 
            icon: 'success',
            duration: 3000
          })
        } else {
          wx.showToast({ 
            title: '密令错误，请检查', 
            icon: 'none' 
          })
        }
      }
    })
  }
})
```

### 6. 云函数示例 - 打卡验证

```javascript
// cloudfunctions/processCheckIn/index.js
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const { teamNumber, spotId, location } = event
  
  try {
    // 1. 获取景点信息
    const spotRes = await db.collection('scenic_spots')
      .where({ spotId: spotId })
      .get()
    
    if (spotRes.data.length === 0) {
      return { success: false, message: '景点不存在' }
    }
    
    const spot = spotRes.data[0]
    
    // 2. 计算距离
    const distance = calculateDistance(
      location.lat, 
      location.lon,
      spot.geoPoint.latitude,
      spot.geoPoint.longitude
    )
    
    // 3. 验证是否在有效范围内
    if (distance > spot.radius) {
      return { 
        success: false, 
        message: `您距离景点还有${distance}米，请靠近后再打卡` 
      }
    }
    
    // 4. 检查是否已打卡过
    const existingRecord = await db.collection('checkin_records')
      .where({
        teamNumber: teamNumber,
        spotId: spotId
      })
      .get()
    
    if (existingRecord.data.length > 0) {
      return { success: false, message: '该景点已打卡，不可重复打卡' }
    }
    
    // 5. 获取该组在该景点的数字映射
    const mappingRes = await db.collection('team_spot_mapping')
      .where({
        teamNumber: teamNumber,
        spotId: spotId
      })
      .get()
    
    if (mappingRes.data.length === 0) {
      return { success: false, message: '该景点不在您的寻密路线中' }
    }
    
    const unlockedDigit = mappingRes.data[0].digit
    
    // 6. 记录打卡
    await db.collection('checkin_records').add({
      data: {
        teamNumber: teamNumber,
        spotId: spotId,
        checkInTime: new Date(),
        location: new db.Geo.Point(location.lon, location.lat),
        distance: distance,
        unlockedDigit: unlockedDigit
      }
    })
    
    // 7. 检查已收集数字数量
    const allRecords = await db.collection('checkin_records')
      .where({ teamNumber: teamNumber })
      .get()
    
    let finalCode = null
    if (allRecords.data.length === 3) {
      // 按顺序组合密令
      const mappings = await db.collection('team_spot_mapping')
        .where({ teamNumber: teamNumber })
        .orderBy('sequence', 'asc')
        .get()
      
      finalCode = mappings.data
        .filter(m => allRecords.data.some(r => r.spotId === m.spotId))
        .map(m => m.digit)
        .join('')
    }
    
    return {
      success: true,
      unlockedDigit: unlockedDigit,
      collectedCount: allRecords.data.length,
      finalCode: finalCode
    }
    
  } catch (err) {
    console.error(err)
    return { success: false, message: '服务器错误' }
  }
}

// Haversine距离计算函数
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}
```

## 游戏数据初始化

### 景点数据示例
```json
// 6个景点的基础数据
[
  {
    "spotId": 1,
    "name": "景点一：海滩沙驹",
    "description": "滩沙塑驹朝汐立，双浪分波印浅涂",
    "geoPoint": { "latitude": 23.1234, "longitude": 113.2345 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  },
  {
    "spotId": 2,
    "name": "景点二：五色潮柱",
    "description": "五阶潮柱标危汛，浪打滩头警色来",
    "geoPoint": { "latitude": 23.1235, "longitude": 113.2346 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  },
  {
    "spotId": 3,
    "name": "景点三：南天古坊",
    "description": "南天坊接四隅境，雕栏刻古向沧溟",
    "geoPoint": { "latitude": 23.1236, "longitude": 113.2347 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  },
  {
    "spotId": 4,
    "name": "景点四：花园石碑",
    "description": "石题园号临滩岸，花绕碑边伴汐生",
    "geoPoint": { "latitude": 23.1237, "longitude": 113.2348 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  },
  {
    "spotId": 5,
    "name": "景点五：古贤雕像",
    "description": "古贤立像传思意，法论载册惠今人",
    "geoPoint": { "latitude": 23.1238, "longitude": 113.2349 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  },
  {
    "spotId": 6,
    "name": "景点六：蓝浪石窟",
    "description": "蓝浪雕空含六窍，风穿镂隙起潮声",
    "geoPoint": { "latitude": 23.1239, "longitude": 113.2350 },
    "radius": 50,
    "image": "cloud://xxx.jpg"
  }
]
```

### 组队景点映射示例（以组1为例）
```json
// 组1的配置
[
  {
    "teamNumber": 1,
    "spotId": 1,
    "digit": 1,
    "sequence": 1,
    "poem": "滩沙塑驹朝汐立，双浪分波印浅涂"
  },
  {
    "teamNumber": 1,
    "spotId": 2,
    "digit": 2,
    "sequence": 2,
    "poem": "五阶潮柱标危汛，浪打滩头警色来"
  },
  {
    "teamNumber": 1,
    "spotId": 3,
    "digit": 3,
    "sequence": 3,
    "poem": "南天坊接四隅境，雕栏刻古向沧溟"
  }
]
// 其他组类似配置...
```

## 开发状态跟踪表
        模块          状态
--------------------------------
     组队登录页      未开始
--------------------------------
     游戏首页        未开始
--------------------------------
     寻密手册页      未开始
--------------------------------
     景点打卡页      未开始
--------------------------------
     景点地图页      未开始
--------------------------------
     我的进度页      未开始
--------------------------------
     结果验证页      未开始
--------------------------------
     云函数开发      未开始
--------------------------------
     数据库初始化    未开始
--------------------------------

## 后续优化方向
1.  增加排行榜功能（打卡速度、完成时间）
2.  支持拍照打卡，增加趣味性
3.  添加景点介绍语音导览
4.  支持多人实时位置共享
5.  增加AR互动元素（扫描景点解锁隐藏线索）
6.  支持分享战绩到朋友圈
