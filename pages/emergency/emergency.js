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
  },

  data: {
    emergencyList: [
      {
        type: "扭伤/骨折",
        icon: "/images/sprain.png",
        steps: [
          {
            title: "1. 立即停止活动",
            desc: "保持静止，避免二次伤害"
          },
          {
            title: "2. 固定伤处",
            desc: "用登山杖、绷带或衣物固定受伤部位"
          },
          {
            title: "3. 冷敷消肿",
            desc: "用冰袋或冷水毛巾敷伤处（15分钟/次）"
          },
          {
            title: "4. 联系救援",
            desc: "拨打110/120或联系队友协助下山"
          }
        ]
      },
      {
        type: "迷路",
        icon: "/images/lost.png",
        steps: [
          {
            title: "1. 原地停留",
            desc: "避免盲目走动消耗体力"
          },
          {
            title: "2. 使用定位",
            desc: "记录坐标，尝试退回最近路标"
          },
        ]
      },
      {
        type: "失温",
        icon: "/images/hypothermia.png",
        steps: [
          {
            title: "1. 转移至避风处",
            desc: "用急救毯或干燥衣物包裹身体"
          },
          {
            title: "2. 补充热量",
            desc: "饮用温水（勿饮酒），吃高糖食物"
          },
          {
            title: "3. 核心部位回温",
            desc: "将发热贴放在颈部、腋下等部位"
          }
        ]
      },
      {
        type: "动物袭击",
        icon: "/images/snake.png",
        steps: [
          {
            title: "蛇虫咬伤",
            desc: "保持冷静，包扎近心端，勿用嘴吸毒液"
          },
          {
            title: "大型动物",
            desc: "避免对视，缓慢后退，用登山杖自卫"
          }
        ]
      }
    ],
    showModal: false,
    currentEmergency: {}
  },

  // 显示详情
  showDetail(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentEmergency: this.data.emergencyList[index],
      showModal: true
    })
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({ showModal: false })
  },

  // 紧急呼叫
  callEmergency() {
    wx.makePhoneCall({
      phoneNumber: '110',
      success: () => {
        wx.showToast({ title: '已拨打求救电话', icon: 'success' })
      }
    })
  },

  // 页面分享功能
  onShareAppMessage() {
    return {
      title: '登山紧急处理指南',
      path: '/pages/emergency/emergency'
    }
  }
});