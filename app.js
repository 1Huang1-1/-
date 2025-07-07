// app.js
//test 1
App({
  globalData: {
    atomConnected: false,     // AtomS3R-M12连接状态
    userLocation: null,        // 用户当前位置
    weatherData: {},           // 天气数据
    healthData: {              // 健康数据
      temperature: 0,
      humidity: 0,
      bloodOxygen: 0,
      motion: { x: 0, y: 0, z: 0 } // 九轴传感器数据
    },
    aiApiKey: 'your-ai-api-key', // 火山引擎AI服务API密钥
    amapKey: '9b76c547692fbd02a094171461bad1fa' // 高德地图API密钥
  },
  
  onLaunch() {
    // 初始化AtomS3R-M12连接
    this.initAtomConnection();
    
    // 初始化位置服务
    this.getUserLocation();
    
    // 初始化高德地图
    this.initAMap();
  },
  
  // 连接AtomS3R-M12
  initAtomConnection() {
    const atom = require('./utils/atomS3r');
    atom.connect((status) => {
      this.globalData.atomConnected = status;
      
      if (status) {
        // 开始接收传感器数据
        atom.startDataStream((data) => {
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
      if (page.updateHealthData) {
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
        this.getWeatherInfo();
        this.getNearbyAttractions();
      },
      fail: () => {
        wx.showToast({
          title: '定位失败，请检查权限',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取天气信息
  getWeatherInfo() {
    if (!this.globalData.userLocation) return;
    
    const amap = require('./utils/amap');
    amap.getWeatherByLocation(
      this.globalData.userLocation, 
      (weather) => {
        this.globalData.weatherData = weather;
        this.updateWeatherData(weather);
      }
    );
  },
  
  // 更新天气数据到所有页面
  updateWeatherData(weather) {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.updateWeatherData) {
        page.updateWeatherData(weather);
      }
    });
  },
  
  // 获取附近景点
  getNearbyAttractions() {
    if (!this.globalData.userLocation) return;
    
    const amap = require('./utils/amap');
    amap.getNearbyAttractions(
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
      if (page.updateAttractions) {
        page.updateAttractions(attractions);
      }
    });
  },
  
  // 初始化高德地图
  initAMap() {
    const amap = require('./utils/amap');
    amap.init(this.globalData.amapKey);
  }
});