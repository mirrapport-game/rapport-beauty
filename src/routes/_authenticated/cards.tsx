import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRoles } from "@/hooks/use-roles";
import { FlipCard, hasCardImage } from "@/components/FlipCard";
import { getPracticeSolution } from "@/lib/solutions.functions";
import { useUser } from "@/hooks/use-user";
import { useAllCards, cardLabel } from "@/hooks/use-all-cards";
import { rubrics, rubricHue, type Card } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Карточки — Раппорт Beauty" },
      { name: "description", content: "Картотека рубрик и ситуаций игры для салонов и студий красоты." },
      { property: "og:title", content: "Карточки — Раппорт Beauty" },
      { property: "og:description", content: "Картотека рубрик и ситуаций игры для салонов красоты." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cards,
});

function Cards() {
  const [rubric, setRubric] = useState<number | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const cards = useAllCards();
  const { is } = useRoles();
  const staff = is("admin") || is("leader");
  const list = rubric ? cards.filter((c) => c.rubric_no === rubric) : [];

  const drawRandom = () => {
    const pool = rubric ? list : cards;
    setCard(pool[Math.floor(Math.random() * pool.length)] ?? null);
  };

  if (!staff) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-lg text-muted-foreground">Картотека доступна только ведущим и администраторам.</p>
        <Link to="/dashboard" className="mt-4 inline-block rounded-full bg-rose-gold px-6 py-3 font-semibold text-primary-foreground">В мой кабинет</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {!card && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-semibold">{rubric ? rubrics.find((r) => r.no === rubric)?.name : "Карточки"}</h1>
            <div className="flex gap-2">
              {rubric && (
                <button onClick={() => setRubric(null)} className="rounded-md border border-input px-4 py-2 text-sm">Все рубрики</button>
              )}
              <button onClick={drawRandom} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Случайная карточка</button>
            </div>
          </div>
          {!rubric ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rubrics.map((r) => (
                <button key={r.no} onClick={() => setRubric(r.no)} style={{ borderLeftColor: `oklch(0.6 0.13 ${rubricHue(r.no)})` }}
                  className="rounded-xl border border-border border-l-8 bg-card p-4 text-left transition hover:shadow-md">
                  <div className="text-sm text-muted-foreground">Рубрика {r.no}</div>
                  <div className="font-semibold">{r.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {list.map((c) => (
                <button key={c.id} onClick={() => setCard(c)} className="rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
                  <div className="text-sm font-bold" style={{ color: `oklch(0.5 0.13 ${rubricHue(c.rubric_no)})` }}>{cardLabel(c)}{c.author ? ` · от ${c.author}` : ""}</div>
                  <div className="font-semibold">{c.title}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {card && <Play card={card} onClose={() => setCard(null)} onNext={drawRandom} />}
    </main>
  );
}

function Play({ card, onClose, onNext }: { card: Card; onClose: () => void; onNext: () => void }) {
  const [step, setStep] = useState(0); // 0 situation, 1 dialogue, 2 solution
  const { user } = useUser();
  const [sol, setSol] = useState<{ task: string; solution: string } | null>(null);
  useEffect(() => {
    if (step === 2 && user && !sol) getPracticeSolution({ data: { cardId: card.id } }).then(setSol);
  }, [step, user, sol, card.id]);
  const hue = rubricHue(card.rubric_no);
  const color = `oklch(0.45 0.12 ${hue})`;
  return (
    <div key={card.id} className="mx-auto max-w-xl">
      {step < 2 && hasCardImage(card.id) ? (
        <FlipCard id={card.id} alt={`${card.id} ${card.title}`} side={step === 0 ? "front" : "back"} onSide={(sd) => setStep(sd === "front" ? 0 : 1)} />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="px-6 py-4 text-primary-foreground" style={{ background: step === 2 ? `oklch(0.4 0.1 ${hue + 40})` : color }}>
          <div className="flex justify-between text-sm opacity-90">
            <span className="text-2xl font-bold">{cardLabel(card)}</span>
            <span>{step === 2 ? "Решение" : "Сценарий"}</span>
          </div>
          <div className="text-sm opacity-90">{card.rubric}</div>
          <div className="mt-1 text-xl font-semibold">{card.title}</div>
        </div>
        <div className="min-h-64 space-y-3 p-6">
          {step === 0 && <p className="leading-relaxed">{card.situation}</p>}
          {step === 1 && card.dialogue.map((d, i) => (
            <p key={i}><b style={{ color }}>{d.who}:</b> {d.line}</p>
          ))}
          {step === 2 && (
            <>
              {!user ? (
                <p className="text-muted-foreground">🔒 <Link to="/auth" className="text-primary">Войдите</Link>, чтобы открыть решение.</p>
              ) : sol ? (
                <>
                  <div className="rounded-lg bg-muted p-3 text-sm"><b>Ваша задача:</b> {sol.task}</div>
                  <p className="leading-relaxed">{sol.solution}</p>
                </>
              ) : <p>Загрузка…</p>}
            </>
          )}
        </div>
      </div>
      )}
      <div className="sticky bottom-0 mt-4 flex flex-wrap justify-between gap-2 bg-background/90 py-3 backdrop-blur">
        <button onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm">← К рубрикам</button>
        <div className="flex gap-2">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-md border border-input px-4 py-2 text-sm">Назад</button>}
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {step === 0 ? "Перевернуть: диалог" : "Показать решение"}
            </button>
          ) : (
            <button onClick={onNext} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Следующая карточка</button>
          )}
        </div>
      </div>
    </div>
  );
}
