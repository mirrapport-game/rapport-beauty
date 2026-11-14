import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-roles";
import { GAME_TITLE } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: `Администратор — ${GAME_TITLE}` }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Пользователи" },
  { to: "/admin/clinics", label: "Салона" },
  { to: "/admin/cards", label: "Карточки" },
  { to: "/admin/import", label: "Импорт" },
  { to: "/admin/export", label: "Экспорт" },
  { to: "/admin/categories", label: "Рубрики" },
  { to: "/admin/analytics", label: "Аналитика" },
  { to: "/admin/analytics/sessions", label: "Все сессии" },
  { to: "/admin/analytics/users", label: "Пользователи: итоги" },
  { to: "/admin/achievements", label: "Достижения" },
] as const;

function AdminLayout() {
  const { is, loaded } = useRoles();
  if (!loaded) return <p className="p-8">Загрузка…</p>;
  if (!is("admin")) return <p className="p-8 text-center text-muted-foreground">Раздел доступен только администратору.</p>;
  return (
    <div className="mx-auto max-w-6xl gap-6 px-4 py-6 pb-24 md:grid md:grid-cols-[180px_minmax(0,1fr)]">
      <nav className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:mb-0 md:flex-col md:px-0">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/admin" || n.to === "/admin/analytics" }}
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            activeProps={{ className: "bg-primary/10 font-semibold text-primary" }}>
            {n.label}
          </Link>
        ))}
      </nav>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}
