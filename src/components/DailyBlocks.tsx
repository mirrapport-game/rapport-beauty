import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Dashboard card: issues today's card on open (if enabled) and links to it. */
export function DailyCardTile() {
  const [state, setState] = useState<{ id: string; status: string; streak: number; title: string; phrase: string } | null | "off">(null);
  useEffect(() => {
    (async () => {
      const { data: id } = await supabase.rpc("issue_my_daily_card");
      if (!id) return setState("off");
      const { data: c } = await supabase.from("daily_cards").select("id, status, streak_day, role_id").eq("id", id).maybeSingle();
      if (!c) return setState("off");
      const [r, x] = await Promise.all([
        supabase.from("daily_roles").select("title").eq("id", c.role_id!).maybeSingle(),
        supabase.from("daily_role_context").select("key_phrase").eq("role_id", c.role_id!).maybeSingle(),
      ]);
      setState({ id: c.id, status: c.status, streak: c.streak_day, title: r.data?.title ?? "", phrase: x.data?.key_phrase ?? "" });
    })();
  }, []);
  if (state === null) return null;
  if (state === "off")
    return (
      <Link to="/profile" className="block rounded-2xl border border-dashed border-border bg-card p-4 text-sm shadow-sm">
        🎭 <b>Роль дня</b> выключена — включите в профиле, чтобы каждый день получать короткое задание.
      </Link>
    );
  if (state.status === "answered")
    return (
      <Link to="/daily/history" className="block rounded-2xl border border-border bg-card p-4 shadow-sm">
        Сегодняшняя роль дня выполнена ✅ <span className="ml-2 font-semibold">🔥 {state.streak}</span>
      </Link>
    );
  return (
    <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm animate-in fade-in zoom-in-95">
      <div className="text-xs uppercase opacity-80">🎭 Роль дня · 🔥 {state.streak}</div>
      <div className="text-xl font-bold">{state.title}</div>
      <p className="mt-1 italic opacity-90">«{state.phrase}»</p>
      <Link to="/daily/$cardId" params={{ cardId: state.id }} className="mt-3 inline-block rounded-md bg-background px-4 py-2 font-semibold text-foreground">Открыть</Link>
    </div>
  );
}

const TZ = ["Europe/Kaliningrad", "Europe/Moscow", "Europe/Samara", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Yakutsk", "Asia/Vladivostok", "Asia/Magadan", "Asia/Kamchatka"];

/** Profile block: on/off, roles, timezone, time. */
export function DailyPrefs({ userId }: { userId: string }) {
  const [roles, setRoles] = useState<{ id: string; title: string }[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [tz, setTz] = useState("Europe/Moscow");
  const [time, setTime] = useState("08:00");
  useEffect(() => {
    supabase.from("daily_roles").select("id, title").eq("is_active", true).order("title").then(({ data }) => setRoles(data ?? []));
    supabase.from("user_daily_preferences").select("*").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setEnabled(data.enabled); setSel((data.role_ids as string[] | null) ?? []); setTz(data.timezone); setTime(data.preferred_time.slice(0, 5));
    });
  }, [userId]);
  const save = async () => {
    const { error } = await supabase.from("user_daily_preferences").upsert({ user_id: userId, enabled, role_ids: sel.length ? sel : null, timezone: tz, preferred_time: time });
    if (error) toast.error(error.message); else toast.success("Сохранено");
  };
  const field = "rounded-md border border-input bg-background px-3 py-2";
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold">🎭 Роль дня</h2>
      <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Получать роль дня</label>
      <div>
        <div className="mb-1 text-sm text-muted-foreground">Роли (ничего не выбрано — все)</div>
        <div className="flex flex-wrap gap-1.5">
          {roles.map((r) => {
            const on = sel.includes(r.id);
            return (
              <button key={r.id} type="button" onClick={() => setSel((s) => (on ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{r.title}</button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={field} value={tz} onChange={(e) => setTz(e.target.value)}>{TZ.map((z) => <option key={z}>{z}</option>)}</select>
        <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <button onClick={save} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Сохранить</button>
    </section>
  );
}
