import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Рубрики и направления — админка" }] }),
  component: CategoriesPage,
});

type Cat = { id: string; title: string; description: string | null; sort_order: number; is_active: boolean };
type Dir = { id: string; title: string; category_id: string | null; is_active: boolean };

function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [dirs, setDirs] = useState<Dir[]>([]);
  const [nc, setNc] = useState({ id: "", title: "" });
  const [nd, setNd] = useState({ id: "", title: "", category_id: "" });

  const load = () => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats((data as Cat[]) ?? []));
    supabase.from("directions").select("*").order("title").then(({ data }) => setDirs((data as Dir[]) ?? []));
  };
  useEffect(load, []);

  const done = (error: { message: string } | null, ok: string) => { if (error) toast.error(error.message.includes("duplicate") ? "Такой id уже есть" : "Не удалось сохранить"); else { toast.success(ok); load(); } };

  const addCat = async () => {
    if (!nc.id.trim() || !nc.title.trim()) return toast.error("Укажите id и название");
    const { error } = await supabase.from("categories").insert({ id: nc.id.trim(), title: nc.title.trim(), sort_order: cats.length + 1 });
    done(error, "Рубрика добавлена"); if (!error) setNc({ id: "", title: "" });
    return undefined;
  };
  const addDir = async () => {
    if (!nd.id.trim() || !nd.title.trim()) return toast.error("Укажите id и название");
    const { error } = await supabase.from("directions").insert({ id: nd.id.trim(), title: nd.title.trim(), category_id: nd.category_id || null });
    done(error, "Направление добавлено"); if (!error) setNd({ id: "", title: "", category_id: "" });
    return undefined;
  };

  const inp = "h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm";
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "border border-input text-muted-foreground"}`}>{on ? "Вкл" : "Выкл"}</button>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Рубрики</h1>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              <input className={`${inp} w-12`} type="number" defaultValue={c.sort_order}
                onBlur={async (e) => { if (Number(e.target.value) !== c.sort_order) done((await supabase.from("categories").update({ sort_order: Number(e.target.value) }).eq("id", c.id)).error, "Порядок изменён"); }} />
              <input className={`${inp} flex-1`} defaultValue={c.title}
                onBlur={async (e) => { if (e.target.value.trim() && e.target.value !== c.title) done((await supabase.from("categories").update({ title: e.target.value.trim() }).eq("id", c.id)).error, "Название изменено"); }} />
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{c.id}</span>
              <Toggle on={c.is_active} onClick={async () => done((await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id)).error, c.is_active ? "Рубрика выключена" : "Рубрика включена")} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input className={inp} placeholder="id, напр. reserve" value={nc.id} onChange={(e) => setNc({ ...nc, id: e.target.value })} />
          <input className={`${inp} flex-1`} placeholder="Название" value={nc.title} onChange={(e) => setNc({ ...nc, title: e.target.value })} />
          <button onClick={addCat} className="rounded-md bg-primary px-4 text-sm text-primary-foreground">Добавить</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Направления</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {dirs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2">
              <input className={`${inp} flex-1`} defaultValue={d.title}
                onBlur={async (e) => { if (e.target.value.trim() && e.target.value !== d.title) done((await supabase.from("directions").update({ title: e.target.value.trim() }).eq("id", d.id)).error, "Название изменено"); }} />
              <select className={`${inp} hidden w-48 sm:block`} value={d.category_id ?? ""}
                onChange={async (e) => done((await supabase.from("directions").update({ category_id: e.target.value || null }).eq("id", d.id)).error, "Рубрика изменена")}>
                <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <Toggle on={d.is_active} onClick={async () => done((await supabase.from("directions").update({ is_active: !d.is_active }).eq("id", d.id)).error, d.is_active ? "Направление выключено" : "Направление включено")} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input className={inp} placeholder="id" value={nd.id} onChange={(e) => setNd({ ...nd, id: e.target.value })} />
          <input className={`${inp} flex-1`} placeholder="Название" value={nd.title} onChange={(e) => setNd({ ...nd, title: e.target.value })} />
          <select className={inp} value={nd.category_id} onChange={(e) => setNd({ ...nd, category_id: e.target.value })}>
            <option value="">Рубрика</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button onClick={addDir} className="rounded-md bg-primary px-4 text-sm text-primary-foreground">Добавить</button>
        </div>
      </section>
    </div>
  );
}
