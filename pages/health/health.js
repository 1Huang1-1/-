// pages/health/health.js
const app = getApp();

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
    chartData: [],
    timer: null
  },

  onLoad() {
    this.setData({
      atomConnected: app.globalData.atomConnected,
      healthData: app.globalData.healthData
    });
    
    this.getHealthTip();
    
    // 创建图表
    this.createChart();
  },

  onShow() {
    // 开始定时更新数据
    this.startDataRefresh();
  },

  onHide() {
    // 停止定时更新
    this.stopDataRefresh();
  },

  // 开始定时刷新数据
  startDataRefresh() {
    this.stopDataRefresh();
    
    this.timer = setInterval(() => {
      this.setData({
        healthData: app.globalData.healthData
      });
      this.updateChart();
    }, 2000);
  },

  // 停止定时刷新
  stopDataRefresh() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 获取健康建议
  getHealthTip() {
    const tips = [
      "建议保持室内温度在22-26°C之间，湿度在40%-60%之间",
      "正常血氧饱和度应在95%-100%之间，低于90%请及时就医",
      "适当运动有助于提高血氧水平，建议每天步行30分钟",
      "保持充足睡眠有助于维持正常体温和血氧水平",
      "高温环境下注意补充水分，避免中暑"
    ];
    
    const randomIndex = Math.floor(Math.random() * tips.length);
    this.setData({
      healthTip: tips[randomIndex]
    });
  },

  // 创建健康数据图表
  createChart() {
    const ctx = wx.createCanvasContext('healthChart', this);
    const chartWidth = 300;
    const chartHeight = 200;
    const padding = 20;
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight - padding);
    ctx.lineTo(chartWidth - padding, chartHeight - padding);
    ctx.stroke();
    
    // 绘制标题
    ctx.setFontSize(12);
    ctx.setFillStyle('#666666');
    ctx.fillText('健康数据趋势', padding, padding - 5);
    
    // 初始化数据点
    const initialData = [
      { value: 36.5, type: 'temperature' },
      { value: 45, type: 'humidity' },
      { value: 98, type: 'bloodOxygen' }
    ];
    
    this.setData({
      chartData: initialData
    });
    
    this.updateChart();
  },

  // 更新图表
  updateChart() {
    const ctx = wx.createCanvasContext('healthChart', this);
    const chartWidth = 300;
    const chartHeight = 200;
    const padding = 20;
    const maxPoints = 10;
    
    // 添加新数据点
    const newData = [...this.data.chartData];
    newData.push({
      value: this.data.healthData.temperature,
      type: 'temperature'
    });
    
    if (newData.length > maxPoints) {
      newData.shift();
    }
    
    this.setData({
      chartData: newData
    });
    
    // 清除画布
    ctx.clearRect(0, 0, chartWidth, chartHeight);
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight - padding);
    ctx.lineTo(chartWidth - padding, chartHeight - padding);
    ctx.stroke();
    
    // 绘制标题
    ctx.setFontSize(12);
    ctx.setFillStyle('#666666');
    ctx.fillText('健康数据趋势', padding, padding - 5);
    
    // 绘制图例
    ctx.setFillStyle('#FF6B6B');
    ctx.fillRect(chartWidth - 80, padding, 10, 10);
    ctx.fillText('体温', chartWidth - 65, padding + 8);
    
    ctx.setFillStyle('#4ECDC4');
    ctx.fillRect(chartWidth - 80, padding + 20, 10, 10);
    ctx.fillText('湿度', chartWidth - 65, padding + 28);
    
    ctx.setFillStyle('#556270');
    ctx.fillRect(chartWidth - 80, padding + 40, 10, 10);
    ctx.fillText('血氧', chartWidth - 65, padding + 48);
    
    // 绘制数据点
    const plotWidth = chartWidth - 2 * padding;
    const plotHeight = chartHeight - 2 * padding;
    const pointSpacing = plotWidth / (maxPoints - 1);
    
    // 体温线
    ctx.setStrokeStyle('#FF6B6B');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.forEach((point, i) => {
      if (point.type === 'temperature') {
        const x = padding + i * pointSpacing;
        const y = chartHeight - padding - (point.value - 35) * 10;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    
    // 湿度线
    ctx.setStrokeStyle('#4ECDC4');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.forEach((point, i) => {
      if (point.type === 'humidity') {
        const x = padding + i * pointSpacing;
        const y = chartHeight - padding - point.value * 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    
    // 血氧线
    ctx.setStrokeStyle('#556270');
    ctx.setLineWidth(2);
    ctx.beginPath();
    this.data.chartData.forEach((point, i) => {
      if (point.type === 'bloodOxygen') {
        const x = padding + i * pointSpacing;
        const y = chartHeight - padding - (point.value - 90) * 4;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    
    ctx.draw();
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
  }
});