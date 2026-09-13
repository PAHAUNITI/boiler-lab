/**
 * Analytics and Trends module for Boiler Lab
 * Построение высокотехнологичных графиков ВХР с поддержкой светлой и неоновой тёмной темы
 */

let phChartInstance = null;
let o2ChartInstance = null;
let hardnessChartInstance = null;
let summaryPieChartInstance = null;

const Analytics = {
  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      isLight,
      textColor: isLight ? '#475569' : '#94a3b8',
      legendColor: isLight ? '#0f172a' : '#f1f5f9',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(56, 189, 248, 0.07)',
      pieBorder: isLight ? '#ffffff' : '#0c1426',
      feedColor: isLight ? '#0284c7' : '#00f2fe',
      boilerColor: isLight ? '#d97706' : '#f59e0b',
      o2Color: isLight ? '#059669' : '#10b981',
      limitColor: isLight ? '#dc2626' : '#ef4444'
    };
  },

  destroyChart(instance) {
    if (instance && typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch (e) {
        console.warn('Ошибка при сбросе графика:', e);
      }
    }
    return null;
  },

  render() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js не обнаружен');
      return;
    }

    try {
      this.renderPhTrend();
      this.renderO2Trend();
      this.renderHardnessTrend();
      this.renderQualityPie();
    } catch (err) {
      console.error('Ошибка рендеринга аналитических графиков:', err);
    }
  },

  // 1. График тренда pH (Неоновый циан и амбер)
  renderPhTrend() {
    const canvas = document.getElementById('chartPh');
    if (!canvas) return;

    phChartInstance = this.destroyChart(phChartInstance);
    const theme = this.getThemeColors();

    const sorted = [...AppState.records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const feedPoints = sorted.filter(r => r.pointId === 'feed' && r.values?.ph !== undefined);
    const boilerPoints = sorted.filter(r => r.pointId === 'boiler' && r.values?.ph !== undefined);

    const labels = Array.from(new Set([...feedPoints, ...boilerPoints].map(r => `${r.date.slice(5)} ${r.time}`)));
    const feedDataMap = new Map(feedPoints.map(r => [`${r.date.slice(5)} ${r.time}`, r.values.ph]));
    const boilerDataMap = new Map(boilerPoints.map(r => [`${r.date.slice(5)} ${r.time}`, r.values.ph]));

    const ctx = canvas.getContext('2d');
    phChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Питательная вода (норма 8.5–9.5)',
            data: labels.map(l => feedDataMap.get(l) ?? null),
            borderColor: theme.feedColor,
            backgroundColor: theme.isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 242, 254, 0.15)',
            borderWidth: 2.5,
            pointBackgroundColor: theme.feedColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.35,
            fill: true,
            spanGaps: true
          },
          {
            label: 'Котловая вода (норма 9.3–11.2)',
            data: labels.map(l => boilerDataMap.get(l) ?? null),
            borderColor: theme.boilerColor,
            backgroundColor: theme.isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2.5,
            pointBackgroundColor: theme.boilerColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.35,
            fill: true,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '700', size: 12 } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 7.0,
            max: 12.0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'pH', color: theme.textColor, font: { weight: '700' } }
          }
        }
      }
    });
  },

  // 2. Кислород O2 с неоновой чертой нормы ПТЭ ТЭ
  renderO2Trend() {
    const canvas = document.getElementById('chartO2');
    if (!canvas) return;

    o2ChartInstance = this.destroyChart(o2ChartInstance);
    const theme = this.getThemeColors();

    const feedPoints = [...AppState.records]
      .filter(r => r.pointId === 'feed' && r.values?.o2 !== undefined)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = feedPoints.map(r => `${r.date.slice(5)} ${r.time}`);
    const values = feedPoints.map(r => r.values.o2);
    const limitNorm = labels.map(() => 20.0);

    const ctx = canvas.getContext('2d');
    o2ChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Замер O₂ (мкг/дм³)',
            data: values,
            borderColor: theme.o2Color,
            backgroundColor: theme.isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(16, 185, 129, 0.15)',
            borderWidth: 2.5,
            pointBackgroundColor: values.map(v => v > 20.0 ? '#ef4444' : (v > 15.0 ? '#f59e0b' : '#10b981')),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Предел нормы ПТЭ ТЭ (≤ 20 мкг/дм³)',
            data: limitNorm,
            borderColor: theme.limitColor,
            borderDash: [6, 4],
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '700', size: 12 } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'мкг/дм³', color: theme.textColor, font: { weight: '700' } }
          }
        }
      }
    });
  },

  // 3. Жесткость ХВО
  renderHardnessTrend() {
    const canvas = document.getElementById('chartHardness');
    if (!canvas) return;

    hardnessChartInstance = this.destroyChart(hardnessChartInstance);
    const theme = this.getThemeColors();

    const softPoints = [...AppState.records]
      .filter(r => r.pointId === 'soft' && r.values?.hardness !== undefined)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = softPoints.map(r => `${r.date.slice(5)} ${r.time}`);
    const softValues = softPoints.map(r => r.values.hardness);
    const limitSoft = labels.map(() => 15.0);

    const ctx = canvas.getContext('2d');
    hardnessChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Жесткость фильтратов ХВО (мкг-экв/дм³)',
            data: softValues,
            backgroundColor: softValues.map(v => v > 15 ? '#ef4444' : (v > 10 ? '#f59e0b' : (theme.isLight ? '#0284c7' : '#00f2fe'))),
            borderRadius: 6,
            borderSkipped: false
          },
          {
            type: 'line',
            label: 'Норма до истощения смолы (15 мкг-экв/дм³)',
            data: limitSoft,
            borderColor: theme.limitColor,
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '700', size: 12 } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'мкг-экв/дм³', color: theme.textColor, font: { weight: '700' } }
          }
        }
      }
    });
  },

  // 4. Круговая диаграмма качества анализов
  renderQualityPie() {
    const canvas = document.getElementById('chartQualityPie');
    if (!canvas) return;

    summaryPieChartInstance = this.destroyChart(summaryPieChartInstance);
    const theme = this.getThemeColors();

    const normal = AppState.records.filter(r => r.status === 'normal').length;
    const warn = AppState.records.filter(r => r.status === 'warning').length;
    const alarm = AppState.records.filter(r => r.status === 'alarm').length;

    const ctx = canvas.getContext('2d');
    summaryPieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['В норме', 'Предупреждение', 'Нарушение нормы'],
        datasets: [
          {
            data: [normal, warn, alarm],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 3,
            borderColor: theme.pieBorder,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.legendColor, font: { weight: '700', size: 12 } } }
        }
      }
    });
  },

  handleResize() {
    try {
      if (phChartInstance) phChartInstance.resize();
      if (o2ChartInstance) o2ChartInstance.resize();
      if (hardnessChartInstance) hardnessChartInstance.resize();
      if (summaryPieChartInstance) summaryPieChartInstance.resize();
    } catch (e) {
      console.warn('Ошибка при ресайзе графиков:', e);
    }
  }
};
