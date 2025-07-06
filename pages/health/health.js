// pages/health/health.js
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
    maxDataPoints: 20, // 图表最大数据点数量
    showHealthWarning: false,
    warningMessage: ""
  },

  onLoad() {
    // 初始化页面数据
    this.setData({
      atomConnected: app.globalData.atomConnected,
      healthData: app.globalData.healthData
    });
    
    this.getHealthTip();
    this.initChartData();
    this.createChart();
  },

  onShow() {
    // 注册页面数据更新方法，供app.js调用
    if (!this.pageRegistered) {
      this.pageRegistered = true;
    }
    
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
    const isConnected = atom.isConnected();
    this.setData({
      atomConnected: isConnected
    });
    
    if (!isConnected) {
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
      this.setData({
        atomConnected: status
      });
      
      if (status) {
        wx.showToast({
          title: '设备连接成功',
          icon: 'success'
        });
        this.startMonitoring();
      } else {
        wx.showToast({
          title: '连接失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 开始监控健康数据
  startMonitoring() {
    this.stopMonitoring();
    
    // 直接使用全局数据更新回调
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
    
    this.setData({
      healthData: data
    });
    
    // 更新图表数据
    this.updateChartData(data);
    
    // 检查健康状态
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
    
    initialData.forEach(data => {
      this.data.chartData.temperature.push(data.temperature);
      this.data.chartData.humidity.push(data.humidity);
      this.data.chartData.bloodOxygen.push(data.bloodOxygen);
    });
  },

  // 更新图表数据
  updateChartData(data) {
    // 温度数据
    if (this.data.chartData.temperature.length >= this.data.maxDataPoints) {
      this.data.chartData.temperature.shift();
    }
    this.data.chartData.temperature.push(data.temperature);
    
    // 湿度数据
    if (this.data.chartData.humidity.length >= this.data.maxDataPoints) {
      this.data.chartData.humidity.shift();
    }
    this.data.chartData.humidity.push(data.humidity);
    
    // 血氧数据
    if (this.data.chartData.bloodOxygen.length >= this.data.maxDataPoints) {
      this.data.chartData.bloodOxygen.shift();
    }
    this.data.chartData.bloodOxygen.push(data.bloodOxygen);
    
    // 更新图表
    this.updateChart();
  },

  // 检查健康状态，判断是否需要发出警告
  checkHealthStatus() {
    const { temperature, bloodOxygen } = this.data.healthData;
    let warnings = [];
    
    // 温度异常检查
    if (temperature < 35.5) {
      warnings.push("体温过低，请注意保暖");
    } else if (temperature > 37.3) {
      warnings.push("体温偏高，请留意身体状况");
    }
    
    // 血氧异常检查
    if (bloodOxygen < 93) {
      warnings.push("血氧偏低，建议休息并密切关注");
    }
    
    // 更新警告状态
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
      "保持充足睡眠有助于维持正常体温和血氧水平",
      "高温环境下注意补充水分，避免中暑",
      "长时间久坐会影响血液循环，建议每小时起身活动",
      "保持良好通风，有助于维持适宜的室内温湿度"
    ];
    
    const randomIndex = Math.floor(Math.random() * tips.length);
    this.setData({
      healthTip: tips[randomIndex]
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
    
    // 清除画布
    ctx.clearRect(0, 0, chartWidth, chartHeight);
    
    // 绘制坐标轴
    this.drawAxes(ctx, chartWidth, chartHeight, padding);
    
    // 绘制标题和图例
    this.drawChartInfo(ctx, chartWidth, chartHeight, padding);
    
    // 绘制数据曲线
    this.drawDataLines(ctx, chartWidth, chartHeight, padding);
    
    // 绘制
    ctx.draw();
  },

  // 绘制坐标轴
  drawAxes(ctx, chartWidth, chartHeight, padding) {
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    
    // X轴和Y轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight - padding);
    ctx.lineTo(chartWidth - padding, chartHeight - padding);
    ctx.stroke();
    
    // X轴刻度
    const xTicks = 5;
    const xStep = (chartWidth - 2 * padding) / xTicks;
    for (let i = 0; i <= xTicks; i++) {
      const x = padding + i * xStep;
      ctx.beginPath();
      ctx.moveTo(x, chartHeight - padding);
      ctx.lineTo(x, chartHeight - padding + 5);
      ctx.stroke();
    }
  },

  // 绘制图表信息（标题和图例）
  drawChartInfo(ctx, chartWidth, chartHeight, padding) {
    // 标题
    ctx.setFontSize(12);
    ctx.setFillStyle('#666666');
    ctx.fillText('健康数据趋势', padding, padding - 5);
    
    // 图例
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
    const pointSpacing = plotWidth / (dataCount > 1 ? dataCount - 1 : 1);
    
    // 绘制体温曲线
    ctx.setStrokeStyle('#FF6B6B');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.temperature.forEach((value, i) => {
      const x = padding + i * pointSpacing;
      // 温度范围映射：34-40°C 映射到绘图区域高度
      const y = chartHeight - padding - ((value - 34) / 6 * plotHeight);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // 绘制湿度曲线
    ctx.setStrokeStyle('#4ECDC4');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.humidity.forEach((value, i) => {
      const x = padding + i * pointSpacing;
      // 湿度范围映射：0-100% 映射到绘图区域高度
      const y = chartHeight - padding - (value / 100 * plotHeight);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // 绘制血氧曲线
    ctx.setStrokeStyle('#556270');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.bloodOxygen.forEach((value, i) => {
      const x = padding + i * pointSpacing;
      // 血氧范围映射：90-100% 映射到绘图区域高度
      const y = chartHeight - padding - ((value - 90) / 10 * plotHeight);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  },

  // 温度状态判断
  getTempStatus(temp) {
    if (temp < 36) return 'low';
    if (temp > 37.5) return 'high';
    return 'normal';
  },

  getTempStatusText(temp) {
    if (temp < 36) return '体温偏低';
    if (temp > 37.5) return '体温偏高';
    return '体温正常';
  },

  // 湿度状态判断
  getHumidityStatus(humidity) {
    if (humidity < 30) return 'low';
    if (humidity > 70) return 'high';
    return 'normal';
  },

  getHumidityStatusText(humidity) {
    if (humidity < 30) return '干燥';
    if (humidity > 70) return '潮湿';
    return '舒适';
  },

  // 血氧状态判断
  getBloodOxygenStatus(oxygen) {
    if (oxygen < 95) return 'low';
    if (oxygen > 100) return 'high';
    return 'normal';
  },

  getBloodOxygenStatusText(oxygen) {
    if (oxygen < 95) return '血氧偏低';
    if (oxygen > 100) return '血氧偏高';
    return '血氧正常';
  },

  // 运动状态判断
  getMotionStatus(motion) {
    const magnitude = Math.sqrt(
      Math.pow(motion.x, 2) + 
      Math.pow(motion.y, 2) + 
      Math.pow(motion.z, 2)
    );
    
    if (magnitude > 1.5) return '运动中';
    if (magnitude > 0.5) return '活动状态';
    return '静止状态';
  },

  // 跳转到紧急联系人页面
  goToEmergency() {
    wx.navigateTo({
      url: '/pages/emergency/emergency'
    });
  }
});
