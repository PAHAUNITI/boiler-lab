/**
 * Модуль эргономики, стартового экрана смены, звукового фидбека и горячих клавиш
 * АИС "ТеплоХимЛаб" — Котельная МУП "Энергия"
 * Разработчик: Коновалов П.С. (группа ИСП-431)
 */

// ====================================================================
// 1. ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API CHIMES)
// ====================================================================
const SoundFx = {
  ctx: null,
  isMuted: localStorage.getItem('TEPLO_KHIM_MUTE') === 'true',

  init() {
    this.updateToggleIcon();
  },

  getCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('TEPLO_KHIM_MUTE', this.isMuted ? 'true' : 'false');
    this.updateToggleIcon();
    if (!this.isMuted) {
      this.playSuccess();
    }
  },

  updateToggleIcon() {
    const icon = document.getElementById('soundToggleIcon');
    if (icon) {
      icon.textContent = this.isMuted ? '🔕' : '🔔';
    }
  },

  // Мягкий мажорный колокольчик приветствия (C5 -> E5 -> G5)
  playChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // До - Ми - Соль
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } catch (e) {
      // Браузерная блокировка аудио до жеста
    }
  },

  // Мягкий приятный щелчок подтверждения сохранения
  playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  },

  // Ненавязчивый предупреждающий тон при отклонении параметров
  playAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {}
  }
};

