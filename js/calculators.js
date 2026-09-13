/**
 * Calculators for Boiler Lab & Water Treatment (ВХР)
 * Физико-химические расчеты водно-химического режима котлов и ХВО
 */

const Calculators = {
  // 1. Расчет непрерывной продувки котла
  // Формула: P = (S_пит / (S_котл - S_пит)) * 100%
  // G_прод = D * P / 100 [т/ч]
  calculateBlowdown(feedTds, boilerTds, steamCapacity) {
    const sFeed = parseFloat(feedTds);
    const sBoiler = parseFloat(boilerTds);
    const d = parseFloat(steamCapacity) || 0;

    if (isNaN(sFeed) || isNaN(sBoiler) || sFeed <= 0 || sBoiler <= 0) {
      return { error: 'Введите корректные положительные значения солесодержания' };
    }
    if (sBoiler <= sFeed) {
      return { error: 'Солесодержание котловой воды должно быть строго выше питательной!' };
    }

    const p = (sFeed / (sBoiler - sFeed)) * 100;
    const gBlow = (d * p) / 100;
    const heatLossGcal = gBlow * 0.15; // ориентировочно 150 ккал/кг энтальпии продувочной воды при 1.3 МПа

    let advice = '';
    let status = 'normal';
    if (p > 5.0) {
      status = 'warning';
      advice = 'Внимание: продувка > 5% считается неэкономичной по теплопотерям. Рекомендуется проверить качество ХВО или деконцентрацию солей.';
    } else if (p < 0.5) {
      status = 'warning';
      advice = 'Внимание: продувка < 0.5% несет риск локального зашламления нижних экранных труб. Проверьте периодическую продувку.';
    } else {
      advice = 'Величина продувки в оптимальном эксплуатационном диапазоне (0.5% – 5.0%).';
    }

    return {
      percent: p.toFixed(2),
      flowRate: gBlow.toFixed(3),
      heatLossGcal: heatLossGcal.toFixed(2),
      advice,
      status
    };
  },

  // 2. Расчет фильтроцикла Na-катионитного фильтра
  // V_ф = (E_раб * V_смолы) / Ж_исх [м³]
  // T_раб = V_ф / Q [ч]
  // M_соли = (E_раб * V_смолы * q_соли) / 1000 [кг]
  calculateFilterCycle(resinVolume, resinCapacity, rawHardness, flowRate, saltSpecificRate = 140) {
    const vResin = parseFloat(resinVolume);
    const eWork = parseFloat(resinCapacity);
    const hardness = parseFloat(rawHardness);
    const qFlow = parseFloat(flowRate);
    const qSalt = parseFloat(saltSpecificRate) || 140;

    if (!vResin || !eWork || !hardness || !qFlow || vResin <= 0 || eWork <= 0 || hardness <= 0 || qFlow <= 0) {
      return { error: 'Заполните все параметры фильтра корректными положительными числами' };
    }

    // Общая емкость фильтра [г-экв]
    const totalCapacity = eWork * vResin;
    // Объем умягченной воды до регенерации [м³] (Ж_исх в мг-экв/л = г-экв/м³)
    const vWater = totalCapacity / hardness;
    // Время работы фильтроцикла [часы]
    const hours = vWater / qFlow;
    // Расход 100% соли NaCl на одну регенерацию [кг]
    const saltKg = (totalCapacity * qSalt) / 1000;
    // Объем 8-10% раствора соли (плотность ~1.06 г/см³) [литры / м³]
    const brineVolumeM3 = saltKg / (1060 * 0.09);

    return {
      waterVolume: Math.round(vWater),
      cycleHours: hours.toFixed(1),
      cycleDays: (hours / 24).toFixed(1),
      saltKg: Math.round(saltKg),
      brineVolumeM3: brineVolumeM3.toFixed(2),
      brineLiters: Math.round(brineVolumeM3 * 1000)
    };
  },

  // 3. Расчет дозирования реагентов
  // А) Сульфитирование (связывание кислорода Na2SO3): 2 Na2SO3 + O2 -> 2 Na2SO4
  // Теоретически 7.88 мг сульфита на 1 мг O2. Избыток k = 1.3..1.5
  calculateOxygenScavenger(waterFlowM3h, dissolvedO2MkgL, excessFactor = 1.4, purityPercent = 95) {
    const q = parseFloat(waterFlowM3h);
    const o2Mkg = parseFloat(dissolvedO2MkgL); // мкг/дм³ = мг/м³
    const k = parseFloat(excessFactor) || 1.4;
    const purity = (parseFloat(purityPercent) || 95) / 100;

    if (!q || isNaN(o2Mkg) || q <= 0 || o2Mkg < 0) {
      return { error: 'Заполните расход питательной воды и содержание O₂' };
    }

    // Содержание O2 в граммах в час
    const o2GramPerHour = (q * o2Mkg) / 1000; // [г O2/ч]
    // Стехиометрия: 7.88 г Na2SO3 на 1 г O2
    const na2so3GramPerHour = (o2GramPerHour * 7.88 * k) / purity;
    const dailyKg = (na2so3GramPerHour * 24) / 1000;

    return {
      gramPerHour: na2so3GramPerHour.toFixed(1),
      kgPerDay: dailyKg.toFixed(2),
      o2GramPerHour: o2GramPerHour.toFixed(2),
      reaction: '2 Na₂SO₃ + O₂ → 2 Na₂SO₄'
    };
  },

  // Б) Фосфатирование котловой воды (Тринатрийфосфат Na3PO4 * 12H2O)
  // Для связывания остаточной жесткости питательной воды и поддержания избытка 5-15 мг/дм³ PO4(3-)
  calculatePhosphateDosing(steamCapacityTh, feedHardnessMkg, targetPo4MgL = 10, purity = 98) {
    const d = parseFloat(steamCapacityTh);
    const h = parseFloat(feedHardnessMkg); // мкг-экв/дм³
    const po4Target = parseFloat(targetPo4MgL) || 10;
    const p = (parseFloat(purity) || 98) / 100;

    if (!d || isNaN(h) || d <= 0 || h < 0) {
      return { error: 'Заполните паропроизводительность и жесткость питательной воды' };
    }

    // На 1 мг-экв жесткости расходуется 31.6 мг PO4(3-)
    // В пересчете на 1 мкг-экв/дм³: 0.0316 мг PO4 на 1 л питательной воды
    const po4ForHardnessG = (d * h * 0.0316); // г PO4 в час
    // Плюс на восполнение уноса с продувкой (при средней продувке 2%):
    const po4ForExcessG = (d * 0.02 * po4Target); // г в час
    const totalPo4GramPerHour = po4ForHardnessG + po4ForExcessG;

    // Молярная масса тринатрийфосфата Na3PO4*12H2O = 380 г/моль, ион PO4 = 95 г/моль -> коэф = 4.0
    const reagentGramPerHour = (totalPo4GramPerHour * 4.0) / p;
    const reagentDailyKg = (reagentGramPerHour * 24) / 1000;

    return {
      gramPerHour: reagentGramPerHour.toFixed(1),
      kgPerDay: reagentDailyKg.toFixed(2),
      po4GramPerHour: totalPo4GramPerHour.toFixed(1),
      reaction: '3 Ca²⁺ + 2 PO₄³⁻ → Ca₃(PO₄)₂ ↓ (шлам выводится с продувкой)'
    };
  },

  // 4. Конвертер единиц жесткости и солесодержания
  convertHardness(value, fromUnit) {
    const v = parseFloat(value);
    if (isNaN(v) || v < 0) return null;

    // Базовая величина: мг-экв/л
    let mgEqL = 0;
    switch (fromUnit) {
      case 'mgeq_l': // мг-экв/л (Россия, ГОСТ)
        mgEqL = v;
        break;
      case 'mcgeq_dm3': // мкг-экв/дм³
        mgEqL = v / 1000;
        break;
      case 'deg_dh': // Немецкие градусы (°dH, 1 °dH = 0.3566 мг-экв/л)
        mgEqL = v * 0.3566;
        break;
      case 'ppm': // ppm CaCO3 (1 мг-экв/л = 50.04 ppm)
        mgEqL = v / 50.04;
        break;
      case 'deg_f': // Французские градусы (°f, 1 °f = 0.20 мг-экв/л)
        mgEqL = v * 0.20;
        break;
      default:
        mgEqL = v;
    }

    return {
      mgeq_l: mgEqL.toFixed(3),
      mcgeq_dm3: (mgEqL * 1000).toFixed(1),
      deg_dh: (mgEqL / 0.3566).toFixed(2),
      ppm: (mgEqL * 50.04).toFixed(1),
      deg_f: (mgEqL / 0.20).toFixed(2)
    };
  },

  // Конвертер проводимости в солесодержание TDS
  convertConductivity(usCm, factor = 0.65) {
    const cond = parseFloat(usCm);
    const k = parseFloat(factor) || 0.65;
    if (isNaN(cond) || cond < 0) return null;
    return {
      tdsMgL: (cond * k).toFixed(1),
      salinityPpm: (cond * k).toFixed(1)
    };
  }
};
