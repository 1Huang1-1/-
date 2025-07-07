// pages/emergency/emergency.js
const app = getApp();

Page({
  data: {
    locationInfo: '',
    emergencyHistory: []
  },
  
  onLoad() {
    this.getLocationInfo();
    this.loadEmergencyHistory();
  },
  
  // 获取位置信息
  getLocationInfo() {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        const amap = require('../../utils/amap');
        amap.reverseGeocode({latitude: res.latitude, longitude: res.longitude}, (data) => {
          if (data.status === 0) {
            this.setData({
              locationInfo: data.result.formatted_address
            });
          } else {
            this.setData({
              locationInfo: `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`
            });
          }
        });
      },
      fail: () => {
        this.setData({
          locationInfo: '获取位置失败'
        });
      }
    });
  },
  
  // 加载报警历史
  loadEmergencyHistory() {
    const history = wx.getStorageSync('emergencyHistory') || [];
    this.setData({ emergencyHistory: history });
  },
  
  // 拨打110报警
  callPolice() {
    wx.showModal({
      title: '紧急报警',
      content: '您确定要拨打110报警电话吗？',
      confirmText: '立即报警',
      confirmColor: '#FF5252',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '110',
            success: () => {
              this.logEmergencyCall();
            },
            fail: (err) => {
              wx.showToast({
                title: '拨打失败，请检查网络',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },
  
  // 记录报警
  logEmergencyCall() {
    const history = this.data.emergencyHistory;
    history.unshift({
      type: '110报警',
      time: new Date().toLocaleString(),
      location: this.data.locationInfo
    });
    
    // 只保留最近10条记录
    const newHistory = history.slice(0, 10);
    
    this.setData({ emergencyHistory: newHistory });
    wx.setStorageSync('emergencyHistory', newHistory);
  },
  
  // 分享位置
  shareLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          name: '我的位置',
          address: this.data.locationInfo,
          scale: 18
        });
      }
    });
  }
});