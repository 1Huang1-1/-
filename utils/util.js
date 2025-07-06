// utils/atomS3r.js
const ATOM_WIFI_SSID = "AtomS3R-M12-WiFi";
const ATOM_WIFI_IP = "192.168.4.1";
const ATOM_API_BASE = `http://${ATOM_WIFI_IP}/api`;

let connected = false;
let dataInterval = null;

module.exports = {
  // 连接AtomS3R-M12
  connect(callback) {
    wx.connectWifi({
      SSID: ATOM_WIFI_SSID,
      success: () => {
        connected = true;
        callback(true);
      },
      fail: () => {
        connected = false;
        callback(false);
      }
    });
  },
  
  // 开始数据流
  startDataStream(callback) {
    if (!connected) return;
    
    // 每2秒获取一次传感器数据
    dataInterval = setInterval(() => {
      this.getSensorData(callback);
    }, 2000);
  },
  
  // 停止数据流
  stopDataStream() {
    if (dataInterval) {
      clearInterval(dataInterval);
      dataInterval = null;
    }
  },
  
  // 获取传感器数据
  getSensorData(callback) {
    wx.request({
      url: `${ATOM_API_BASE}/sensors`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          callback(res.data);
        }
      },
      fail: () => {
        console.error('获取传感器数据失败');
      }
    });
  },
  
  // 拍照
  takePhoto(callback) {
    if (!connected) {
      callback(false);
      return;
    }
    
    wx.request({
      url: `${ATOM_API_BASE}/camera/capture`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200) {
          callback(res.data.imageUrl);
        }
      },
      fail: () => {
        callback(false);
      }
    });
  },
  
  // 获取实时视频流
  getVideoStream() {
    return `${ATOM_API_BASE}/camera/stream`;
  }
};
// utils/ai.js
const AI_API_BASE = 'https://your-ai-api-server.com';
const app = getApp();

module.exports = {
  // 分析图片
  analyzeImage(imageUrl, type = 'scene') {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${AI_API_BASE}/analyze`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${app.globalData.aiApiKey}`
        },
        data: {
          image_url: imageUrl,
          type: type
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  },
  
  // 美化图片
  enhanceImage(imageUrl) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${AI_API_BASE}/enhance`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${app.globalData.aiApiKey}`
        },
        data: {
          image_url: imageUrl
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.enhanced_url);
          } else {
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  },
  
  // 文本转语音
  textToSpeech(text) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${AI_API_BASE}/tts`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${app.globalData.aiApiKey}`
        },
        data: { text: text },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.audio_url);
          } else {
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  }
};