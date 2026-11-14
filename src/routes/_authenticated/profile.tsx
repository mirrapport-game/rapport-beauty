import { PROF_ROLES, PLAY_SCOPES } from "@/lib/prof-roles";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { GAME_TITLE } from "@/lib/game";
import { useProgress } from "@/lib/use-progress";
import { ProgressSummary } from "@/components/ProgressBlocks";
import { DailyPrefs } from "@/components/DailyBlocks";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: `Профиль — ${GAME_TITLE}` }] }),
  component: Profile,
});

const field = "w-full rounded-md border border-input bg-background px-3 py-2";

function Profile() {
  const { user } = useUser();
  const { roles } = useRoles();
  const [p, setP] = useState({ display_name: "", city: "", clinic: "", avatar_url: "", prof_role: "", play_scope: "all" });
  const [theme, setTheme] = useState<Theme>("light");
  const [providers, setProviders] = useState<string[]>([]);
  const progress = useProgress(user?.id);

  useEffect(() => setTheme(currentTheme()), []);
  useEffect(() => {
    if (!user) return;
    setProviders((user.identities ?? []).map((i) => i.provider));
    supabase.from("profiles").select("display_name,city,clinic,avatar_url,prof_role,play_scope").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setP({ display_name: data.display_name, city: data.city ?? "", clinic: data.clinic ?? "", avatar_url: data.avatar_url ?? "", prof_role: data.prof_role ?? "", play_scope: data.play_scope });
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ ...p, prof_role: p.prof_role || null, updated_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) toast.error("Не удалось сохранить");
    else toast.success("Профиль сохранён");
  };
  const linkGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: window.location.href } });
    if (error) toast.error("Привязка Google сейчас недоступна");
  };

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold">Профиль</h1>
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-2xl font-bold">
            {p.avatar_url ? <img src={p.avatar_url} alt="Аватар" className="h-full w-full object-cover" /> : (p.display_name[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 text-sm text-muted-foreground">{user?.email}</div>
        </div>
        <label className="block text-sm font-medium">Имя (видно в игре)<input value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} className={field} /></label>
        <label className="block text-sm font-medium">Город<input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} className={field} /></label>
        <label className="block text-sm font-medium">Салон<input value={p.clinic} onChange={(e) => setP({ ...p, clinic: e.target.value })} className={field} /></label>
        <label className="block text-sm font-medium">Моя роль в салоне
          <select value={p.prof_role} onChange={(e) => setP({ ...p, prof_role: e.target.value })} className={field}>
            <option value="">Не выбрана</option>
            {PROF_ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium">Какие роли хочу проигрывать</legend>
          {PLAY_SCOPES.map((o) => (
            <label key={o.id} className="flex items-center gap-2">
              <input type="radio" name="scope" checked={p.play_scope === o.id} onChange={() => setP({ ...p, play_scope: o.id })} />{o.label}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm font-medium">Ссылка на фото<input value={p.avatar_url} onChange={(e) => setP({ ...p, avatar_url: e.target.value })} placeholder="https://…" className={field} /></label>
        <button className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground">Сохранить</button>
      </form>
      <ProgressSummary p={progress} />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Тема</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["light", "dark"] as Theme[]).map((t) => (
            <button key={t} onClick={() => { applyTheme(t); setTheme(t); }}
              className={`rounded-md border py-2 ${theme === t ? "border-primary bg-accent font-medium" : "border-input"}`}>
              {t === "light" ? "☀️ Светлая" : "🌙 Тёмная"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Способы входа</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between"><span>Email</span><span>{providers.includes("email") ? "✅ привязан" : "—"}</span></li>
          <li className="flex items-center justify-between"><span>Google</span>
            {providers.includes("google") ? <span>✅ привязан</span> : <button onClick={linkGoogle} className="text-primary">Привязать</button>}
          </li>
          {["Яндекс ID", "VK ID", "Telegram"].map((n) => (
            <li key={n} className="flex justify-between text-muted-foreground"><span>{n}</span><span>скоро</span></li>
          ))}
        </ul>
      </div>
      {user && <DailyPrefs userId={user.id} />}
    </main>
  );
}
