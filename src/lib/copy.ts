/**
 * Motivational copy from the brief «МОТИВАЦИОННЫЕ ТЕКСТЫ (вшить в UI)».
 * Strings are used verbatim; the word «домашка» was dropped from the onboarding
 * screen 2 at the author's request.
 */
import { CRITERIA, type Scores } from "@/lib/feedback";
import { deltas, type Level } from "@/lib/assessment";

const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return few;
  return many;
};
export const daysWord = (n: number) => plural(n, "день", "дня", "дней");

const labelOf = (key: string) => CRITERIA.find(([k]) => k === key)?.[1] ?? key;

/* ─── 1. ОНБОРДИНГ (первый вход) ─── */
export const ONBOARDING = [
  {
    title: "Это не тест и не экзамен",
    text: 'Это тренировка, где ошибаться безопасно — в отличие от реального салона. Здесь можно попробовать "неправильный" ответ, увидеть последствия и попробовать снова.',
  },
  {
    title: "5–10 минут в день",
    text: "Короткая практика каждое утро. Без отчётов. Просто 5 минут — и ты в тонусе.",
  },
  {
    title: "Ты видишь свой рост",
    text: 'После каждого отыгрыша — график "до / после" по 6 шкалам. Через месяц сравнишь себя с собой в начале.',
  },
  {
    title: "Начни с теста",
    text: "12 вопросов, 5 минут. Узнаешь свой профиль коммуникации — и с чего начать.",
  },
] as const;
export const ONBOARDING_START = "Начать";

/* ─── 2. ДАШБОРД (карточки-мотиваторы) ─── */
export const DAILY_CARD = {
  todoTitle: "Твоя роль дня готова",
  todoText: "5 минут — и ты в тонусе. Открой карту и проживи один день из жизни коллеги.",
  open: "Открыть",
  doneTitle: "Сегодняшняя роль дня выполнена ✅",
  doneText: (streak: number) => `День ${streak} подряд 🔥 Так держать!`,
  history: "История",
};

/** Streak card copy; null when there is nothing to celebrate yet. */
export function streakText(streak: number): string | null {
  if (streak < 1) return null;
  const d = `${streak} ${daysWord(streak)} подряд`;
  if (streak < 3) return `Начало положено 🔥 ${d}. Продолжай!`;
  if (streak < 7) return `${d}! Ты в ритме 🔥`;
  if (streak < 14) return `Неделя в игре! ${d} 🔥🔥`;
  return `${d}! Это уже привычка 🔥🔥🔥`;
}

export const GROWTH_CARD = {
  title: "Твой рост",
  line: (key: string, start: number, now: number) => {
    const delta = Math.round((now - start) * 10) / 10;
    return `${labelOf(key)}: ${start} → ${now} (${delta >= 0 ? "+" : ""}${delta})`;
  },
  more: "Подробнее",
};

export const ACHIEVEMENT_CARD = {
  newTitle: "Новое достижение!",
  text: (title: string, description: string | null) => `${title} — ${description ?? ""}`.trim(),
  all: "Посмотреть все",
};

export const TEAM_CARD = {
  title: "Команда ждёт тебя",
  text: (department: string, streakSum: number) =>
    `${department} — ${streakSum} ${daysWord(streakSum)} streak вместе. Не подведи!`,
};

/* ─── 3. ПОСЛЕ ТЕСТА (результат) ─── */
export const AFTER_TEST = {
  title: "Твой профиль коммуникации",
  toGame: "Перейти к игре",
  another: "Пройти ещё один тест",
};

export const LEVEL_TEXT: Record<Level, (strength: string, growth: string) => string> = {
  beginner: (s, g) =>
    `Ты в начале пути. Это нормально — все с чего-то начинают. Твоя сильная сторона: ${s}. Зона роста: ${g}.`,
  intermediate: (s, g) => `Хорошая база. Ты уже многое умеешь. Сильная сторона: ${s}. Зона роста: ${g}.`,
  advanced: (s, g) =>
    `Сильный профиль. Ты уверенно справляешься с большинством ситуаций. Сильная сторона: ${s}. Зона роста: ${g}.`,
  expert: (s, g) => `Очень сильный профиль. Ты — пример для коллег. Сильная сторона: ${s}. Зона роста: ${g}.`,
};

/* ─── 4. ПОСЛЕ СЕССИИ / SOLO (динамика) ─── */
export const AFTER_RESULT = {
  title: "Твой результат",
  again: "Пройти ещё раз",
  other: "К другой ситуации",
};

/** Scale names in the accusative case — «обрати внимание на …». */
const ACCUSATIVE: Record<string, string> = {
  empathy: "эмпатию",
  listening: "слушание",
  argumentation: "аргументацию",
  stress: "стрессоустойчивость",
  teamwork: "командность",
  upselling: "допродажи",
};

/** Growth / decline / stable message after a result, plus the scale to work on. */
export function resultText(prev: Scores, cur: Scores): string {
  const d = deltas(prev, cur);
  if (d.some((x) => x.delta >= 0.3)) return "Отличный рост! Ты стал лучше слышать и договариваться.";
  const worst = [...d].sort((a, b) => a.delta - b.delta)[0];
  if (worst && worst.delta <= -0.3)
    return `Есть над чем поработать. Обрати внимание на ${ACCUSATIVE[worst.key] ?? worst.label} — попробуй ещё раз.`;
  return "Стабильно. Чтобы был рост, попробуй другой сценарий или роль.";
}

