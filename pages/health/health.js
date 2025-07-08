const app = getApp();
const atom = require('../../utils/atomS3r');

Page({
  data: {
    atomConnected: false,
    healthData: {
      temperature: 0,
      humidity: 0,
      bloodOxygen: 0,
      motion: { x: 0, y: 0, z: 0 }
    },
    healthTip: "正在获取健康建议...",
    chartData: {
      temperature: [],
      humidity: [],
      bloodOxygen: []
    },
    timer: null,
    maxDataPoints: 20,
    showHealthWarning: false,
    warningMessage: ""
  },

  onLoad() {
    // 初始化页面数据
    this.setData({
      atomConnected: app.globalData.atomConnected,
      healthData: app.globalData.healthData || this.data.healthData
    });
    
    this.getHealthTip();
    this.initChartData();
    this.createChart();
  },

  onShow() {
    // 检查设备连接状态
    this.checkConnectionStatus();
    
    // 如果已连接，开始监控数据
    if (app.globalData.atomConnected) {
      this.startMonitoring();
    }
  },

  onHide() {
    this.stopMonitoring();
  },

  onUnload() {
    this.stopMonitoring();
  },

  // 检查设备连接状态
  checkConnectionStatus() {
    this.setData({
      atomConnected: app.globalData.atomConnected
    });
    
    if (!this.data.atomConnected) {
      wx.showToast({
        title: '设备未连接',
        icon: 'none'
      });
    }
  },

  // 重新连接设备
  reconnectDevice() {
    wx.showLoading({
      title: '正在连接设备...',
      mask: true
    });
    
    atom.connect((status) => {
      wx.hideLoading();
      this.setData({ atomConnected: status });
      app.globalData.atomConnected = status;
      
      if (status) {
        wx.showToast({ title: '设备连接成功', icon: 'success' });
        this.startMonitoring();
      } else {
        wx.showToast({ title: '连接失败，请重试', icon: 'none' });
      }
    });
  },

  // 开始监控健康数据
  startMonitoring() {
    this.stopMonitoring();
    
    // 使用全局数据更新回调
    atom.startDataStream((data) => {
      this.updateHealthData(data);
    });
    
    // 设置定时器定期检查数据状态
    this.timer = setInterval(() => {
      this.checkHealthStatus();
    }, 5000);
  },

  // 停止监控健康数据
  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 更新健康数据
  updateHealthData(data) {
    if (!data) return;
    
    // 更新全局数据
    app.globalData.healthData = data;
    
    this.setData({ healthData: data });
    this.updateChartData(data);
    this.checkHealthStatus();
  },

  // 初始化图表数据
  initChartData() {
    const { temperature, humidity, bloodOxygen } = this.data.healthData;
    const initialData = Array(5).fill({
      temperature,
      humidity,
      bloodOxygen
    });
    
    this.setData({
      'chartData.temperature': initialData.map(d => d.temperature),
      'chartData.humidity': initialData.map(d => d.humidity),
      'chartData.bloodOxygen': initialData.map(d => d.bloodOxygen)
    });
  },

  // 更新图表数据
  updateChartData(data) {
    const { chartData, maxDataPoints } = this.data;
    const newChartData = { ...chartData };
    
    // 温度数据
    if (newChartData.temperature.length >= maxDataPoints) {
      newChartData.temperature.shift();
    }
    newChartData.temperature.push(data.temperature);
    
    // 湿度数据
    if (newChartData.humidity.length >= maxDataPoints) {
      newChartData.humidity.shift();
    }
    newChartData.humidity.push(data.humidity);
    
    // 血氧数据
    if (newChartData.bloodOxygen.length >= maxDataPoints) {
      newChartData.bloodOxygen.shift();
    }
    newChartData.bloodOxygen.push(data.bloodOxygen);
    
    this.setData({ chartData: newChartData });
    this.updateChart();
  },

  // 检查健康状态
  checkHealthStatus() {
    const { temperature, bloodOxygen } = this.data.healthData;
    let warnings = [];
    
    if (temperature < 35.5) warnings.push("体温过低，请注意保暖");
    if (temperature > 37.3) warnings.push("体温偏高，请留意身体状况");
    if (bloodOxygen < 93) warnings.push("血氧偏低，建议休息并密切关注");
    
    if (warnings.length > 0) {
      this.setData({
        showHealthWarning: true,
        warningMessage: warnings.join("；")
      });
    } else {
      this.setData({
        showHealthWarning: false,
        warningMessage: ""
      });
    }
  },

  // 获取健康建议
  getHealthTip() {
    const tips = [
      "建议保持室内温度在22-26°C之间，湿度在40%-60%之间",
      "正常血氧饱和度应在95%-100%之间，低于90%请及时就医",
      "适当运动有助于提高血氧水平，建议每天步行30分钟",
      "保持充足睡眠有助于维持正常体温和血氧水平"
    ];
    
    this.setData({
      healthTip: tips[Math.floor(Math.random() * tips.length)]
    });
  },

  // 创建健康数据图表
  createChart() {
    this.chartCtx = wx.createCanvasContext('healthChart', this);
    this.updateChart();
  },

  // 更新图表
  updateChart() {
    const ctx = this.chartCtx;
    const chartWidth = 300;
    const chartHeight = 200;
    const padding = 20;
    
    ctx.clearRect(0, 0, chartWidth, chartHeight);
    this.drawAxes(ctx, chartWidth, chartHeight, padding);
    this.drawChartInfo(ctx, chartWidth, chartHeight, padding);
    this.drawDataLines(ctx, chartWidth, chartHeight, padding);
    ctx.draw();
  },

  // 绘制坐标轴 (简化的实现)
  drawAxes(ctx, chartWidth, chartHeight, padding) {
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight - padding);
    ctx.lineTo(chartWidth - padding, chartHeight - padding);
    ctx.stroke();
  },

  // 绘制图表信息
  drawChartInfo(ctx, chartWidth, chartHeight, padding) {
    ctx.setFontSize(12);
    ctx.setFillStyle('#666666');
    ctx.fillText('健康数据趋势', padding, padding - 5);
    
    ctx.setFillStyle('#FF6B6B');
    ctx.fillRect(chartWidth - 100, padding, 10, 10);
    ctx.fillText('体温 (°C)', chartWidth - 85, padding + 8);
    
    ctx.setFillStyle('#4ECDC4');
    ctx.fillRect(chartWidth - 100, padding + 20, 10, 10);
    ctx.fillText('湿度 (%)', chartWidth - 85, padding + 28);
    
    ctx.setFillStyle('#556270');
    ctx.fillRect(chartWidth - 100, padding + 40, 10, 10);
    ctx.fillText('血氧 (%)', chartWidth - 85, padding + 48);
  },

  // 绘制数据曲线
  drawDataLines(ctx, chartWidth, chartHeight, padding) {
    const plotWidth = chartWidth - 2 * padding;
    const plotHeight = chartHeight - 2 * padding;
    const dataCount = this.data.chartData.temperature.length;
    const pointSpacing = dataCount > 1 ? plotWidth / (dataCount - 1) : plotWidth;
    
    // 体温曲线
    ctx.setStrokeStyle('#FF6B6B');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.temperature.forEach((value, i) => {
      const x = padding + i * pointSpacing;
      const y = chartHeight - padding - ((value - 34) / 6 * plotHeight);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // 其他曲线类似实现...
  },

  // 跳转到紧急联系人页面
  goToEmergency() {
    wx.navigateTo({
      url: '/pages/emergency/index'
    });
  }
});