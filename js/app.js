/**
 * Main Controller for Boiler Lab App (ВХР)
 * Microsoft 365 & Excel Fluent Architecture
 */

const App = {
  currentTab: 'journal',
  currentCalcSubtab: 'blowdown',

  // Переключение светлой / тёмной темы Office
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.settings.theme = theme;
    AppState.save();

    // Обновляем кнопку темы в шапке
    const btn = document.getElementById('titlebarThemeBtn');
    if (btn) {
      if (theme === 'dark') {
        btn.innerHTML = '☀️ <span class="theme-text-lbl">День</span>';
        btn.title = 'Переключить на классическую светлую тему Excel';
      } else {
        btn.innerHTML = '🌙 <span class="theme-text-lbl">Ночь</span>';
        btn.title = 'Переключить на темный режим Office Dark';
      }
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0e5b30' : '#107c41');
    }

    if (window.Analytics && typeof window.Analytics.render === 'function') {
      window.Analytics.render();
    }
  },

  initTheme() {
    let preferredTheme = AppState.settings.theme;
    if (!preferredTheme) {
      preferredTheme = 'light'; // По умолчанию в стиле классического Excel
    }
    this.applyTheme(preferredTheme);
  },

  // Переключение вкладок ленты Ribbon
  switchTab(tabId) {
    this.currentTab = tabId;

    // Обновляем вкладки на ленте Office
    document.querySelectorAll('.ribbon-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Обновляем вкладки на мобильном Bottom Nav
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Переключаем контейнеры листов
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Обновляем строку формулы Excel в зависимости от раздела
    const cellNameEl = document.getElementById('excelCellName');
    const formulaInput = document.getElementById('excelFormulaInput');
    if (cellNameEl && formulaInput) {
      switch (tabId) {
        case 'journal':
          cellNameEl.textContent = 'A1: ВХР_СМЕНА';
          formulaInput.value = `=ВПР("ВХР_Котельная"; Журнал!A1:N${AppState.records.length + 1}; "Статус: В норме")`;
          break;
        case 'calculators':
          cellNameEl.textContent = 'B4: ПРОДУВКА_P';
          formulaInput.value = '=(S_пит / (S_котл - S_пит)) * 100%';
          break;
        case 'reminders':
          cellNameEl.textContent = 'C2: РЕГЛАМЕНТ';
          formulaInput.value = '=ТАЙМЕР(Интервал=120мин; "Контроль O2 деаэратора")';
          break;
        case 'analytics':
          cellNameEl.textContent = 'D1: ДИАГРАММА_pH';
          formulaInput.value = '=ДИАГРАММА(Тренды!pH_Питательная:pH_Котловая; Шаг="2ч")';
          break;
        case 'settings':
          cellNameEl.textContent = 'E1: УСТАВКИ_ПТЭ';
          formulaInput.value = '=НОРМЫ_ПТЭ_ТЭ(ГОСТ_20995_75; "Предел O2 <= 20 мкг/дм3")';
          break;
      }
    }

    if (window.location.hash !== `#${tabId}`) {
      window.history.replaceState(null, null, `#${tabId}`);
    }

    if (tabId === 'analytics' && window.Analytics) {
      setTimeout(() => window.Analytics.render(), 40);
    }
    if (tabId === 'reminders' && window.Reminders) {
      window.Reminders.render();
    }
  },

  // Фильтрация по нижним вкладкам Excel (Лист 1: Все, Лист 2: Отклонения)
  filterBySheet(sheetType) {
    if (this.currentTab !== 'journal') {
      this.switchTab('journal');
    }

    const tabAll = document.getElementById('sheetTabAll');
    const tabAlarm = document.getElementById('sheetTabAlarm');
    const filterStatus = document.getElementById('filterStatus');

    if (sheetType === 'alarm') {
      if (tabAll) tabAll.classList.remove('active');
      if (tabAlarm) tabAlarm.classList.add('active');
      if (filterStatus) filterStatus.value = 'alarm';
      Journal.currentFilter.status = 'alarm';
    } else {
      if (tabAll) tabAll.classList.add('active');
      if (tabAlarm) tabAlarm.classList.remove('active');
      if (filterStatus) filterStatus.value = 'all';
      Journal.currentFilter.status = 'all';
    }

    Journal.render();
  },

  // Быстрый поиск в строке заголовка Office (Tell Me / Search)
  onQuickSearch(text) {
    if (this.currentTab !== 'journal') {
      this.switchTab('journal');
    }
    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
      searchInput.value = text;
    }
    Journal.currentFilter.search = text;
    Journal.render();
  },

  switchCalcSubtab(subtabId) {
    this.currentCalcSubtab = subtabId;
    document.querySelectorAll('.calc-subtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtabId);
    });
    document.querySelectorAll('.calc-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `calc-${subtabId}`);
    });
  },

  bindCalculators() {
    // 1. Продувка
    const calcBlowdown = () => {
      const feedTds = document.getElementById('calcBlowFeedTds')?.value;
      const boilerTds = document.getElementById('calcBlowBoilerTds')?.value;
      const capacity = document.getElementById('calcBlowCapacity')?.value;

      const res = Calculators.calculateBlowdown(feedTds, boilerTds, capacity);
      const resPanel = document.getElementById('blowdownResults');
      if (!resPanel) return;

      if (res.error) {
        resPanel.innerHTML = `<div class="text-warning py-2">${res.error}</div>`;
      } else {
        const badgeCls = res.status === 'warning' ? 'val-warn' : 'val-ok';
        resPanel.innerHTML = `
          <div class="res-row">
            <span class="res-label">Величина продувки (P):</span>
            <span class="res-value ${badgeCls}">${res.percent} %</span>
          </div>
          <div class="res-row">
            <span class="res-label">Расход продувочной воды (Gпрод):</span>
            <span class="res-value">${res.flowRate} т/ч</span>
          </div>
          <div class="res-row">
            <span class="res-label">Тепловые потери с продувкой:</span>
            <span class="res-value">${res.heatLossGcal} Гкал/ч</span>
          </div>
          <div class="mt-2 text-muted" style="font-size: 0.78rem; border-top: 1px solid var(--border-grid); padding-top: 0.4rem;">
            💡 <em>${res.advice}</em>
          </div>
        `;
      }
    };

    ['calcBlowFeedTds', 'calcBlowBoilerTds', 'calcBlowCapacity'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calcBlowdown);
    });
    calcBlowdown();

    // 2. ХВО
    const calcFilter = () => {
      const resinVol = document.getElementById('calcResinVol')?.value;
      const resinCap = document.getElementById('calcResinCap')?.value;
      const rawHard = document.getElementById('calcRawHard')?.value;
      const flowRate = document.getElementById('calcFilterFlow')?.value;
      const saltRate = document.getElementById('calcSaltRate')?.value;

      const res = Calculators.calculateFilterCycle(resinVol, resinCap, rawHard, flowRate, saltRate);
      const resPanel = document.getElementById('filterResults');
      if (!resPanel) return;

      if (res.error) {
        resPanel.innerHTML = `<div class="text-warning py-2">${res.error}</div>`;
      } else {
        resPanel.innerHTML = `
          <div class="res-row">
            <span class="res-label">Объем воды за фильтроцикл (Vф):</span>
            <span class="res-value">${res.waterVolume} м³</span>
          </div>
          <div class="res-row">
            <span class="res-label">Длительность работы фильтра:</span>
            <span class="res-value">${res.cycleHours} ч (~${res.cycleDays} сут.)</span>
          </div>
          <div class="res-row">
            <span class="res-label">Расход соли на регенерацию:</span>
            <span class="res-value">${res.saltKg} кг</span>
          </div>
          <div class="res-row">
            <span class="res-label">Объем 8–10% рассола NaCl:</span>
            <span class="res-value">${res.brineVolumeM3} м³ (${res.brineLiters} л)</span>
          </div>
        `;
      }
    };

    ['calcResinVol', 'calcResinCap', 'calcRawHard', 'calcFilterFlow', 'calcSaltRate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calcFilter);
    });
    calcFilter();

    // 3. Реагенты
    const calcReagents = () => {
      const qWater = document.getElementById('calcSulfWaterFlow')?.value;
      const o2Val = document.getElementById('calcSulfO2')?.value;
      const sulfRes = Calculators.calculateOxygenScavenger(qWater, o2Val);
      const sulfPanel = document.getElementById('sulfiteResults');
      if (sulfPanel) {
        if (sulfRes.error) {
          sulfPanel.innerHTML = `<div class="text-warning py-1">${sulfRes.error}</div>`;
        } else {
          sulfPanel.innerHTML = `
            <div class="res-row">
              <span class="res-label">Часовой расход Na₂SO₃:</span>
              <span class="res-value">${sulfRes.gramPerHour} г/ч</span>
            </div>
            <div class="res-row">
              <span class="res-label">Суточная потребность:</span>
              <span class="res-value">${sulfRes.kgPerDay} кг/сут</span>
            </div>
          `;
        }
      }

      const stCap = document.getElementById('calcPhosSteamCap')?.value;
      const fHard = document.getElementById('calcPhosFeedHard')?.value;
      const phosRes = Calculators.calculatePhosphateDosing(stCap, fHard);
      const phosPanel = document.getElementById('phosphateResults');
      if (phosPanel) {
        if (phosRes.error) {
          phosPanel.innerHTML = `<div class="text-warning py-1">${phosRes.error}</div>`;
        } else {
          phosPanel.innerHTML = `
            <div class="res-row">
              <span class="res-label">Расход фосфата (Na₃PO₄·12H₂O):</span>
              <span class="res-value">${phosRes.gramPerHour} г/ч</span>
            </div>
            <div class="res-row">
              <span class="res-label">Суточная потребность соли:</span>
              <span class="res-value">${phosRes.kgPerDay} кг/сут</span>
            </div>
          `;
        }
      }
    };

    ['calcSulfWaterFlow', 'calcSulfO2', 'calcPhosSteamCap', 'calcPhosFeedHard'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calcReagents);
    });
    calcReagents();

    // 4. Конвертер
    const calcConverter = () => {
      const hardVal = document.getElementById('calcConvHardVal')?.value;
      const fromUnit = document.getElementById('calcConvHardUnit')?.value;
      const res = Calculators.convertHardness(hardVal, fromUnit);
      const resPanel = document.getElementById('hardnessConverterResults');

      if (resPanel && res) {
        resPanel.innerHTML = `
          <div class="res-row">
            <span class="res-label">мг-экв/л (СанПиН РФ):</span>
            <span class="res-value">${res.mgeq_l} мг-экв/л</span>
          </div>
          <div class="res-row">
            <span class="res-label">мкг-экв/дм³ (паровые котлы):</span>
            <span class="res-value">${res.mcgeq_dm3} мкг-экв/дм³</span>
          </div>
          <div class="res-row">
            <span class="res-label">Немецкие градусы (°dH):</span>
            <span class="res-value">${res.deg_dh} °dH</span>
          </div>
          <div class="res-row">
            <span class="res-label">Американские ppm (мг/л CaCO₃):</span>
            <span class="res-value">${res.ppm} ppm</span>
          </div>
          <div class="res-row">
            <span class="res-label">Французские градусы (°f):</span>
            <span class="res-value">${res.deg_f} °f</span>
          </div>
        `;
      }
    };

    const cVal = document.getElementById('calcConvHardVal');
    const cUnit = document.getElementById('calcConvHardUnit');
    if (cVal) cVal.addEventListener('input', calcConverter);
    if (cUnit) cUnit.addEventListener('change', calcConverter);
    calcConverter();
  },

  initSettingsPage() {
    const facInput = document.getElementById('settingFacility');
    const techInput = document.getElementById('settingTechnician');
    const shiftSelect = document.getElementById('settingShift');
    const soundToggle = document.getElementById('settingSound');

    if (facInput) facInput.value = AppState.settings.facilityName || '';
    if (techInput) techInput.value = AppState.settings.currentTechnician || '';
    if (shiftSelect) shiftSelect.value = AppState.settings.currentShift || 1;
    if (soundToggle) soundToggle.checked = AppState.settings.soundEnabled;

    const normContainer = document.getElementById('normsReferenceContainer');
    if (normContainer) {
      normContainer.innerHTML = Object.entries(SAMPLE_POINTS).map(([pointId, p]) => `
        <div style="margin-bottom: 1rem; background: var(--bg-window); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-grid);">
          <h4 style="color: var(--ms-excel-green); margin-bottom: 0.35rem; font-size: 0.85rem;">
            ${p.icon} ${p.name} <small style="color: var(--text-muted); font-weight: normal;">(${p.desc})</small>
          </h4>
          <table class="data-table" style="font-size: 0.78rem;">
            <thead>
              <tr>
                <th>Параметр</th>
                <th>Единицы</th>
                <th>Мин.</th>
                <th>Макс.</th>
                <th>Предупреждение</th>
                <th>Норматив</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(p.params).map(([pKey, cfg]) => `
                <tr>
                  <td><strong>${cfg.name}</strong></td>
                  <td>${cfg.unit}</td>
                  <td>${cfg.min !== undefined ? cfg.min : '—'}</td>
                  <td>${cfg.max !== undefined ? cfg.max : '—'}</td>
                  <td>${cfg.warnMin ? `≥ ${cfg.warnMin}` : ''} ${cfg.warnMax ? `≤ ${cfg.warnMax}` : ''}</td>
                  <td style="color: var(--text-muted);">${cfg.standard}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');
    }
  },

  saveSettings() {
    const facInput = document.getElementById('settingFacility');
    const techInput = document.getElementById('settingTechnician');
    const shiftSelect = document.getElementById('settingShift');
    const soundToggle = document.getElementById('settingSound');

    if (facInput) AppState.settings.facilityName = facInput.value.trim();
    if (techInput) AppState.settings.currentTechnician = techInput.value.trim();
    if (shiftSelect) AppState.settings.currentShift = parseInt(shiftSelect.value, 10);
    if (soundToggle) AppState.settings.soundEnabled = soundToggle.checked;

    AppState.save();
    alert('Параметры успешно сохранены в книге Excel!');
  },

  resetToDemo() {
    if (!confirm('Сбросить данные книги к демонстрационному набору?')) return;
    AppState.loadDemoRecords();
    AppState.save();
    window.location.reload();
  },

  checkUrlTab() {
    try {
      const hash = window.location.hash.replace('#', '');
      if (['journal', 'calculators', 'reminders', 'analytics', 'settings'].includes(hash)) {
        this.switchTab(hash);
      } else {
        this.switchTab('journal');
      }
    } catch (e) {
      console.warn('Ошибка проверки URL хэша:', e);
      this.switchTab('journal');
    }
  },

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

    console.log('✅ Microsoft Excel ВХР успешно запущен (Тема:', AppState.settings.theme, ')');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
