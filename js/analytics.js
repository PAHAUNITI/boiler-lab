/**
 * Analytics and Chart.js integration
 * Clean Microsoft Blue & High-Contrast Palette
 */

const Analytics = {
  charts: {},

  init() {
    // Charts initialize on demand
  },

  getChartColors() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
    return {
      text: isDark ? '#a19f9d' : '#64748b',
      grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      primary: isDark ? '#2886de' : '#0078d4',
      primaryBg: isDark ? 'rgba(40, 134, 222, 0.18)' : 'rgba(0, 120, 212, 0.12)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.15)',
      alarm: '#f87171',
      alarmBg: 'rgba(239, 68, 68, 0.15)',
      emerald: '#10b981',
      emeraldBg: 'rgba(16, 185, 129, 0.15)'
    };
  },

  render() {
    if (typeof Chart === 'undefined') return;

    this.renderPhChart();
    this.renderO2Chart();
    this.renderHardnessChart();
    this.renderQualityPie();
  },

  handleResize() {
    Object.values(this.charts).forEach(ch => {
      if (ch && typeof ch.resize === 'function') ch.resize();
    });
  },

  renderPhChart() {
    const ctx = document.getElementById('chartPh')?.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    const sorted = [...AppState.records].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    const feedPoints = sorted.filter(r => r.pointId === 'feed' && r.values && r.values.ph !== undefined);
    const boilerPoints = sorted.filter(r => r.pointId === 'boiler' && r.values && r.values.ph !== undefined);

    const labels = [...new Set([...feedPoints.map(r => `${r.date.slice(5)} ${r.time}`), ...boilerPoints.map(r => `${r.date.slice(5)} ${r.time}`)])].slice(-10);

    const feedData = labels.map(lbl => {
      const rec = feedPoints.find(r => `${r.date.slice(5)} ${r.time}` === lbl);
      return rec ? rec.values.ph : null;
    });

    const boilerData = labels.map(lbl => {
      const rec = boilerPoints.find(r => `${r.date.slice(5)} ${r.time}` === lbl);
      return rec ? rec.values.ph : null;
    });

    if (this.charts.ph) this.charts.ph.destroy();

    this.charts.ph = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Нет данных'],
        datasets: [
          {
            label: 'Питательная вода (норма 8.5–9.2)',
            data: feedData.length ? feedData : [null],
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: colors.primary
          },
          {
            label: 'Котловая вода (норма 9.0–11.5)',
            data: boilerData.length ? boilerData : [null],
            borderColor: colors.warning,
            backgroundColor: colors.warningBg,
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: colors.warning
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { min: 7, max: 12, ticks: { color: colors.text }, grid: { color: colors.grid } }
        },
        plugins: {
          legend: { labels: { color: colors.text, font: { size: 11 } } }
        }
      }
    });
  },

  renderO2Chart() {
    const ctx = document.getElementById('chartO2')?.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    const sorted = [...AppState.records].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    const feedPoints = sorted.filter(r => r.pointId === 'feed' && r.values && r.values.o2 !== undefined).slice(-10);

    const labels = feedPoints.map(r => `${r.date.slice(5)} ${r.time}`);
    const o2Data = feedPoints.map(r => r.values.o2);

    if (this.charts.o2) this.charts.o2.destroy();

    this.charts.o2 = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Нет данных'],
        datasets: [
          {
            label: 'Кислород O₂ (мкг/дм³)',
            data: o2Data.length ? o2Data : [null],
            borderColor: colors.alarm,
            backgroundColor: colors.alarmBg,
            tension: 0.25,
            fill: true,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: colors.alarm
          },
          {
            label: 'Предельная норма ПТЭ ТЭ (20 мкг/дм³)',
            data: labels.map(() => 20),
            borderColor: colors.text,
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { min: 0, max: 35, ticks: { color: colors.text }, grid: { color: colors.grid } }
        },
        plugins: {
          legend: { labels: { color: colors.text, font: { size: 11 } } }
        }
      }
    });
  },

  renderHardnessChart() {
    const ctx = document.getElementById('chartHardness')?.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    const sorted = [...AppState.records].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    const softPoints = sorted.filter(r => r.pointId === 'soft' && r.values && r.values.hardness !== undefined).slice(-10);

    const labels = softPoints.map(r => `${r.date.slice(5)} ${r.time}`);
    const hardnessData = softPoints.map(r => r.values.hardness);

    if (this.charts.hardness) this.charts.hardness.destroy();

    this.charts.hardness = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Нет данных'],
        datasets: [
          {
            label: 'Жесткость фильтрата ХВО (мкг-экв/дм³)',
            data: hardnessData.length ? hardnessData : [null],
            backgroundColor: hardnessData.map(v => v > 15 ? colors.alarm : (v > 10 ? colors.warning : colors.emerald)),
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { min: 0, max: 25, ticks: { color: colors.text }, grid: { color: colors.grid } }
        },
        plugins: {
          legend: { labels: { color: colors.text, font: { size: 11 } } }
        }
      }
    });
  },

  renderQualityPie() {
    const ctx = document.getElementById('chartQualityPie')?.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    let normal = 0, warn = 0, alarm = 0;

    AppState.records.forEach(r => {
      const v = AppState.validateRecord(r);
      if (v.status === 'alarm') alarm++;
      else if (v.status === 'warning') warn++;
      else normal++;
    });

    if (this.charts.quality) this.charts.quality.destroy();

    this.charts.quality = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['В норме', 'Предупреждения', 'Брак / Авария'],
        datasets: [
          {
            data: (normal + warn + alarm > 0) ? [normal, warn, alarm] : [1, 0, 0],
            backgroundColor: [colors.emerald, colors.warning, colors.alarm],
            borderWidth: 2,
            borderColor: (document.documentElement.getAttribute('data-theme') === 'dark') ? '#252423' : '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.text, font: { size: 11 } } }
        }
      }
    });
  }
};
