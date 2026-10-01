package ru.nek.boilerlab;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ru.nek.boilerlab.service.CalculatorsService;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Тестирование инженерных расчетов продувки и ХВО")
public class CalculatorsServiceTest {

    @Test
    @DisplayName("Корректный расчет процента непрерывной продувки котла")
    void testContinuousBlowdownCalculation() {
        double sFeed = 50.0;
        double sBoiler = 2050.0;
        // P = 50 / (2050 - 50) * 100 = 50 / 2000 * 100 = 2.5%
        double percent = CalculatorsService.calculateContinuousBlowdownPercent(sFeed, sBoiler);
        assertEquals(2.5, percent, 0.01);
    }

    @Test
    @DisplayName("Исключение при некорректных солесодержаниях котловой воды")
    void testInvalidBlowdownParameters() {
        assertThrows(IllegalArgumentException.class, () -> {
            CalculatorsService.calculateContinuousBlowdownPercent(100.0, 80.0);
        });
    }

    @Test
    @DisplayName("Расчет полезного объема фильтроцикла умягчения воды")
    void testFilterCycleVolumeCalculation() {
        double resinVol = 2.0; // 2 м3 смолы
        double resinCap = 1000.0; // 1000 г-экв/м3
        double rawHardness = 4.0; // 4 мг-экв/л
        // V = 2000 / 4 = 500 м3
        double volume = CalculatorsService.calculateFilterCycleWaterVolume(resinVol, resinCap, rawHardness);
        assertEquals(500.0, volume, 0.01);
    }
}
