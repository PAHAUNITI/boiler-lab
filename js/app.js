/**
 * Main Controller for Boiler Lab App (ВХР)
 * Modern Microsoft Blue & Clean Architecture
 */

const App = {
  currentTab: 'journal',
  currentCalcSubtab: 'blowdown',

  // Переключение светлой / тёмной темы
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.settings.theme = theme;
    AppState.save();

    // Обновляем иконку темы
    const icon = document.getElementById('themeToggleIcon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#1b1a19' : '#0078d4');
    }

    if (window.Analytics && typeof window.Analytics.render === 'function') {
      window.Analytics.render();
    }
  },

  initTheme() {
    let preferredTheme = AppState.settings.theme;
    if (!preferredTheme) {
      preferredTheme = 'light';
    }
    this.applyTheme(preferredTheme);
  },

  // Переключение вкладок приложения
  switchTab(tabId) {
    this.currentTab = tabId;

    // Обновляем десктопные табы
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Обновляем мобильные табы
    document.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Показываем нужный контент
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Дополнительные хуки при переключении
    if (tabId === 'analytics' && window.Analytics) {
      setTimeout(() => window.Analytics.render(), 50);
    } else if (tabId === 'settings') {
      this.initSettingsPage();
    }
  },

  // Переключение подвкладок калькулятора
  switchCalcSubtab(subtabId) {
    this.currentCalcSubtab = subtabId;

    document.querySelectorAll('.calc-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtabId);
    });

    document.querySelectorAll('.calc-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const target = document.getElementById(`calc-${subtabId}`);
    if (target) {
      target.classList.add('active');
    }
  },

  // Привязка калькуляторов
  bindCalculators() {
    // 1. Продувка
    const blowInputs = ['calcBlowFeedTds', 'calcBlowBoilerTds', 'calcBlowCapacity'];
    blowInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.runBlowdownCalc());
    });
    this.runBlowdownCalc();

    // 2. Фильтроцикл ХВО
    const filterInputs = ['calcResinVol', 'calcResinCap', 'calcRawHard', 'calcFilterFlow', 'calcSaltRate'];
    filterInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.runFilterCalc());
    });
    this.runFilterCalc();

    // 3. Реагенты
    const reagentInputs = ['calcSulfWaterFlow', 'calcSulfO2', 'calcPhosSteamCap', 'calcPhosFeedHard'];
    reagentInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.runReagentsCalc());
    });
    this.runReagentsCalc();

    // 4. Конвертер
    const convInputs = ['calcConvHardVal', 'calcConvHardUnit'];
    convInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.runConverterCalc());
        el.addEventListener('change', () => this.runConverterCalc());
      }
    });
    this.runConverterCalc();
  },

  runBlowdownCalc() {
    const sFeed = parseFloat(document.getElementById('calcBlowFeedTds')?.value) || 0;
    const sBoiler = parseFloat(document.getElementById('calcBlowBoilerTds')?.value) || 0;
    const cap = parseFloat(document.getElementById('calcBlowCapacity')?.value) || 0;

    const res = Calculators.continuousBlowdown(sFeed, sBoiler, cap);
    const container = document.getElementById('blowdownResults');
    if (!container) return;

    if (res.error) {
      container.innerHTML = `<div class="calc-res-item" style="border-left: 3px solid var(--status-alarm);"><span style="color: var(--status-alarm);">${res.error}</span></div>`;
      return;
    }

    container.innerHTML = `
      <div class="calc-res-item">
        <span class="calc-res-label">Процент непрерывной продувки (P):</span>
        <span class="calc-res-value">${res.blowdownPercent}%</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">Расход продувочной воды (Gпрод):</span>
        <span class="calc-res-value">${res.blowdownRate} т/ч (${res.blowdownLitersPerMin} л/мин)</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">Суточный сброс солей с продувкой:</span>
        <span class="calc-res-value">${res.dailySaltBlowdownKg} кг/сутки</span>
      </div>
    `;
  },

  runFilterCalc() {
    const vResin = parseFloat(document.getElementById('calcResinVol')?.value) || 0;
    const eCap = parseFloat(document.getElementById('calcResinCap')?.value) || 0;
    const rawHard = parseFloat(document.getElementById('calcRawHard')?.value) || 0;
    const flow = parseFloat(document.getElementById('calcFilterFlow')?.value) || 0;
    const saltRate = parseFloat(document.getElementById('calcSaltRate')?.value) || 0;

    const res = Calculators.filterRun(vResin, eCap, rawHard, flow, saltRate);
    const container = document.getElementById('filterResults');
    if (!container) return;

    if (res.error) {
      container.innerHTML = `<div class="calc-res-item" style="border-left: 3px solid var(--status-alarm);"><span style="color: var(--status-alarm);">${res.error}</span></div>`;
      return;
    }

    container.innerHTML = `
      <div class="calc-res-item">
        <span class="calc-res-label">Полезный фильтроцикл (Vф):</span>
        <span class="calc-res-value">${res.filterCycleM3} м³</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">Длительность работы фильтра:</span>
        <span class="calc-res-value">${res.durationHours} ч (~${res.durationDays} сут)</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">Расход поваренной соли на 1 регенерацию:</span>
        <span class="calc-res-value">${res.saltKg} кг (${res.saltBags25kg} мешков по 25кг)</span>
      </div>
    `;
  },

  runReagentsCalc() {
    // Сульфит
    const waterFlow = parseFloat(document.getElementById('calcSulfWaterFlow')?.value) || 0;
    const o2Val = parseFloat(document.getElementById('calcSulfO2')?.value) || 0;
    const sulfRes = Calculators.sulfiteDosing(waterFlow, o2Val);
    const sulfContainer = document.getElementById('sulfiteResults');
    if (sulfContainer) {
      sulfContainer.innerHTML = `
        <div class="calc-res-item">
          <span class="calc-res-label">Часовой расход Na₂SO₃:</span>
          <span class="calc-res-value">${sulfRes.hourlyGrams} г/ч</span>
        </div>
        <div class="calc-res-item">
          <span class="calc-res-label">Суточный расход Na₂SO₃:</span>
          <span class="calc-res-value">${sulfRes.dailyKg} кг/сутки</span>
        </div>
      `;
    }

    // Фосфат
    const steamCap = parseFloat(document.getElementById('calcPhosSteamCap')?.value) || 0;
    const feedHard = parseFloat(document.getElementById('calcPhosFeedHard')?.value) || 0;
    const phosRes = Calculators.phosphateDosing(steamCap, feedHard);
    const phosContainer = document.getElementById('phosphateResults');
    if (phosContainer) {
      phosContainer.innerHTML = `
        <div class="calc-res-item">
          <span class="calc-res-label">Часовой расход тринатрийфосфата:</span>
          <span class="calc-res-value">${phosRes.hourlyGrams} г/ч</span>
        </div>
        <div class="calc-res-item">
          <span class="calc-res-label">Суточный расход тринатрийфосфата:</span>
          <span class="calc-res-value">${phosRes.dailyKg} кг/сутки</span>
        </div>
      `;
    }
  },

  runConverterCalc() {
    const val = parseFloat(document.getElementById('calcConvHardVal')?.value) || 0;
    const unit = document.getElementById('calcConvHardUnit')?.value || 'mgeq_l';
    const res = Calculators.convertHardness(val, unit);
    const container = document.getElementById('hardnessConverterResults');
    if (!container) return;

    container.innerHTML = `
      <div class="calc-res-item">
        <span class="calc-res-label">мг-экв/л (Россия, СанПиН):</span>
        <span class="calc-res-value">${res.mgeq_l}</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">мкг-экв/дм³ (паровые котлы):</span>
        <span class="calc-res-value">${res.mcgeq_dm3}</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">°dH (Немецкие градусы):</span>
        <span class="calc-res-value">${res.deg_dh}</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">ppm (мг/л CaCO₃):</span>
        <span class="calc-res-value">${res.ppm}</span>
      </div>
      <div class="calc-res-item">
        <span class="calc-res-label">°f (Французские градусы):</span>
        <span class="calc-res-value">${res.deg_f}</span>
      </div>
    `;
  },

  // Инициализация вкладки настроек и справочника норм
  initSettingsPage() {
    const fac = document.getElementById('settingFacility');
    const tech = document.getElementById('settingTechnician');
    const shift = document.getElementById('settingShift');
    const sound = document.getElementById('settingSound');

    if (fac) fac.value = AppState.settings.facilityName || '';
    if (tech) tech.value = AppState.settings.technicianName || '';
    if (shift) shift.value = AppState.settings.defaultShift || '1';
    if (sound) sound.checked = AppState.settings.soundAlerts !== false;

    // Рендер справочника норм ПТЭ ТЭ
    const container = document.getElementById('normsReferenceContainer');
    if (container) {
      let html = '';
      Object.entries(AppState.norms).forEach(([ptKey, point]) => {
        html += `
          <div class="norm-point-box">
            <div class="norm-point-header">
              <span>${point.name}</span>
              <span style="font-size: 0.72rem; opacity: 0.8;">${point.description || ''}</span>
            </div>
        `;
        Object.entries(point.parameters).forEach(([pKey, p]) => {
          let rangeStr = '';
          if (p.min !== undefined && p.max !== undefined) rangeStr = `${p.min} – ${p.max}`;
          else if (p.min !== undefined) rangeStr = `≥ ${p.min}`;
          else if (p.max !== undefined) rangeStr = `≤ ${p.max}`;

          html += `
            <div class="norm-param-row">
              <span style="font-weight: 500;">${p.name}:</span>
              <span style="font-family: monospace; font-weight: 700;">${rangeStr} ${p.unit}</span>
            </div>
          `;
        });
        html += `</div>`;
      });
      container.innerHTML = html;
    }
  },

  saveSettings() {
    AppState.settings.facilityName = document.getElementById('settingFacility')?.value.trim() || 'Котельная №1';
    AppState.settings.technicianName = document.getElementById('settingTechnician')?.value.trim() || '';
    AppState.settings.defaultShift = document.getElementById('settingShift')?.value || '1';
    AppState.settings.soundAlerts = document.getElementById('settingSound')?.checked ?? true;
    AppState.save();
    alert('Параметры успешно сохранены!');
  },

  resetToDemo() {
    if (confirm('Восстановить типовые демонстрационные замеры? Текущие записи будут перезаписаны.')) {
      AppState.records = [...AppState.getDemoRecords()];
      AppState.save();
      if (window.Journal) window.Journal.render();
      if (window.Analytics) window.Analytics.render();
      alert('Данные сброшены к демонстрационным.');
    }
  },

  // Модалка создания задачи
  openNewReminderModal() {
    const modal = document.getElementById('newReminderModal');
    if (modal) modal.classList.add('active');
  },
  closeNewReminderModal() {
    const modal = document.getElementById('newReminderModal');
    if (modal) modal.classList.remove('active');
  },
  saveNewReminder() {
    const title = document.getElementById('newRemTitle')?.value.trim();
    const pointId = document.getElementById('newRemPoint')?.value;
    const interval = document.getElementById('newRemInterval')?.value;
    const notes = document.getElementById('newRemNotes')?.value.trim();

    if (!title) {
      alert('Укажите название задачи!');
      return;
    }

    Reminders.addReminder({
      title,
      pointId,
      intervalMinutes: interval,
      notes
    });

    this.closeNewReminderModal();
  },

  checkUrlTab() {
    try {
      const hash = window.location.hash.replace('#', '');
      if (['journal', 'calculators', 'reminders', 'analytics', 'settings'].includes(hash)) {
        this.switchTab(hash);
      }
    } catch (e) {
      console.warn('URL routing warning:', e);
    }
  },

  init() {
    AppState.load();
    this.initTheme();

    if (window.Journal) window.Journal.init();
    if (window.Reminders) window.Reminders.init();
    this.bindCalculators();
    this.initSettingsPage();
    this.checkUrlTab();

    window.addEventListener('resize', () => {
      if (window.Analytics) window.Analytics.handleResize();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (window.Journal) window.Journal.closeRecordModal();
        this.closeNewReminderModal();
      }
    });

    console.log('✅ ВХР Лаборатория успешно запущена (Тема:', AppState.settings.theme, ')');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
