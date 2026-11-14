import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { SaveOffline } from "@/components/SaveOffline";
import { SkillCard, SolutionCard, RoleCard } from "@/components/GameCards";
import { rubricHint, rubricLabel } from "@/lib/rubrics";
import { dealPool, loadDeck, loadSessions, saveDeck, saveSessions, type OCard, type ODeck, type OSession } from "@/lib/offline-game";

export const Route = createFileRoute("/offline")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Игра без интернета — Раппорт Beauty" },
      { name: "description", content: "Проведите игру на одном устройстве ведущей без интернета." },
      { property: "og:title", content: "Игра без интернета — Раппорт Beauty" },
      { property: "og:description", content: "Офлайн-сессии игры для салонов и студий красоты." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

const LEVEL = ["", "Вопрос", "Просьба", "Требование"];
const btn = "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const ghost = "rounded-md border border-border px-4 py-2 text-sm";

function OfflinePage() {
  const [deck, setDeck] = useState<ODeck | null>(null);
  const [sessions, setSessions] = useState<OSession[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { setDeck(loadDeck()); setSessions(loadSessions()); }, []);
  const update = (s: OSession) => {
    const next = sessions.some((x) => x.id === s.id) ? sessions.map((x) => (x.id === s.id ? s : x)) : [s, ...sessions];
    setSessions(next); saveSessions(next);
  };
  const current = sessions.find((s) => s.id === openId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl sm:text-3xl">Игра без интернета</h1>
        <Link to="/dashboard" className="text-sm text-muted-foreground underline">В кабинет</Link>
      </div>
      <Download deck={deck} onSaved={setDeck} />
      {!deck ? null : current ? (
        <Game deck={deck} s={current} onChange={update} onClose={() => setOpenId(null)} />
      ) : creating ? (
        <Create deck={deck} onCancel={() => setCreating(false)} onCreate={(s) => { update(s); setCreating(false); setOpenId(s.id); }} />
      ) : (
        <section className="space-y-3">
          <button className={btn} onClick={() => setCreating(true)}>+ Создать сессию</button>
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setOpenId(s.id)} className="block w-full rounded-xl border border-border bg-card p-4 text-left">
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(s.createdAt).toLocaleString("ru-RU")} · {s.players.length} игроков · ходов: {s.turns.length}{s.finished ? " · завершена" : ""}
              </div>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

function Download({ deck, onSaved }: { deck: ODeck | null; onSaved: (d: ODeck) => void }) {
  const { is, loaded } = useRoles();
  const staff = is("leader") || is("admin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const download = async () => {
    setBusy(true); setErr("");
    const [c, k, s] = await Promise.all([
      supabase.from("categories").select("id,title,deck,sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("cards").select("id,type,category_id,title,description,opening_line,level,scenario_id,card_no,linked_skill_id,formula,how_to_apply,why_learn,task,example_dialogue").limit(5000),
      supabase.from("scenarios").select("id,solution_id").limit(5000),
    ]);
    setBusy(false);
    if (c.error || k.error || s.error) return setErr("Не получилось скачать — проверьте интернет.");
    const d: ODeck = { savedAt: new Date().toISOString(), cats: c.data as ODeck["cats"], cards: k.data as OCard[], scenarios: s.data ?? [] };
    saveDeck(d); onSaved(d);
    caches?.open("pages").then((cache) => cache.add("/offline")).catch(() => {});
  };
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Пока есть интернет, скачайте игру на это устройство. Потом сессии создаются и проходят без сети: ведущая показывает карточки группе со своего телефона или планшета, а результаты хранятся на устройстве.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {deck && <span className="text-sm">✅ Игра скачана {new Date(deck.savedAt).toLocaleDateString("ru-RU")} · {deck.cards.filter((c) => c.type === "situation").length} ситуаций</span>}
        {loaded && staff && <button className={btn} onClick={download} disabled={busy}>{busy ? "Скачиваем…" : deck ? "Обновить" : "Скачать игру"}</button>}
        {loaded && !staff && !deck && <span className="text-sm">Скачать игру может ведущая или администратор (нужен вход и интернет).</span>}
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      {loaded && staff && <div className="mt-4"><SaveOffline /></div>}
    </section>
  );
}

function Create({ deck, onCreate, onCancel }: { deck: ODeck; onCreate: (s: OSession) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("Игра " + new Date().toLocaleDateString("ru-RU"));
  const [names, setNames] = useState<string[]>(["", ""]);
  const [cats, setCats] = useState<string[]>([]);
  const withCards = deck.cats.filter((c) => deck.cards.some((k) => k.type === "situation" && k.category_id === c.id));
  const players = names.map((n) => n.trim()).filter(Boolean);
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <label className="block"><span className="text-sm font-semibold">Название</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" /></label>
      <div>
        <div className="text-sm font-semibold">Участники ({players.length})</div>
        {names.map((n, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input value={n} placeholder={`Имя участника ${i + 1}`} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2" />
            <button className={ghost} aria-label="Убрать" onClick={() => setNames(names.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className={`${ghost} mt-2`} onClick={() => setNames([...names, ""])}>+ Участник</button>
      </div>
      <div>
        <div className="text-sm font-semibold">Рубрики</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {withCards.map((c) => {
            const on = cats.includes(c.id);
            return (
              <button key={c.id} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])}
                className={`rounded-lg border p-3 text-left text-sm ${on ? "border-primary bg-primary/10" : "border-border"}`}>
                <div className="font-semibold">{rubricLabel(c)}</div>
                <div className="text-xs text-muted-foreground">{rubricHint(c)}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3">
        <button className={btn} disabled={!players.length || !cats.length}
          onClick={() => onCreate({ id: crypto.randomUUID(), title: title.trim() || "Игра", createdAt: new Date().toISOString(), players, catIds: cats, turns: [], finished: false })}>
          Начать игру
        </button>
        <button className={ghost} onClick={onCancel}>Отмена</button>
      </div>
    </section>
  );
}

function Game({ deck, s, onChange, onClose }: { deck: ODeck; s: OSession; onChange: (s: OSession) => void; onClose: () => void }) {
  const [show, setShow] = useState<{ skill: boolean; sol: boolean }>({ skill: false, sol: false });
  const turn = s.turns[s.turns.length - 1];
  const open = turn && turn.score === null ? turn : null;
  const nextPlayer = s.players[s.turns.length % s.players.length] ?? "";
  const pool = useMemo(() => dealPool(deck, s), [deck, s]);
  const card = open ? deck.cards.find((c) => c.id === open.cardId) : undefined;
  const cat = deck.cats.find((c) => c.id === card?.category_id);
  const skill = card?.linked_skill_id ? deck.cards.find((c) => c.id === card.linked_skill_id) : undefined;
  const solId = deck.scenarios.find((x) => x.id === card?.scenario_id)?.solution_id;
  const sol = solId ? deck.cards.find((c) => c.id === solId) : undefined;
  const roles = (cat ? rubricLabel(cat) : "").split(/\s*[—→-]\s*/).filter(Boolean);

  const [pick, setPick] = useState<string | null>(null);
  const mine = pool.filter((c) => c.category_id === pick);
  const deal = () => {
    const c = mine[Math.floor(Math.random() * mine.length)];
    setPick(null);
    if (!c) return;
    setShow({ skill: false, sol: false });
    onChange({ ...s, turns: [...s.turns, { player: nextPlayer, cardId: c.id, score: null }] });
  };
  const score = (n: number) => onChange({ ...s, turns: s.turns.map((t, i) => (i === s.turns.length - 1 ? { ...t, score: n } : t)) });

  if (s.finished) {
    const totals = s.players.map((p) => {
      const sc = s.turns.filter((t) => t.player === p && t.score !== null).map((t) => t.score!);
      return { p, n: sc.length, avg: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0 };
    });
    return (
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl">{s.title} — итоги</h2>
        {totals.map((t) => <div key={t.p} className="flex justify-between border-b border-border py-2"><span>{t.p}</span><span>{t.n ? `${t.avg.toFixed(1)} из 5 · ходов: ${t.n}` : "не играл(а)"}</span></div>)}
        <button className={ghost} onClick={onClose}>К списку сессий</button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl">{s.title}</h2>
        <div className="flex gap-2">
          <button className={ghost} onClick={onClose}>← Сессии</button>
          <button className={ghost} onClick={() => onChange({ ...s, finished: true })}>Завершить</button>
        </div>
      </div>
      {!open ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-muted-foreground">Ход {s.turns.length + 1}</p>
          <p className="my-2 text-2xl font-semibold">{nextPlayer}</p>
          {pool.length ? (
            <>
              <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Участник выбирает рубрику</div>
              <div className="mb-4 grid gap-2 text-left sm:grid-cols-2">
                {deck.cats.filter((c) => s.catIds.includes(c.id)).map((c) => {
                  const n = pool.filter((k) => k.category_id === c.id).length;
                  return (
                    <button key={c.id} disabled={!n} onClick={() => setPick(c.id)}
                      className={`rounded-lg border p-3 text-sm disabled:opacity-40 ${pick === c.id ? "border-primary bg-primary/10" : "border-border"}`}>
                      <div className="font-semibold">{rubricLabel(c)}</div>
                      <div className="text-xs text-muted-foreground">{rubricHint(c)} · {n} карт</div>
                    </button>
                  );
                })}
              </div>
              <button className={btn} onClick={deal} disabled={!mine.length}>Выдать карточку</button>
            </>
          ) : <p className="text-sm">Ситуации в выбранных рубриках закончились — завершите игру.</p>}
        </div>
      ) : card && (
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">Играет: <b className="text-foreground">{open.player}</b>{cat ? ` · ${rubricLabel(cat)}` : ""}</div>
          {roles.length === 2 && <div className="grid gap-3 sm:grid-cols-2"><RoleCard role={`${open.player}: ${roles[0]}`} /><RoleCard role={`Партнёр: ${roles[1]}`} /></div>}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Ситуация{card.level ? ` · ${LEVEL[card.level]}` : ""}</div>
            <div className="mt-1 text-lg font-semibold">{card.title}</div>
            <p className="mt-2 leading-relaxed">{card.description}</p>
            {card.opening_line && <p className="mt-3 text-lg font-medium italic">«{card.opening_line}»</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {skill && <button className={ghost} onClick={() => setShow({ ...show, skill: !show.skill })}>💡 {show.skill ? "Скрыть" : "Открыть"} навык</button>}
            {sol && <button className={ghost} onClick={() => setShow({ ...show, sol: !show.sol })}>✅ {show.sol ? "Скрыть" : "Открыть"} решение</button>}
          </div>
          {show.skill && skill && <SkillCard skill={{ id: skill.id, title: skill.title, formula: skill.formula ?? "", description: skill.description ?? "", how_to_apply: (skill.how_to_apply as string[] | null) ?? [], why_learn: skill.why_learn ?? "", tags: [] }} />}
          {show.sol && sol && <SolutionCard task={sol.task ?? ""} solution={sol.example_dialogue ?? ""} />}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold">Оценка группы</div>
            <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={`${ghost} flex-1`} onClick={() => score(n)}>{n}</button>)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
