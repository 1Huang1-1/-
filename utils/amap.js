// utils/amap.js
const AMapKey = '9b76c547692fbd02a094171461bad1fa'; // 替换为实际密钥

class AMapService {
  // 初始化地图
  initMap(ctx, mapId) {
    return new Promise((resolve) => {
      wx.createMapContext(mapId, ctx);
      resolve();
    });
  }

  // 获取天气信息
  getWeatherInfo(location) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://restapi.amap.com/v3/weather/weatherInfo',
        data: {
          key: AMapKey,
          city: location,
          extensions: 'base'
        },
        success: (res) => {
          if (res.data.status === '1') {
            resolve(res.data.lives[0]);
          } else {
            reject(new Error('获取天气信息失败'));
          }
        },
        fail: (err) => reject(err)
      });
    });
  }

  // 获取附近景点
  getNearbyAttractions(location, radius = 1000) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://restapi.amap.com/v3/place/around',
        data: {
          key: AMapKey,
          location: location,
          keywords: '景点',
          radius: radius,
          types: '风景名胜'
        },
        success: (res) => {
          if (res.data.status === '1') {
            resolve(res.data.pois);
          } else {
            reject(new Error('获取附近景点失败'));
          }
        },
        fail: (err) => reject(err)
      });
    });
  }
}

export default new AMapService();