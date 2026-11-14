import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GameSession = Omit<Tables<"game_sessions">, "current_skill_id">;
export type Participant = Tables<"session_participants">;
export type Feedback = Tables<"feedback">;

export const STAGES = [
  "Выдать роль и ситуацию",
  "Первый отыгрыш",
  "Обратная связь",
  "Открыть навык",
  "Второй отыгрыш",
  "Открыть решение",
  "Завершить ход",
] as const;

const COLS =
  "id,code,title,leader_id,rubric_no,stage,turn_no,current_participant,current_card_id,turn_role,timer_started_at,timer_duration,timer_remaining,status,created_at,category_ids,mode,max_participants,stage_durations,started_at,finished_at,feedback_anonymous";

/** Live session state: session row, participants, feedback — kept fresh via realtime. */
export function useLiveSession(id: string) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [s, p, f] = await Promise.all([
      supabase.from("game_sessions").select(COLS).eq("id", id).maybeSingle(),
      supabase.from("session_participants").select("*").eq("session_id", id).order("joined_at"),
      supabase.from("feedback").select("*").eq("session_id", id).order("created_at"),
    ]);
    setSession((s.data as GameSession) ?? null);
    setParticipants(p.data ?? []);
    setFeedback(f.data ?? []);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`sess-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback", filter: `session_id=eq.${id}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, reload]);

  return { session, participants, feedback, loaded, reload };
}

/** Seconds left on the shared timer. */
export function timerLeft(s: Pick<GameSession, "timer_started_at" | "timer_duration" | "timer_remaining">, now: number) {
  if (s.timer_started_at) {
    const elapsed = (now - new Date(s.timer_started_at).getTime()) / 1000;
    return Math.max(0, Math.ceil((s.timer_remaining ?? s.timer_duration) - elapsed));
  }
  return s.timer_remaining ?? s.timer_duration;
}

export function useNow(ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    /* audio unavailable */
  }
}
