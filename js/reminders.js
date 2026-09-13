/**
 * Reminders & Timers module for Boiler Lab
 * Контроль периодичности отбора проб, регенерации фильтров и поверок
 */

const Reminders = {
  timerIntervalId: null,
  audioCtx: null,

  // Мягкий звуковой сигнал оповещения (без резких сирен, мягкий синус с fade-in/fade-out)
  playAlertSound() {
    if (!AppState.settings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Первый мягкий тон (E5 ~ 659 Гц)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.018, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Второй мягкий тон гармонии (A5 ~ 880 Гц)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.15);

      gain2.gain.setValueAtTime(0.0001, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.016, now + 0.20);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('AudioContext unavailable or blocked:', e);
    }
  },

  // Отправка системного уведомления браузера
  sendBrowserNotification(title, body) {
    if (!AppState.settings.notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'assets/icon.png'
        });
      } catch (e) {
        console.warn('Ошибка отправки уведомления:', e);
      }
    }
  },

  // Запрос прав на уведомления
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      AppState.settings.notificationsEnabled = (perm === 'granted');
      AppState.save();
      return perm === 'granted';
    }
    return false;
  },

  // Проверка наступления дедлайнов напоминалок
  checkDueReminders() {
    const now = Date.now();
    let hasTriggered = false;

    AppState.reminders.forEach(rem => {
      if (!rem.enabled) return;

      if (now >= rem.nextRun && !rem.isAlerting) {
        rem.isAlerting = true;
        hasTriggered = true;
        this.sendBrowserNotification(
          '⏰ Время анализа ВХР!',
          `${rem.title} — подошел срок выполнения анализа.`
        );
      }
    });

    if (hasTriggered) {
      this.playAlertSound();
      this.render();
    }
  },

  // Сброс / подтверждение выполнения задачи
  completeReminder(id) {
    const rem = AppState.reminders.find(r => r.id === id);
    if (!rem) return;

    const now = Date.now();
    rem.lastRun = now;
    rem.nextRun = now + rem.intervalMinutes * 60 * 1000;
    rem.isAlerting = false;
    AppState.save();
    this.render();
  },

  // Отложить напоминание на N минут
  snoozeReminder(id, minutes = 15) {
    const rem = AppState.reminders.find(r => r.id === id);
    if (!rem) return;

    rem.nextRun = Date.now() + minutes * 60 * 1000;
    rem.isAlerting = false;
    AppState.save();
    this.render();
  },

  // Форматирование оставшегося времени
  formatRemaining(ms) {
    if (ms <= 0) return 'СРОК НАСТУПИЛ';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours > 0) {
      return `${hours}ч ${mins}мин`;
    }
    return `${mins}мин ${secs}сек`;
  },

  // Рендеринг виджетов напоминалок
  render() {
    const container = document.getElementById('remindersList');
    if (!container) return;

    const now = Date.now();
    const sorted = [...AppState.reminders].sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));

    // Обновляем бейдж счетчика в шапке (ПК) и в нижнем баре (мобильный)
    const dueCount = AppState.reminders.filter(r => r.enabled && r.nextRun <= now).length;
    ['reminderDueBadge', 'bottomNavReminderBadge'].forEach(badgeId => {
      const badge = document.getElementById(badgeId);
      if (badge) {
        if (dueCount > 0) {
          badge.textContent = dueCount;
          badge.style.display = 'inline-flex';
          badge.classList.add('badge-pulse');
        } else {
          badge.style.display = 'none';
          badge.classList.remove('badge-pulse');
        }
      }
    });

    container.innerHTML = sorted.map(rem => {
      const isDue = rem.enabled && rem.nextRun <= now;
      const timeLeftMs = (rem.nextRun || 0) - now;
      const point = SAMPLE_POINTS[rem.pointId] || {};
      const statusClass = !rem.enabled ? 'rem-disabled' : isDue ? 'rem-overdue' : (timeLeftMs < 20 * 60 * 1000 ? 'rem-soon' : 'rem-ok');

      return `
        <div class="reminder-card ${statusClass}" data-id="${rem.id}">
          <div class="rem-header">
            <div class="rem-title-group">
              <span class="rem-icon">${point.icon || '⏱️'}</span>
              <div>
                <h4 class="rem-title">${rem.title}</h4>
                <div class="rem-subtitle">${point.name || 'Общая задача'} • Интервал: ${Math.round(rem.intervalMinutes / 60)}ч</div>
              </div>
            </div>
            <div class="rem-time-badge ${isDue ? 'badge-due' : ''}">
              ${rem.enabled ? this.formatRemaining(timeLeftMs) : 'Отключено'}
            </div>
          </div>
          ${rem.notes ? `<div class="rem-notes">${rem.notes}</div>` : ''}
          <div class="rem-actions">
            <button class="btn btn-sm btn-primary" onclick="Reminders.openSampleFor('${rem.pointId}', '${rem.id}')">
              ✍️ Внести замер
            </button>
            <button class="btn btn-sm btn-success" onclick="Reminders.completeReminder('${rem.id}')">
              ✔️ Выполнено
            </button>
            <button class="btn btn-sm btn-secondary" onclick="Reminders.snoozeReminder('${rem.id}', 15)">
              ⏳ +15 мин
            </button>
            <button class="btn btn-sm btn-outline" onclick="Reminders.toggleEnabled('${rem.id}')">
              ${rem.enabled ? '⏸️ Выкл' : '▶️ Вкл'}
            </button>
            <button class="btn btn-sm btn-danger-outline" onclick="Reminders.deleteReminder('${rem.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // Включение / выключение напоминалки
  toggleEnabled(id) {
    const rem = AppState.reminders.find(r => r.id === id);
    if (!rem) return;
    rem.enabled = !rem.enabled;
    if (rem.enabled) {
      rem.nextRun = Date.now() + rem.intervalMinutes * 60 * 1000;
    }
    AppState.save();
    this.render();
  },

  // Удаление напоминалки
  deleteReminder(id) {
    if (!confirm('Удалить эту задачу из регламента?')) return;
    AppState.reminders = AppState.reminders.filter(r => r.id !== id);
    AppState.save();
    this.render();
  },

  // Добавление новой напоминалки
  addReminder(data) {
    const id = 'rem_' + Date.now();
    const intervalMins = parseInt(data.intervalMinutes, 10) || 120;
    const newRem = {
      id,
      title: data.title,
      pointId: data.pointId || 'feed',
      intervalMinutes: intervalMins,
      lastRun: Date.now(),
      nextRun: Date.now() + intervalMins * 60 * 1000,
      enabled: true,
      priority: data.priority || 'normal',
      notes: data.notes || ''
    };
    AppState.reminders.push(newRem);
    AppState.save();
    this.render();
  },

  // Переход к форме ввода замера для этой точки
  openSampleFor(pointId, reminderId) {
    if (window.App && window.App.switchTab) {
      window.App.switchTab('journal');
    }
    const select = document.getElementById('modalPointSelect');
    if (select) {
      select.value = pointId;
      select.dispatchEvent(new Event('change'));
    }
    if (window.Journal && window.Journal.openNewRecordModal) {
      window.Journal.openNewRecordModal(pointId, reminderId);
    }
  },

  // Инициализация цикла таймеров
  init() {
    this.render();
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = setInterval(() => {
      this.checkDueReminders();
      // Обновляем бегущий счетчик секунд/минут в открытой вкладке
      const container = document.getElementById('remindersList');
      if (container && document.getElementById('tab-reminders')?.classList.contains('active')) {
        this.render();
      }
    }, 1000);
  }
};
