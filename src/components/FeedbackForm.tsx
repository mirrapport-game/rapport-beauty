import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CRITERIA, type Scores } from "@/lib/feedback";

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((v) => (
        <button type="button" key={v} onClick={() => onChange(v)} aria-label={`${v}`}
          className={`h-10 w-10 rounded-full text-xl leading-none ${v <= value ? "text-primary" : "text-muted-foreground/40"}`}>★</button>
      ))}
    </div>
  );
}

export function FeedbackForm({ sessionId, turnNo, to, toName, fromName, fromRole, onSent }: {
  sessionId: string; turnNo: number; to: string; toName?: string | undefined; fromName: string; fromRole: "participant" | "leader"; onSent?: () => void;
}) {
  const [scores, setScores] = useState<Scores>(Object.fromEntries(CRITERIA.map(([k]) => [k, 3])));
  const [overall, setOverall] = useState(3);
  const [good, setGood] = useState("");
  const [improve, setImprove] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      session_id: sessionId, turn_no: turnNo, to_participant: to, from_name: fromName, from_role: fromRole,
      scores, overall_rating: overall, good, improve,
      score_contact: scores.listening ?? null, score_empathy: scores.empathy ?? null, score_solution: scores.argumentation ?? null,
    });
    setBusy(false);
    if (error) { toast.error("Не отправилось"); return; }
    toast.success("Фидбэк отправлен");
    setGood(""); setImprove("");
    onSent?.();
  };

  return (
    <form onSubmit={send} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Обратная связь{toName ? `: ${toName}` : " игроку"}</h3>
      {CRITERIA.map(([k, l]) => (
        <div key={k} className="flex flex-wrap items-center justify-between gap-1">
          <span>{l}</span>
          <Stars value={scores[k] ?? 0} onChange={(v) => setScores({ ...scores, [k]: v })} />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border pt-3 font-medium">
        <span>Общая оценка</span>
        <Stars value={overall} onChange={setOverall} />
      </div>
      <textarea value={good} onChange={(e) => setGood(e.target.value)} placeholder="Что получилось" className="w-full rounded-md border border-input bg-background p-2" />
      <textarea value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="Что улучшить" className="w-full rounded-md border border-input bg-background p-2" />
      <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-50">Отправить</button>
    </form>
  );
}
