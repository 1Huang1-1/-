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
  navigateToEmergency() { wx.navigateTo({ url: '/pages/emergency/index' }); },

  data: {
    diaries: [] // 存储日志数组
  },

  onLoad() {
    // 页面加载时从本地存储读取日志数据
    this.loadDiariesFromStorage();
  },

  // 添加新日志
  addDiary() {
    const newDiary = {
      id: Date.now(), // 生成唯一ID（时间戳）
      content: '写下你的旅游故事...',
      date: this.formatDateTime(new Date()), // 自动生成当前时间
      location: '未获取位置',
      images: [], // 图片列表
      isEditing: true // 初始为编辑状态
    };
    
    // 更新数据
    this.setData({
      diaries: [...this.data.diaries, newDiary]
    });
    
    // 延迟获取定位（避免授权弹窗阻塞输入）
    setTimeout(() => {
      this.getLocation(newDiary.id);
    }, 300);
    
    // 保存到本地存储
    this.saveDiariesToStorage();
  },

  // 切换编辑状态
  toggleEdit(e) {
    const { id, action } = e.currentTarget.dataset;
    const diaries = this.data.diaries.map(diary => {
      if (diary.id === id) {
        return {
          ...diary,
          isEditing: action === 'edit' ? !diary.isEditing : false
        };
      }
      return diary;
    });
    
    this.setData({ diaries });
    this.saveDiariesToStorage();
  },

  // 编辑内容输入
  onContentInput(e) {
    const { id } = e.currentTarget.dataset;
    const value = e.detail.value;
    const diaries = this.data.diaries.map(diary => {
      if (diary.id === id) {
        return { ...diary, content: value };
      }
      return diary;
    });
    
    this.setData({ diaries });
    this.saveDiariesToStorage();
  },

  // 删除日志
  deleteDiary(e) {
    const { id } = e.currentTarget.dataset;
    const diaries = this.data.diaries.filter(diary => diary.id !== id);
    
    this.setData({ diaries });
    this.saveDiariesToStorage();
    
    wx.showToast({
      title: '日志已删除',
      icon: 'success',
      duration: 1500
    });
  },

  // 选择图片
  chooseImage(e) {
    const { id } = e.currentTarget.dataset;
    wx.chooseMedia({
      count: 9, // 最多选9张
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        const diaries = this.data.diaries.map(diary => {
          if (diary.id === id) {
            const images = diary.images || [];
            return { 
              ...diary, 
              images: [...images, ...tempFiles.map(file => file.tempFilePath)] 
            };
          }
          return diary;
        });
        this.setData({ diaries });
        this.saveDiariesToStorage();
      }
    });
  },

  // 获取位置信息
  getLocation(diaryId) {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          // 未授权则请求授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.fetchLocation(diaryId);
            },
            fail: () => {
              wx.showToast({
                title: '已拒绝定位权限',
                icon: 'none'
              });
            }
          });
        } else {
          // 已授权直接获取位置
          this.fetchLocation(diaryId);
        }
      }
    });
  },

  // 获取位置信息（高德地图版）
  getLocation(diaryId) {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.fetchGaodeLocation(diaryId);
            },
            fail: () => {
              wx.showToast({ title: '已拒绝定位权限', icon: 'none' });
            }
          });
        } else {
          this.fetchGaodeLocation(diaryId);
        }
      }
    });
  },

  // 调用高德地图逆地址解析
  fetchGaodeLocation(diaryId) {
    wx.getLocation({
      type: 'gcj02', // 高德地图支持GCJ-02坐标系
      success: (res) => {
        const { latitude, longitude } = res;
        // 高德地图逆地址解析API（需替换key）
        wx.request({
          url: 'https://restapi.amap.com/v3/geocode/regeo',
          data: {
            location: `${longitude},${latitude}`, // 注意：高德要求经度在前
            key: '9b76c547692fbd02a094171461bad1fa', // 需替换为实际密钥
            radius: 1000,
            extensions: 'base'
          },
          success: (res) => {
            if (res.data.status === '1') {
              const locationName = res.data.regeocode.formatted_address;
              const diaries = this.data.diaries.map(diary => {
                if (diary.id === diaryId) {
                  return { ...diary, location: locationName };
                }
                return diary;
              });
              this.setData({ diaries });
              this.saveDiariesToStorage();
            } else {
              wx.showToast({ title: '地址解析失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '网络请求失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '定位失败', icon: 'none' });
      }
    });
  },
  // 格式化日期时间（如：2023-05-20 14:30）
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 保存日志到本地存储
  saveDiariesToStorage() {
    wx.setStorageSync('travelDiaries', this.data.diaries);
  },

  // 从本地存储加载日志
  loadDiariesFromStorage() {
    const diaries = wx.getStorageSync('travelDiaries') || [];
    this.setData({ diaries });
  }
});