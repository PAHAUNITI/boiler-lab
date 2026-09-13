/**
 * State and Single Source of Truth (SSOT) for Boiler Water Lab
 * Водно-химический режим (ВХР) по ПТЭ ТЭ и РД 24.031.120-91
 */

const STORAGE_KEY = 'BOILER_LAB_V1_STATE';

// Точки контроля водно-химического режима
const SAMPLE_POINTS = {
  feed: {
    id: 'feed',
    name: 'Питательная вода',
    icon: '⚡',
    badge: 'Деаэратор / Вход в котел',
    desc: 'После деаэратора перед подачей в экономайзер/котел',
    params: {
      hardness: { name: 'Общая жесткость', unit: 'мкг-экв/дм³', min: 0, max: 10.0, warnMax: 7.0, step: 0.1, standard: 'ПТЭ ТЭ ≤ 10 мкг-экв/дм³' },
      o2: { name: 'Растворенный кислород (O₂)', unit: 'мкг/дм³', min: 0, max: 20.0, warnMax: 15.0, step: 0.5, standard: 'ПТЭ ТЭ ≤ 20 мкг/дм³' },
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 8.5, max: 9.5, warnMin: 8.6, warnMax: 9.3, step: 0.05, standard: '8.5 – 9.5 (защита от CO₂ коррозии)' },
      iron: { name: 'Железо общее (Fe)', unit: 'мкг/дм³', min: 0, max: 50.0, warnMax: 40.0, step: 1.0, standard: '≤ 50 мкг/дм³' },
      oil: { name: 'Нефтепродукты / масла', unit: 'мг/дм³', min: 0, max: 0.5, warnMax: 0.3, step: 0.05, standard: '≤ 0.5 мг/дм³' },
      tds: { name: 'Солесодержание (TDS)', unit: 'мг/л', min: 0, max: 150.0, warnMax: 100.0, step: 1.0, standard: '≤ 150 мг/л' }
    }
  },
  boiler: {
    id: 'boiler',
    name: 'Котловая вода',
    icon: '🔥',
    badge: 'Барабан / Контур котла',
    desc: 'Чистовой отсек барабана котла или контур циркуляции',
    params: {
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 9.3, max: 11.2, warnMin: 9.5, warnMax: 11.0, step: 0.05, standard: '9.3 – 11.2 (щелочной режим)' },
      po4: { name: 'Фосфаты (PO₄³⁻)', unit: 'мг/дм³', min: 5.0, max: 15.0, warnMin: 6.0, warnMax: 14.0, step: 0.5, standard: '5.0 – 15.0 мг/дм³ (связывание накипи)' },
      alkalinity_total: { name: 'Щелочность общая (Щобщ)', unit: 'мг-экв/л', min: 2.0, max: 12.0, warnMin: 2.5, warnMax: 10.0, step: 0.1, standard: '2.0 – 12.0 мг-экв/л' },
      alkalinity_ff: { name: 'Щелочность по ф/ф (Щфф)', unit: 'мг-экв/л', min: 1.0, max: 8.0, warnMin: 1.5, warnMax: 7.0, step: 0.1, standard: '1.0 – 8.0 мг-экв/л' },
      tds: { name: 'Солесодержание (TDS)', unit: 'мг/л', min: 50, max: 3000.0, warnMax: 2500.0, step: 10, standard: '≤ 3000 мг/л (предел вспенивания)' },
      silica: { name: 'Кремнесодержание (SiO₂)', unit: 'мг/дм³', min: 0, max: 20.0, warnMax: 15.0, step: 0.5, standard: '≤ 20.0 мг/дм³' }
    }
  },
  soft: {
    id: 'soft',
    name: 'Вода ХВО (умягченная)',
    icon: '🧪',
    badge: 'После Na-фильтров',
    desc: 'На выходе из ступени катионирования (фильтры №1, №2)',
    params: {
      hardness: { name: 'Общая жесткость', unit: 'мкг-экв/дм³', min: 0, max: 15.0, warnMax: 10.0, step: 0.2, standard: '≤ 15 мкг-экв/дм³ (до проскока)' },
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 7.0, max: 8.5, warnMin: 7.2, warnMax: 8.3, step: 0.05, standard: '7.0 – 8.5' },
      iron: { name: 'Железо общее (Fe)', unit: 'мкг/дм³', min: 0, max: 100.0, warnMax: 80.0, step: 1.0, standard: '≤ 100 мкг/дм³' },
      tds: { name: 'Солесодержание (TDS)', unit: 'мг/л', min: 0, max: 400.0, warnMax: 350.0, step: 5, standard: 'По паспорту исходной воды' }
    }
  },
  raw: {
    id: 'raw',
    name: 'Исходная (сырая) вода',
    icon: '💧',
    badge: 'Водопровод / Скважина',
    desc: 'Поступающая вода до очистки и реагентной обработки',
    params: {
      hardness: { name: 'Общая жесткость', unit: 'мг-экв/л', min: 0.5, max: 7.0, warnMax: 6.0, step: 0.1, standard: 'Норматив источника (СанПиН ≤ 7.0)' },
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 6.5, max: 8.5, warnMin: 6.8, warnMax: 8.2, step: 0.05, standard: '6.5 – 8.5' },
      iron: { name: 'Железо общее (Fe)', unit: 'мг/л', min: 0, max: 0.3, warnMax: 0.25, step: 0.01, standard: '≤ 0.3 мг/л' },
      tds: { name: 'Сухой остаток / TDS', unit: 'мг/л', min: 50, max: 600.0, warnMax: 500.0, step: 10, standard: '≤ 600 мг/л' }
    }
  },
  network: {
    id: 'network',
    name: 'Сетевая вода (контур отопления)',
    icon: '🔄',
    badge: 'Прямая / Обратная сетевая',
    desc: 'Циркулирующая вода тепловых сетей котельной',
    params: {
      hardness: { name: 'Общая жесткость', unit: 'мкг-экв/дм³', min: 0, max: 50.0, warnMax: 40.0, step: 1.0, standard: '≤ 50 мкг-экв/дм³' },
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 8.3, max: 9.2, warnMin: 8.4, warnMax: 9.0, step: 0.05, standard: '8.3 – 9.2' },
      o2: { name: 'Растворенный кислород (O₂)', unit: 'мкг/дм³', min: 0, max: 20.0, warnMax: 15.0, step: 1.0, standard: '≤ 20 мкг/дм³' },
      iron: { name: 'Железо общее (Fe)', unit: 'мкг/дм³', min: 0, max: 250.0, warnMax: 200.0, step: 5.0, standard: '≤ 250 мкг/дм³' }
    }
  },
  condensate: {
    id: 'condensate',
    name: 'Возвратный конденсат',
    icon: '🌫️',
    badge: 'Сборный бак конденсата',
    desc: 'Конденсат от паровых подогревателей и теплообменников',
    params: {
      hardness: { name: 'Общая жесткость', unit: 'мкг-экв/дм³', min: 0, max: 10.0, warnMax: 8.0, step: 0.2, standard: '≤ 10 мкг-экв/дм³' },
      ph: { name: 'Водородный показатель (pH)', unit: 'pH', min: 8.0, max: 9.2, warnMin: 8.2, warnMax: 9.0, step: 0.05, standard: '8.0 – 9.2' },
      iron: { name: 'Железо общее (Fe)', unit: 'мкг/дм³', min: 0, max: 50.0, warnMax: 40.0, step: 1.0, standard: '≤ 50 мкг/дм³' },
      oil: { name: 'Нефтепродукты / масла', unit: 'мг/дм³', min: 0, max: 0.5, warnMax: 0.3, step: 0.05, standard: '≤ 0.5 мг/дм³' }
    }
  }
};

