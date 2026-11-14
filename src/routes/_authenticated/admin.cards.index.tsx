import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TYPE_LABEL, type CardRow, type CardType } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/admin/cards/")({
  head: () => ({ meta: [{ title: "Карточки — админка" }] }),
  component: CardsAdmin,
});

const PAGE = 25;
type Opt = { id: string; title: string };

function CardsAdmin() {
  const [f, setF] = useState({ type: "", category: "", direction: "", level: "", batch: "", q: "", inactive: false });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState<Opt[]>([]);
  const [dirs, setDirs] = useState<Opt[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    supabase.from("categories").select("id,title").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("directions").select("id,title").order("title").then(({ data }) => setDirs(data ?? []));
    supabase.from("cards").select("batch_id").then(({ data }) =>
      setBatches([...new Set((data ?? []).map((d) => d.batch_id).filter(Boolean) as string[])]));
  }, []);

  useEffect(() => {
    let q = supabase.from("cards").select("*", { count: "exact" }).order("id").range(page * PAGE, page * PAGE + PAGE - 1);
    if (!f.inactive) q = q.eq("is_active", true);
    if (f.type) q = q.eq("type", f.type);
    if (f.category) q = q.eq("category_id", f.category);
    if (f.direction) q = q.eq("direction_id", f.direction);
    if (f.level) q = q.eq("level", Number(f.level));
    if (f.batch) q = q.eq("batch_id", f.batch);
    if (f.q.trim()) q = q.ilike("title", `%${f.q.trim()}%`);
    q.then(({ data, count }) => { setRows(data ?? []); setTotal(count ?? 0); });
  }, [f, page, tick]);

  const set = (k: keyof typeof f, v: string | boolean) => { setPage(0); setF({ ...f, [k]: v }); };
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.title ?? id ?? "—";

  const toggle = async (r: CardRow) => {
    const { error } = await supabase.from("cards").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error("Не удалось изменить"); else { toast.success(r.is_active ? "Карточка скрыта" : "Карточка восстановлена"); setTick(tick + 1); }
  };

  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Карточки <span className="text-base font-normal text-muted-foreground">({total})</span></h1>
        <Link to="/admin/cards/$id" params={{ id: "new" }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Создать карточку</Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input placeholder="Поиск по названию" value={f.q} onChange={(e) => set("q", e.target.value)} className={`${sel} col-span-2 sm:col-span-3 lg:col-span-6`} />
        <select className={sel} value={f.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">Все типы</option>
          {(Object.keys(TYPE_LABEL) as CardType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select className={sel} value={f.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">Все рубрики</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className={sel} value={f.direction} onChange={(e) => set("direction", e.target.value)}>
          <option value="">Все направления</option>{dirs.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className={sel} value={f.level} onChange={(e) => set("level", e.target.value)}>
          <option value="">Любой уровень</option>{[1, 2, 3].map((l) => <option key={l} value={l}>Уровень {l}</option>)}
        </select>
        <select className={sel} value={f.batch} onChange={(e) => set("batch", e.target.value)}>
          <option value="">Все партии</option>{batches.map((b) => <option key={b}>{b}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.inactive} onChange={(e) => set("inactive", e.target.checked)} />Показать скрытые</label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Ничего не найдено. Измените фильтры, создайте карточку или загрузите партию в «Импорте».
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[150px_90px_minmax(0,1fr)_180px_50px_80px_150px] gap-3 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span>ID</span><span>Тип</span><span>Название</span><span>Рубрика</span><span>Ур.</span><span>Партия</span><span />
          </div>
          {rows.map((r) => (
            <div key={r.id} className={`grid gap-1 px-3 py-3 text-sm md:grid-cols-[150px_90px_minmax(0,1fr)_180px_50px_80px_150px] md:items-center md:gap-3 ${r.is_active ? "" : "opacity-50"}`}>
              <span className="truncate font-mono text-xs text-muted-foreground">{r.id}</span>
              <span className="text-xs"><span className="rounded-full bg-muted px-2 py-0.5">{TYPE_LABEL[r.type as CardType]}</span></span>
              <span className="truncate font-medium">{r.title}</span>
              <span className="truncate text-xs text-muted-foreground">{catName(r.category_id)}</span>
              <span className="text-xs">{r.level ?? "—"}</span>
              <span className="truncate text-xs text-muted-foreground">{r.batch_id ?? "—"}</span>
              <span className="flex gap-2">
                <Link to="/admin/cards/$id" params={{ id: r.id }} className="rounded-md border border-input px-2 py-1 text-xs">Редактировать</Link>
                <button onClick={() => toggle(r)} className="rounded-md border border-input px-2 py-1 text-xs">{r.is_active ? "Удалить" : "Вернуть"}</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-input px-3 py-1 disabled:opacity-40">Назад</button>
        <span>{page + 1} / {Math.max(1, Math.ceil(total / PAGE))}</span>
        <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} className="rounded-md border border-input px-3 py-1 disabled:opacity-40">Вперёд</button>
      </div>
    </div>
  );
}
