import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/achievements")({
  head: () => ({ meta: [{ title: "Достижения — админка" }] }),
  component: AchievementsAdmin,
});

type A = { id: string; title: string; description: string | null; icon: string; condition: Json };
const EMPTY = { id: "", title: "", description: "", icon: "🏅", condition: '{"type":"sessions","min":1}' };

function AchievementsAdmin() {
  const [list, setList] = useState<A[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const load = () => supabase.from("achievements").select("*").order("id").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.id.trim() || !form.title.trim()) { toast.error("Укажите id и название"); return; }
    let condition: Json;
    try { condition = JSON.parse(form.condition); } catch { toast.error("Условие должно быть JSON"); return; }
    const row = { id: form.id.trim(), title: form.title.trim(), description: form.description || null, icon: form.icon || "🏅", condition };
    const { error } = editing ? await supabase.from("achievements").update(row).eq("id", editing) : await supabase.from("achievements").insert(row);
    if (error) { toast.error(error.code === "23505" ? "Такой id уже есть" : "Не удалось сохранить"); return; }
    toast.success("Сохранено"); setForm(EMPTY); setEditing(null); load();
  };
  const del = async (id: string) => {
    if (!confirm("Удалить достижение? У пользователей оно тоже пропадёт.")) return;
    const { error } = await supabase.from("achievements").delete().eq("id", id);
    if (error) toast.error("Не удалось удалить"); else load();
  };
  const inp = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Достижения</h1>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="text-2xl">{a.icon}</span>
            <div className="min-w-0 flex-1"><div className="font-medium">{a.title} <span className="font-mono text-xs text-muted-foreground">{a.id}</span></div><div className="truncate text-xs text-muted-foreground">{a.description} · {JSON.stringify(a.condition)}</div></div>
            <button onClick={() => { setEditing(a.id); setForm({ id: a.id, title: a.title, description: a.description ?? "", icon: a.icon, condition: JSON.stringify(a.condition) }); }} className="rounded-md border border-input px-2 py-1 text-xs">Изменить</button>
            <button onClick={() => del(a.id)} className="rounded-md border border-input px-2 py-1 text-xs">Удалить</button>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{editing ? `Изменить «${editing}»` : "Новое достижение"}</h2>
        <div className="grid gap-2 sm:grid-cols-[80px_1fr_1fr]">
          <input className={inp} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏅" />
          <input className={inp} disabled={!!editing} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="id, напр. twenty_sessions" />
          <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название" />
        </div>
        <input className={`${inp} w-full`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание" />
        <input className={`${inp} w-full font-mono`} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
        <p className="text-xs text-muted-foreground">Типы условий: sessions (min), led (min), streak (min), perfect, all_categories.</p>
        <div className="flex gap-2">
          <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Сохранить</button>
          {editing && <button onClick={() => { setEditing(null); setForm(EMPTY); }} className="rounded-md border border-input px-4 py-2 text-sm">Отмена</button>}
        </div>
      </div>
    </div>
  );
}
