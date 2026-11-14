import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { rubrics, GAME_TITLE } from "@/lib/game";
import { processScenario, type DraftScenario } from "@/lib/scenarios.functions";

export const Route = createFileRoute("/_authenticated/scenarios/new")({
  head: () => ({ meta: [{ title: `Добавить сценарий — ${GAME_TITLE}` }] }),
  component: NewScenario,
});

const field = "w-full rounded-md border border-input bg-background px-3 py-2";

function NewScenario() {
  const { is } = useRoles();
  const staff = is("leader") || is("admin");
  const navigate = useNavigate();
  const process = useServerFn(processScenario);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState<DraftScenario | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await process({ data: { text, rubrics: rubrics.map((x) => `${x.no}. ${x.name}`).join("\n") } });
      if (r.error || !r.draft) toast.error(r.error ?? "Ошибка");
      else setD({ ...r.draft, rubric_no: rubrics.some((x) => x.no === r.draft!.rubric_no) ? r.draft.rubric_no : 1 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  const save = async () => {
    if (!d) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", u.user!.id).maybeSingle();
    const { data: clinicId } = await supabase.rpc("my_clinic_id");
    const { data: row, error } = await supabase.from("user_scenarios").insert({
      clinic_id: (clinicId as string | null) ?? null,
      rubric_no: d.rubric_no, rubric: rubrics.find((x) => x.no === d.rubric_no)?.name ?? "",
      title: d.title, situation: d.situation, dialogue: d.dialogue, author_name: prof?.display_name ?? "",
    }).select("id").single();
    if (error || !row) { setBusy(false); toast.error("Не удалось сохранить"); return; }
    await supabase.from("user_scenario_solutions").insert({ scenario_id: row.id, task: d.task, solution: d.solution });
    toast.success("Сценарий добавлен в игру");
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Добавить свой сценарий</h1>
      {!d ? (
        <>
          <p className="text-muted-foreground">Опишите своими словами случай из работы: кто участвовал, что произошло, что говорили. ИИ оформит карточку: название, ситуацию, диалог, задачу и решение. Перед сохранением всё можно поправить.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Например: клиентка пришла на окрашивание, но не предупредила, что недавно делала химзавивку…" className={field} />
          <button disabled={busy || text.trim().length < 20} onClick={run} className="w-full rounded-md bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Обрабатываем…" : "Обработать"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          {staff && <label className="block text-sm font-medium">Рубрика
            <select value={d.rubric_no} onChange={(e) => setD({ ...d, rubric_no: Number(e.target.value) })} className={field}>
              {rubrics.map((r) => <option key={r.no} value={r.no}>{r.no}. {r.name}</option>)}
            </select>
          </label>}
          <label className="block text-sm font-medium">Название<input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={field} /></label>
          <label className="block text-sm font-medium">Ситуация<textarea rows={4} value={d.situation} onChange={(e) => setD({ ...d, situation: e.target.value })} className={field} /></label>
          <div className="text-sm font-medium">Диалог</div>
          {d.dialogue.map((l, i) => (
            <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
              <input value={l.who} onChange={(e) => setD({ ...d, dialogue: d.dialogue.map((x, j) => (j === i ? { ...x, who: e.target.value } : x)) })} className={field} />
              <input value={l.line} onChange={(e) => setD({ ...d, dialogue: d.dialogue.map((x, j) => (j === i ? { ...x, line: e.target.value } : x)) })} className={field} />
            </div>
          ))}
          <label className="block text-sm font-medium">Задача игрока<textarea rows={2} value={d.task} onChange={(e) => setD({ ...d, task: e.target.value })} className={field} /></label>
          <label className="block text-sm font-medium">Эталонное решение (видно только после второго отыгрыша)<textarea rows={5} value={d.solution} onChange={(e) => setD({ ...d, solution: e.target.value })} className={field} /></label>
          <div className="flex gap-2">
            <button onClick={() => setD(null)} className="flex-1 rounded-md border border-input py-3">Назад</button>
            <button disabled={busy} onClick={save} className="flex-1 rounded-md bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">Добавить в игру</button>
          </div>
        </div>
      )}
    </main>
  );
}
