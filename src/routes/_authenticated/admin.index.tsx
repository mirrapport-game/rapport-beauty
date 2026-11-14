import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, type Role } from "@/hooks/use-roles";
import { GAME_TITLE } from "@/lib/game";
import { SaveOffline } from "@/components/SaveOffline";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: `Администратор — ${GAME_TITLE}` }] }),
  component: Admin,
});

type U = { id: string; display_name: string; email: string; clinic: string | null; roles: string[] };

function Admin() {
  const { is, loaded, user } = useRoles();
  const [list, setList] = useState<U[]>([]);
  const load = useCallback(() => {
    supabase.rpc("admin_list_users").then(({ data }) => setList((data as U[]) ?? []));
  }, []);
  useEffect(() => { if (is("admin")) load(); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <p className="p-8">Загрузка…</p>;
  if (!is("admin")) return <p className="p-8 text-center text-muted-foreground">Раздел доступен только администратору.</p>;

  const toggle = async (u: U, role: Role) => {
    const has = u.roles.includes(role);
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error) toast.error("Не удалось изменить роль");
    load();
  };

  return (
    <div className="space-y-5">
      <SaveOffline />
      <h1 className="text-2xl font-bold">Пользователи и роли</h1>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Пользователи и роли ({list.length})</h2>
        <div className="mt-3 divide-y divide-border">
          {list.map((u) => (
            <div key={u.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{u.display_name || "Без имени"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}{u.clinic ? ` · ${u.clinic}` : ""}</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {(["leader", "admin"] as Role[]).map((r) => (
                  <button key={r} disabled={r === "admin" && u.id === user?.id} onClick={() => toggle(u, r)}
                    className={`rounded-full px-3 py-1 text-xs ${u.roles.includes(r) ? "bg-primary text-primary-foreground" : "border border-input"}`}>
                    {r === "leader" ? "Ведущий" : "Админ"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
