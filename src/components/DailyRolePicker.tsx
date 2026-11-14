import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";

/** Home block: participant picks a role and lives it today (morning / day / evening questions). */
export function DailyRolePicker() {
  const { user } = useUser();
  const nav = useNavigate();
  const [roles, setRoles] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [today, setToday] = useState<{ id: string; role_id: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("daily_roles").select("id, title, description").eq("is_active", true).order("id").then(({ data }) => setRoles(data ?? []));
    const d = new Date().toLocaleDateString("sv-SE");
    supabase.from("daily_cards").select("id, role_id").eq("user_id", user.id).eq("issued_date", d).maybeSingle()
      .then(({ data }) => setToday(data as any));
  }, [user]);

  const pick = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("choose_daily_role", { _role: id });
    setBusy(false);
    if (error || !data) {
      toast.error("Не удалось выбрать роль");
      return;
    }
    void nav({ to: "/daily/$cardId", params: { cardId: data as string } });
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-bold">🎭 Роль дня</h2>
      <p className="mt-1 text-sm text-muted-foreground">Выберите роль и проживите её сегодня: вопрос утром, днём и вечером — с обратной связью от ИИ.</p>
      {!user ? (
        <Link to="/auth" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">Войти и выбрать роль</Link>
      ) : (
        <>
          {today && (
            <Link to="/daily/$cardId" params={{ cardId: today.id }} className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
              Продолжить сегодняшнюю роль: {roles.find((r) => r.id === today.role_id)?.title ?? "…"}
            </Link>
          )}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {roles.map((r) => (
              <button key={r.id} disabled={busy} onClick={() => pick(r.id)}
                className={`min-w-48 shrink-0 rounded-xl border p-3 text-left text-sm transition hover:shadow-md ${today?.role_id === r.id ? "border-primary bg-accent" : "border-border bg-background"}`}>
                <div className="font-semibold">{r.title}</div>
                {r.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
