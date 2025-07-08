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
  },

  data: {
    socketTask: null,    // 小程序 WebSocket 任务对象
    // 替换为你的火山引擎配置（建议通过环境变量或云开发隐藏密钥）
    VE_API_KEY: 'sk-bb6128a39b60422aa29bc5f3942a3060bfge8g7y6o7qp952', 
    VE_MODEL: 'AG-voice-chat-agent',       // 智能体模型
  },

  onLoad() {
    // 初始化 WebSocket 连接（可在页面加载时预连，或点击浮窗时连）
    this.initWebSocket();
  },

  onUnload() {
    // 页面卸载时关闭连接
    this.closeWebSocket();
  },

  // 初始化 WebSocket（适配小程序 API）
  initWebSocket() {
    const { VE_API_KEY, VE_MODEL } = this.data;
    // 火山引擎 WebSocket 地址
    const wsUrl = `wss://ai-gateway.vei.volces.com/v1/realtime?model=${VE_MODEL}`; 

    // 小程序创建 WebSocket 连接
    this.socketTask = wx.connectSocket({
      url: wsUrl,
      header: {
        // 鉴权：替换为实际密钥（务必隐藏密钥，避免硬编码！）
        'openai-insecure-api-key': 'sk-bb6128a39b60422aa29bc5f3942a3060bfge8g7y6o7qp952', 
      },
      protocols: ['realtime'],
    });

    // 监听连接成功
    this.socketTask.onOpen((res) => {
      // 连接成功后发送初始化指令（与火山引擎协议对齐）
      this.sendInitMessage();
    });

    // 监听消息接收
    this.socketTask.onMessage((res) => {
      const data = JSON.parse(res.data);
      // 处理服务端响应（如语音合成、文本回复等，需根据业务解析）
      this.handleServerResponse(data);
    });

    // 监听连接关闭
    this.socketTask.onClose((res) => {
      console.log('WebSocket 已关闭', res);
    });

    // 监听错误
    this.socketTask.onError((err) => {
      console.error('WebSocket 错误', err);
    });
  },

  // 发送初始化消息（与火山引擎协议交互）
  sendInitMessage() {
    const message = {
      type: "response.create",
      response: {
        modalities: ["text", "audio"], // 支持文本、语音交互
        instructions: "Please assist the user.", // 给智能体的指令
      },
    };
    this.socketTask.send({ data: JSON.stringify(message) });
  },

  // 处理服务端响应（需根据智能体协议解析，示例仅打印关键信息）
  handleServerResponse(data) {
    // TODO: 解析语音流、文本回复等，可结合小程序语音播放 API 处理 audio
    console.log('服务端响应解析:', data);
    // 这里可扩展逻辑，比如拿到回复文本后展示到页面，或处理语音播放等
  },

  // 关闭 WebSocket 连接
  closeWebSocket() {
    if (this.socketTask) {
      this.socketTask.close();
      this.socketTask = null;
    }
  },

});