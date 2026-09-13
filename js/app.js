/**
 * Main Controller for Boiler Lab App (ВХР)
 * Инициализация, маршрутизация вкладок, переключение тем и поддержка мобильных устройств
 */

const App = {
  currentTab: 'journal',
  currentCalcSubtab: 'blowdown',

  // Переключение светлой / тёмной темы
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.settings.theme = theme;
    AppState.save();

    // Обновляем текст и иконки на кнопках темы
    const btns = document.querySelectorAll('.btn-theme-toggle');
    btns.forEach(btn => {
      if (theme === 'light') {
        btn.innerHTML = '🌙 <span class="theme-label">Ночь</span>';
        btn.title = 'Переключить на ночную (SCADA) тему';
      } else {
        btn.innerHTML = '☀️ <span class="theme-label">День</span>';
        btn.title = 'Переключить на дневную (светлую) тему';
      }
    });

    // Метатег theme-color для мобильных браузеров
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#0b1120');
    }

    // Если открыта вкладка аналитики — перерисовываем графики с новой палитрой
    if (window.Analytics && typeof window.Analytics.render === 'function') {
      window.Analytics.render();
    }
  },

  // Инициализация темы с учетом настроек или системного предпочтения
  initTheme() {
    let preferredTheme = AppState.settings.theme;
    if (!preferredTheme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      preferredTheme = prefersDark ? 'dark' : 'light';
    }
    this.applyTheme(preferredTheme);

    // Слушатель системной смены темы (если пользователь не переключал вручную)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  // Переключение основных вкладок (синхронизация десктопного меню и мобильного Bottom Nav)
  switchTab(tabId) {
    this.currentTab = tabId;

    // Обновляем верхние кнопки навигации (ПК)
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Обновляем нижние кнопки навигации (Смартфон)
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Обновляем контейнеры вкладок
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Хэш в URL
    if (window.location.hash !== `#${tabId}`) {
      window.history.replaceState(null, null, `#${tabId}`);
    }

    // Прокрутка наверх экрана при переключении
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Отрисовка графиков при входе на вкладку аналитики
    if (tabId === 'analytics' && window.Analytics) {
      setTimeout(() => {
        window.Analytics.render();
      }, 50);
    }

    // Актуализация напоминалок
    if (tabId === 'reminders' && window.Reminders) {
      window.Reminders.render();
    }
  },

  // Переключение подвкладок калькулятора
  switchCalcSubtab(subtabId) {
    this.currentCalcSubtab = subtabId;
    document.querySelectorAll('.calc-subtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtabId);
    });
    document.querySelectorAll('.calc-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `calc-${subtabId}`);
    });
  },

  // Привязка обработчиков калькуляторов
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
            <span class="res-label">Величина непрерывной продувки (P):</span>
            <span class="res-value ${badgeCls}">${res.percent} %</span>
          </div>
          <div class="res-row">
            <span class="res-label">Часовой расход продувки (Gпрод):</span>
            <span class="res-value">${res.flowRate} т/ч</span>
          </div>
          <div class="res-row">
            <span class="res-label">Ориентировочные тепловые потери:</span>
            <span class="res-value">${res.heatLossGcal} Гкал/ч</span>
          </div>
          <div class="mt-2 text-muted" style="font-size: 0.82rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
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

    // 2. Фильтроцикл ХВО
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
            <span class="res-label">Объем воды за один фильтроцикл (Vф):</span>
            <span class="res-value">${res.waterVolume} м³</span>
          </div>
          <div class="res-row">
            <span class="res-label">Длительность работы фильтра:</span>
            <span class="res-value">${res.cycleHours} ч (~${res.cycleDays} сут.)</span>
          </div>
          <div class="res-row">
            <span class="res-label">Потребность чистой соли (NaCl):</span>
            <span class="res-value">${res.saltKg} кг</span>
          </div>
          <div class="res-row">
            <span class="res-label">Объем 8-10% раствора соли:</span>
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
              <span class="res-label">Расход сульфита (Na₂SO₃):</span>
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

    // 4. Конвертер жесткости
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
        <div class="norm-point-block" style="margin-bottom: 1.25rem; background: var(--bg-main); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="color: var(--color-primary); margin-bottom: 0.5rem;">${p.icon} ${p.name} <small style="color: var(--text-muted); font-weight: normal;">(${p.desc})</small></h4>
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Параметр</th>
                <th>Единицы</th>
                <th>Мин. норма</th>
                <th>Макс. норма</th>
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

    const facEl = document.getElementById('brandFacilityName');
    if (facEl) facEl.textContent = AppState.settings.facilityName;

    alert('Настройки успешно сохранены!');
  },

  resetToDemo() {
    if (!confirm('Внимание! Все текущие записи будут заменены демонстрационными данными за последние смены. Продолжить?')) return;
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
      alert('Укажите название регламентной задачи!');
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
    // 1. Загрузка данных
    AppState.load();

    // 2. Инициализация светлой/тёмной темы
    this.initTheme();

    // 3. Шапка
    const facEl = document.getElementById('brandFacilityName');
    if (facEl) facEl.textContent = AppState.settings.facilityName;

    // 4. Модули
    if (window.Journal) window.Journal.init();
    if (window.Reminders) window.Reminders.init();
    this.bindCalculators();
    this.initSettingsPage();

    // 5. Роутинг
    this.checkUrlTab();

    // 6. Ресайз
    window.addEventListener('resize', () => {
      if (window.Analytics) window.Analytics.handleResize();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (window.Journal) window.Journal.closeRecordModal();
        this.closeNewReminderModal();
      }
    });

    // Регистрация Service Worker для PWA (при запуске через HTTP-сервер)
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        // Оффлайн fallback без ошибки
      });
    }

    console.log('✅ Лаборатория ВХР успешно запущена (Тема:', AppState.settings.theme, ')');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
