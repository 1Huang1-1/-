// pages/index/index.js
const app = getApp();
const atom = require('../../utils/atomS3r');
const amap = require('../../utils/amap');

Page({
  data: {
    atomConnected: false,
    locationInfo: '',
    weather: {},
    healthData: {},
    attractions: []
  },
  
  onLoad() {
    this.setData({
      atomConnected: app.globalData.atomConnected,
      healthData: app.globalData.healthData,
      weather: app.globalData.weatherData,
      attractions: app.globalData.nearbyAttractions || []
    });
    
    if (app.globalData.userLocation) {
      this.getLocationInfo(app.globalData.userLocation);
    }
  },
  
  onShow() {
    // 更新连接状态
    this.setData({
      atomConnected: app.globalData.atomConnected
    });
  },
  
  // 获取位置信息
  getLocationInfo(location) {
    amap.reverseGeocode(location, (res) => {
      if (res.status === 0) {
        const address = res.result.formatted_address;
        this.setData({
          locationInfo: address
        });
      }
    });
  },
  
  // 更新健康数据
  updateHealthData(data) {
    this.setData({ healthData: data });
  },
  
  // 更新天气数据
  updateWeatherData(weather) {
    this.setData({ weather: weather });
  },
  
  // 更新景点数据
  updateAttractions(attractions) {
    this.setData({ attractions: attractions });
  },
  
  // 开始导航
  startNavigation() {
    if (!app.globalData.userLocation) {
      wx.showToast({ title: '请先获取位置', icon: 'none' });
      return;
    }
    
    const plugin = requirePlugin('amapPlugin');
    plugin.openNavigation({
      start: '我的位置',
      end: '故宫博物院',  // 实际应用中可让用户选择目的地
      mode: 'walk',      // 步行模式
      success: () => console.log('导航启动成功'),
      fail: (err) => console.error('导航启动失败', err)
    });
  },
  
  // 查看景点详情
  viewAttractionDetail(e) {
    const id = e.currentTarget.dataset.id;
    const attraction = this.data.attractions.find(a => a.id === id);
    
    wx.navigateTo({
      url: `/pages/attraction-detail/index?id=${id}&name=${attraction.name}`,
    });
  },
  
  // 查看更多景点
  viewMoreAttractions() {
    wx.navigateTo({
      url: '/pages/attractions/index',
    });
  },
  
  // 打开AI聊天
  openAIChat() {
    wx.navigateTo({
      url: '/pages/ai-chat/index',
    });
  },
  
  // 页面跳转
  navigateToCamera() { wx.navigateTo({ url: '/pages/camera/index' }); },
  navigateToEmergency() { wx.navigateTo({ url: '/pages/emergency/index' }); }
});