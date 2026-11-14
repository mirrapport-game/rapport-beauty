import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { STAGES, timerLeft, useLiveSession, type GameSession, type Participant } from "@/lib/session";
import { STAGE_TIMER, MODES, toGameCard, toSkill, useCategories, useTurnCards } from "@/lib/game-cards";
import { roleAt, sideOf } from "@/lib/pairs";
import type { CardRow } from "@/lib/library";
import { LeaderReview } from "@/components/LeaderReview";
import { TimerRing } from "@/components/TimerRing";
import { GuestInvites } from "@/components/GuestInvites";
import { RoleCard, SituationCard, SkillCard, SolutionCard } from "@/components/GameCards";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/leader/$id")({
  head: () => ({ meta: [{ title: `Панель ведущего — ${GAME_TITLE}` }] }),
  component: LeaderPanel,
});

function AdminSelfPlay({ sid }: { sid: string }) {
  const { is, loaded } = useRoles();
  if (!loaded || !is("admin")) return null;
  const join = async () => {
    const { error } = await supabase.rpc("admin_join_as_player", { _sid: sid });
    if (error) { toast.error(error.message); return; }
    toast.success("Вы добавлены как игрок");
    window.open(`/play/${sid}`, "_blank");
  };
  return (
    <div className="rounded-2xl border border-dashed border-primary/50 bg-card p-4 text-center">
      <button type="button" onClick={join} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">🧪 Играть самому (тест)</button>
      <p className="mt-1.5 text-xs text-muted-foreground">Только для админа: вы станете участником, экран игрока откроется в новой вкладке.</p>
    </div>
  );
}

const STATUS: Record<string, string> = {
  joined: "в лобби", has_cards: "получил карточки", first_playing: "1-й отыгрыш", gave_feedback: "обратная связь",
  skill_opened: "навык открыт", second_playing: "2-й отыгрыш", solution_opened: "решение открыто", done: "ход завершён",
};

