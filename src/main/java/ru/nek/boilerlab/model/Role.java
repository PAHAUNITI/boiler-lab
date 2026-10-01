package ru.nek.boilerlab.model;

/**
 * Роли пользователей в системе ВХР
 */
public enum Role {
    ADMIN("Администратор"),
    LAB("Инженер-химик (лаборант ВХР)"),
    OPERATOR("Оператор / начальник смены");

    private final String title;

    Role(String title) {
        this.title = title;
    }

    public String getTitle() { return title; }

    public boolean canWriteJournal() {
        return this == ADMIN || this == LAB;
    }

    public boolean canAdminUsers() {
        return this == ADMIN;
    }
}
