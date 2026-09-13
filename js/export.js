/**
 * Export and Reporting module for Boiler Lab
 * Экспорт в Excel (.xlsx), печать официальной суточной ведомости в PDF и JSON-бэкап
 */

const ExportManager = {
  // 1. Экспорт в полноценный файл Excel (.xlsx) через автономный SheetJS
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Ошибка: библиотека SheetJS не загружена. Проверьте файл js/xlsx.full.min.js');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // --- ЛИСТ 1: ЖУРНАЛ ЗАМЕРОВ ---
      const journalHeaders = [
        'ID', 'Дата', 'Время', 'Смена', 'Точка отбора', 'Оборудование',
        'Жесткость', 'pH', 'Кислород O₂ (мкг/дм³)', 'Фосфаты PO₄ (мг/дм³)',
        'Щелочность общ. (мг-экв/л)', 'Щелочность ф/ф (мг-экв/л)', 'TDS (мг/л)',
        'Железо Fe (мкг/дм³)', 'Статус', 'Замечания / Отклонения', 'Лаборант'
      ];

      const journalRows = AppState.records.map(r => {
        const point = SAMPLE_POINTS[r.pointId] || {};
        const v = r.values || {};
        const issuesText = (r.issues || []).map(i => i.message).join('; ');

        return [
          r.id,
          r.date,
          r.time,
          r.shift,
          point.name || r.pointId,
          r.equipment || '—',
          v.hardness !== undefined ? v.hardness : '',
          v.ph !== undefined ? v.ph : '',
          v.o2 !== undefined ? v.o2 : '',
          v.po4 !== undefined ? v.po4 : '',
          v.alkalinity_total !== undefined ? v.alkalinity_total : '',
          v.alkalinity_ff !== undefined ? v.alkalinity_ff : '',
          v.tds !== undefined ? v.tds : '',
          v.iron !== undefined ? v.iron : '',
          r.status === 'alarm' ? 'НАРУШЕНИЕ' : (r.status === 'warning' ? 'ПРЕДУПРЕЖДЕНИЕ' : 'В НОРМЕ'),
          issuesText || r.notes || '',
          r.technician || ''
        ];
      });

      const wsJournal = XLSX.utils.aoa_to_sheet([journalHeaders, ...journalRows]);

      // Устанавливаем ширину колонок для читаемости
      wsJournal['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 26 }, { wch: 25 },
        { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
        { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, wsJournal, 'Журнал замеров');

      // --- ЛИСТ 2: ЖУРНАЛ ОТКЛОНЕНИЙ И НАРУШЕНИЙ ---
      const alarms = AppState.records.filter(r => r.status === 'alarm' || r.status === 'warning');
      const alarmRows = alarms.map(r => {
        const point = SAMPLE_POINTS[r.pointId] || {};
        return [
          r.date,
          r.time,
          r.shift,
          point.name || r.pointId,
          r.equipment || '—',
          r.status === 'alarm' ? 'КРИТИЧЕСКИЙ БРАК' : 'ПРЕДУПРЕЖДЕНИЕ',
          (r.issues || []).map(i => i.message).join(' | '),
          r.notes || '',
          r.technician || ''
        ];
      });

      const wsAlarms = XLSX.utils.aoa_to_sheet([
        ['Дата', 'Время', 'Смена', 'Точка контроля', 'Оборудование', 'Степень', 'Выявленные нарушения норм ПТЭ ТЭ', 'Принятые меры / Примечание', 'Лаборант'],
        ...alarmRows
      ]);
      wsAlarms['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 45 }, { wch: 35 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, wsAlarms, 'Отклонения от норм');

      // --- ЛИСТ 3: НОРМАТИВНЫЙ СПРАВОЧНИК ВХР ---
      const normRows = [];
      Object.entries(SAMPLE_POINTS).forEach(([pointId, p]) => {
        Object.entries(p.params).forEach(([pKey, cfg]) => {
          normRows.push([
            p.name,
            cfg.name,
            cfg.unit,
            cfg.min !== undefined ? cfg.min : '—',
            cfg.max !== undefined ? cfg.max : '—',
            cfg.standard
          ]);
        });
      });

      const wsNorms = XLSX.utils.aoa_to_sheet([
        ['Точка отбора', 'Контролируемый параметр', 'Единицы', 'Мин. уставка', 'Макс. уставка', 'Нормативный документ (ПТЭ ТЭ / ГОСТ)'],
        ...normRows
      ]);
      wsNorms['!cols'] = [{ wch: 25 }, { wch: 28 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsNorms, 'Нормы ПТЭ ТЭ');

      // Сохраняем файл
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Журнал_ВХР_Котельная_${today}.xlsx`);
    } catch (e) {
      console.error('Ошибка экспорта в Excel:', e);
      alert('Произошла ошибка при формировании Excel: ' + e.message);
    }
  },

  // 2. Подготовка и печать официальной суточной ведомости в PDF (Ctrl + P)
  printDailyReport() {
    const printContainer = document.getElementById('printableReportArea');
    if (!printContainer) return;

    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;

    // Группируем последние замеры по точкам
    const sorted = [...AppState.records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let tableRowsHtml = sorted.map((rec, idx) => {
      const point = SAMPLE_POINTS[rec.pointId] || {};
      const v = rec.values || {};
      const statusText = rec.status === 'alarm' ? 'БРАК' : (rec.status === 'warning' ? 'ПРЕДУПР.' : 'НОРМА');

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${rec.time}</td>
          <td>Смена ${rec.shift}</td>
          <td><strong>${point.name || rec.pointId}</strong><br><small>${rec.equipment || ''}</small></td>
          <td>${v.hardness !== undefined ? v.hardness : '—'}</td>
          <td>${v.ph !== undefined ? v.ph : '—'}</td>
          <td>${v.o2 !== undefined ? v.o2 : '—'}</td>
          <td>${v.po4 !== undefined ? v.po4 : '—'}</td>
          <td>${v.alkalinity_total !== undefined ? v.alkalinity_total : '—'}</td>
          <td>${v.tds !== undefined ? v.tds : '—'}</td>
          <td class="print-status-${rec.status}">${statusText}</td>
          <td><small>${rec.notes || '—'}</small></td>
          <td><small>${rec.technician || ''}</small></td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      <div class="official-print-document">
        <div class="print-header">
          <div class="print-org">
            <h3>${AppState.settings.facilityName || 'РАЙОННАЯ ОТОПИТЕЛЬНАЯ КОТЕЛЬНАЯ'}</h3>
            <p>Химическая лаборатория • Служба водно-химического режима и ХВО</p>
          </div>
          <div class="print-doc-title">
            <h2>СУТОЧНАЯ ВЕДОМОСТЬ ВОДНО-ХИМИЧЕСКОГО РЕЖИМА</h2>
            <div class="print-meta-grid">
              <div><strong>Дата составления:</strong> ${dateFormatted}</div>
              <div><strong>Текущая смена:</strong> № ${AppState.settings.currentShift || 1}</div>
              <div><strong>Ответственный лаборант:</strong> ${AppState.settings.currentTechnician || '—'}</div>
              <div><strong>Всего анализов:</strong> ${AppState.records.length}</div>
            </div>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th rowspan="2">№</th>
              <th rowspan="2">Время</th>
              <th rowspan="2">Смена</th>
              <th rowspan="2">Точка отбора / Оборудование</th>
              <th colspan="6">Результаты лабораторного химического анализа</th>
              <th rowspan="2">Оценка ВХР</th>
              <th rowspan="2">Замечания и принятые меры</th>
              <th rowspan="2">Подпись</th>
            </tr>
            <tr>
              <th>Жобщ</th>
              <th>pH</th>
              <th>O₂ (мкг)</th>
              <th>PO₄ (мг)</th>
              <th>Щобщ</th>
              <th>TDS</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="print-footer-signatures">
          <div class="sig-block">
            <span class="sig-title">Инженер-химик (лаборант ВХР):</span>
            <div class="sig-line">________________ / ${AppState.settings.currentTechnician || '___________'} /</div>
          </div>
          <div class="sig-block">
            <span class="sig-title">Начальник смены котельной:</span>
            <div class="sig-line">________________ / ___________________ /</div>
          </div>
          <div class="sig-block">
            <span class="sig-title">Главный инженер / Начальник ПТО:</span>
            <div class="sig-line">________________ / ___________________ /</div>
          </div>
        </div>
      </div>
    `;

    // Вызов диалога печати браузера
    window.print();
  },

  // 3. Полный бэкап в JSON
  exportToJson() {
    const payload = {
      app: 'BoilerWaterLab',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      state: AppState
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BoilerLab_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 4. Импорт из JSON
  importFromJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.state) {
          if (parsed.state.settings) AppState.settings = { ...AppState.settings, ...parsed.state.settings };
          if (Array.isArray(parsed.state.records)) AppState.records = parsed.state.records;
          if (Array.isArray(parsed.state.reminders)) AppState.reminders = parsed.state.reminders;
          AppState.save();
          alert('База данных успешно восстановлена из файла!');
          window.location.reload();
        } else {
          alert('Неверный формат файла резервной копии!');
        }
      } catch (err) {
        alert('Ошибка при чтении файла JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
};
