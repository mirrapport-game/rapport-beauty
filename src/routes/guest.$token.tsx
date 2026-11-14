import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/guest/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Вход гостя — Раппорт Beauty" },
      { name: "description", content: "Вход в игровую сессию по приглашению ведущего, без регистрации." },
      { property: "og:title", content: "Вход гостя — Раппорт Beauty" },
      { property: "og:description", content: "Присоединяйтесь к игре по ссылке ведущего." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestJoin,
});

function GuestJoin() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) return setErr(error.message);
      }
      const { data, error } = await supabase.rpc("claim_guest_invite", { _token: token });
      if (error || !data) return setErr(error?.message ?? "Приглашение не найдено");
      navigate({ to: "/play/$id", params: { id: data }, replace: true });
    })();
  }, [token, navigate]);
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      {err ? (
        <>
          <p className="text-destructive">{err}</p>
          <p className="mt-2 text-sm text-muted-foreground">Попросите ведущего открыть доступ или прислать новую ссылку.</p>
          <Link to="/" className="mt-4 inline-block text-primary">На главную</Link>
        </>
      ) : (
        <p>Входим в игру…</p>
      )}
    </main>
  );
}
