package ru.nek.boilerlab.model;

/**
 * Точки контроля водно-химического режима (ВХР) котельной
 * Специальность 09.02.07 "Информационные системы и программирование"
 * Разработчик: Коновалов П.С., группа ИСП-431
 */
public enum SamplePoint {
    RAW("Исходная (сырая) вода", "Водопровод или скважина до очистки"),
    SOFT("Вода ХВО", "Умягченная вода после Na-катионитных фильтров"),
    FEED("Питательная вода", "После деаэратора перед подачей в котел"),
    BOILER("Котловая вода", "Чистовой отсек барабана котла / контур циркуляции"),
    NETWORK("Сетевая вода", "Прямая и обратная магистраль тепловой сети"),
    CONDENSATE("Возвратный конденсат", "Сборный бак конденсата от подогревателей");

    private final String title;
    private final String description;

    SamplePoint(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
}
