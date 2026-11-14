import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Invite = { id: string; display_name: string; token: string; is_open: boolean; used_by: string | null };

/** Leader-only: named guest passes that let people join without registering. */
export function GuestInvites({ sessionId }: { sessionId: string }) {
  const [list, setList] = useState<Invite[]>([]);
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("guest_invites").select("id,display_name,token,is_open,used_by")
      .eq("session_id", sessionId).order("created_at");
    setList((data as Invite[]) ?? []);
  };
  useEffect(() => { void load(); }, [sessionId]);

  const link = (t: string) => `${window.location.origin}/guest/${t}`;

  const add = async () => {
    const rows = names.split(/[\n,;]/).map((n) => n.trim()).filter(Boolean).map((n) => ({ session_id: sessionId, display_name: n.slice(0, 60) }));
    if (!rows.length) return undefined;
    setBusy(true);
    const { error } = await supabase.from("guest_invites").insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return undefined; }
    setNames(""); toast.success(`Добавлено гостей: ${rows.length}`); void load();
    return undefined;
  };
  const toggle = async (i: Invite) => {
    await supabase.from("guest_invites").update({ is_open: !i.is_open }).eq("id", i.id); load();
  };
  const remove = async (i: Invite) => {
    await supabase.from("guest_invites").delete().eq("id", i.id); load();
  };
  const copy = (t: string) => { navigator.clipboard.writeText(link(t)); toast.success("Ссылка скопирована"); };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Гости без регистрации</h3>
      <p className="mt-1 text-xs text-muted-foreground">Впишите имена (каждое с новой строки или через запятую). Каждый гость получит свою ссылку и сразу войдёт в игру под этим именем.</p>
      <textarea value={names} onChange={(e) => setNames(e.target.value)} rows={3} placeholder={"Анна, администратор\nИгорь"}
        className="mt-2 w-full rounded-lg border border-input bg-background p-2 text-sm" />
      <button onClick={add} disabled={busy || !names.trim()} className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Создать доступ</button>
      <ul className="mt-3 space-y-2 text-sm">
        {list.map((i) => (
          <li key={i.id} className="rounded-lg border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{i.display_name}</span>
              <span className="text-xs text-muted-foreground">{!i.is_open ? "🔒 закрыт" : i.used_by ? "✅ вошёл" : "ожидает"}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs">
              <button onClick={() => copy(i.token)} className="text-primary">Копировать ссылку</button>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link(i.token))}`} target="_blank" rel="noreferrer" className="text-primary">QR</a>
              <button onClick={() => toggle(i)} className="text-primary">{i.is_open ? "Закрыть доступ" : "Открыть доступ"}</button>
              <button onClick={() => remove(i)} className="text-destructive">Удалить</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
