/**
 * Analytics and Trends module for Boiler Lab
 * Построение графиков ВХР с поддержкой светлой и тёмной темы
 */

let phChartInstance = null;
let o2ChartInstance = null;
let hardnessChartInstance = null;
let summaryPieChartInstance = null;

const Analytics = {
  // Получение актуальных цветов для Chart.js в зависимости от темы
  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      textColor: isLight ? '#334155' : '#94a3b8',
      legendColor: isLight ? '#0f172a' : '#e2e8f0',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.07)',
      pieBorder: isLight ? '#ffffff' : '#131d33',
      pieBg: isLight ? '#f1f5f9' : '#0b1120'
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

  // 1. График тренда pH
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
            label: 'Питательная вода (норма 8.5-9.5)',
            data: labels.map(l => feedDataMap.get(l) ?? null),
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            tension: 0.3,
            fill: false,
            pointRadius: 5,
            spanGaps: true
          },
          {
            label: 'Котловая вода (норма 9.3-11.2)',
            data: labels.map(l => boilerDataMap.get(l) ?? null),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            tension: 0.3,
            fill: false,
            pointRadius: 5,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '600' } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 7.0,
            max: 12.0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'pH', color: theme.textColor }
          }
        }
      }
    });
  },

  // 2. Кислород O2 с красной чертой нормы ПТЭ ТЭ
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
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            pointBackgroundColor: values.map(v => v > 20.0 ? '#ef4444' : (v > 15.0 ? '#f59e0b' : '#10b981')),
            pointRadius: 6,
            tension: 0.25
          },
          {
            label: 'Предел нормы ПТЭ ТЭ (≤ 20 мкг/дм³)',
            data: limitNorm,
            borderColor: '#ef4444',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '600' } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'мкг/дм³', color: theme.textColor }
          }
        }
      }
    });
  },

  // 3. Жесткость фильтратов ХВО
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
            backgroundColor: softValues.map(v => v > 15 ? '#ef4444' : (v > 10 ? '#f59e0b' : '#0284c7')),
            borderRadius: 4
          },
          {
            type: 'line',
            label: 'Норма до регенерации (15 мкг-экв/дм³)',
            data: limitSoft,
            borderColor: '#ef4444',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.legendColor, font: { weight: '600' } } }
        },
        scales: {
          x: { ticks: { color: theme.textColor }, grid: { color: theme.gridColor } },
          y: {
            min: 0,
            ticks: { color: theme.textColor },
            grid: { color: theme.gridColor },
            title: { display: true, text: 'мкг-экв/дм³', color: theme.textColor }
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
            borderColor: theme.pieBorder
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.legendColor, font: { weight: '600' } } }
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
