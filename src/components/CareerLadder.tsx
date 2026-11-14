import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LADDER } from "@/lib/assessment";
import { LADDER_SCREEN } from "@/lib/copy";

export type LadderRow = { current_step: number; completed_steps: number[]; scores_by_step: Record<string, number>; role_mode: string };

export function useLadder() {
  const [row, setRow] = useState<LadderRow | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUid(user.id);
      const { data } = await supabase.from("career_ladder_progress").select("current_step, completed_steps, scores_by_step, role_mode").eq("user_id", user.id).maybeSingle();
      setRow((data as LadderRow) ?? { current_step: 1, completed_steps: [], scores_by_step: {}, role_mode: "my_role" });
    });
  }, []);
  const save = async (patch: Partial<LadderRow>) => {
    if (!uid || !row) return;
    const next = { ...row, ...patch };
    setRow(next);
    await supabase.from("career_ladder_progress").upsert({ user_id: uid, ...next, updated_at: new Date().toISOString() });
  };
  return { row, save };
}

/** Visual progress of the «Карьерная лестница» challenge. */
export function CareerLadder({ row: given, onStartStep }: { row?: LadderRow | null; onStartStep?: (categoryId: string) => void }) {
  const own = useLadder();
  const row = given ?? own.row;
  if (!row) return null;
  const done = new Set(row.completed_steps);
  const current = LADDER.find((s) => s.step === row.current_step && !done.has(s.step));
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">🪜 {LADDER_SCREEN.title}</h2>
      <p className="text-xs text-muted-foreground">{LADDER_SCREEN.subtitle}</p>
      <ol className="mt-3 space-y-1">
        {[...LADDER].reverse().map((s) => {
          const isDone = done.has(s.step);
          const isCur = !isDone && s.step === row.current_step;
          return (
            <li key={s.step} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${isCur ? "bg-primary text-primary-foreground" : isDone ? "bg-accent" : "bg-muted text-muted-foreground"}`}>
              <span>{isDone ? "✅" : isCur ? "▶️" : "🔒"} {s.step}. {s.title}</span>
              {row.scores_by_step[s.step] != null && <b>{row.scores_by_step[s.step]}</b>}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm">{LADDER_SCREEN.progress(done.size)}</p>
      {current && onStartStep && (
        <button onClick={() => onStartStep(current.category_id)} className="mt-2 w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
          {LADDER_SCREEN.step(current.step)}
        </button>
      )}
      {done.size >= LADDER.length && <p className="mt-2 font-semibold">{LADDER_SCREEN.final}</p>}
    </section>
  );
}
