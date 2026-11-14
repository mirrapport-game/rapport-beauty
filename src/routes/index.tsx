import { createFileRoute, Link } from "@tanstack/react-router";
import { TodayFlow } from "@/components/TodayFlow";
import { useRoles } from "@/hooks/use-roles";
import box from "@/assets/rapport-box.jpg.asset.json";
import { GAME_TITLE } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: GAME_TITLE },
      { name: "description", content: "Психологическая игра для салонов и студий красоты: реальные сценарии с клиентами, навыки и эталонные решения." },
      { property: "og:title", content: GAME_TITLE },
      { property: "og:description", content: "Психологическая игра для сферы красоты: тренажёр общения в салоне." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useRoles();

  return (
    <div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="grid items-center gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Красота начинается с отношений</p>
            <h1 className="mt-3 text-5xl leading-none sm:text-6xl">
              Раппорт <span className="block font-[family-name:var(--font-script)] text-6xl font-normal text-rose-gold sm:text-7xl">Beauty</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">Психологическая игра для салонов и студий красоты: тренируйте сложные разговоры с клиентами, коллегами и руководством.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm md:justify-start">
              {["Люди", "Коммуникация", "Доверие", "Развитие"].map((t) => (
                <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-foreground">{t}</span>
              ))}
            </div>
          </div>
          <img src={box.url} alt="Коробка игры Раппорт Beauty" className="w-full rounded-3xl shadow-soft" />
        </section>

        {!user && (
          <div className="my-6 flex flex-wrap gap-3">
            <Link to="/auth" className="rounded-full bg-rose-gold px-6 py-3 font-semibold text-primary-foreground shadow-soft">Войти и начать</Link>
            <Link to="/join" className="rounded-full border border-input bg-card px-6 py-3 font-semibold text-foreground">Войти в игру по коду</Link>
          </div>
        )}
        {user && <div className="mx-auto my-6 max-w-2xl"><TodayFlow userId={user.id} /></div>}
      </main>
    </div>
  );
}