// ====================================================================
// 2. СТАРТОВЫЙ ЭКРАН СМЕНЫ (SHIFT WELCOME GATE)
// ====================================================================
const ShiftGate = {
  SESSION_ACTIVE_FLAG: 'TEPLO_KHIM_SHIFT_ACTIVE',

  init() {
    this.updateGreetingAndMeta();
    // Проверяем: заступил ли пользователь на смену
    const isActive = sessionStorage.getItem(this.SESSION_ACTIVE_FLAG);
    if (!isActive) {
      this.openShiftGate();
    }
  },

  updateGreetingAndMeta() {
    const now = new Date();
    const hour = now.getHours();

    // Приветствие по времени суток
    let greeting = '☀️ Добрый день!';
    if (hour >= 5 && hour < 11) {
      greeting = '🌅 Доброе утро!';
    } else if (hour >= 11 && hour < 17) {
      greeting = '☀️ Добрый день!';
    } else if (hour >= 17 && hour < 22) {
      greeting = '🌆 Добрый вечер!';
    } else {
      greeting = '🌙 Удачной ночной смены!';
    }

    const greetEl = document.getElementById('shiftGreetingText');
    if (greetEl) {
      greetEl.textContent = `${greeting} Выберите специалиста для заступления на смену:`;
    }

    // Определение смены (Смена 1: 08:00 - 20:00, Смена 2: 20:00 - 08:00)
    const isShift1 = hour >= 8 && hour < 20;
    const shiftNum = isShift1 ? 1 : 2;
    const shiftName = isShift1 ? 'Дневная (08:00–20:00)' : 'Ночная (20:00–08:00)';

    const metaShiftEl = document.getElementById('shiftMetaShift');
    if (metaShiftEl) {
      metaShiftEl.textContent = `⏱️ Смена №${shiftNum} (${shiftName})`;
    }

    const options = { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' };
    const dateStr = now.toLocaleDateString('ru-RU', options);
    const metaDateEl = document.getElementById('shiftMetaDate');
    if (metaDateEl) {
      metaDateEl.textContent = `📅 ${dateStr}`;
    }
  },

  openShiftGate() {
    this.updateGreetingAndMeta();
    const modal = document.getElementById('modalShiftGate');
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeShiftGate() {
    const modal = document.getElementById('modalShiftGate');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Вход специалиста в 1 клик
  selectUser(username, password) {
    const res = Auth.login(username, password);
    if (res.success) {
      sessionStorage.setItem(this.SESSION_ACTIVE_FLAG, 'true');
      SoundFx.playChime();
      this.closeShiftGate();

      // Уведомление об успешном начале смены
      const user = Auth.currentUser;
      const hour = new Date().getHours();
      const shiftNum = (hour >= 8 && hour < 20) ? 1 : 2;
      this.showToast(`🎉 Смена №${shiftNum} открыта. Добро пожаловать, ${user.fullName}! Приятного дежурства!`, 'success');

      // Переключаем на журнал и обновляем данные
      App.switchTab('journal');
    } else {
      alert(res.error || 'Ошибка входа');
    }
  },

  openRegistration() {
    this.closeShiftGate();
    Auth.showLoginModal();
    Auth.setAuthMode('register');
  },

  openPasswordLogin() {
    this.closeShiftGate();
    Auth.showLoginModal();
    Auth.setAuthMode('login');
  },

  // Передача / сдача смены
  openHandoverModal() {
    const user = Auth.currentUser || { fullName: 'Лаборант ВХР' };
    const nameEl = document.getElementById('handoverUserName');
    if (nameEl) nameEl.textContent = user.fullName;

    const records = AppState.records || [];
    const countEl = document.getElementById('handoverRecordsCount');
    if (countEl) countEl.textContent = records.length;

    const alarms = records.filter(r => r.status === 'alarm' || r.status === 'warning').length;
    const alarmEl = document.getElementById('handoverAlarmCount');
    if (alarmEl) alarmEl.textContent = alarms;

    const modal = document.getElementById('modalShiftHandover');
    if (modal) modal.classList.add('active');
  },

  closeHandoverModal() {
    const modal = document.getElementById('modalShiftHandover');
    if (modal) modal.classList.remove('active');
  },

  confirmHandover() {
    const notes = (document.getElementById('handoverNotes').value || '').trim();
    if (window.Admin && typeof window.Admin.logAction === 'function') {
      const user = Auth.currentUser;
      window.Admin.logAction('Сдача смены', `Смена сдана пользователем ${user.fullName}. Замечания: ${notes || 'Без замечаний'}`, 'info');
    }

    this.closeHandoverModal();
    sessionStorage.removeItem(this.SESSION_ACTIVE_FLAG);
    Auth.logout();

    SoundFx.playSuccess();
    this.showToast('✅ Смена успешно сдана. Спасибо за работу!', 'info');
    setTimeout(() => {
      this.openShiftGate();
    }, 400);
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'shift-toast';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 9999;
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: var(--text-main);
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      border: 1px solid var(--primary-border);
      box-shadow: 0 12px 30px rgba(0,0,0,0.3);
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      toast.style.transform = 'translateX(140%)';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }
};

// ====================================================================
// 3. ГОРЯЧИЕ КЛАВИШИ (HOTKEYS)
// ====================================================================
const Hotkeys = {
  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  },

  handleKeyDown(e) {
    // Не перехватываем горячие клавиши, если пользователь пишет в поле ввода
    const tag = (e.target.tagName || '').toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // Закрытие модальных окон по Escape в любом контексте
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-overlay.active, .modal.active');
      activeModals.forEach(m => m.classList.remove('active'));
      return;
    }

    if (isInput) return;

    // Клавиша N или n -> Новый замер
    if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
      e.preventDefault();
      Journal.openNewRecordModal();
      return;
    }

    // Цифры 1..5 -> Переключение вкладок
    if (e.key === '1') { App.switchTab('journal'); }
    else if (e.key === '2') { App.switchTab('calculators'); }
    else if (e.key === '3') { App.switchTab('reminders'); }
    else if (e.key === '4') { App.switchTab('analytics'); }
    else if (e.key === '5') { App.switchTab('admin'); }
  },

  hideBar() {
    const bar = document.getElementById('hotkeysBar');
    if (bar) {
      bar.style.opacity = '0';
      bar.style.transform = 'translateY(15px)';
      setTimeout(() => { bar.style.display = 'none'; }, 260);
    }
  }
};

// ====================================================================
// 4. ЛАБОРАТОРНЫЙ РЕГЛАМЕНТ И ТАЙМЕР ОТБОРА ПРОБ ВХР
// ====================================================================
const LabSchedule = {
  countdownSec: 2700, // 45 минут до планового анализа

  init() {
    setInterval(() => this.tickTimer(), 1000);
  },

  tickTimer() {
    if (this.countdownSec > 0) {
      this.countdownSec--;
    } else {
      this.countdownSec = 7200; // сброс на 2 часа (регламент отбора)
      SoundFx.playAlert();
      ShiftGate.showToast('⏰ Время планового отбора пробы питательной воды ДА-15!', 'info');
    }

    const min = Math.floor(this.countdownSec / 60);
    const sec = this.countdownSec % 60;
    const timeStr = `${min}м ${sec < 10 ? '0' : ''}${sec}с`;

    const sampleEl = document.getElementById('weatherNextSample');
    if (sampleEl) {
      sampleEl.textContent = `через ${timeStr}`;
    }
  }
};

// Инициализируем при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  SoundFx.init();
  ShiftGate.init();
  Hotkeys.init();
  LabSchedule.init();
});
