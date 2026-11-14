import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { skills, GAME_TITLE } from "@/lib/game";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: `Навыки — ${GAME_TITLE}` },
      { name: "description", content: "Библиотека навыков общения с клиентами: формулы и правила применения." },
      { property: "og:title", content: `Навыки — ${GAME_TITLE}` },
      { property: "og:description", content: "Библиотека навыков общения с клиентами." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Skills,
});

function Skills() {
  const [q, setQ] = useState("");
  const list = skills.filter((s) => (s.title + s.formula + s.tags.join(" ")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск навыка…"
          className="w-full rounded-md border border-input bg-card px-4 py-2" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <details key={s.id} className="rounded-xl border border-border bg-card p-5">
              <summary className="cursor-pointer">
                <span className="font-semibold">{s.title}</span>
                <div className="mt-1 text-sm font-medium text-primary">{s.formula}</div>
              </summary>
              <p className="mt-3 text-sm">{s.description}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {s.how_to_apply.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
              <p className="mt-3 rounded-md bg-muted p-3 text-sm"><b>Зачем:</b> {s.why_learn}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