// Единый глобальный объект состояния
const AppState = {
  settings: {
    facilityName: 'Районная отопительная котельная №4',
    boilerList: ['Котел №1 (ДКВР-10/13)', 'Котел №2 (ДКВР-10/13)', 'Котел №3 (КВ-ГМ-20)', 'Деаэратор ДА-15'],
    currentTechnician: 'Смирнова А.В.',
    currentShift: 1, // 1 (08:00 - 20:00) или 2 (20:00 - 08:00)
    soundEnabled: true,
    notificationsEnabled: false,
    theme: 'dark' // 'dark' | 'light'
  },
  records: [],
  reminders: [
    {
      id: 'rem_1',
      title: 'Контроль O₂ питательной воды (Деаэратор)',
      pointId: 'feed',
      intervalMinutes: 120,
      lastRun: Date.now() - 45 * 60 * 1000,
      nextRun: Date.now() + 75 * 60 * 1000,
      enabled: true,
      priority: 'high',
      notes: 'Критично для котлов: норма ≤ 20 мкг/дм³'
    },
    {
      id: 'rem_2',
      title: 'Анализ котловой воды (pH, фосфаты, солесодержание)',
      pointId: 'boiler',
      intervalMinutes: 120,
      lastRun: Date.now() - 30 * 60 * 1000,
      nextRun: Date.now() + 90 * 60 * 1000,
      enabled: true,
      priority: 'high',
      notes: 'Проверка фосфатного режима и необходимости продувки'
    },
    {
      id: 'rem_3',
      title: 'Замер жесткости фильтратов ХВО (Na-фильтры)',
      pointId: 'soft',
      intervalMinutes: 240,
      lastRun: Date.now() - 190 * 60 * 1000,
      nextRun: Date.now() + 50 * 60 * 1000,
      enabled: true,
      priority: 'normal',
      notes: 'Контроль проскока солей жесткости'
    },
    {
      id: 'rem_4',
      title: 'Проверка плотности рассола в солерастворителе',
      pointId: 'soft',
      intervalMinutes: 720,
      lastRun: Date.now() - 600 * 60 * 1000,
      nextRun: Date.now() + 120 * 60 * 1000,
      enabled: true,
      priority: 'normal',
      notes: 'Плотность должна быть не менее 1.15-1.18 г/см³'
    },
    {
      id: 'rem_5',
      title: 'Калибровка pH-метра по буферным растворам (4.01/7.00/9.18)',
      pointId: 'feed',
      intervalMinutes: 1440,
      lastRun: Date.now() - 1100 * 60 * 1000,
      nextRun: Date.now() + 340 * 60 * 1000,
      enabled: true,
      priority: 'low',
      notes: 'Ежесуточная поверка электродной системы'
    }
  ],

  // Валидация значений анализа по нормам ПТЭ ТЭ
  validateMeasurement(pointId, paramKey, value) {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return { status: 'empty', message: 'Не задано' };
    }
    const val = parseFloat(value);
    const point = SAMPLE_POINTS[pointId];
    if (!point || !point.params[paramKey]) {
      return { status: 'normal', message: 'OK' };
    }

    const cfg = point.params[paramKey];

    // Критические аварийные выходы за пределы
    if (cfg.max !== undefined && val > cfg.max) {
      return {
        status: 'alarm',
        type: 'high',
        message: `Выше нормы! ${val} > ${cfg.max} ${cfg.unit} (${cfg.standard})`
      };
    }
    if (cfg.min !== undefined && val < cfg.min) {
      return {
        status: 'alarm',
        type: 'low',
        message: `Ниже нормы! ${val} < ${cfg.min} ${cfg.unit} (${cfg.standard})`
      };
    }

    // Предупредительные пороги (на границе)
    if (cfg.warnMax !== undefined && val > cfg.warnMax) {
      return {
        status: 'warning',
        type: 'warn_high',
        message: `Внимание: приближение к верхнему пределу (${val} ${cfg.unit}, норма ≤ ${cfg.max})`
      };
    }
    if (cfg.warnMin !== undefined && val < cfg.warnMin) {
      return {
        status: 'warning',
        type: 'warn_low',
        message: `Внимание: приближение к нижнему пределу (${val} ${cfg.unit}, норма ≥ ${cfg.min})`
      };
    }

    return { status: 'normal', message: 'В норме' };
  },

  // Оценка общего статуса записи (normal / warning / alarm)
  evaluateRecordStatus(pointId, values) {
    let overall = 'normal';
    const issues = [];

    for (const [key, val] of Object.entries(values)) {
      if (val !== '' && val !== null && !isNaN(val)) {
        const res = this.validateMeasurement(pointId, key, val);
        if (res.status === 'alarm') {
          overall = 'alarm';
          issues.push({ param: key, ...res });
        } else if (res.status === 'warning' && overall !== 'alarm') {
          overall = 'warning';
          issues.push({ param: key, ...res });
        }
      }
    }

    return { status: overall, issues };
  },

  // Сохранение в LocalStorage
  save() {
    try {
      const payload = {
        settings: this.settings,
        records: this.records,
        reminders: this.reminders,
        version: '1.1'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Ошибка сохранения AppState в LocalStorage:', e);
    }
  },

  // Загрузка из LocalStorage
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
        if (Array.isArray(parsed.records) && parsed.records.length > 0) {
          this.records = parsed.records;
        } else {
          this.loadDemoRecords();
        }
        if (Array.isArray(parsed.reminders)) {
          this.reminders = parsed.reminders;
        }
        return true;
      }
    } catch (e) {
      console.warn('Не удалось загрузить данные из хранилища, загружаем демо:', e);
    }
    this.loadDemoRecords();
    this.save();
    return false;
  },

  // Генерация демонстрационных данных за последние смены
  loadDemoRecords() {
    const now = new Date();
    const records = [];

    const pad = n => n.toString().padStart(2, '0');
    const makeTime = (hoursAgo, minute = 0) => {
      const d = new Date(now.getTime() - hoursAgo * 3600 * 1000);
      d.setMinutes(minute);
      return {
        dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        iso: d.toISOString()
      };
    };

    // 1. Питательная вода - Замер 10 часов назад
    let t = makeTime(10, 0);
    let vals = { hardness: 4.5, o2: 14.0, ph: 8.95, iron: 28.0, oil: 0.1, tds: 45 };
    let evalRes = this.evaluateRecordStatus('feed', vals);
    records.push({
      id: 'rec_demo_1',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'feed',
      equipment: 'Деаэратор ДА-15',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'Деаэратор работает устойчиво, температура 104°C'
    });

    // 2. Котловая вода - Замер 8 часов назад
    t = makeTime(8, 0);
    vals = { ph: 10.4, po4: 9.8, alkalinity_total: 6.2, alkalinity_ff: 3.4, tds: 1850, silica: 8.5 };
    evalRes = this.evaluateRecordStatus('boiler', vals);
    records.push({
      id: 'rec_demo_2',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'boiler',
      equipment: 'Котел №1 (ДКВР-10/13)',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'ВХР в норме, фосфатирование непрерывное'
    });

    // 3. Вода ХВО - Замер 6 часов назад (на грани по жесткости)
    t = makeTime(6, 0);
    vals = { hardness: 12.0, ph: 7.8, iron: 65.0, tds: 280 };
    evalRes = this.evaluateRecordStatus('soft', vals);
    records.push({
      id: 'rec_demo_3',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'soft',
      equipment: 'Na-катионитный фильтр №2',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'Внимание: приближение к истощению смолы фильтра №2, подготовлен к регенерации'
    });

    // 4. Питательная вода - Замер 4 часа назад (Превышение O2! Авария)
    t = makeTime(4, 0);
    vals = { hardness: 5.0, o2: 24.5, ph: 8.8, iron: 34.0, oil: 0.1, tds: 50 };
    evalRes = this.evaluateRecordStatus('feed', vals);
    records.push({
      id: 'rec_demo_4',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'feed',
      equipment: 'Деаэратор ДА-15',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'ВНИМАНИЕ! Проскок O2 выше 20 мкг/дм³. Причина: падение давления пара на деаэратор до 0.008 МПа. Отрегулирован редукционный клапан!'
    });

    // 5. Питательная вода - Контрольный замер 2 часа назад (восстановлено)
    t = makeTime(2, 0);
    vals = { hardness: 4.8, o2: 12.2, ph: 9.05, iron: 30.0, oil: 0.1, tds: 48 };
    evalRes = this.evaluateRecordStatus('feed', vals);
    records.push({
      id: 'rec_demo_5',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'feed',
      equipment: 'Деаэратор ДА-15',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'Повторный замер: кислород снижен до 12.2 мкг/дм³, режим нормализован'
    });

    // 6. Сетевая вода - Замер 1 час назад
    t = makeTime(1, 0);
    vals = { hardness: 32.0, ph: 8.65, o2: 14.0, iron: 110.0 };
    evalRes = this.evaluateRecordStatus('network', vals);
    records.push({
      id: 'rec_demo_6',
      timestamp: t.iso,
      date: t.dateStr,
      time: t.timeStr,
      shift: 1,
      pointId: 'network',
      equipment: 'Прямая сетевая линия (Т1)',
      technician: 'Смирнова А.В.',
      values: vals,
      status: evalRes.status,
      issues: evalRes.issues,
      notes: 'Температура подачи 78°C, подпитка 4.2 м³/ч'
    });

    this.records = records;
  }
};
