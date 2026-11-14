import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GAME_TITLE } from "@/lib/game";
import { LEADER_SCRIPT } from "@/lib/copy";

export const Route = createFileRoute("/_authenticated/leader/onboarding")({
  head: () => ({
    meta: [
      { title: `Как презентовать игру команде — ${GAME_TITLE}` },
      { name: "description", content: "Готовый текст для разговора с командой и правила, чего избегать." },
      { property: "og:title", content: `Как презентовать игру команде — ${GAME_TITLE}` },
      { property: "og:description", content: "Скрипт запуска игры для руководителя салона." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderOnboarding,
});

function LeaderOnboarding() {
  const [copied, setCopied] = useState(false);
  const full = LEADER_SCRIPT.paragraphs.join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast.success("Текст скопирован");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold">{LEADER_SCRIPT.title}</h1>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        {LEADER_SCRIPT.paragraphs.map((p) => (
          <p key={p} className="leading-relaxed">
            {p}
          </p>
        ))}
        <button onClick={copy} className="rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground">
          {copied ? "✓ Скопировано" : LEADER_SCRIPT.copy}
        </button>
      </section>

      <section className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-semibold">{LEADER_SCRIPT.avoidTitle}</h2>
        <ul className="space-y-1.5">
          {LEADER_SCRIPT.avoid.map((a) => (
            <li key={a}>❌ {a}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{LEADER_SCRIPT.avoidNote}</p>
      </section>
    </main>
  );
}
