import { CRITERIA, type CriterionKey, type Scores } from "@/lib/feedback";

export type DailyMode = "my_role" | "random" | "career";

export const MODE_INFO: Record<DailyMode, { icon: string; title: string; text: string }> = {
  my_role: { icon: "🎯", title: "Моя роль", text: "Выберите свою должность — каждый день будет открываться карточка с заданием для неё. Отвечайте в диалоге и прокачивайте свои навыки коммуникации." },
  random: { icon: "🎲", title: "Рандомная роль", text: "Каждый день выпадает случайная роль — от помощника мастера до владельца. Тренируйтесь смотреть на ситуацию глазами коллег." },
  career: { icon: "🪜", title: "Карьерная лестница", text: "Задача — пройти путь от помощника мастера до владельца сети салонов и студий красоты. Ответили на задание дня — завтра поднимаетесь на ступень выше." },
};

/** Career ladder step → daily role played that day. */
export const CAREER_ROLES = [
  "dr_sanitary", "dr_junior", "dr_driver", "dr_admin", "dr_lab_nurse",
  "dr_checkup_doc", "dr_therapist", "dr_accountant", "dr_head", "dr_owner",
] as const;

/** Role for a new day. `rnd` in [0,1) makes random choice testable. */
export function roleForToday(mode: DailyMode, opts: { myRole?: string | null; careerStep?: number; roles: string[]; rnd?: number }): string | null {
  const { roles } = opts;
  if (!roles.length) return null;
  if (mode === "my_role") return opts.myRole && roles.includes(opts.myRole) ? opts.myRole : null;
  if (mode === "career") {
    const step = Math.min(Math.max(opts.careerStep ?? 1, 1), CAREER_ROLES.length);
    return CAREER_ROLES[step - 1] ?? null;
  }
  const r = opts.rnd ?? Math.random();
  return roles[Math.floor(r * roles.length) % roles.length] ?? null;
}

/** Quick situation rubrics per daily role: the daily "Быстрая ситуация" comes from the player's role. */
export const ROLE_QUICK_CATEGORIES: Record<string, string[]> = {
  dr_sanitary: ["master_client", "client_master", "master_master"],
  dr_junior: ["master_client", "client_master", "master_master", "master_admin"],
  dr_driver: ["master_client", "client_master", "master_admin", "master_master"],
  dr_admin: ["admin_client", "client_admin", "group", "admin_master"],
  dr_lab_nurse: ["admin_client", "client_admin", "admin_master", "group"],
  dr_accountant: ["admin_master", "leader_master", "group", "master_admin"],
  dr_head: ["leader_master", "owner_staff", "group"],
  dr_owner: ["owner_staff", "leader_master", "group"],
  dr_checkup_doc: ["client_admin", "client_master", "owner_staff"],
  dr_therapist: ["client_admin", "client_master", "owner_staff"],
};

/** Questions for the player's role; falls back to the full pool when the role has no mapped situations. */
export function quickQuestionsFor<T extends { category_id: string }>(roleId: string | null | undefined, all: T[]): T[] {
  const cats = roleId ? ROLE_QUICK_CATEGORIES[roleId] : undefined;
  const pool = cats?.length ? all.filter((q) => cats.includes(q.category_id)) : [];
  return pool.length ? pool : all;
}

/** Stable index for a seed string — same player gets the same situation all day. */
export function dayIndex(seed: string, n: number): number {
  if (n <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

/** Weakest criterion (what to work on). */
export function weakest(sc: Scores): CriterionKey | null {
  let best: [CriterionKey, number] | null = null;
  for (const [k] of CRITERIA) {
    const v = sc[k];
    if (typeof v === "number" && (!best || v < best[1])) best = [k, v];
  }
  return best?.[0] ?? null;
}
