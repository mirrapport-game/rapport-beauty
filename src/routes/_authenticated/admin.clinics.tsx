import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/clinics")({
  head: () => ({ meta: [{ title: "Салона — Администратор" }] }),
  component: AdminClinics,
});

type Row = { id: string; name: string; join_code: string; members: number; managers: string | null };

function AdminClinics() {
  const [list, setList] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    supabase.rpc("admin_list_clinics").then(({ data }) => setList((data as Row[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc("create_clinic", { _name: name });
    if (error) { toast.error(error.message); return; }
    setName(""); toast.success("Салон создана"); load();
  };
  const setManager = async (cid: string) => {
    const { error } = await supabase.rpc("admin_set_clinic_manager", { _cid: cid, _email: emails[cid] ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success("Руководитель назначен"); setEmails({ ...emails, [cid]: "" }); load();
  };
  const remove = async (cid: string) => {
    if (!confirm("Удалить салон? Сотрудники останутся, но без салона.")) return;
    await supabase.rpc("admin_delete_clinic", { _cid: cid }); load();
  };
  const inp = "rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Салона</h1>
      <form onSubmit={create} className="flex gap-2 rounded-2xl border border-border bg-card p-4">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Название салона" className={`${inp} w-full`} />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Создать</button>
      </form>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Салонов пока нет.</p>}
      {list.map((c) => (
        <div key={c.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">Код для сотрудников: <b className="font-mono text-foreground">{c.join_code}</b> · сотрудников: {c.members}</div>
              <div className="text-xs text-muted-foreground">Руководители: {c.managers ?? "не назначены"}</div>
            </div>
            <button onClick={() => remove(c.id)} className="text-xs text-destructive">Удалить</button>
          </div>
          <div className="flex gap-2">
            <input type="email" value={emails[c.id] ?? ""} onChange={(e) => setEmails({ ...emails, [c.id]: e.target.value })}
              placeholder="Email руководителя (уже зарегистрирован)" className={`${inp} w-full`} />
            <button onClick={() => setManager(c.id)} disabled={!emails[c.id]} className="whitespace-nowrap rounded-md border border-input px-3 py-2 text-sm disabled:opacity-50">Назначить</button>
          </div>
        </div>
      ))}
    </div>
  );
}
