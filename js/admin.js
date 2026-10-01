/**
 * Модуль администрирования, аудита и безопасности (Admin & Audit)
 * АИС "ТеплоХимЛаб"
 * Разработчик: Коновалов П.С. (группа ИСП-431)
 */

const Admin = {
  AUDIT_KEY: 'TEPLO_KHIM_LAB_AUDIT',

  init() {
    this.ensureAuditSeeded();
    this.renderUsersTable();
    this.renderAuditTable();
  },

  ensureAuditSeeded() {
    const raw = localStorage.getItem(this.AUDIT_KEY);
    if (!raw) {
      const initialLogs = [
        {
          id: 1,
          timestamp: '2026-09-10T08:00:15',
          user: 'Коновалов П.С.',
          role: 'Инженер-химик',
          action: 'Вход в систему',
          details: 'Успешная авторизация в системе с рабочего места лаборатории',
          level: 'info'
        },
        {
          id: 2,
          timestamp: '2026-09-10T08:15:30',
          user: 'Коновалов П.С.',
          role: 'Инженер-химик',
          action: 'Внесение замера',
          details: 'Добавлен анализ питательной воды котла ДКВР-10/13. Жесткость: 4.5 мкг-экв/дм³, pH: 8.9',
          level: 'success'
        },
        {
          id: 3,
          timestamp: '2026-09-10T09:05:00',
          user: 'Смирнова А.В.',
          role: 'Начальник смены',
          action: 'Просмотр аналитики',
          details: 'Формирование суточного графика кислорода и продувки котлов',
          level: 'info'
        },
        {
          id: 4,
          timestamp: '2026-09-10T10:30:20',
          user: 'Администратор',
          role: 'Администратор АИС',
          action: 'Резервное копирование',
          details: 'Создан автоматический архив базы данных АИС ТеплоХимЛаб',
          level: 'warning'
        }
      ];
      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(initialLogs));
    }
  },

  getAllAuditLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.AUDIT_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  logAction(action, details, level = 'info') {
    const logs = this.getAllAuditLogs();
    const user = Auth.getCurrentUser() || { fullName: 'Система', roleName: 'Сервер' };
    
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: user.fullName,
      role: user.roleName,
      action: action,
      details: details,
      level: level
    };

    logs.unshift(newEntry);
    if (logs.length > 300) logs.pop(); // держим последние 300 событий
    localStorage.setItem(this.AUDIT_KEY, JSON.stringify(logs));

    // Если открыта вкладка администрирования — перерисовываем
    if (App.currentTab === 'admin') {
      this.renderAuditTable();
    }
  },

  renderAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    const filterAction = (document.getElementById('auditFilterAction')?.value || 'all').toLowerCase();
    const searchVal = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();

    let logs = this.getAllAuditLogs();

    if (filterAction !== 'all') {
      logs = logs.filter(l => l.action.toLowerCase().includes(filterAction));
    }

    if (searchVal) {
      logs = logs.filter(l => 
        l.user.toLowerCase().includes(searchVal) ||
        l.action.toLowerCase().includes(searchVal) ||
        l.details.toLowerCase().includes(searchVal)
      );
    }

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Событий аудита не обнаружено</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const dt = new Date(l.timestamp);
      const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = dt.toLocaleDateString('ru-RU');
      
      let badgeClass = 'badge-info';
      if (l.level === 'warning') badgeClass = 'badge-warning';
      if (l.level === 'danger' || l.level === 'alarm') badgeClass = 'badge-danger';
      if (l.level === 'success') badgeClass = 'badge-success';

      return `
        <tr>
          <td><span class="audit-time">${timeStr}</span> <small class="text-muted">${dateStr}</small></td>
          <td><strong>${l.user}</strong><br><small class="text-muted">${l.role || ''}</small></td>
          <td><span class="badge ${badgeClass}">${l.action}</span></td>
          <td><div class="audit-details-text">${l.details}</div></td>
        </tr>
      `;
    }).join('');
  },

  renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const users = Auth.getAllUsers();
    tbody.innerHTML = users.map((u, idx) => {
      const statusBadge = u.active 
        ? `<span class="badge badge-success">Активен</span>` 
        : `<span class="badge badge-danger">Заблокирован</span>`;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><code>${u.username}</code></td>
          <td><strong>${u.fullName}</strong></td>
          <td>${u.roleName}</td>
          <td>${statusBadge}</td>
          <td class="text-right">
            <button class="btn btn-sm btn-outline" onclick="Admin.resetUserPassword(${u.id})">Сброс пароля</button>
            ${u.username !== 'admin' ? `
              <button class="btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="Admin.toggleUserActive(${u.id})">
                ${u.active ? 'Заблокировать' : 'Активировать'}
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  addNewUser(username, fullName, password, role) {
    if (!username || !fullName || !password) {
      alert('Заполните логин, ФИО и пароль');
      return;
    }

    const users = Auth.getAllUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      alert('Пользователь с таким логином уже существует');
      return;
    }

    let roleName = 'Лаборант ВХР';
    if (role === 'OPERATOR') roleName = 'Начальник смены';
    if (role === 'ADMIN') roleName = 'Администратор АИС';

    const newUser = {
      id: Date.now(),
      username: username.trim(),
      passwordHash: password.trim(),
      fullName: fullName.trim(),
      role: role,
      roleName: roleName,
      shift: 1,
      active: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(Auth.USERS_KEY, JSON.stringify(users));
    this.logAction('Создание пользователя', `Создана учетная запись ${newUser.username} (${newUser.fullName}, ${roleName})`, 'warning');
    
    this.renderUsersTable();
    alert(`Пользователь ${newUser.username} успешно создан!`);
  },

  resetUserPassword(userId) {
    const users = Auth.getAllUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return;

    if (confirm(`Сбросить пароль пользователя ${u.fullName} на стандартный '123456'?`)) {
      u.passwordHash = '123456';
      localStorage.setItem(Auth.USERS_KEY, JSON.stringify(users));
      this.logAction('Сброс пароля пользователя', `Администратор сбросил пароль для ${u.username}`, 'warning');
      alert(`Пароль для ${u.username} успешно сброшен на '123456'`);
    }
  },

  toggleUserActive(userId) {
    const users = Auth.getAllUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return;

    u.active = !u.active;
    localStorage.setItem(Auth.USERS_KEY, JSON.stringify(users));
    this.logAction(
      u.active ? 'Активация пользователя' : 'Блокировка пользователя',
      `Статус пользователя ${u.username} изменен на: ${u.active ? 'Активен' : 'Заблокирован'}`,
      'danger'
    );
    this.renderUsersTable();
  }
};
