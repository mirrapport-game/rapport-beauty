import { describe, expect, it } from "vitest";
import * as COPY from "@/lib/copy";

/** Every string the copy module can produce, including function results. */
const stringsFrom = (o: unknown): string[] => {
  if (typeof o === "string") return [o];
  if (typeof o === "function") return [];
  if (Array.isArray(o)) return o.flatMap(stringsFrom);
  if (o && typeof o === "object") return Object.values(o).flatMap(stringsFrom);
  return [];
};

const CALLS = [
  COPY.streakText(0),
  COPY.streakText(1),
  COPY.streakText(4),
  COPY.streakText(9),
  COPY.streakText(30),
  COPY.DAILY_CARD.doneText(3),
  COPY.TEAM_CARD.text("Салон «Ромашка»", 5),
  COPY.ACHIEVEMENT_CARD.text("Первый шаг", "Ты сыграл первую сессию. Начало положено!"),
  COPY.GROWTH_CARD.line("empathy", 3, 4),
  COPY.LADDER_SCREEN.progress(3),
  COPY.LADDER_SCREEN.step(4),
  COPY.LADDER_SCREEN.passed(4, "Медсестра"),
  COPY.DAILY_SCREEN.title("Мастер"),
  COPY.DAILY_SCREEN.saved("Стоит уточнить детали"),
  COPY.DAILY_SCREEN.streak(2),
  COPY.resultText({ empathy: 3 }, { empathy: 4 }),
  COPY.resultText({ empathy: 4 }, { empathy: 2 }),
  COPY.resultText({ empathy: 3 }, { empathy: 3 }),
  COPY.WEEKLY_DIGEST.text(2, 1, 5),
  COPY.NOTIFICATIONS.streak(3),
  COPY.NOTIFICATIONS.daily("Мастер"),
  COPY.NOTIFICATIONS.team("Салон «Ромашка»", 5),
  ...Object.values(COPY.LEVEL_TEXT).map((f) => f("Эмпатия", "Стрессоустойчивость")),
];

const ALL = [...stringsFrom(COPY), ...CALLS.filter((x): x is string => typeof x === "string")];

describe("мотивационные тексты", () => {
  it("нигде нет слова «домашка»", () => {
    expect(ALL.some((s) => /домашк/i.test(s))).toBe(false);
  });

  it("онбординг: экран про 5–10 минут без слова «домашка»", () => {
    expect(COPY.ONBOARDING[1]?.text).toBe("Короткая практика каждое утро. Без отчётов. Просто 5 минут — и ты в тонусе.");
    expect(COPY.ONBOARDING).toHaveLength(4);
  });

  it("streak: формулировка меняется по диапазону", () => {
    expect(COPY.streakText(0)).toBeNull();
    expect(COPY.streakText(1)).toBe("Начало положено 🔥 1 день подряд. Продолжай!");
    expect(COPY.streakText(3)).toBe("3 дня подряд! Ты в ритме 🔥");
    expect(COPY.streakText(7)).toBe("Неделя в игре! 7 дней подряд 🔥🔥");
    expect(COPY.streakText(14)).toBe("14 дней подряд! Это уже привычка 🔥🔥🔥");
  });

  it("после результата: рост, спад и стабильно", () => {
    expect(COPY.resultText({ empathy: 3, stress: 3 }, { empathy: 4, stress: 3 })).toBe("Отличный рост! Ты стал лучше слышать и договариваться.");
    expect(COPY.resultText({ empathy: 4, stress: 4 }, { empathy: 2, stress: 4 })).toBe("Есть над чем поработать. Обрати внимание на эмпатию — попробуй ещё раз.");
    expect(COPY.resultText({ empathy: 3 }, { empathy: 3 })).toBe("Стабильно. Чтобы был рост, попробуй другой сценарий или роль.");
  });

  it("карточка роли дня: тексты для невыполненной и выполненной", () => {
    expect(COPY.DAILY_CARD.todoTitle).toBe("Твоя роль дня готова");
    expect(COPY.DAILY_CARD.todoText).toBe("5 минут — и ты в тонусе. Открой карту и проживи один день из жизни коллеги.");
    expect(COPY.DAILY_CARD.doneTitle).toBe("Сегодняшняя роль дня выполнена ✅");
    expect(COPY.DAILY_CARD.doneText(4)).toBe("День 4 подряд 🔥 Так держать!");
  });
});
