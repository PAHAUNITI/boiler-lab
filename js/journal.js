/**
 * Journal module for Boiler Lab
 * Управление журналом водно-химического режима, фильтрами и вводом проб (с поддержкой мобильных устройств)
 */

const Journal = {
  currentFilter: {
    pointId: 'all',
    status: 'all',
    shift: 'all',
    search: ''
  },
  editingRecordId: null,
  linkedReminderId: null,

  // Рендеринг таблицы / карточек журнала
  render() {
    const tbody = document.getElementById('journalTableBody');
    if (!tbody) return;

    const filtered = this.getFilteredRecords();
    this.updateStatsCounters();

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5 text-muted">
            <div class="empty-state">
              <span class="empty-icon">📋</span>
              <p>Записей по выбранным фильтрам не найдено</p>
              <button class="btn btn-sm btn-primary" onclick="Journal.openNewRecordModal()">+ Внести замер</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(rec => {
      const point = SAMPLE_POINTS[rec.pointId] || { name: rec.pointId, icon: '💧' };
      const statusBadge = this.renderStatusBadge(rec.status);
      const paramsSummary = this.renderParamsSummary(rec.pointId, rec.values);

      return `
        <tr class="record-row row-status-${rec.status}">
          <td class="col-time" data-label="Время/Смена">
            <div class="time-primary">${rec.time || '—'}</div>
            <div class="date-secondary">${rec.date || '—'}</div>
            <div class="shift-badge">Смена ${rec.shift || 1}</div>
          </td>
          <td class="col-point" data-label="Точка контроля">
            <div class="point-tag">
              <span class="point-icon">${point.icon || '💧'}</span>
              <strong>${point.name}</strong>
            </div>
            ${rec.equipment ? `<div class="equipment-sub">${rec.equipment}</div>` : ''}
          </td>
          <td class="col-params" data-label="Показатели">
            <div class="params-grid-cell">
              ${paramsSummary}
            </div>
          </td>
          <td class="col-status" data-label="Оценка">
            ${statusBadge}
            ${rec.issues && rec.issues.length > 0 ? `
              <div class="issues-list">
                ${rec.issues.map(iss => `<div class="issue-item issue-${iss.status}">⚠️ ${iss.message}</div>`).join('')}
              </div>
            ` : ''}
          </td>
          <td class="col-notes" data-label="Замечания">
            <div class="notes-cell">${rec.notes || '—'}</div>
            <div class="tech-signature">Лаборант: <span>${rec.technician || '—'}</span></div>
          </td>
          <td class="col-actions text-right" data-label="Действия">
            <div class="row-actions-group">
              <button class="btn-icon" title="Редактировать" onclick="Journal.openEditModal('${rec.id}')">✏️</button>
              <button class="btn-icon btn-icon-danger" title="Удалить" onclick="Journal.deleteRecord('${rec.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  getFilteredRecords() {
    let list = [...AppState.records];
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (this.currentFilter.pointId !== 'all') {
      list = list.filter(r => r.pointId === this.currentFilter.pointId);
    }
    if (this.currentFilter.status !== 'all') {
      list = list.filter(r => r.status === this.currentFilter.status);
    }
    if (this.currentFilter.shift !== 'all') {
      list = list.filter(r => String(r.shift) === String(this.currentFilter.shift));
    }
    if (this.currentFilter.search.trim()) {
      const q = this.currentFilter.search.toLowerCase();
      list = list.filter(r => 
        (r.equipment && r.equipment.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.technician && r.technician.toLowerCase().includes(q)) ||
        (SAMPLE_POINTS[r.pointId] && SAMPLE_POINTS[r.pointId].name.toLowerCase().includes(q))
      );
    }

    return list;
  },

  renderStatusBadge(status) {
    switch (status) {
      case 'alarm':
        return `<span class="badge badge-alarm">🚨 Нарушение норм</span>`;
      case 'warning':
        return `<span class="badge badge-warning">⚠️ Предупреждение</span>`;
      default:
        return `<span class="badge badge-normal">✔️ В норме</span>`;
    }
  },

  renderParamsSummary(pointId, values) {
    const point = SAMPLE_POINTS[pointId];
    if (!point || !values) return '—';

    const items = [];
    for (const [key, val] of Object.entries(values)) {
      if (val !== '' && val !== null && !isNaN(val)) {
        const pDef = point.params[key];
        if (pDef) {
          const check = AppState.validateMeasurement(pointId, key, val);
          const cls = check.status === 'alarm' ? 'val-alarm' : (check.status === 'warning' ? 'val-warn' : 'val-ok');
          items.push(`
            <span class="param-chip ${cls}" title="${check.message}">
              <span class="param-lbl">${pDef.name}:</span>
              <strong>${val}</strong> <small>${pDef.unit}</small>
            </span>
          `);
        }
      }
    }

    return items.length > 0 ? items.join('') : '<span class="text-muted">Параметры не внесены</span>';
  },

  updateStatsCounters() {
    const all = AppState.records;
    const total = all.length;
    const normal = all.filter(r => r.status === 'normal').length;
    const warning = all.filter(r => r.status === 'warning').length;
    const alarm = all.filter(r => r.status === 'alarm').length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('statTotalRecords', total);
    setEl('statNormalRecords', normal);
    setEl('statWarnRecords', warning);
    setEl('statAlarmRecords', alarm);
  },

  openNewRecordModal(preselectedPointId = null, linkedReminderId = null) {
    this.editingRecordId = null;
    this.linkedReminderId = linkedReminderId || null;

    const modal = document.getElementById('recordModal');
    const modalTitle = document.getElementById('recordModalTitle');
    if (!modal) return;

    modalTitle.textContent = 'Новый замер ВХР';

    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    document.getElementById('recDate').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    document.getElementById('recTime').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('recTechnician').value = AppState.settings.currentTechnician || '';
    document.getElementById('recShift').value = AppState.settings.currentShift || 1;
    document.getElementById('recNotes').value = '';

    const pointSelect = document.getElementById('modalPointSelect');
    if (preselectedPointId && SAMPLE_POINTS[preselectedPointId]) {
      pointSelect.value = preselectedPointId;
    } else if (!pointSelect.value) {
      pointSelect.value = 'feed';
    }

    this.updateModalEquipmentOptions(pointSelect.value);
    this.renderDynamicParamInputs(pointSelect.value);

    modal.classList.add('active');
  },

  openEditModal(recordId) {
    const rec = AppState.records.find(r => r.id === recordId);
    if (!rec) return;

    this.editingRecordId = recordId;
    this.linkedReminderId = null;

    const modal = document.getElementById('recordModal');
    const modalTitle = document.getElementById('recordModalTitle');
    if (!modal) return;

    modalTitle.textContent = 'Редактирование анализа';

    document.getElementById('recDate').value = rec.date;
    document.getElementById('recTime').value = rec.time;
    document.getElementById('recTechnician').value = rec.technician || '';
    document.getElementById('recShift').value = rec.shift || 1;
    document.getElementById('recNotes').value = rec.notes || '';

    const pointSelect = document.getElementById('modalPointSelect');
    pointSelect.value = rec.pointId;

    this.updateModalEquipmentOptions(rec.pointId, rec.equipment);
    this.renderDynamicParamInputs(rec.pointId, rec.values);

    modal.classList.add('active');
  },

  closeRecordModal() {
    const modal = document.getElementById('recordModal');
    if (modal) modal.classList.remove('active');
    this.editingRecordId = null;
    this.linkedReminderId = null;
  },

  updateModalEquipmentOptions(pointId, selectedEquip = null) {
    const select = document.getElementById('recEquipment');
    if (!select) return;

    let options = [];
    if (pointId === 'boiler') {
      options = ['Котел №1 (ДКВР-10/13)', 'Котел №2 (ДКВР-10/13)', 'Котел №3 (КВ-ГМ-20)'];
    } else if (pointId === 'feed') {
      options = ['Деаэратор ДА-15', 'Питательный насос ПЭ-65/40', 'Вход в экономайзер №1'];
    } else if (pointId === 'soft') {
      options = ['Na-катионитный фильтр №1', 'Na-катионитный фильтр №2', 'Бак запаса умягченной воды'];
    } else if (pointId === 'raw') {
      options = ['Городской водопровод (вход ХВО)', 'Скважина технической воды'];
    } else if (pointId === 'network') {
      options = ['Прямая сетевая линия (Т1)', 'Обратная сетевая линия (Т2)', 'Сетевой подогреватель ПСВ'];
    } else {
      options = ['Сборный бак конденсата', 'Дренажный насос'];
    }

    select.innerHTML = options.map(opt => `
      <option value="${opt}" ${opt === selectedEquip ? 'selected' : ''}>${opt}</option>
    `).join('');
  },

  // Отрисовка динамических полей с оптимизацией под мобильную клавиатуру (inputmode="decimal")
  renderDynamicParamInputs(pointId, existingValues = {}) {
    const container = document.getElementById('dynamicParamInputs');
    if (!container) return;

    const point = SAMPLE_POINTS[pointId];
    if (!point) return;

    container.innerHTML = Object.entries(point.params).map(([paramKey, cfg]) => {
      const val = existingValues[paramKey] !== undefined ? existingValues[paramKey] : '';
      const check = AppState.validateMeasurement(pointId, paramKey, val);
      const validationClass = check.status === 'alarm' ? 'is-invalid' : (check.status === 'warning' ? 'is-warning' : '');

      return `
        <div class="form-group param-input-group" data-param="${paramKey}">
          <div class="param-header-flex">
            <label for="param_${paramKey}">${cfg.name}</label>
            <span class="norm-tip">${cfg.standard}</span>
          </div>
          <div class="input-with-addon">
            <input 
              type="number" 
              inputmode="decimal"
              step="${cfg.step || 0.1}" 
              id="param_${paramKey}" 
              name="${paramKey}" 
              value="${val}" 
              class="form-control param-field ${validationClass}"
              placeholder="0.0"
              oninput="Journal.onParamLiveInput('${pointId}', '${paramKey}', this)"
            />
            <span class="addon-unit">${cfg.unit}</span>
          </div>
          <div class="param-feedback" id="feedback_${paramKey}">
            ${check.status !== 'normal' && check.status !== 'empty' ? check.message : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  onParamLiveInput(pointId, paramKey, inputEl) {
    const val = inputEl.value;
    const check = AppState.validateMeasurement(pointId, paramKey, val);
    const feedbackEl = document.getElementById(`feedback_${paramKey}`);

    inputEl.classList.remove('is-invalid', 'is-warning');
    if (check.status === 'alarm') {
      inputEl.classList.add('is-invalid');
      if (feedbackEl) {
        feedbackEl.className = 'param-feedback text-danger';
        feedbackEl.textContent = `🚨 ${check.message}`;
      }
    } else if (check.status === 'warning') {
      inputEl.classList.add('is-warning');
      if (feedbackEl) {
        feedbackEl.className = 'param-feedback text-warning';
        feedbackEl.textContent = `⚠️ ${check.message}`;
      }
    } else {
      if (feedbackEl) {
        feedbackEl.className = 'param-feedback text-success';
        feedbackEl.textContent = val ? '✔️ В норме' : '';
      }
    }
  },

  saveRecordFromModal() {
    const pointId = document.getElementById('modalPointSelect').value;
    const point = SAMPLE_POINTS[pointId];
    if (!point) return;

    const date = document.getElementById('recDate').value;
    const time = document.getElementById('recTime').value;
    const technician = document.getElementById('recTechnician').value.trim() || 'Лаборант';
    const shift = parseInt(document.getElementById('recShift').value, 10) || 1;
    const equipment = document.getElementById('recEquipment').value;
    const notes = document.getElementById('recNotes').value.trim();

    const values = {};
    Object.keys(point.params).forEach(paramKey => {
      const input = document.getElementById(`param_${paramKey}`);
      if (input && input.value !== '') {
        values[paramKey] = parseFloat(input.value);
      }
    });

    if (Object.keys(values).length === 0) {
      alert('Пожалуйста, введите хотя бы одно значение замера!');
      return;
    }

    const evalResult = AppState.evaluateRecordStatus(pointId, values);

    AppState.settings.currentTechnician = technician;
    AppState.settings.currentShift = shift;

    if (this.editingRecordId) {
      const index = AppState.records.findIndex(r => r.id === this.editingRecordId);
      if (index !== -1) {
        AppState.records[index] = {
          ...AppState.records[index],
          date,
          time,
          timestamp: `${date}T${time}:00`,
          shift,
          pointId,
          equipment,
          technician,
          values,
          status: evalResult.status,
          issues: evalResult.issues,
          notes
        };
      }
    } else {
      const newRecord = {
        id: 'rec_' + Date.now(),
        timestamp: `${date}T${time}:00`,
        date,
        time,
        shift,
        pointId,
        equipment,
        technician,
        values,
        status: evalResult.status,
        issues: evalResult.issues,
        notes
      };
      AppState.records.unshift(newRecord);

      if (this.linkedReminderId) {
        Reminders.completeReminder(this.linkedReminderId);
      }
    }

    AppState.save();
    this.closeRecordModal();
    this.render();

    if (window.Analytics && window.Analytics.render) {
      window.Analytics.render();
    }
  },

  deleteRecord(id) {
    if (!confirm('Вы действительно хотите удалить эту запись из журнала?')) return;
    AppState.records = AppState.records.filter(r => r.id !== id);
    AppState.save();
    this.render();
    if (window.Analytics && window.Analytics.render) {
      window.Analytics.render();
    }
  },

  resetFilters() {
    this.currentFilter = { pointId: 'all', status: 'all', shift: 'all', search: '' };
    document.getElementById('filterPoint').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterShift').value = 'all';
    document.getElementById('filterSearch').value = '';
    this.render();
  },

  init() {
    this.render();

    const fPoint = document.getElementById('filterPoint');
    const fStatus = document.getElementById('filterStatus');
    const fShift = document.getElementById('filterShift');
    const fSearch = document.getElementById('filterSearch');

    if (fPoint) fPoint.addEventListener('change', e => { this.currentFilter.pointId = e.target.value; this.render(); });
    if (fStatus) fStatus.addEventListener('change', e => { this.currentFilter.status = e.target.value; this.render(); });
    if (fShift) fShift.addEventListener('change', e => { this.currentFilter.shift = e.target.value; this.render(); });
    if (fSearch) fSearch.addEventListener('input', e => { this.currentFilter.search = e.target.value; this.render(); });

    const modalPointSelect = document.getElementById('modalPointSelect');
    if (modalPointSelect) {
      modalPointSelect.addEventListener('change', e => {
        this.updateModalEquipmentOptions(e.target.value);
        this.renderDynamicParamInputs(e.target.value);
      });
    }
  }
};
