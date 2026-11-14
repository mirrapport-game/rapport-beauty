// Player-facing rubric names; the first side is the one who is right.
const LABELS: Record<string, string> = {
  master_client: "Мастер — Клиент",
  client_master: "Клиент — Мастер",
  client_salon: "Клиент — Салон",
  client_admin: "Клиент — Администратор",
  admin_client: "Администратор — Клиент",
  master_master: "Мастер — Мастер",
  admin_master: "Администратор — Мастер",
  master_admin: "Мастер — Администратор",
  owner_staff: "Владелец — Сотрудники",
  manager_admin: "Управляющая — Администратор",
  leader_master: "Руководитель — Мастер",
  team_group: "Групповые сценарии",
  team_cases: "Командные кейсы",
  admin_client_m: "Администратор — Клиент-мужчина",
  master_client_m: "Мастер — Клиент-мужчина",
  cosmo_client: "Косметолог — Клиент",
};
const RIGHT: Record<string, string> = {
  master_master: "Мастера спорят между собой — ищите правых по ситуации",
  team_group: "Решаете всей командой",
  team_cases: "Решаете всей командой за 5 минут",
};

type C = { id: string; title: string };
export function rubricLabel(c: C): string {
  return LABELS[c.id] ?? c.title.replace("→", "—");
}
export function rubricHint(c: C): string {
  const r = RIGHT[c.id];
  if (r) return r;
  const first = rubricLabel(c).split("—")[0]?.trim() ?? "";
  return `Прав ${first.toLowerCase()}`;
}
