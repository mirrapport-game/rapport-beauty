import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/leader/$id_/qr")({
  head: () => ({ meta: [{ title: "QR-код сессии — Раппорт" }] }),
  component: QrPage,
});

function QrPage() {
  const { id } = Route.useParams();
  const [s, setS] = useState<{ code: string; title: string } | null>(null);
  useEffect(() => { supabase.from("game_sessions").select("code,title").eq("id", id).maybeSingle().then(({ data }) => setS(data)); }, [id]);
  if (!s) return <p className="p-8 text-center">Загрузка…</p>;
  const url = `${window.location.origin}/join/${s.code}`;
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="text-xl text-muted-foreground">{s.title}</div>
      <img alt="QR-код для подключения" className="h-72 w-72 rounded-2xl bg-card p-3 shadow" src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`} />
      <div className="font-mono text-6xl font-bold tracking-[0.3em] text-primary">{s.code}</div>
      <div className="text-lg">{url}</div>
      <Link to="/leader/$id" params={{ id }} className="text-sm text-primary">← Вернуться к панели</Link>
    </main>
  );
}
