/**
 * Модуль аутентификации и ролевого доступа (Auth & RBAC)
 * АИС "ТеплоХимЛаб" — Химическая лаборатория водно-химического режима котельной
 * Разработчик: Коновалов П.С. (группа ИСП-431)
 */

const Auth = {
  SESSION_KEY: 'TEPLO_KHIM_LAB_SESSION',
  USERS_KEY: 'TEPLO_KHIM_LAB_USERS',

  // Предустановленные учетные записи (SSOT)
  defaultUsers: [
    {
      id: 1,
      username: 'lab',
      passwordHash: 'lab123', // В учебном стенде для наглядности
      fullName: 'Коновалов Павел Сергеевич',
      role: 'LAB', // LAB: Лаборант ВХР / инженер-химик
      roleName: 'Инженер-химик (лаборант ВХР)',
      shift: 1,
      active: true,
      createdAt: '2026-09-01T08:00:00'
    },
    {
      id: 2,
      username: 'operator',
      passwordHash: 'op123',
      fullName: 'Смирнова Анна Васильевна',
      role: 'OPERATOR', // OPERATOR: Начальник смены / оператор котельной
      roleName: 'Начальник смены котельной',
      shift: 1,
      active: true,
      createdAt: '2026-09-01T08:00:00'
    },
    {
      id: 3,
      username: 'admin',
      passwordHash: 'admin123',
      fullName: 'Администратор системы',
      role: 'ADMIN', // ADMIN: Системный администратор
      roleName: 'Администратор АИС',
      shift: null,
      active: true,
      createdAt: '2026-09-01T08:00:00'
    }
  ],

  currentUser: null,

  init() {
    this.ensureUsersSeeded();
    const saved = localStorage.getItem(this.SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        const freshUser = this.getUserByUsername(user.username);
        if (freshUser && freshUser.active) {
          this.currentUser = freshUser;
        } else {
          localStorage.removeItem(this.SESSION_KEY);
          this.currentUser = null;
        }
      } catch (e) {
        localStorage.removeItem(this.SESSION_KEY);
      }
    }

    // Если нет активного пользователя — по умолчанию предлагаем войти как лаборант Коновалов П.С.
    if (!this.currentUser) {
      this.currentUser = this.defaultUsers[0]; // Демо-авторизация по умолчанию
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
    }

    this.updateHeaderUI();
    this.applyPermissionsUI();
  },

  ensureUsersSeeded() {
    const raw = localStorage.getItem(this.USERS_KEY);
    if (!raw) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this.defaultUsers));
    }
  },

  getAllUsers() {
    this.ensureUsersSeeded();
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || this.defaultUsers;
    } catch (e) {
      return this.defaultUsers;
    }
  },

  getUserByUsername(username) {
    const users = this.getAllUsers();
    return users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  },

  login(username, password) {
    const user = this.getUserByUsername(username);
    if (!user) {
      return { success: false, error: 'Пользователь с таким логином не найден' };
    }
    if (!user.active) {
      return { success: false, error: 'Учетная запись заблокирована администратором' };
    }
    if (user.passwordHash !== password) {
      return { success: false, error: 'Неверный пароль' };
    }

    this.currentUser = user;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    
    // Фиксируем в аудите
    if (window.Admin && typeof window.Admin.logAction === 'function') {
      window.Admin.logAction('Вход в систему', `Пользователь ${user.fullName} (${user.roleName}) успешно авторизован`, 'info');
    }

    this.updateHeaderUI();
    this.applyPermissionsUI();
    return { success: true, user };
  },

  register(userData) {
    const { fullName, username, password, role, department } = userData;
    if (!fullName || fullName.trim().length < 3) {
      return { success: false, error: 'Укажите полные ФИО специалиста' };
    }
    if (!username || username.trim().length < 3) {
      return { success: false, error: 'Логин должен содержать не менее 3 символов' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Пароль должен содержать не менее 4 символов' };
    }
    const cleanUser = username.trim().toLowerCase();
    const existing = this.getUserByUsername(cleanUser);
    if (existing) {
      return { success: false, error: 'Специалист с таким логином уже зарегистрирован в базе ВХР' };
    }

    const roleMap = {
      'LAB': 'Инженер-химик (лаборант ВХР)',
      'OPERATOR': 'Начальник смены котельной',
      'TECHNOLOGIST': 'Главный технолог / инженер ПТО',
      'ADMIN': 'Администратор АИС ВХР'
    };

    const users = this.getAllUsers();
    const newId = users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
    const newUser = {
      id: newId,
      username: cleanUser,
      passwordHash: password,
      fullName: fullName.trim(),
      role: role || 'LAB',
      roleName: roleMap[role] || 'Специалист ВХР',
      department: department || 'Лаборатория ХВО и ВХР',
      shift: 1,
      active: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

    // Синхронизация с сервером
    try {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      }).catch(() => {});
    } catch(e) {}

    // Фиксация в аудите
    if (window.Admin && typeof window.Admin.logAction === 'function') {
      window.Admin.logAction('Регистрация специалиста', `Зарегистрирован новый сотрудник ${newUser.fullName} (${newUser.roleName}, ${newUser.department})`, 'success');
    }

    // Мгновенный вход в систему
    this.currentUser = newUser;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(newUser));
    this.updateHeaderUI();
    this.applyPermissionsUI();

    return { success: true, user: newUser };
  },

  setAuthMode(mode) {
    const loginForm = document.getElementById('authFormLogin');
    const registerForm = document.getElementById('authFormRegister');
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabReg = document.getElementById('tabAuthRegister');
    const errEl = document.getElementById('loginErrorMsg');
    if (errEl) errEl.style.display = 'none';

    if (mode === 'register') {
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
    } else {
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
    }
  },

  submitRegister() {
    const fullName = (document.getElementById('regFullName') || {}).value || '';
    const username = (document.getElementById('regUsername') || {}).value || '';
    const password = (document.getElementById('regPassword') || {}).value || '';
    const role = (document.getElementById('regRole') || {}).value || 'LAB';
    const department = (document.getElementById('regDepartment') || {}).value || '';

    const res = this.register({ fullName, username, password, role, department });
    const err = document.getElementById('loginErrorMsg');
    if (res.success) {
      if (err) err.style.display = 'none';
      this.closeLoginModal();
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`Добро пожаловать, ${res.user.fullName}! Вы успешно зарегистрированы.`, 'success');
      } else {
        alert(`Добро пожаловать, ${res.user.fullName}! Вы успешно зарегистрированы в системе.`);
      }
    } else {
      if (err) {
        err.textContent = res.error;
        err.style.display = 'block';
      } else {
        alert(res.error);
      }
    }
  },

  submitLogin() {
    const u = (document.getElementById('loginUsername') || {}).value || '';
    const p = (document.getElementById('loginPassword') || {}).value || '';
    const res = this.login(u, p);
    const err = document.getElementById('loginErrorMsg');
    if (res.success) {
      if (err) err.style.display = 'none';
      this.closeLoginModal();
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`Успешный вход: ${res.user.fullName}`, 'info');
      }
    } else {
      if (err) {
        err.textContent = res.error;
        err.style.display = 'block';
      } else {
        alert(res.error);
      }
    }
  },

  quickSelectUser(username, password) {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    if (uInput) uInput.value = username;
    if (pInput) pInput.value = password;
    this.setAuthMode('login');
  },

  logout() {
    if (this.currentUser && window.Admin && typeof window.Admin.logAction === 'function') {
      window.Admin.logAction('Выход из системы', `Пользователь ${this.currentUser.fullName} вышел из сеанса`, 'info');
    }
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
    this.updateHeaderUI();
    if (window.ShiftGate) {
      window.ShiftGate.openShiftGate();
    } else {
      this.showLoginModal();
    }
  },

  changePassword(oldPassword, newPassword) {
    if (!this.currentUser) return { success: false, error: 'Требуется авторизация' };
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Новый пароль должен быть не менее 4 символов' };
    }
    if (this.currentUser.passwordHash !== oldPassword) {
      return { success: false, error: 'Старый пароль указан неверно' };
    }

    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === this.currentUser.id);
    if (idx !== -1) {
      users[idx].passwordHash = newPassword;
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      this.currentUser.passwordHash = newPassword;
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
      
      if (window.Admin && typeof window.Admin.logAction === 'function') {
        window.Admin.logAction('Смена пароля', `Пользователь ${this.currentUser.fullName} сменил свой пароль`, 'warning');
      }
      return { success: true };
    }
    return { success: false, error: 'Пользователь не найден в БД' };
  },

  getCurrentUser() {
    return this.currentUser;
  },

  canWriteJournal() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'LAB' || this.currentUser.role === 'ADMIN';
  },

  canAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'ADMIN';
  },

  updateHeaderUI() {
    const userBadge = document.getElementById('headerUserBadge');
    const userNameEl = document.getElementById('headerUserName');
    const userRoleEl = document.getElementById('headerUserRole');

    if (this.currentUser) {
      if (userNameEl) userNameEl.textContent = this.currentUser.fullName;
      if (userRoleEl) userRoleEl.textContent = this.currentUser.roleName;
      if (userBadge) {
        userBadge.textContent = this.currentUser.role === 'ADMIN' ? '👑' : (this.currentUser.role === 'LAB' ? '🧪' : '⚡');
        userBadge.title = `${this.currentUser.fullName} (${this.currentUser.roleName})`;
      }
    } else {
      if (userNameEl) userNameEl.textContent = 'Не авторизован';
      if (userRoleEl) userRoleEl.textContent = 'Гость';
      if (userBadge) userBadge.textContent = '👤';
    }
  },

  applyPermissionsUI() {
    const adminNavTab = document.querySelector('[data-tab="admin"]');
    if (adminNavTab) {
      adminNavTab.style.display = this.canAdmin() ? 'flex' : 'none';
    }

    const newRecordBtns = document.querySelectorAll('.btn-add-record');
    newRecordBtns.forEach(btn => {
      btn.style.display = this.canWriteJournal() ? 'inline-flex' : 'none';
    });
  },

  showLoginModal() {
    const modal = document.getElementById('modalLogin');
    if (modal) modal.classList.add('active');
  },

  closeLoginModal() {
    const modal = document.getElementById('modalLogin');
    if (modal) modal.classList.remove('active');
  },

  showChangePassModal() {
    const modal = document.getElementById('modalChangePass');
    if (modal) modal.classList.add('active');
  },

  closeChangePassModal() {
    const modal = document.getElementById('modalChangePass');
    if (modal) modal.classList.remove('active');
  }
};
