import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Войти в игру по коду — Раппорт" },
      { name: "description", content: "Введите 6-значный код сессии от ведущего." },
      { property: "og:title", content: "Войти в игру — Раппорт Beauty" },
      { property: "og:description", content: "Введите код сессии от ведущего." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Войти в игру</h1>
      <p className="mt-2 text-muted-foreground">Введите код сессии от ведущего</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().length === 6) navigate({ to: "/join/$code", params: { code: code.trim().toUpperCase() } });
        }}
        className="mt-6 space-y-3"
      >
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123"
          className="w-full rounded-xl border border-input bg-background px-4 py-4 text-center font-mono text-3xl tracking-[0.4em]" />
        <button className="w-full rounded-md bg-primary py-3 font-medium text-primary-foreground">Присоединиться</button>
      </form>
    </main>
  );
}
