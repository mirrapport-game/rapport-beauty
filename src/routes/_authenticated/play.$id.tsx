import { useSkillHistory } from "@/lib/use-skill-history";
import { DynamicsBlock } from "@/components/SkillDynamics";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { toGameCard, toSkill, useCategories, useTurnCards } from "@/lib/game-cards";
import { sideOf, type PairSide } from "@/lib/pairs";
import { rubricHint, rubricLabel } from "@/lib/rubrics";
import { STAGES, useLiveSession } from "@/lib/session";
import { useUser } from "@/hooks/use-user";
import { FeedbackForm } from "@/components/FeedbackForm";
import { CRITERIA, type Scores } from "@/lib/feedback";
import { AFTER_RESULT, EMPTY } from "@/lib/copy";
import { TimerRing } from "@/components/TimerRing";
import { Locked, RoleCard, SituationCard, SkillCard, SolutionCard } from "@/components/GameCards";

export const Route = createFileRoute("/_authenticated/play/$id")({
  head: () => ({ meta: [{ title: `Игра — ${GAME_TITLE}` }] }),
  component: PlayerView,
});

function PlayerView() {
  const { id } = Route.useParams();
  const { user } = useUser();
  const { session: s, participants, feedback, loaded } = useLiveSession(id);
  const cats = useCategories();
  const me = participants.find((p) => p.user_id === user?.id);
  const myTurn = !!s && !!me && s.current_participant === me.id;
  const { cards: mine } = useTurnCards(id, myTurn ? s?.turn_no : undefined);
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const c of mine) {
      if ((c.card_type === "skill" || c.card_type === "solution") && !seen.current.has(c.assignment_id)) {
        seen.current.add(c.assignment_id);
        toast.success(c.card_type === "skill" ? "Навык открыт" : "Решение открыто");
      }
    }
  }, [mine]);

  // Detect removal by the leader (closed guest access) within a few seconds.
  const [removed, setRemoved] = useState(false);
  const wasMember = useRef(false);
  if (me) wasMember.current = true;
  useEffect(() => {
    const t = setInterval(async () => {
      if (!wasMember.current) return;
      const { data } = await supabase.rpc("is_session_member", { _sid: id });
      if (data === false) setRemoved(true);
    }, 4000);
    return () => clearInterval(t);
  }, [id]);

  if (removed) return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-3 text-2xl font-bold">Доступ закрыт</h1>
      <p className="mt-2 text-muted-foreground">Ведущий закрыл вам доступ к этой игре.</p>
    </main>
  );
  if (!loaded) return <p className="p-8">Загрузка…</p>;
  if (!s) return <p className="p-8">Сессия не найдена или вы не участник.</p>;

  const sitRow = mine.find((c) => c.card_type === "situation");
  const card = sitRow ? toGameCard(sitRow.card, cats) : undefined;
  const skillRow = mine.find((c) => c.card_type === "skill");
  const skill = skillRow ? toSkill(skillRow.card) : undefined;
  const solRow = mine.find((c) => c.card_type === "solution");
  const sol = solRow ? { task: solRow.card.task ?? "", solution: solRow.card.example_dialogue ?? "", playMode: (solRow.card as { play_mode?: string | null }).play_mode ?? null } : null;
  const roleRow = mine.find((c) => c.card_type === "role");
  const currentP = participants.find((p) => p.id === s.current_participant);
  const gaveFeedback = feedback.some((f) => f.turn_no === s.turn_no && f.from_user === user?.id);

  if (s.status === "finished")
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">🏁</div>
        <h1 className="mt-3 text-2xl font-bold">Сессия завершена</h1>
        <p className="mt-2 text-muted-foreground">Спасибо за игру! Ведущий закрыл сессию «{s.title}».</p>
        <div className="mt-6 text-left"><SessionDynamics sid={s.id} uid={user?.id} /></div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/join" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">{AFTER_RESULT.again}</Link>
          <Link to="/solo" className="rounded-md border border-border px-4 py-2">{AFTER_RESULT.other}</Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm text-muted-foreground">{s.title} · код {s.code}</div>
          <div className="truncate font-semibold">{s.stage === 0 ? "Ожидаем ход" : `Этап: ${STAGES[s.stage - 1]}`}</div>
          {currentP && <div className="truncate text-sm">Ходит: {myTurn ? "вы" : currentP.display_name}</div>}
        </div>
        <TimerRing s={s} size={96} />
      </div>

      {myTurn && card && s.stage >= 1 ? (
        <>
          <RoleCard role={roleRow?.card.title ?? s.turn_role ?? "Сотрудник"} description={roleRow?.card.description} />
          <SituationCard card={card} />
          {skill ? <SkillCard skill={skill} /> : <Locked text="Навык откроется после первого отыгрыша" />}
          {sol ? <SolutionCard {...sol} /> : <Locked text="Решение откроет ведущий после второго отыгрыша" />}
        </>
      ) : s.stage === 0 ? (
        <>
          {me && <PairPicker sid={id} catIds={(s.category_ids as string[]) ?? []} cats={cats} current={me.pair_category_id} side={sideOf(me.pair_side)} />}
          <p className="py-6 text-center text-muted-foreground">Ведущий скоро выдаст карточки. Участников: {participants.length}</p>
        </>
      ) : (
        <p className="py-4 text-center text-muted-foreground">Сейчас ход: {currentP?.display_name}. Подождите и наблюдайте за сценкой…</p>
      )}

      {!myTurn && me && s.stage >= 3 && s.current_participant && !gaveFeedback && (
        <FeedbackForm sessionId={id} turnNo={s.turn_no} to={s.current_participant} toName={currentP?.display_name} fromName={me.display_name} fromRole="participant" />
      )}
      {!myTurn && gaveFeedback && <p className="text-center text-sm text-primary">Спасибо, обратная связь отправлена.</p>}
      {me && <MyFeedback sessionId={id} tick={feedback.length} showEmpty={s.stage >= 3} />}
    </main>
  );
}

