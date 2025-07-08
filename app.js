// app.js
App({
  globalData: {
    atomConnected: false,
    userLocation: null,
    weatherData: {},
    healthData: {
      temperature: 0,
      humidity: 0,
      bloodOxygen: 0,
      motion: { x: 0, y: 0, z: 0 }
    },
    nearbyAttractions: [], // 添加景点数据存储
    aiApiKey: 'your-ai-api-key',
    amapKey: '9b76c547692fbd02a094171461bad1fa'
  },
  
  onLaunch() {
    // 统一使用 require 导入
    const atom = require('./utils/atomS3r');
    const amap = require('./utils/amap');
    
    // 初始化高德地图
    this.amap = amap;
    this.amap.init(this.globalData.amapKey);
    
    // 初始化AtomS3R-M12连接
    this.initAtomConnection();
    
    // 初始化位置服务
    this.getUserLocation();
  },
  
  // 连接AtomS3R-M12
  initAtomConnection() {
    const atom = require('./utils/atomS3r');
    
    atom.connect((status) => {
      this.globalData.atomConnected = status;
      
      if (status) {
        // 开始接收传感器数据
        atom.startDataStream((data) => {
          console.log('收到传感器数据', data);
          this.globalData.healthData = data;
          this.updateHealthData(data);
        });
      }
    });
  },
  
  // 更新健康数据到所有页面
  updateHealthData(data) {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.updateHealthData && typeof page.updateHealthData === 'function') {
        page.updateHealthData(data);
      }
    });
  },
  
  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.globalData.userLocation = {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        };
        
        // 获取天气信息
        this.getWeatherInfo();
        
        // 获取附近景点
        this.getNearbyAttractions();
      },
      fail: (err) => {
        console.error('定位失败', err);
        wx.showToast({
          title: '定位失败，请检查权限',
          icon: 'none'
        });
        
        // 使用默认位置（北京）
        this.globalData.userLocation = {
          latitude: 39.90469,
          longitude: 116.40717
        };
        this.getWeatherInfo();
        this.getNearbyAttractions();
      }
    });
  },
  
  // 获取天气信息
  getWeatherInfo() {
    if (!this.globalData.userLocation) return;
    
    this.amap.getWeatherByLocation(
      this.globalData.userLocation, 
      (weather) => {
        if (weather) {
          this.globalData.weatherData = weather;
          this.updateWeatherData(weather);
        }
      }
    );
  },
  
  // 更新天气数据到所有页面
  updateWeatherData(weather) {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.updateWeatherData && typeof page.updateWeatherData === 'function') {
        page.updateWeatherData(weather);
      }
    });
  },
  
  // 获取附近景点
  getNearbyAttractions() {
    if (!this.globalData.userLocation) return;
    
    this.amap.getNearbyAttractions(
      this.globalData.userLocation,
      (attractions) => {
        this.globalData.nearbyAttractions = attractions;
        this.updateAttractions(attractions);
      }
    );
  },
  
  // 更新景点数据到所有页面
  updateAttractions(attractions) {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.updateAttractions && typeof page.updateAttractions === 'function') {
        page.updateAttractions(attractions);
      }
    });
  }
});