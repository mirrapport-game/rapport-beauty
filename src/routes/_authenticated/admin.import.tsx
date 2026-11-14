import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { csvToImport, parseCsv, planImport, type ImportFile, type Plan } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/admin/import")({
  head: () => ({ meta: [{ title: "Импорт карточек — админка" }] }),
  component: ImportPage,
});

type Hist = { id: string; batch_id: string; imported_at: string; imported_by_name: string | null; counts: unknown; status: string | null; source_file: string | null };
const LBL: Record<string, string> = { skills: "навыки", situations: "ситуации", solutions: "решения", roles: "роли", scenarios: "сценарии" };

function ImportPage() {
  const [tab, setTab] = useState<"json" | "csv">("json");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<ImportFile | null>(null);
  const [batch, setBatch] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [report, setReport] = useState<{ ok: number; plan: Plan; failed: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<Hist[]>([]);

  const loadHist = () => supabase.from("batch_imports").select("*").order("imported_at", { ascending: false }).limit(50).then(({ data }) => setHist((data as Hist[]) ?? []));
  useEffect(() => { loadHist(); }, []);

  const reset = () => { setData(null); setPlan(null); setReport(null); setFileName(""); setBatch(""); };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    reset();
    const text = await f.text();
    try {
      const parsed: ImportFile = tab === "json" ? JSON.parse(text) : csvToImport(parseCsv(text));
      setFileName(f.name); setData(parsed);
      setBatch(parsed.meta?.batch_id ?? "");
    } catch {
      toast.error(tab === "json" ? "Файл не является корректным JSON" : "Не удалось прочитать CSV");
    }
  };

  const validate = async () => {
    if (!data || !batch.trim()) return toast.error("Укажите batch_id");
    setBusy(true);
    const [c, s] = await Promise.all([supabase.from("cards").select("id"), supabase.from("scenarios").select("id")]);
    setBusy(false);
    setPlan(planImport(data, batch.trim(), new Set((c.data ?? []).map((x) => x.id)), new Set((s.data ?? []).map((x) => x.id))));
    return undefined;
  };

  const run = async () => {
    if (!plan) return;
    setBusy(true);
    const failed: string[] = [];
    // Cards without links to scenarios first, scenarios next (they reference cards).
    const skills = plan.cards.filter((c) => c.type === "skill" || c.type === "role");
    const rest = plan.cards.filter((c) => c.type !== "skill" && c.type !== "role");
    for (const chunk of [skills, rest]) {
      if (!chunk.length) continue;
      const { error } = await supabase.from("cards").insert(chunk);
      if (error) failed.push(`карточки: ${error.message}`);
    }
    if (plan.scenarios.length) {
      const { error } = await supabase.from("scenarios").insert(plan.scenarios);
      if (error) failed.push(`сценарии: ${error.message}`);
    }
    const ok = failed.length ? 0 : plan.cards.length + plan.scenarios.length;
    const status = failed.length ? "failed" : plan.errors.length || plan.skipped.length ? "partial" : "success";
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user?.id ?? "").maybeSingle();
    await supabase.from("batch_imports").insert({
      batch_id: batch.trim(), source_file: fileName, counts: plan.counts, status,
      imported_by_name: p?.display_name || u.user?.email || null,
      errors: [...plan.errors, ...failed.map((f) => ({ id: "-", reason: f }))],
    });
    setBusy(false);
    setReport({ ok, plan, failed });
    failed.length ? toast.error("Импорт не выполнен") : toast.success(`Добавлено: ${ok}`);
    loadHist();
  };

  const step = report ? 4 : plan ? 3 : data ? 2 : 1;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Импорт</h1>
      <div className="flex gap-1.5">
        {(["json", "csv"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); reset(); }} className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-primary text-primary-foreground" : "border border-input"}`}>{t.toUpperCase()}</button>
        ))}
      </div>
      <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {["Файл", "Партия", "Проверка", "Отчёт"].map((s, i) => <li key={s} className={`rounded-full px-2.5 py-1 ${step >= i + 1 ? "bg-primary/10 text-primary" : "bg-muted"}`}>{i + 1}. {s}</li>)}
      </ol>

      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
        className="block cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:bg-muted/50">
        <input type="file" accept={tab === "json" ? ".json,application/json" : ".csv,text/csv"} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {fileName ? <span className="font-medium text-foreground">{fileName}</span> : `Перетащите ${tab.toUpperCase()}-файл сюда или нажмите, чтобы выбрать`}
        {tab === "csv" && <div className="mt-2 text-xs">Колонка type обязательна (skill / situation / solution / role / scenario). Списки — через «;».</div>}
      </label>

      {data && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {(["skills", "situations", "solutions", "roles", "scenarios"] as const).map((k) => (
              <span key={k} className="rounded-full bg-muted px-3 py-1">{LBL[k]}: {(data[k] ?? []).length}</span>
            ))}
          </div>
          <label className="block space-y-1"><span className="text-sm font-medium">batch_id *</span>
            <input value={batch} onChange={(e) => { setBatch(e.target.value); setPlan(null); }} placeholder="batch_01_02" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          {!report && <button disabled={busy} onClick={validate} className="rounded-md border border-input px-4 py-2 text-sm">Проверить</button>}
        </div>
      )}

      {plan && !report && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="font-semibold">Будет добавлено: {plan.cards.length + plan.scenarios.length}</div>
          <div className="flex flex-wrap gap-2">{Object.entries(plan.counts).map(([k, n]) => <span key={k} className="rounded-full bg-primary/10 px-3 py-1 text-primary">{LBL[k]}: {n}</span>)}</div>
          <Issues title="Пропущено (id уже есть)" list={plan.skipped} />
          <Issues title="Ошибки (не будут добавлены)" list={plan.errors} danger />
          <button disabled={busy || plan.cards.length + plan.scenarios.length === 0} onClick={run} className="rounded-md bg-primary px-5 py-2 font-medium text-primary-foreground disabled:opacity-50">Импортировать</button>
        </div>
      )}

      {report && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="font-semibold">Готово. Успешно: {report.ok} · Пропущено: {report.plan.skipped.length} · Ошибок: {report.plan.errors.length + report.failed.length}</div>
          {report.failed.map((f) => <div key={f} className="text-destructive">{f}</div>)}
          <Issues title="Пропущено" list={report.plan.skipped} />
          <Issues title="Ошибки" list={report.plan.errors} danger />
          <button onClick={reset} className="rounded-md border border-input px-4 py-2">Новый импорт</button>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">История импортов</h2>
        {hist.length === 0 ? <p className="text-sm text-muted-foreground">Импортов пока не было.</p> : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {hist.map((h) => (
              <div key={h.id} className="grid gap-1 px-3 py-2 md:grid-cols-[140px_150px_minmax(0,1fr)_minmax(0,1.5fr)_80px] md:gap-3">
                <span className="font-mono text-xs">{h.batch_id}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.imported_at).toLocaleString("ru-RU")}</span>
                <span className="truncate text-xs">{h.imported_by_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{Object.entries((h.counts as Record<string, number>) ?? {}).filter(([, n]) => n).map(([k, n]) => `${LBL[k] ?? k}: ${n}`).join(", ") || "—"}</span>
                <span className={`text-xs font-medium ${h.status === "failed" ? "text-destructive" : h.status === "partial" ? "text-muted-foreground" : "text-primary"}`}>{h.status === "success" ? "успешно" : h.status === "partial" ? "частично" : "ошибка"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Issues({ title, list, danger }: { title: string; list: { id: string; reason: string }[]; danger?: boolean }) {
  if (!list.length) return null;
  return (
    <details open={danger}>
      <summary className={`cursor-pointer ${danger ? "text-destructive" : "text-muted-foreground"}`}>{title}: {list.length}</summary>
      <ul className="mt-1 max-h-48 overflow-auto text-xs">{list.map((i, n) => <li key={n}><span className="font-mono">{i.id}</span> — {i.reason}</li>)}</ul>
    </details>
  );
}