/* ─── 5. УВЕДОМЛЕНИЯ (push / Telegram) — строки для будущих ботов ─── */
export const NOTIFICATIONS = {
  daily: (role: string) => `🔥 Твоя роль дня готова: ${role}. 5 минут — и ты в тонусе. Открой приложение.`,
  streak: (streak: number) =>
    `🔥 ${streak} ${daysWord(streak)} подряд! Не разрывай серию — сегодняшняя роль дня ждёт.`,
  achievement: (title: string) => `🏆 Новое достижение: ${title}. Открой приложение, чтобы посмотреть.`,
  invite: (leader: string, session: string, link: string) =>
    `🎭 ${leader} приглашает тебя в сессию «${session}». Подключись по ссылке: ${link}`,
  remind: (session: string) => `⏰ Сессия «${session}» начнётся через 15 минут. Не опаздывай!`,
  team: (department: string, streakSum: number) =>
    `🏅 ${department} — ${streakSum} ${daysWord(streakSum)} streak вместе. Ты в топе!`,
};

/* ─── 6. ДОСТИЖЕНИЯ — тексты живут в таблице achievements (миграция 0018) ─── */

/* ─── 7. ПУСТЫЕ СОСТОЯНИЯ ─── */
export const EMPTY = {
  sessions: "Пока нет сессий. Создай первую или присоединись по коду.",
  feedback: "Пока нет фидбэка. Сыграй сессию, чтобы получить обратную связь.",
  achievements: "Пока нет достижений. Сыграй первую сессию — и получишь \"Первый шаг\".",
  dailyHistory: "Пока нет истории. Выполни первую роль дня — и здесь появится календарь.",
  dynamics: "Пока нет данных. Пройди тест или сыграй сессию, чтобы увидеть рост.",
};

/* ─── 8. ЭКРАН «РОЛЬ ДНЯ» ─── */
export const DAILY_SCREEN = {
  title: (role: string) => `Роль дня: ${role}`,
  subtitle: "Проживи один день из жизни коллеги",
  ctx: [
    ["who_you_are", "Кто вы"],
    ["where_you_are", "Где вы"],
    ["what_is_happening", "Что происходит"],
    ["what_you_feel", "Что вы чувствуете"],
    ["what_you_want", "Чего вы хотите"],
    ["what_you_fear", "Чего вы боитесь"],
    ["what_to_remember", "Что важно помнить"],
    ["key_phrase", "Фраза-установка"],
  ] as [string, string][],
  answer: "Ответить",
  saved: (feedback: string) => `Твой ответ сохранён. Вот что можно было сделать лучше: ${feedback}`,
  model: "Показать эталон",
  streak: (n: number) => `День ${n} подряд 🔥`,
};

/* ─── 9. ЭКРАН «КАРЬЕРНАЯ ЛЕСТНИЦА» ─── */
export const LADDER_SCREEN = {
  title: "Карьерная лестница: от мастера до владельца салона",
  subtitle: "Пройди все 10 ролей и узнай, как устроена салон изнутри",
  progress: (done: number) => `${done} из 10 шагов пройдено`,
  step: (n: number) => `Пройти шаг ${n}`,
  passed: (n: number, next: string) => `Шаг ${n} пройден! ${next} ждёт.`,
  final: "🏆 Ты прошёл карьерную лестницу! Теперь ты видишь салон глазами всех ролей.",
};

/* ─── 10. СКРИПТ ДЛЯ РУКОВОДИТЕЛЯ ─── */
export const LEADER_SCRIPT = {
  title: "Как презентовать игру команде",
  paragraphs: [
    "Коллеги, у нас появился тренажёр коммуникации. Это не тест и не аттестация — это игра, где можно безопасно тренировать сложные разговоры с клиентами и коллегами.",
    "5–10 минут в день. Вы видите свой рост на графике, получаете фидбэк по каждой ситуации.",
    "Есть карта дня — короткая практика каждое утро. Есть челлендж \"Карьерная лестница\" — от мастера до владельца.",
    "За streak и достижения — бонусы. Это инструмент для вас, чтобы работать спокойнее и увереннее.",
    "Давайте попробуем неделю — потом обсудим, что зашло, что нет.",
  ],
  copy: "Скопировать текст",
  avoidTitle: "Чего избегать",
  avoid: [
    "«Это обязаловка, отчитайтесь, кто прошёл».",
    "«По результатам игры будем штрафовать/увольнять».",
    "«Кто не играет — тот плохой сотрудник».",
    "«Это тест на профпригодность».",
  ],
  avoidNote:
    "Если игра станет экзаменом, сотрудники начнут её бояться. Мотивация — через пользу, безопасность и рост.",
};

/* ─── 12. ЕЖЕНЕДЕЛЬНЫЙ ДАЙДЖЕСТ (Telegram) — строки для будущих ботов ─── */
export const WEEKLY_DIGEST = {
  title: "Твоя неделя в игре",
  text: (sessions: number, daily: number, streak: number) =>
    `Ты сыграл ${sessions} ${plural(sessions, "сессию", "сессии", "сессий")}, выполнил ${daily} ${plural(daily, "роль дня", "роли дня", "ролей дня")}. Streak: ${streak} ${daysWord(streak)} 🔥`,
  open: "Открыть приложение",
};
