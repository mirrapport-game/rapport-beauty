import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLiveSession } from "@/lib/session";
import { CRITERIA, type Scores } from "@/lib/feedback";
import { buildResults } from "@/components/LeaderReview";
import { download, toCsv } from "@/lib/library";
import { avgScores, mean } from "@/lib/feedback";

export const Route = createFileRoute("/_authenticated/leader/$id_/export")({
  head: () => ({ meta: [{ title: "Отчёт по сессии — Раппорт" }] }),
  component: ExportSession,
});

type Turn = { participant_id: string; card_type: string; card: { title: string; task?: string | null; example_dialogue?: string | null } };

function ExportSession() {
  const { id } = Route.useParams();
  const { session: s, participants, feedback, loaded } = useLiveSession(id);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [leader, setLeader] = useState("");
  const [cats, setCats] = useState<string>("");

  useEffect(() => {
    if (!s) return;
    Promise.all(Array.from({ length: s.turn_no }, (_, i) => supabase.rpc("session_cards", { _sid: id, _turn: i + 1 })))
      .then((rs) => setTurns(rs.flatMap((r) => (r.data as unknown as Turn[]) ?? [])));
    supabase.from("profiles").select("display_name").eq("id", s.leader_id).maybeSingle().then(({ data }) => setLeader(data?.display_name ?? ""));
    const ids = (s.category_ids as string[]) ?? [];
    if (ids.length) supabase.from("categories").select("title").in("id", ids).then(({ data }) => setCats((data ?? []).map((c) => c.title).join(", ")));
    else setCats("Все рубрики");
  }, [s?.id, s?.turn_no]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <p className="p-8">Загрузка…</p>;
  if (!s) return <p className="p-8">Сессия не найдена.</p>;

  const results = buildResults(participants, feedback);
  const cardsOf = (pid: string, t: string) => turns.filter((x) => x.participant_id === pid && x.card_type === t).map((x) => x.card);
  const group = avgScores(feedback.map((f) => f.scores as Scores));
  const top = [...results].filter((r) => r.overall != null).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 3);
  const nameOf = (pid: string) => participants.find((p) => p.id === pid)?.display_name ?? "";

  const csv = () => {
    const rows = feedback.map((f) => {
      const pid = f.to_participant;
      return {
        participant: nameOf(pid), from: f.from_name, role: cardsOf(pid, "role").map((c) => c.title).join("; ") || s.turn_role || "",
        situation: cardsOf(pid, "situation").map((c) => c.title).join("; "), skill: cardsOf(pid, "skill").map((c) => c.title).join("; "),
        solution: cardsOf(pid, "solution").map((c) => c.task ?? c.title).join("; "),
        ...Object.fromEntries(CRITERIA.map(([k]) => [k, (f.scores as Scores)?.[k] ?? ""])),
        overall: f.overall_rating ?? "", what_worked: f.good ?? "", what_to_improve: f.improve ?? "",
      };
    });
    const cols = ["participant", "from", "role", "situation", "skill", "solution", ...CRITERIA.map(([k]) => k), "overall", "what_worked", "what_to_improve"];
    download(`session_${s.code}.csv`, toCsv(rows, cols), "text/csv");
    toast.success("Отчёт скачан");
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-24 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/leader/$id" params={{ id }} className="text-sm text-primary">← К панели</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">📄 Сохранить PDF</button>
          <button onClick={csv} className="rounded-md border border-input px-4 py-2 text-sm">📊 Скачать CSV</button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground print:hidden">Ниже — превью отчёта. «Сохранить PDF» открывает печать: выберите «Сохранить как PDF».</p>

      <article className="space-y-5 rounded-2xl border border-border bg-card p-6 print:border-0">
        <header>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <div className="text-sm text-muted-foreground">
            {new Date(s.created_at).toLocaleDateString("ru-RU")} · Ведущий: {leader || "—"} · {cats} · Код {s.code}
          </div>
        </header>

        <section>
          <h2 className="mb-2 font-semibold">Участники</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Имя</th><th>Роль</th><th>Ситуация</th><th>Навык</th><th>Решение</th></tr></thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="py-1.5 font-medium">{p.display_name}</td>
                  <td>{cardsOf(p.id, "role").map((c) => c.title).join(", ") || "—"}</td>
                  <td>{cardsOf(p.id, "situation").map((c) => c.title).join(", ") || "—"}</td>
                  <td>{cardsOf(p.id, "skill").map((c) => c.title).join(", ") || "—"}</td>
                  <td>{cardsOf(p.id, "solution").map((c) => c.task ?? c.title).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Оценки (средние)</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Участник</th>{CRITERIA.map(([k, l]) => <th key={k}>{l}</th>)}<th>Общая</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-border"><td className="py-1.5">{r.name}</td>{CRITERIA.map(([k]) => <td key={k}>{r.scores[k] ?? "—"}</td>)}<td className="font-semibold">{r.overall ?? "—"}</td></tr>
              ))}
              <tr className="border-t-2 border-border font-semibold"><td className="py-1.5">Группа</td>{CRITERIA.map(([k]) => <td key={k}>{group[k] ?? "—"}</td>)}<td>{mean(feedback.map((f) => f.overall_rating)) ?? "—"}</td></tr>
            </tbody>
          </table>
        </section>

        {top.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">Лучшие по общей оценке</h2>
            <ol className="list-decimal pl-5 text-sm">{top.map((r) => <li key={r.id}>{r.name} — {r.overall}</li>)}</ol>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-semibold">Комментарии</h2>
          {feedback.length === 0 ? <p className="text-sm text-muted-foreground">Пока нет фидбэка.</p> : (
            <div className="space-y-2 text-sm">
              {feedback.map((f) => (
                <div key={f.id} className="break-inside-avoid border-t border-border pt-2">
                  <b>{nameOf(f.to_participant)}</b> ← {s.feedback_anonymous && f.from_role !== "leader" ? "участник" : f.from_name}{f.overall_rating ? ` · ★ ${f.overall_rating}` : ""}
                  {f.good && <div>✅ {f.good}</div>}
                  {f.improve && <div>🔧 {f.improve}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
