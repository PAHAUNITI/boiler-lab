package ru.nek.boilerlab;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ru.nek.boilerlab.model.SamplePoint;
import ru.nek.boilerlab.model.SampleStatus;
import ru.nek.boilerlab.service.WaterNormsValidator;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Тестирование модуля контроля водно-химического режима")
public class WaterNormsValidatorTest {

    @Test
    @DisplayName("Питательная вода: кислород до 20 мкг/дм³ оценивается как норма")
    void testFeedWaterOxygenNormal() {
        WaterNormsValidator.ValidationResult result = 
            WaterNormsValidator.validateParameter(SamplePoint.FEED, "o2", 12.0);
        assertEquals(SampleStatus.NORMAL, result.getStatus());
    }

    @Test
    @DisplayName("Питательная вода: кислород > 20 мкг/дм³ фиксирует аварийное нарушение (ALARM)")
    void testFeedWaterOxygenAlarm() {
        WaterNormsValidator.ValidationResult result = 
            WaterNormsValidator.validateParameter(SamplePoint.FEED, "o2", 24.5);
        assertEquals(SampleStatus.ALARM, result.getStatus());
        assertTrue(result.getMessage().contains("риск коррозии"));
    }

    @Test
    @DisplayName("Вода ХВО: жесткость > 15 мкг-экв/дм³ диагностирует проскок катионитового фильтра")
    void testSoftWaterHardnessBreakthrough() {
        WaterNormsValidator.ValidationResult result = 
            WaterNormsValidator.validateParameter(SamplePoint.SOFT, "hardness", 18.0);
        assertEquals(SampleStatus.ALARM, result.getStatus());
        assertTrue(result.getMessage().contains("Проскок фильтра ХВО"));
    }

    @Test
    @DisplayName("Котловая вода: завышенное солесодержание > 3000 мг/л приводит к статусу ALARM")
    void testBoilerWaterHighTdsAlarm() {
        WaterNormsValidator.ValidationResult result = 
            WaterNormsValidator.validateParameter(SamplePoint.BOILER, "tds", 3200.0);
        assertEquals(SampleStatus.ALARM, result.getStatus());
    }

    @Test
    @DisplayName("Комплексная проба: если хотя бы один параметр ALARM, вся проба переходит в ALARM")
    void testCompositeSampleEvaluation() {
        Map<String, Double> values = new HashMap<>();
        values.put("hardness", 4.0); // норма (<=10)
        values.put("ph", 8.9);       // норма (8.5 - 9.5)
        values.put("o2", 28.0);      // авария (>20)

        SampleStatus status = WaterNormsValidator.evaluateSample(SamplePoint.FEED, values);
        assertEquals(SampleStatus.ALARM, status);
    }
}
