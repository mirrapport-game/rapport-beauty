import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ASession = { id: string; title: string; code: string; leader_id: string; status: string; created_at: string; category_ids: string[] };
export type AFeedback = { session_id: string; to_participant: string; scores: Record<string, number>; overall_rating: number | null; created_at: string };
export type AParticipant = { id: string; session_id: string; user_id: string; display_name: string; joined_at: string };

/** Admin-wide raw data (admin RLS grants read on all rows). */
export function useAnalyticsData() {
  const [d, setD] = useState({
    sessions: [] as ASession[], feedback: [] as AFeedback[], participants: [] as AParticipant[],
    cats: [] as { id: string; title: string }[], people: new Map<string, string>(), loaded: false,
  });
  useEffect(() => {
    (async () => {
      const [s, f, p, c, u] = await Promise.all([
        supabase.from("game_sessions").select("id,title,code,leader_id,status,created_at,category_ids").order("created_at", { ascending: false }),
        supabase.from("feedback").select("session_id,to_participant,scores,overall_rating,created_at"),
        supabase.from("session_participants").select("id,session_id,user_id,display_name,joined_at"),
        supabase.from("categories").select("id,title").order("sort_order"),
        supabase.rpc("admin_list_users"),
      ]);
      setD({
        sessions: (s.data as ASession[]) ?? [], feedback: (f.data as AFeedback[]) ?? [], participants: (p.data as AParticipant[]) ?? [],
        cats: c.data ?? [], people: new Map(((u.data as { id: string; display_name: string; email: string }[]) ?? []).map((x) => [x.id, x.display_name || x.email])),
        loaded: true,
      });
    })();
  }, []);
  return d;
}
