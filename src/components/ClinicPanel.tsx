import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Clinic = { id: string; name: string; join_code: string };
type Stat = { user_id: string; display_name: string; email: string | null; member_role: string; is_leader: boolean; games: number; avg_score: number | null; solo_count: number; daily_done: number; scenarios: number };
type Scen = { id: string; title: string; rubric: string; author_name: string };

export function ClinicPanel({ view }: { view: "member" | "manager" }) {
  const [me, setMe] = useState<string>("");
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [role, setRole] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [scens, setScens] = useState<Scen[]>([]);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id; setMe(uid);
    const { data: m } = await supabase.from("clinic_members").select("clinic_id,role").eq("user_id", uid).maybeSingle();
    if (!m) { setClinic(null); setLoaded(true); return; }
    setRole(m.role);
    const { data: c } = await supabase.from("clinics").select("id,name,join_code").eq("id", m.clinic_id).single();
    setClinic(c);
    if (m.role === "manager") {
      const { data: s } = await supabase.rpc("clinic_stats", { _cid: m.clinic_id });
      setStats((s as Stat[]) ?? []);
      const { data: sc } = await supabase.from("user_scenarios").select("id,title,rubric,author_name").eq("clinic_id", m.clinic_id).order("created_at", { ascending: false });
      setScens(sc ?? []);
    }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc("join_clinic", { _code: code });
    if (error) { toast.error(error.message); return; }
    toast.success("Вы в салоне!"); load();
  };
  const act = async (uid: string, action: string) => {
    if (action === "remove" && !confirm("Убрать сотрудника из салона?")) return;
    const { error } = await supabase.rpc("clinic_manage_member", { _uid: uid, _action: action });
    if (error) { toast.error(error.message); return; }
    load();
  };
  const newCode = async () => { await supabase.rpc("clinic_new_code"); load(); };
  const delScen = async (id: string) => {
    if (!confirm("Удалить сценарий?")) return;
    await supabase.from("user_scenarios").delete().eq("id", id); load();
  };

  if (!loaded) return <p className="p-8 text-center">Загрузка…</p>;
  if (view === "manager" && (!clinic || role !== "manager"))
    return <p className="mx-auto max-w-md px-4 py-12 text-center text-muted-foreground">Эта страница доступна только руководителю салона.</p>;
  if (!clinic)
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <form onSubmit={join} className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">🏥 Подключиться к салоне</h1>
          <p className="text-sm text-muted-foreground">Введите код салона — его даёт руководитель.</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код салона" className="w-full rounded-md border border-input bg-background px-3 py-2 uppercase" />
            <button disabled={!code.trim()} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Войти</button>
          </div>
        </form>
      </main>
    );

  const btn = "rounded-md border border-input px-2 py-1 text-xs";
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 pb-24">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground">Моя салон</div>
        <h1 className="text-2xl font-bold">{clinic.name}</h1>
        {role === "manager" && view === "member" ? (
          <Link to="/manager" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">👑 Открыть панель руководителя</Link>
        ) : role === "manager" ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            Код для сотрудников: <b className="font-mono text-lg">{clinic.join_code}</b>
            <button onClick={newCode} className={btn}>Новый код</button>
            <Link to="/leader/onboarding" className="mt-2 inline-block rounded-md border border-border px-4 py-2 text-sm">📣 Как презентовать игру команде</Link>
          </div>
        ) : (
          <button onClick={async () => { await supabase.rpc("leave_clinic"); load(); }} className="mt-2 text-sm text-destructive">Выйти из салона</button>
        )}
      </div>

      {role === "manager" && view === "manager" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Сотрудники и статистика</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-1">Сотрудник</th><th>Игры</th><th>Ср. балл</th><th>С ИИ</th><th>Роль дня</th><th>Сценарии</th><th /></tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.user_id} className="border-t border-border align-top">
                      <td className="py-2">
                        <div className="font-medium">{s.display_name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                        <div className="text-xs">{s.member_role === "manager" ? "👑 Руководитель" : "Сотрудник"}{s.is_leader && " · 🎙️ Ведущий"}</div>
                      </td>
                      <td>{s.games}</td><td>{s.avg_score ?? "—"}</td><td>{s.solo_count}</td><td>{s.daily_done}</td><td>{s.scenarios}</td>
                      <td className="space-y-1 py-2 text-right">
                        {s.user_id !== me && (
                          <div className="flex flex-col items-end gap-1">
                            <button onClick={() => act(s.user_id, s.is_leader ? "revoke_leader" : "grant_leader")} className={btn}>{s.is_leader ? "Снять ведущего" : "Сделать ведущим"}</button>
                            <button onClick={() => act(s.user_id, s.member_role === "manager" ? "make_member" : "make_manager")} className={btn}>{s.member_role === "manager" ? "Снять руководителя" : "Сделать руководителем"}</button>
                            <button onClick={() => act(s.user_id, "remove")} className={`${btn} text-destructive`}>Убрать</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-1 font-semibold">Карточки салона</h2>
            <p className="mb-3 text-xs text-muted-foreground">Сценарии, которые добавили сотрудники салона. Новые — через «Добавить сценарий».</p>
            {scens.length === 0 && <p className="text-sm text-muted-foreground">Пока нет.</p>}
            {scens.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-t border-border py-2 text-sm">
                <div><div className="font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{s.rubric} · {s.author_name}</div></div>
                <button onClick={() => delScen(s.id)} className="text-xs text-destructive">Удалить</button>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
