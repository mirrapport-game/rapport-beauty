import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/join/$code")({
  head: () => ({ meta: [{ title: "Подключение к сессии — Раппорт" }] }),
  component: JoinCode,
});

function JoinCode() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    supabase.rpc("join_game_session", { _code: code }).then(({ data, error }) => {
      if (error || !data) setErr(error?.message ?? "Сессия не найдена");
      else navigate({ to: "/play/$id", params: { id: data }, replace: true });
    });
  }, [code, navigate]);
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      {err ? (
        <>
          <p className="text-destructive">{err}</p>
          <Link to="/join" className="mt-4 inline-block text-primary">Ввести другой код</Link>
        </>
      ) : (
        <p>Подключаемся к сессии {code}…</p>
      )}
    </main>
  );
}
