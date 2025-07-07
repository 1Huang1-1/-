// pages/camera/camera.js
const app = getApp();
wx.cloud.init({ env: app.globalData.envId }); 

Page({
  data: {
    // 权限相关
    hasPermission: false,
    
    // 相册相关
    albumImages: [],
    previewImagePath: '',
    
    // 相机相关
    showCamera: false,
    cameraPosition: 'back',
    flashMode: 'auto',
    
    // 识别相关
    recognitionResult: null,
    isPlaying: false,
    audioContext: null,
    volume: 0.8,
    
    // 火山引擎配置（需替换为实际值）
    volcConfig: {
      visionApiKey: 'your-vision-api-key',
      visionApiSecret: 'your-vision-secret',
      ttsApiKey: 'your-tts-api-key',
      ttsApiSecret: 'your-tts-secret'
    }
  },

  onLoad() {
    // 检查权限
    this.checkPermission();
    // 加载本地相册
    this.loadAlbum();
    // 获取火山引擎配置
    if (app.globalData.volcConfig) {
      this.setData({ volcConfig: app.globalData.volcConfig });
    }
  },

  onShow() {
    // 页面显示时默认显示导航栏
    wx.showTabBar();
  },
  
  onUnload() {
    // 销毁音频上下文
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
  },

  // 检查权限
  checkPermission() {
    wx.getSetting({
      success: (res) => {
        const hasCamera = res.authSetting['scope.camera'];
        const hasAlbum = res.authSetting['scope.writePhotosAlbum'];
        const hasRecord = res.authSetting['scope.record'];
        
        this.setData({
          hasPermission: hasCamera && hasAlbum && hasRecord
        });
      }
    });
  },

  // 请求权限
  requestPermission() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => {
            wx.authorize({
              scope: 'scope.record',
              success: () => {
                this.setData({ hasPermission: true });
              },
              fail: this.showPermissionDenied
            });
          },
          fail: this.showPermissionDenied
        });
      },
      fail: this.showPermissionDenied
    });
  },

  // 显示权限被拒绝提示
  showPermissionDenied() {
    wx.showModal({
      title: '权限不足',
      content: '请在设置中开启相机、相册和录音权限',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  // 打开相机（隐藏导航栏）
  openCamera() {
    if (!this.data.hasPermission) {
      this.requestPermission();
      return;
    }
    this.setData({ showCamera: true });
    wx.hideTabBar(); // 打开相机时隐藏导航栏
  },

  // 关闭相机（显示导航栏）
  closeCamera() {
    this.setData({ showCamera: false });
    wx.showTabBar(); // 关闭相机时显示导航栏
  },

  // 切换摄像头
  switchCamera() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'back' ? 'front' : 'back'
    });
  },

  // 切换闪光灯
  toggleFlash() {
    const modes = ['auto', 'on', 'off'];
    const currentIndex = modes.indexOf(this.data.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setData({ flashMode: modes[nextIndex] });
  },

  // 拍照
  takePhoto() {
    const cameraContext = wx.createCameraContext();
    cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        // 关闭相机但保持导航栏隐藏（因为要显示预览）
        this.setData({ 
          showCamera: false,
          previewImagePath: res.tempImagePath
        });
        // 保存到相册
        this.saveImageToAlbum(res.tempImagePath);
        // 保持导航栏隐藏
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
        // 失败时显示导航栏
        wx.showTabBar();
      }
    });
  },

  // 打开系统相册
  openSystemAlbum() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.addImagesToAlbum(newImages);
        // 关闭相机，显示导航栏
        this.setData({ showCamera: false });
        wx.showTabBar();
      }
    });
  },

  // 加载本地相册
  loadAlbum() {
    try {
      const images = wx.getStorageSync('cameraAlbum') || [];
      this.setData({ albumImages: images });
    } catch (e) {
      console.error('加载相册失败:', e);
      this.setData({ albumImages: [] });
    }
  },

  // 保存图片到相册
  saveImageToAlbum(imagePath) {
    const albumImages = [imagePath, ...this.data.albumImages];
    // 限制最多50张
    if (albumImages.length > 50) {
      albumImages.pop();
    }
    this.setData({ albumImages });
    this.saveAlbumToStorage();
  },

  // 添加多张图片到相册
  addImagesToAlbum(images) {
    const albumImages = [...images, ...this.data.albumImages];
    // 去重并限制数量
    const uniqueImages = [...new Set(albumImages)].slice(0, 50);
    this.setData({ albumImages: uniqueImages });
    this.saveAlbumToStorage();
  },

  // 保存相册到本地存储
  saveAlbumToStorage() {
    try {
      wx.setStorageSync('cameraAlbum', this.data.albumImages);
    } catch (e) {
      console.error('保存相册失败:', e);
    }
  },

  // 预览图片（隐藏导航栏）
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      previewImagePath: this.data.albumImages[index]
    });
    wx.hideTabBar(); // 预览时隐藏导航栏
  },

  // 关闭预览（显示导航栏）
  closePreview() {
    this.setData({ previewImagePath: '' });
    wx.showTabBar(); // 关闭预览时显示导航栏
  },

  // 删除预览图片（显示导航栏）
  deletePreviewImage() {
    const currentImage = this.data.previewImagePath;
    const albumImages = this.data.albumImages.filter(img => img !== currentImage);
    this.setData({
      albumImages,
      previewImagePath: ''
    });
    this.saveAlbumToStorage();
    wx.showTabBar(); // 删除后显示导航栏
  },

  // 删除相册图片
  deleteAlbumImage(e) {
    const index = e.currentTarget.dataset.index;
    const albumImages = [...this.data.albumImages];
    albumImages.splice(index, 1);
    this.setData({ albumImages });
    this.saveAlbumToStorage();
  },

  // 保存到系统相册
  saveToSystemAlbum() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.previewImagePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('保存失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  // 摄像头错误处理
  onCameraError(e) {
    console.error('摄像头错误:', e.detail);
    wx.showToast({
      title: '摄像头启动失败',
      icon: 'none'
    });
    this.setData({ showCamera: false });
    wx.showTabBar(); // 错误时显示导航栏
  },

  // 景点识别
  recognizeScenic() {
    if (!this.data.previewImagePath) return;
    
    wx.showLoading({ title: '识别中...' });
    
    // 上传图片到云存储
    wx.cloud.uploadFile({
      cloudPath: `scenic/${Date.now()}.jpg`,
      filePath: this.data.previewImagePath,
      success: (uploadRes) => {
        // 调用火山引擎API
        wx.request({
          url: 'https://vision.volcengineapi.com/v1/recognize/scenic',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.data.volcConfig.visionApiKey,
            'X-Api-Secret': this.data.volcConfig.visionApiSecret
          },
          data: {
            image_url: uploadRes.fileID,
            model: 'scenic_spot'
          },
          success: (res) => {
            wx.hideLoading();
            if (res.data.code === 200) {
              const spots = res.data.result.scenic_spots;
              if (spots && spots.length > 0) {
                this.getScenicInfo(spots[0].name);
              } else {
                this.setData({
                  recognitionResult: { spotName: null }
                });
              }
            } else {
              wx.showToast({
                title: '识别失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('识别请求失败:', err);
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('图片上传失败:', err);
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取景点信息
  getScenicInfo(spotName) {
    wx.cloud.callFunction({
      name: 'queryScenicInfo',
      data: { spotName },
      success: (res) => {
        if (res.result.code === 200) {
          this.setData({
            recognitionResult: {
              spotName,
              description: res.result.data.description
            }
          });
        } else {
          this.setData({
            recognitionResult: {
              spotName,
              description: null
            }
          });
        }
      },
      fail: (err) => {
        console.error('获取景点信息失败:', err);
        this.setData({
          recognitionResult: {
            spotName,
            description: null
          }
        });
      }
    });
  },

  // 播放语音
  playVoice() {
    const { description } = this.data.recognitionResult;
    if (!description) return;
    
    wx.showLoading({ title: '语音合成中...' });
    
    wx.request({
      url: 'https://tts.volcengineapi.com/v1/synthesize',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.data.volcConfig.ttsApiKey,
        'X-Api-Secret': this.data.volcConfig.ttsApiSecret
      },
      data: {
        text: description,
        voice: 'female_standard',
        speed: 1.0,
        volume: this.data.volume
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.playAudio(res.data.result.audio_url);
        } else {
          wx.showToast({
            title: '语音合成失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('语音合成失败:', err);
        wx.showToast({
          title: '语音合成失败',
          icon: 'none'
        });
      }
    });
  },

  // 播放音频
  playAudio(url) {
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    
    this.data.audioContext = wx.createInnerAudioContext();
    this.data.audioContext.src = url;
    this.data.audioContext.volume = this.data.volume;
    this.data.audioContext.autoplay = true;
    
    this.data.audioContext.onPlay(() => {
      this.setData({ isPlaying: true });
    });
    
    this.data.audioContext.onPause(() => {
      this.setData({ isPlaying: false });
    });
    
    this.data.audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
    });
    
    this.data.audioContext.onError((err) => {
      console.error('音频播放错误:', err);
      this.setData({ isPlaying: false });
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    });
  },

  // 关闭识别结果
  closeResult() {
    this.setData({ recognitionResult: null });
    // 停止播放
    if (this.data.audioContext) {
      this.data.audioContext.stop();
      this.setData({ isPlaying: false });
    }
  }
});