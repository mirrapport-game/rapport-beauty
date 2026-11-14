import { CRITERIA, type CriterionKey, type Scores } from "@/lib/feedback";

export type AOption = { id: string; text: string; scores: Scores };
export type AQuestion = { id: string; scenario: string; question: string; category_id: string; options: AOption[] };

const s = (empathy: number, listening: number, argumentation: number, stress: number, teamwork: number, upselling: number): Scores =>
  ({ empathy, listening, argumentation, stress, teamwork, upselling });

export const ASSESSMENT_ID = "assessment_v1";
export const RETAKE_DAYS = 30;

export const QUESTIONS: AQuestion[] = [
  { id: "aq_01", category_id: "client_admin", scenario: "Клиент кричит, что вы его не записали, хотя он точно записывался.", question: "Ваши первые действия?", options: [
    { id: "a", text: "Сразу скажу, что записи нет, и предложу записаться заново", scores: s(1, 1, 2, 2, 1, 1) },
    { id: "b", text: "Извинюсь за неудобство, уточню детали и предложу ближайшее приоритетное время", scores: s(5, 4, 4, 4, 3, 2) },
    { id: "c", text: "Позову старшего администратора", scores: s(2, 2, 2, 3, 4, 1) },
    { id: "d", text: "Начну доказывать, что он не записывался", scores: s(0, 1, 1, 1, 1, 0) },
  ] },
  { id: "aq_02", category_id: "client_master", scenario: "Клиентка боится болезненной эпиляции и просит «сделать как-нибудь без боли».", question: "Что вы скажете?", options: [
    { id: "a", text: "«Без этого никак, садитесь»", scores: s(0, 1, 1, 2, 1, 0) },
    { id: "b", text: "«Понимаю, многие волнуются. Расскажу, как всё пройдёт, это займёт минуту»", scores: s(5, 4, 4, 4, 2, 1) },
    { id: "c", text: "Предложу перенести процедуру на другой день", scores: s(3, 2, 1, 2, 1, 0) },
  ] },
  { id: "aq_03", category_id: "master_client", scenario: "Клиентка перебивает мастера и пересказывает, что прочитала в интернете про уход.", question: "Как поступить?", options: [
    { id: "a", text: "Выслушать, уточнить, что именно волнует, и мягко объяснить своё мнение", scores: s(4, 5, 5, 4, 2, 1) },
    { id: "b", text: "Сказать, что интернет — не мастер, и продолжить процедуру", scores: s(1, 1, 2, 3, 1, 0) },
    { id: "c", text: "Молча дождаться, пока она закончит, и продолжить", scores: s(2, 3, 1, 3, 1, 0) },
  ] },
  { id: "aq_04", category_id: "admin_client", scenario: "Клиент записан на стрижку. Есть пакет «стрижка + уход» со скидкой.", question: "Как предложить?", options: [
    { id: "a", text: "Не предлагать — вдруг подумает, что навязываем", scores: s(2, 2, 1, 2, 1, 0) },
    { id: "b", text: "«После стрижки волосам почти наверняка понадобится уход — в пакете выйдет выгоднее и быстрее. Рассказать?»", scores: s(4, 3, 5, 3, 2, 5) },
    { id: "c", text: "Сразу оформить пакет и сообщить итоговую сумму", scores: s(0, 1, 2, 2, 1, 3) },
  ] },
  { id: "aq_05", category_id: "master_admin", scenario: "Коллега постоянно опаздывает, и вам приходится брать его клиентов.", question: "Что вы сделаете?", options: [
    { id: "a", text: "Пожалуюсь руководителю", scores: s(1, 1, 2, 2, 2, 0) },
    { id: "b", text: "Спокойно поговорю с коллегой наедине, опишу, как это влияет на работу, и предложу договориться", scores: s(4, 4, 4, 4, 5, 1) },
    { id: "c", text: "Буду молча терпеть", scores: s(2, 1, 0, 1, 2, 0) },
    { id: "d", text: "Выскажу ему при клиентах", scores: s(0, 0, 1, 0, 0, 0) },
  ] },
  { id: "aq_06", category_id: "client_master", scenario: "Клиентка недовольна ценой окрашивания: «У вас дороже, чем везде!».", question: "Ваш ответ?", options: [
    { id: "a", text: "«Это не я устанавливаю цены»", scores: s(1, 1, 0, 2, 0, 0) },
    { id: "b", text: "«Понимаю, сумма ощутимая. Давайте покажу, из чего она складывается и какие есть варианты»", scores: s(5, 4, 5, 4, 2, 4) },
    { id: "c", text: "Предложу скидку, чтобы он не ушёл", scores: s(3, 2, 1, 2, 1, 2) },
  ] },
  { id: "aq_07", category_id: "group", scenario: "У стойки администратора очередь, звонит телефон, и подходит недовольный клиент.", question: "Как вы действуете?", options: [
    { id: "a", text: "Попрошу коллегу взять телефон, улыбнусь очереди и займусь клиентом", scores: s(4, 3, 3, 5, 5, 1) },
    { id: "b", text: "Буду пытаться сделать всё сразу сам(а)", scores: s(2, 1, 1, 1, 0, 0) },
    { id: "c", text: "Попрошу всех подождать и уйду на минуту успокоиться", scores: s(1, 1, 1, 2, 1, 0) },
  ] },
  { id: "aq_08", category_id: "client_master", scenario: "Клиентка в зоне ожидания жалуется, что ей «никто ничего не объясняет» о задержке мастера.", question: "Что лучше ответить?", options: [
    { id: "a", text: "«Это не ко мне, спрашивайте администратора»", scores: s(0, 1, 1, 2, 0, 0) },
    { id: "b", text: "«Понимаю, неизвестность тревожит. Я уточню у мастера и через 2 минуты скажу точное время»", scores: s(5, 4, 3, 4, 5, 0) },
    { id: "c", text: "Скажу «скоро» без уточнения", scores: s(3, 2, 1, 2, 1, 0) },
  ] },
  { id: "aq_09", category_id: "leader_master", scenario: "Руководитель вводит новый регламент, сотрудники недовольны.", question: "Как вы (как руководитель) донесёте изменения?", options: [
    { id: "a", text: "Разошлю приказ — обсуждать нечего", scores: s(0, 0, 2, 3, 0, 0) },
    { id: "b", text: "Соберу команду, объясню причины, выслушаю опасения и договорюсь о пробном периоде", scores: s(4, 5, 5, 4, 5, 1) },
    { id: "c", text: "Отложу внедрение, чтобы не было конфликта", scores: s(2, 2, 0, 1, 2, 0) },
  ] },
  { id: "aq_10", category_id: "master_client", scenario: "Заказанная краска задерживается на день, клиентка звонит уже третий раз.", question: "Ваш ответ?", options: [
    { id: "a", text: "«Готово будет, когда будет»", scores: s(0, 0, 0, 1, 0, 0) },
    { id: "b", text: "«Извините за ожидание. Краска будет завтра до 12:00 — я лично напишу вам и предложу удобное время»", scores: s(5, 3, 4, 4, 3, 2) },
    { id: "c", text: "Скажу, что всё будет сегодня, чтобы он успокоился", scores: s(2, 1, 1, 2, 1, 0) },
  ] },
  { id: "aq_11", category_id: "master_master", scenario: "Коллега задерживает предыдущую процедуру, ваша клиентка уже ждёт 15 минут.", question: "Что вы сделаете?", options: [
    { id: "a", text: "Предупреждаю клиентку, предлагаю чай и точное время; потом спокойно обсуждаю с коллегой", scores: s(4, 3, 4, 4, 5, 1) },
    { id: "b", text: "Отчитываю коллегу при всех", scores: s(0, 1, 1, 0, 0, 0) },
    { id: "c", text: "Ничего не делаю — это проблема коллеги", scores: s(1, 0, 0, 2, 0, 0) },
  ] },
  { id: "aq_12", category_id: "owner_staff", scenario: "Постоянный клиент оставил негативный отзыв в интернете.", question: "Как отреагировать?", options: [
    { id: "a", text: "Удалить отзыв или попросить удалить", scores: s(0, 0, 1, 1, 0, 0) },
    { id: "b", text: "Публично поблагодарить, извиниться, пригласить к личному разговору и решить проблему", scores: s(5, 4, 4, 4, 3, 3) },
    { id: "c", text: "Ответить фактами, почему клиент неправ", scores: s(1, 1, 3, 2, 1, 0) },
  ] },
];