type Received = { id: string; turn_no: number; from_name: string | null; from_role: string; scores: Scores; overall_rating: number | null; good: string | null; improve: string | null };

function MyFeedback({ sessionId, tick, showEmpty }: { sessionId: string; tick: number; showEmpty: boolean }) {
  const [list, setList] = useState<Received[]>([]);
  useEffect(() => {
    supabase.rpc("my_feedback", { _sid: sessionId }).then(({ data }) => setList((data as unknown as Received[]) ?? []));
  }, [sessionId, tick]);
  if (!list.length)
    return showEmpty ? <p className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">{EMPTY.feedback}</p> : null;
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Обратная связь вам ({list.length})</h3>
      {list.map((f) => (
        <div key={f.id} className="rounded-lg bg-muted p-3 text-sm">
          <div className="font-medium">{f.from_role === "leader" ? `Ведущий${f.from_name ? ` · ${f.from_name}` : ""}` : f.from_name ?? "Участник"} · ход #{f.turn_no}{f.overall_rating ? ` · ★ ${f.overall_rating}` : ""}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {CRITERIA.map(([k, l]) => f.scores?.[k] ? <span key={k}>{l}: {f.scores[k]}</span> : null)}
          </div>
          {f.good && <p className="mt-1">✅ {f.good}</p>}
          {f.improve && <p>🔧 {f.improve}</p>}
        </div>
      ))}
    </section>
  );
}

function SessionDynamics({ sid, uid }: { sid: string; uid?: string | undefined }) {
  const points = useSkillHistory(uid);
  return <DynamicsBlock points={points} sourceId={sid} />;
}

type Cat = { id: string; title: string; is_active: boolean };
function PairPicker({ sid, catIds, cats, current, side }: { sid: string; catIds: string[]; cats: Cat[]; current: string | null; side: PairSide }) {
  const [withCards, setWithCards] = useState<Set<string> | null>(null);
  useEffect(() => {
    supabase.from("cards").select("category_id").eq("type", "situation").eq("is_active", true)
      .then(({ data }) => setWithCards(data && data.length ? new Set(data.map((r) => r.category_id as string)) : null));
  }, []);
  const avail = cats.filter((c) => c.is_active && c.title.includes("→") && (catIds.length === 0 || catIds.includes(c.id)) && (!withCards || withCards.has(c.id)));
  const cur = cats.find((c) => c.id === current);
  const choose = async (cat: string | null, s: PairSide) => {
    const { error } = await supabase.rpc("choose_my_pair", { _sid: sid, _cat: cat as string, _side: s });
    if (error) toast.error("Не удалось сохранить выбор"); else if (cat) toast.success("Сценарий выбран");
  };
  const pill = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-primary text-primary-foreground" : "border border-input bg-background"}`;
  if (avail.length === 0) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      {cur ? (
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Ваш сценарий</div>
          <div className="font-serif text-xl">{rubricLabel(cur)}</div>
          <p className="mt-1 text-xs text-muted-foreground">{rubricHint(cur)}. Ведущий выдаст ситуацию из этой рубрики.</p>
          <button type="button" onClick={() => choose(null, "left")} className="mt-2 text-sm underline">Изменить</button>
        </div>
      ) : (
        <div>
          <div className="mb-1.5 text-sm font-medium">Выберите сценарий (рубрику)</div>
          <p className="mb-2 text-xs text-muted-foreground">Первым указан тот, кто прав: «Мастер — Клиент» — прав мастер, «Клиент — Мастер» — прав клиент.</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {avail.map((c) => (
              <button type="button" key={c.id} onClick={() => choose(c.id, "left")} className={pill(false) + " rounded-xl text-left"}>
                <div className="font-medium">{rubricLabel(c)}</div>
                <div className="text-xs text-muted-foreground">{rubricHint(c)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
