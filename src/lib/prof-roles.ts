export const PROF_ROLES = [
  "SMM-специалист", "Маркетолог", "Администратор", "Старший администратор",
  "Мастер", "Мастер маникюра и педикюра", "Парикмахер-стилист", "Колорист", "Бровист", "Лешмейкер",
  "Визажист", "Массажист", "Топ-мастер", "Управляющая", "Руководитель",
  "Владелец салона", "Владелец сети студий", "Другое",
] as const;
export const PLAY_SCOPES = [
  { id: "own", label: "Только свою профессиональную роль" },
  { id: "all", label: "Также роли коллег и других сотрудников" },
] as const;

/** Rubrics (category ids) where a professional role is the one speaking/acting. */
const MASTER = ["master_client", "client_master", "master_master", "master_admin", "leader_master", "admin_master"];
const ADMIN = ["admin_client", "client_admin", "client_salon", "admin_master", "master_admin", "manager_admin"];
export const ROLE_CATEGORIES: Record<string, string[]> = {
  "Мастер": MASTER,
  "Мастер маникюра и педикюра": MASTER,
  "Парикмахер-стилист": MASTER,
  "Колорист": MASTER,
  "Бровист": MASTER,
  "Лешмейкер": MASTER,
  "Визажист": MASTER,
  "Массажист": MASTER,
  "Топ-мастер": MASTER,
  "Администратор": ADMIN,
  "Старший администратор": [...ADMIN, "owner_staff"],
  "SMM-специалист": ["client_salon", "admin_client", "client_admin"],
  "Маркетолог": ["client_salon", "admin_client", "client_admin"],
  "Управляющая": ["manager_admin", "owner_staff", "client_salon"],
  "Руководитель": ["leader_master", "owner_staff", "manager_admin"],
  "Владелец салона": ["owner_staff", "client_salon"],
  "Владелец сети студий": ["owner_staff", "client_salon", "manager_admin", "leader_master"],
};

/** Categories a player may train on; null = no restriction. Group scenarios are open to everyone. */
export function allowedCategories(ownRole: string | null, extraRoles: string[]): Set<string> | null {
  const roles = [ownRole, ...extraRoles].filter((r): r is string => !!r && !!ROLE_CATEGORIES[r]);
  if (!roles.length) return null;
  return new Set<string>(["group", ...roles.flatMap((r) => ROLE_CATEGORIES[r] ?? [])]);
}
