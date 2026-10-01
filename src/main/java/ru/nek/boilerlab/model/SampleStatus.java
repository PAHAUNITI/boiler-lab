package ru.nek.boilerlab.model;

/**
 * Оценка соответствия пробы нормам ПТЭ ТЭ и РД 24.031.120-91
 */
public enum SampleStatus {
    NORMAL("В норме"),
    WARNING("Предупреждение (приближение к границе)"),
    ALARM("Критическое нарушение нормы");

    private final String description;

    SampleStatus(String description) {
        this.description = description;
    }

    public String getDescription() { return description; }

    /**
     * Конечный автомат допустимости подтверждения пробы
     */
    public boolean requiresImmediateIntervention() {
        return this == ALARM;
    }
}