function LeaderPanel() {
  const { id } = Route.useParams();
  const { session: s, participants, feedback, loaded } = useLiveSession(id);
  const cats = useCategories();
  const { cards: turnCards } = useTurnCards(id, s?.turn_no);
  const [lib, setLib] = useState<CardRow[]>([]);
  const [pid, setPid] = useState("");
  const [cardId, setCardId] = useState("");
  const [role, setRole] = useState("");
  const [roleCard, setRoleCard] = useState("");
  const [skillId, setSkillId] = useState("");
  const [notes, setNotes] = useState<{ id: string; participant_id: string | null; note: string; created_at: string }[]>([]);
  const [note, setNote] = useState("");
  const [leaderName, setLeaderName] = useState("Ведущий");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle()
      .then(({ data: p }) => p?.display_name && setLeaderName(p.display_name)));
  }, []);

  useEffect(() => {
    supabase.from("cards").select("*").eq("is_active", true).in("type", ["situation", "skill", "role"]).order("id")
      .then(({ data }) => setLib(data ?? []));
  }, []);
  const loadNotes = () => supabase.from("leader_notes").select("*").eq("session_id", id).order("created_at", { ascending: false }).then(({ data }) => setNotes(data ?? []));
  useEffect(() => { loadNotes(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const catIds = (s?.category_ids as string[] | undefined) ?? [];
  const inCats = (c: CardRow) => catIds.length === 0 || !c.category_id || catIds.includes(c.category_id);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const loadUsed = () => supabase.from("card_assignments").select("card_id").eq("session_id", id).eq("card_type", "situation")
    .then(({ data }) => setUsedIds((data ?? []).map((r) => r.card_id as string)));
  useEffect(() => { loadUsed(); }, [id, s?.turn_no]); // eslint-disable-line react-hooks/exhaustive-deps
  // One scenario = one family (1.1 / 1.2 / 1.3 share context): once any level is dealt, the whole family is excluded.
  const familyOf = (c: CardRow) => c.scenario_id ? c.scenario_id.replace(/_\d+$/, "") : (c.card_no ?? c.id).split(".")[0];
  const usedFamilies = useMemo(() => new Set(lib.filter((c) => usedIds.includes(c.id)).map(familyOf)), [lib, usedIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const pairCat = participants.find((p) => p.id === pid)?.pair_category_id ?? null;
  const pool = useMemo(() => lib.filter((c) => c.type === "situation" && inCats(c) && (!pairCat || c.category_id === pairCat) && !usedFamilies.has(familyOf(c))), [lib, s?.category_ids, usedFamilies, pairCat]); // eslint-disable-line react-hooks/exhaustive-deps
  const skillsLib = lib.filter((c) => c.type === "skill");
  const roleCards = lib.filter((c) => c.type === "role" && inCats(c));
  // Role the participant picked for themselves (either side of the pair counts).
  const ownRole = (p: Participant | undefined) => {
    const c = cats.find((k) => k.id === p?.pair_category_id);
    return c ? roleAt(c.title, sideOf(p?.pair_side)) : "";
  };
  // When the leader switches player, preselect the role card matching that player's pick.
  const autoPid = useRef("");
  useEffect(() => {
    if (!pid || pid === autoPid.current) return;
    autoPid.current = pid;
    const p = participants.find((x) => x.id === pid);
    const c = cats.find((k) => k.id === p?.pair_category_id);
    if (!c) return;
    const own = roleAt(c.title, sideOf(p?.pair_side));
    const hits = lib.filter((r) => r.type === "role" && r.category_id === c.id && (r.title === own || r.title.startsWith(own)));
    // Only preselect when the pick names one card; "Клиент" may mean клиентка or клиент-мужчина.
    const hit = hits[0];
    if (hit) setRoleCard(hit.id);
  }, [pid, participants, cats, lib]);
  const chosen = pool.find((c) => c.id === cardId);
  const dialogue = (chosen?.dialogue as { who: string }[] | null) ?? [];
  const roles = Array.from(new Set(dialogue.map((d) => (d.who === "Вы" ? "Сотрудник (вы)" : d.who))));

  if (!loaded) return <p className="p-8">Загрузка…</p>;
  if (!s) return <p className="p-8">Сессия не найдена.</p>;

  const durations = (s.stage_durations as Record<string, number>) ?? {};
  const currentP = participants.find((p) => p.id === s.current_participant);
  const finished = s.status === "finished";

  const upd = async (patch: Partial<GameSession>, action?: string) => {
    const { error } = await supabase.from("game_sessions").update(patch).eq("id", id);
    if (error) toast.error("Ошибка сохранения");
    if (action) await supabase.from("turn_log").insert({ session_id: id, participant_id: s.current_participant, card_id: s.current_card_id, action });
  };
  const timerFor = (stage: number, start: boolean) => {
    const d = durations[STAGE_TIMER[stage] ?? ""] ?? s.timer_duration;
    return { timer_duration: d, timer_remaining: d, timer_started_at: start ? new Date().toISOString() : null };
  };

  const deal = async () => {
    if (!pid || !chosen) { toast.error("Выберите игрока и ситуацию"); return; }
    if (!skillId) { toast.error("Выберите навык"); return; }
    const turn = s.turn_no + 1;
    const { data: scn } = chosen.scenario_id
      ? await supabase.from("scenarios").select("solution_id").eq("id", chosen.scenario_id).maybeSingle()
      : { data: null };
    const rows = [
      { card_id: chosen.id, card_type: "situation", revealed: true },
      { card_id: skillId, card_type: "skill", revealed: false },
      ...(scn?.solution_id ? [{ card_id: scn.solution_id, card_type: "solution", revealed: false }] : []),
      ...(roleCard ? [{ card_id: roleCard, card_type: "role", revealed: true }] : []),
    ].map((r) => ({ ...r, session_id: id, participant_id: pid, turn_no: turn, round_stage: "assign_cards" }));
    const { error } = await supabase.from("card_assignments").insert(rows);
    if (error) { toast.error("Не удалось выдать карточки"); return; }
    if (!scn?.solution_id) toast.warning("У этой ситуации нет карточки решения");
    const rc = roleCards.find((r) => r.id === roleCard);
    await upd({ stage: 1, turn_no: turn, current_participant: pid, current_card_id: chosen.id,
      turn_role: rc?.title || role || roles[0] || "Сотрудник", status: "active", ...timerFor(1, false) }, "deal");
    setCardId(""); setRoleCard(""); loadUsed();
    toast.success(`Карточки выданы: ${participants.find((p) => p.id === pid)?.display_name}`);
  };

  const reveal = async (type: "skill" | "solution") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("card_assignments")
      .update({ revealed: true, revealed_at: new Date().toISOString(), revealed_by: u.user?.id ?? null })
      .eq("session_id", id).eq("turn_no", s.turn_no).eq("participant_id", s.current_participant!).eq("card_type", type);
    if (error) { toast.error("Не удалось открыть"); return false; }
    toast.success(type === "skill" ? "Навык открыт" : "Решение открыто");
    return true;
  };

  const go = async (stage: number) => {
    const names = ["", "", "first_play", "feedback", "reveal_skill", "second_play", "reveal_solution", "finish"];
    if (stage === 4 && !(await reveal("skill"))) return;
    if (stage === 6 && !(await reveal("solution"))) return;
    if (stage === 7) {
      const idx = participants.findIndex((p) => p.id === s.current_participant);
      const next = participants.slice(idx + 1).concat(participants.slice(0, idx)).find((p) => p.status !== "done");
      await upd({ stage: 0, current_participant: null, current_card_id: null, turn_role: null, ...timerFor(1, false) }, "finish");
      if (next) { setPid(next.id); toast.success(`Ход передан: ${next.display_name}`); }
      return;
    }
    await upd({ stage, ...(STAGE_TIMER[stage] ? timerFor(stage, true) : { timer_started_at: null }) }, names[stage]);
  };

  const nextStage = () => { if (s.stage > 0 && s.stage < 7) go(s.stage + 1); };
  const finishSession = async () => {
    if (!confirm("Завершить сессию для всех участников?")) return;
    await upd({ status: "finished", stage: 0, current_participant: null, current_card_id: null, timer_started_at: null }, "session_finished");
    toast.success("Сессия завершена");
  };
  const addNote = async () => {
    if (!note.trim()) return;
    const { error } = await supabase.from("leader_notes").insert({ session_id: id, participant_id: s.current_participant ?? (pid || null), note: note.trim() });
    if (error) toast.error("Не сохранилось"); else { setNote(""); loadNotes(); }
  };

  const sit = turnCards.find((c) => c.card_type === "situation");
  const skill = turnCards.find((c) => c.card_type === "skill");
  const sol = turnCards.find((c) => c.card_type === "solution");
  const roleC = turnCards.find((c) => c.card_type === "role");
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${s.code}` : "";
  const notePid = s.current_participant ?? pid;
  const sel = "rounded-md border border-input bg-background px-3 py-2";

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-24 lg:grid-cols-[1fr_300px]">
      <section className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:flex sm:flex-wrap sm:justify-between sm:gap-4 sm:p-5">
          <div className="min-w-0">
            <div className="truncate text-sm text-muted-foreground">{s.title} · {MODES[s.mode] ?? s.mode}</div>
            <div className="truncate text-lg font-bold sm:text-xl">
              {finished ? "Сессия завершена" : currentP ? <>Игрок: {currentP.display_name} · Ход #{s.turn_no}</> : "Ход не начат"}
            </div>
            {s.stage > 0 && <div className="truncate text-sm text-primary">Этап: {STAGES[s.stage - 1]}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <TimerRing s={s} />
            <div className="flex flex-col gap-1.5 text-sm">
              {s.timer_started_at ? (
                <button onClick={() => upd({ timer_started_at: null, timer_remaining: timerLeft(s, Date.now()) })} className="rounded border border-input px-3 py-1">Пауза</button>
              ) : (
                <button onClick={() => upd({ timer_started_at: new Date().toISOString() })} className="rounded bg-primary px-3 py-1 text-primary-foreground">Старт</button>
              )}
              <button onClick={() => upd({ timer_started_at: null, timer_remaining: s.timer_duration })} className="rounded border border-input px-3 py-1">Сброс</button>
              <button disabled={s.stage === 0 || s.stage >= 7} onClick={nextStage} className="rounded border border-input px-3 py-1 disabled:opacity-40">Следующий этап</button>
            </div>
          </div>
        </div>

        {!finished && s.stage === 0 && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">① Выдать роль + ситуацию</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={pid} onChange={(e) => setPid(e.target.value)} className={sel}>
                <option value="">— игрок —</option>
                {participants.map((p) => <option key={p.id} value={p.id}>{p.display_name}{ownRole(p) ? ` · ${ownRole(p)}` : ""}{p.status === "done" ? " (уже ходил)" : ""}</option>)}
              </select>
              <select value={cardId} onChange={(e) => { setCardId(e.target.value); setRole(""); }} className={sel}>
                <option value="">— ситуация —</option>
                {pool.map((c) => <option key={c.id} value={c.id}>{c.card_no && c.card_no.length < 8 ? c.card_no + " " : ""}{c.title}</option>)}
              </select>
              {roleCards.length > 0 ? (
                <select value={roleCard} onChange={(e) => setRoleCard(e.target.value)} className={sel}>
                  <option value="">— карточка роли (необязательно) —</option>
                  {roleCards.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              ) : null}
              {!roleCard && (
                <select value={role} onChange={(e) => setRole(e.target.value)} className={sel}>
                  {roles.length === 0 && <option value="">— роль —</option>}
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className={sel}>
                <option value="">— навык (скрыт до этапа ④) —</option>
                {skillsLib.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCardId(pool[Math.floor(Math.random() * pool.length)]?.id ?? "")} className="rounded-md border border-input px-4 py-2 text-sm">Случайная ситуация</button>
              <button onClick={deal} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Выдать</button>
            </div>
            {participants.length === 0 && <p className="text-sm text-muted-foreground">Пока нет участников — поделитесь ссылкой или QR-кодом.</p>}
          </div>
        )}

        {s.stage > 0 && (
          <ol className="space-y-2 rounded-2xl border border-border bg-card p-5">
            {STAGES.map((name, i) => {
              const n = i + 1;
              const done = s.stage > n || (n === 1 && s.stage >= 1);
              const isNext = s.stage + 1 === n;
              return (
                <li key={n} className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.stage === n ? "bg-accent" : ""}`}>
                  <span className={done ? "text-muted-foreground" : ""}>{["①", "②", "③", "④", "⑤", "⑥", "⑦"][i]} {n === 4 || n === 6 ? "🔓 " : ""}{name}</span>
                  {done ? <span className="text-sm">✅</span> : (
                    <button disabled={!isNext} onClick={() => go(n)} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-30">
                      {n === 4 || n === 6 ? `Открыть (${currentP?.display_name ?? "—"})` : n === 7 ? "Следующий игрок" : "▶ Запустить"}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {sit && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <RoleCard role={roleC?.card.title ?? s.turn_role ?? "Сотрудник"} description={roleC?.card.description} />
              <SituationCard card={toGameCard(sit.card, cats)} />
            </div>
            <div className="space-y-4">
              {skill && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{skill.revealed ? "✅ открыт игроку" : "🔒 игрок пока не видит"}</div>
                  <SkillCard skill={toSkill(skill.card)} />
                </div>
              )}
              {sol && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">{sol.revealed ? "✅ открыто игроку" : "🔒 игрок пока не видит"}</div>
                  <SolutionCard task={sol.card.task ?? ""} solution={sol.card.example_dialogue ?? ""} playMode={(sol.card as { play_mode?: string | null }).play_mode ?? null} />
                </div>
              )}
            </div>
          </div>
        )}

        <LeaderReview s={s} participants={participants} feedback={feedback} leaderName={leaderName}
          onToggleAnon={() => upd({ feedback_anonymous: !s.feedback_anonymous })} />
      </section>

      <aside className="space-y-4">
        <AdminSelfPlay sid={id} />
        <GuestInvites sessionId={id} />
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <div className="text-sm text-muted-foreground">Код сессии</div>
          <div className="font-mono text-4xl font-bold tracking-widest text-primary">{s.code}</div>
          {joinUrl && <img alt="QR-код приглашения" className="mx-auto mt-3 h-40 w-40" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} />}
          <div className="mt-2 flex justify-center gap-3 text-sm">
            <button onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Ссылка скопирована"); }} className="text-primary">Копировать ссылку</button>
            <Link to="/leader/$id/qr" params={{ id }} className="text-primary">На весь экран</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Участники ({participants.length}/{s.max_participants})</h3>
          {participants.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Пока нет участников — поделитесь ссылкой.</p>}
          <ul className="mt-2 space-y-1.5 text-sm">
            {participants.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span className={p.id === s.current_participant ? "font-semibold text-primary" : ""}>{p.id === s.current_participant ? "▶ " : ""}{p.display_name}</span>
                <span className="text-right text-muted-foreground">{STATUS[p.status] ?? p.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Заметки {notePid ? `· ${participants.find((p) => p.id === notePid)?.display_name ?? ""}` : ""}</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Видно только вам" className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm" />
          <button onClick={addNote} className="mt-1 rounded-md border border-input px-3 py-1 text-sm">Сохранить заметку</button>
          <ul className="mt-3 max-h-60 space-y-2 overflow-auto text-sm">
            {notes.filter((n) => !notePid || n.participant_id === notePid).map((n) => <li key={n.id} className="rounded bg-muted p-2">{n.note}</li>)}
          </ul>
        </div>
        {!finished && <button onClick={finishSession} className="w-full rounded-md border border-destructive py-2 text-sm text-destructive">Завершить сессию</button>}
      </aside>
    </main>
  );
}
