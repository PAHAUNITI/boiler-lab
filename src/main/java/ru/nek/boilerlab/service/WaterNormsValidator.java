package ru.nek.boilerlab.service;

import ru.nek.boilerlab.model.SamplePoint;
import ru.nek.boilerlab.model.SampleStatus;

import java.util.Map;

/**
 * Валидатор соответствия качества воды нормативам ПТЭ ТЭ и РД 24.031.120-91
 */
public class WaterNormsValidator {

    public static class ValidationResult {
        private final SampleStatus status;
        private final String message;

        public ValidationResult(SampleStatus status, String message) {
            this.status = status;
            this.message = message;
        }

        public SampleStatus getStatus() { return status; }
        public String getMessage() { return message; }
    }

    /**
     * Проверка отдельного параметра
     */
    public static ValidationResult validateParameter(SamplePoint point, String param, double value) {
        if (point == SamplePoint.FEED) {
            if ("hardness".equals(param)) {
                if (value > 10.0) return new ValidationResult(SampleStatus.ALARM, "Жесткость питательной воды > 10 мкг-экв/дм³ (проскок жесткости!)");
                if (value > 7.0) return new ValidationResult(SampleStatus.WARNING, "Жесткость приближается к пределу (7-10 мкг-экв/дм³)");
                return new ValidationResult(SampleStatus.NORMAL, "Жесткость питательной воды в норме");
            }
            if ("o2".equals(param)) {
                if (value > 20.0) return new ValidationResult(SampleStatus.ALARM, "Кислород > 20 мкг/дм³ (риск коррозии экономайзера!)");
                if (value > 15.0) return new ValidationResult(SampleStatus.WARNING, "Повышенный кислород O2 (15-20 мкг/дм³)");
                return new ValidationResult(SampleStatus.NORMAL, "Растворенный кислород в норме (деаэрация эффективна)");
            }
            if ("ph".equals(param)) {
                if (value < 8.5 || value > 9.5) return new ValidationResult(SampleStatus.ALARM, "pH питательной воды вне диапазона 8.5 - 9.5");
                return new ValidationResult(SampleStatus.NORMAL, "pH питательной воды в норме");
            }
        }

        if (point == SamplePoint.BOILER) {
            if ("ph".equals(param)) {
                if (value < 9.3 || value > 11.2) return new ValidationResult(SampleStatus.ALARM, "pH котловой воды вне щелочного диапазона 9.3 - 11.2");
                return new ValidationResult(SampleStatus.NORMAL, "pH котловой воды в норме");
            }
            if ("tds".equals(param)) {
                if (value > 3000.0) return new ValidationResult(SampleStatus.ALARM, "Солесодержание котла > 3000 мг/л (опасность вспенивания и уноса пара!)");
                if (value > 2500.0) return new ValidationResult(SampleStatus.WARNING, "Солесодержание приближается к пределу. Требуется увеличить продувку.");
                return new ValidationResult(SampleStatus.NORMAL, "Солесодержание котла в норме");
            }
        }

        if (point == SamplePoint.SOFT) {
            if ("hardness".equals(param)) {
                if (value > 15.0) return new ValidationResult(SampleStatus.ALARM, "Проскок фильтра ХВО! Жесткость > 15 мкг-экв/дм³. Необходима регенерация смолы.");
                if (value > 10.0) return new ValidationResult(SampleStatus.WARNING, "Остаточная жесткость фильтра ХВО повышена (> 10 мкг-экв/дм³)");
                return new ValidationResult(SampleStatus.NORMAL, "Вода ХВО соответствует норме");
            }
        }

        return new ValidationResult(SampleStatus.NORMAL, "Параметр в пределах уставки");
    }

    /**
     * Комплексная оценка всей пробы
     */
    public static SampleStatus evaluateSample(SamplePoint point, Map<String, Double> values) {
        SampleStatus worstStatus = SampleStatus.NORMAL;
        for (Map.Entry<String, Double> entry : values.entrySet()) {
            ValidationResult res = validateParameter(point, entry.getKey(), entry.getValue());
            if (res.getStatus() == SampleStatus.ALARM) {
                return SampleStatus.ALARM;
            } else if (res.getStatus() == SampleStatus.WARNING) {
                worstStatus = SampleStatus.WARNING;
            }
        }
        return worstStatus;
    }
}
