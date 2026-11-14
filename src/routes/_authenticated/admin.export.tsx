import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CARD_COLUMNS, SCENARIO_COLUMNS, download, toCsv } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/admin/export")({
  head: () => ({ meta: [{ title: "Экспорт карточек — админка" }] }),
  component: ExportPage,
});

function ExportPage() {
  const [cats, setCats] = useState<{ id: string; title: string }[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [cat, setCat] = useState("");
  const [batch, setBatch] = useState("");

  useEffect(() => {
    supabase.from("categories").select("id,title").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("cards").select("batch_id").then(({ data }) => setBatches([...new Set((data ?? []).map((d) => d.batch_id).filter(Boolean) as string[])]));
  }, []);

  const fetchAll = async () => {
    let c = supabase.from("cards").select(CARD_COLUMNS.join(",")).order("id");
    let s = supabase.from("scenarios").select(SCENARIO_COLUMNS.join(",")).order("id");
    if (cat) { c = c.eq("category_id", cat); s = s.eq("category_id", cat); }
    if (batch) { c = c.eq("batch_id", batch); s = s.eq("batch_id", batch); }
    const [a, b] = await Promise.all([c, s]);
    return { cards: (a.data ?? []) as unknown as Record<string, unknown>[], scenarios: (b.data ?? []) as unknown as Record<string, unknown>[] };
  };
  const name = () => `cards${cat ? "_" + cat : ""}${batch ? "_" + batch : ""}`;

  const json = async () => {
    const { cards, scenarios } = await fetchAll();
    const by = (t: string) => cards.filter((c) => c["type"] === t);
    const out = {
      meta: { version: "1.0", batch_id: batch || "export", exported_at: new Date().toISOString() },
      skills: by("skill"), solutions: by("solution"), situations: by("situation"), scenarios, roles: by("role"),
    };
    download(`${name()}.json`, JSON.stringify(out, null, 2), "application/json");
    toast.success(`Выгружено: ${cards.length + scenarios.length}`);
  };
  const csv = async () => {
    const { cards, scenarios } = await fetchAll();
    const cols = ["type", ...CARD_COLUMNS.filter((c) => c !== "type"), "situation_id", "skill_ids", "solution_id"];
    const rows = [...cards, ...scenarios.map((s) => ({ ...s, type: "scenario" }))];
    download(`${name()}.csv`, toCsv(rows, cols), "text/csv");
    toast.success(`Выгружено: ${rows.length}`);
  };

  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Экспорт</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Все рубрики</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <select className={sel} value={batch} onChange={(e) => setBatch(e.target.value)}><option value="">Все партии</option>{batches.map((b) => <option key={b}>{b}</option>)}</select>
      </div>
      <div className="flex gap-2">
        <button onClick={json} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Скачать JSON</button>
        <button onClick={csv} className="rounded-md border border-input px-5 py-2 text-sm">Скачать CSV</button>
      </div>
      <p className="text-xs text-muted-foreground">Файл JSON можно сразу загрузить обратно через «Импорт». В CSV списки разделены «;».</p>
    </div>
  );
}