export const LEVELS = {
  beginner: "Начинающий",
  intermediate: "Уверенный",
  advanced: "Продвинутый",
  expert: "Эксперт",
} as const;
export type Level = keyof typeof LEVELS;

export function levelOf(avg: number): Level {
  if (avg < 2.5) return "beginner";
  if (avg < 3.5) return "intermediate";
  if (avg <= 4.5) return "advanced";
  return "expert";
}

export const overall = (sc: Scores) => {
  const v = CRITERIA.map(([k]) => sc[k]).filter((x): x is number => typeof x === "number");
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : 0;
};

/** Average each scale over all answered questions. */
export function scoreAnswers(answers: Record<string, string>): Scores {
  const out: Scores = {};
  for (const [k] of CRITERIA) {
    const vals = QUESTIONS.map((q) => q.options.find((o) => o.id === answers[q.id])?.scores[k]).filter((x): x is number => typeof x === "number");
    out[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
  }
  return out;
}

const label = (k: CriterionKey) => CRITERIA.find(([c]) => c === k)![1];

export function summary(sc: Scores) {
  const sorted = CRITERIA.map(([k]) => k).sort((a, b) => (sc[b] ?? 0) - (sc[a] ?? 0));
  return { strong: sorted.slice(0, 2).map(label), grow: sorted.slice(-2).reverse().map(label) };
}

export function deltas(prev: Scores, cur: Scores) {
  return CRITERIA.map(([k, l]) => ({ key: k, label: l, delta: Math.round(((cur[k] ?? 0) - (prev[k] ?? 0)) * 10) / 10 }));
}

export function deltaText(prev: Scores, cur: Scores): string {
  const d = deltas(prev, cur);
  const up = d.filter((x) => x.delta >= 0.3).sort((a, b) => b.delta - a.delta)[0];
  const down = d.filter((x) => x.delta <= -0.3).sort((a, b) => a.delta - b.delta)[0];
  const parts: string[] = [];
  if (up) parts.push(`${up.label} выросла на ${up.delta}.`);
  if (down) parts.push(`${down.label} просела на ${Math.abs(down.delta)} — обратите внимание.`);
  return parts.join(" ") || "Результат стабилен — без заметных изменений.";
}

/** Career ladder: from junior staff to owner; each step trains one rubric. */
export const LADDER = [
  { step: 1, title: "Мастер с клиентом", category_id: "master_client" },
  { step: 2, title: "Клиент и мастер", category_id: "client_master" },
  { step: 3, title: "Мастер в команде", category_id: "master_master" },
  { step: 4, title: "Администратор с клиентом", category_id: "admin_client" },
  { step: 5, title: "Клиент и салон", category_id: "client_salon" },
  { step: 6, title: "Администратор и мастера", category_id: "admin_master" },
  { step: 7, title: "Мастер и администратор", category_id: "master_admin" },
  { step: 8, title: "Управляющая", category_id: "manager_admin" },
  { step: 9, title: "Руководитель", category_id: "leader_master" },
  { step: 10, title: "Владелец салона", category_id: "owner_staff" },
] as const;
/** Minimum average score on a step's training to move up the ladder. */
export const LADDER_PASS = 3;
