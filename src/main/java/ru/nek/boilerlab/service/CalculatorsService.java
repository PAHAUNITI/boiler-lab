package ru.nek.boilerlab.service;

/**
 * Инженерные и химические расчеты водно-химического режима котлов и ХВО
 */
public class CalculatorsService {

    /**
     * Расчет процента непрерывной продувки котла:
     * P = (S_пит / (S_котл - S_пит)) * 100%
     */
    public static double calculateContinuousBlowdownPercent(double feedTds, double boilerTds) {
        if (boilerTds <= feedTds || feedTds <= 0) {
            throw new IllegalArgumentException("Солесодержание котловой воды должно быть строго выше питательной");
        }
        return (feedTds / (boilerTds - feedTds)) * 100.0;
    }

    /**
     * Расход продувочной воды в т/ч:
     * G_прод = D * P / 100
     */
    public static double calculateBlowdownFlowRate(double steamCapacityTonsPerHour, double blowdownPercent) {
        return (steamCapacityTonsPerHour * blowdownPercent) / 100.0;
    }

    /**
     * Расчет фильтроцикла Na-катионитного фильтра:
     * V_ф = (E_раб * V_смолы) / Ж_исх [м³]
     */
    public static double calculateFilterCycleWaterVolume(double resinVolumeM3, double resinCapacityGEqPerM3, double rawHardnessMgEqPerL) {
        if (resinVolumeM3 <= 0 || resinCapacityGEqPerM3 <= 0 || rawHardnessMgEqPerL <= 0) {
            throw new IllegalArgumentException("Параметры фильтра должны быть строго положительными");
        }
        double totalCapacityGEq = resinCapacityGEqPerM3 * resinVolumeM3;
        return totalCapacityGEq / rawHardnessMgEqPerL; // м³
    }

    /**
     * Расчет расхода технической поваренной соли NaCl на регенерацию:
     * M_соли = (E_раб * V_смолы * q_соли) / 1000 [кг]
     */
    public static double calculateSaltConsumptionKg(double resinVolumeM3, double resinCapacityGEqPerM3, double saltSpecificRateGramsPerGEq) {
        double totalCapacityGEq = resinCapacityGEqPerM3 * resinVolumeM3;
        return (totalCapacityGEq * saltSpecificRateGramsPerGEq) / 1000.0;
    }
}
