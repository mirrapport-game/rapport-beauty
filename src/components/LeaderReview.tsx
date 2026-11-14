import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { CRITERIA, avgScores, mean, type Scores } from "@/lib/feedback";
import type { Feedback, GameSession, Participant } from "@/lib/session";

export type ResultRow = { id: string; name: string; scores: Scores; overall: number | null; count: number };

export function buildResults(participants: Participant[], feedback: Feedback[]): ResultRow[] {
  return participants.map((p) => {
    const fs = feedback.filter((f) => f.to_participant === p.id);
    return { id: p.id, name: p.display_name, scores: avgScores(fs.map((f) => f.scores as Scores)), overall: mean(fs.map((f) => f.overall_rating)), count: fs.length };
  });
}

export function LeaderReview({ s, participants, feedback, leaderName, onToggleAnon }: {
  s: GameSession; participants: Participant[]; feedback: Feedback[]; leaderName: string; onToggleAnon: () => void;
}) {
  const [tab, setTab] = useState<"fb" | "res">("fb");
  const [to, setTo] = useState(s.current_participant ?? "");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: "overall", dir: -1 });
  const rows = useMemo(() => buildResults(participants, feedback), [participants, feedback]);
  const sorted = [...rows].sort((a, b) => {
    const va = sort.k === "name" ? a.name : sort.k === "overall" ? a.overall ?? -1 : a.scores[sort.k as keyof Scores] ?? -1;
    const vb = sort.k === "name" ? b.name : sort.k === "overall" ? b.overall ?? -1 : b.scores[sort.k as keyof Scores] ?? -1;
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  });
  const group = avgScores(feedback.map((f) => f.scores as Scores));
  const groupOverall = mean(feedback.map((f) => f.overall_rating));
  const target = to || s.current_participant || "";
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.display_name ?? "—";
  const th = (k: string, l: string) => (
    <th onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : -1 })} className="cursor-pointer whitespace-nowrap px-2 py-2 text-left font-medium">
      {l}{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {([["fb", "Обратная связь"], ["res", "Результаты"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-sm ${tab === k ? "bg-primary text-primary-foreground" : "border border-input"}`}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={s.feedback_anonymous} onChange={onToggleAnon} />Анонимный фидбэк</label>
          <Link to="/leader/$id/export" params={{ id: s.id }} className="rounded-md border border-input px-3 py-1">📄 Экспорт PDF / CSV</Link>
        </div>
      </div>

      {tab === "fb" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <select value={target} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
              <option value="">— участник —</option>
              {participants.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
            {target && <FeedbackForm key={target} sessionId={s.id} turnNo={s.turn_no} to={target} toName={nameOf(target)} fromName={leaderName} fromRole="leader" />}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Оставленный фидбэк ({feedback.length})</h3>
            {feedback.length === 0 && <p className="text-sm text-muted-foreground">Пока нет фидбэка.</p>}
            <div className="max-h-[32rem] space-y-2 overflow-auto">
              {[...feedback].reverse().map((f) => (
                <div key={f.id} className="rounded-lg bg-muted p-3 text-sm">
                  <div><b>{f.from_name || "—"}</b>{f.from_role === "leader" ? " (ведущий)" : ""} → {nameOf(f.to_participant)} · ход #{f.turn_no}{f.overall_rating ? ` · ★ ${f.overall_rating}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{CRITERIA.map(([k, l]) => (f.scores as Scores)?.[k] ? `${l} ${(f.scores as Scores)[k]}` : null).filter(Boolean).join(" · ")}</div>
                  {(f.good || f.improve) && <div className="mt-1">{f.good && `✅ ${f.good} `}{f.improve && `🔧 ${f.improve}`}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.every((r) => r.count === 0) ? <p className="text-sm text-muted-foreground">Пока нет фидбэка — результаты появятся после первых оценок.</p> : (
            <>
              <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted"><tr>{th("name", "Участник")}{CRITERIA.map(([k, l]) => th(k, l))}{th("overall", "Общая")}</tr></thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-1.5 font-medium">{r.name} <span className="text-xs text-muted-foreground">({r.count})</span></td>
                        {CRITERIA.map(([k]) => <td key={k} className="px-2 tabular-nums">{r.scores[k] ?? "—"}</td>)}
                        <td className="px-2 font-semibold tabular-nums">{r.overall ?? "—"}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                      <td className="px-2 py-1.5">Группа</td>
                      {CRITERIA.map(([k]) => <td key={k} className="px-2 tabular-nums">{group[k] ?? "—"}</td>)}
                      <td className="px-2 tabular-nums">{groupOverall ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="font-semibold">Сильные стороны группы</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {CRITERIA.map(([k, l]) => {
                    const best = [...rows].filter((r) => r.scores[k] != null).sort((a, b) => (b.scores[k] ?? 0) - (a.scores[k] ?? 0))[0];
                    return best ? <div key={k} className="rounded-lg bg-muted p-2 text-sm"><div className="text-xs text-muted-foreground">{l}</div>{best.name} · {best.scores[k]}</div> : null;
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
