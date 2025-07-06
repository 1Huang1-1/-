// pages/camera/camera.js
const app = getApp();
const atom = require('../../utils/atomS3r');
const ai = require('../../utils/ai');

Page({
  data: {
    videoStream: '',
    resultImage: null,
    isProcessing: false,
    analysisMode: 'scene', // scene: 景点识别, object: 物体识别
    tags: [],
    description: '',
    audioUrl: ''
  },
  
  onLoad() {
    // 获取AtomS3R-M12的视频流
    this.setData({
      videoStream: atom.getVideoStream()
    });
  },
  
  // 拍照
  takePhoto() {
    this.setData({ isProcessing: true });
    
    atom.takePhoto((imageUrl) => {
      if (imageUrl) {
        this.setData({ 
          resultImage: imageUrl,
          isProcessing: false
        });
        this.analyzeImage(imageUrl);
      } else {
        this.setData({ isProcessing: false });
        wx.showToast({ title: '拍照失败', icon: 'none' });
      }
    });
  },
  
  // 分析图片
  analyzeImage(imageUrl) {
    const { analysisMode } = this.data;
    const type = analysisMode === 'scene' ? 'scene' : 'object';
    
    ai.analyzeImage(imageUrl, type).then(result => {
      this.setData({
        tags: result.tags,
        description: result.description,
        audioUrl: result.audioUrl
      });
    }).catch(err => {
      console.error('AI分析失败', err);
      wx.showToast({ title: '分析失败', icon: 'none' });
    });
  },
  
  // 重新拍照
  retake() {
    this.setData({
      resultImage: null,
      tags: [],
      description: '',
      audioUrl: ''
    });
  },
  
  // AI美化图片
  enhanceImage() {
    this.setData({ isProcessing: true });
    
    ai.enhanceImage(this.data.resultImage).then(enhancedUrl => {
      this.setData({ 
        resultImage: enhancedUrl,
        isProcessing: false
      });
      wx.showToast({ title: '美化完成' });
    }).catch(err => {
      this.setData({ isProcessing: false });
      wx.showToast({ title: '美化失败', icon: 'none' });
    });
  },
  
  // 播放语音
  playAudio() {
    if (!this.data.audioUrl) return;
    
    const backgroundAudioManager = wx.getBackgroundAudioManager();
    backgroundAudioManager.title = '景点介绍';
    backgroundAudioManager.src = this.data.audioUrl;
    backgroundAudioManager.play();
  },
  
  // 切换识别模式
  toggleMode() {
    this.setData({
      analysisMode: this.data.analysisMode === 'scene' ? 'object' : 'scene'
    });
  }
});