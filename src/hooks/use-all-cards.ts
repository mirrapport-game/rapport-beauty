import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cards as base, type Card } from "@/lib/game";

/** Built-in cards plus scenarios added by participants (signed-in only). */
export function useAllCards() {
  const [extra, setExtra] = useState<Card[]>([]);
  useEffect(() => {
    supabase
      .from("user_scenarios")
      .select("id,rubric_no,rubric,title,situation,dialogue,author_name")
      .order("created_at")
      .then(({ data }) =>
        setExtra(
          (data ?? []).map((r) => ({
            id: r.id,
            rubric_no: r.rubric_no,
            rubric: r.rubric,
            title: r.title,
            situation: r.situation,
            dialogue: (r.dialogue as Card["dialogue"]) ?? [],
            author: r.author_name,
          })),
        ),
      );
  }, []);
  return [...base, ...extra];
}

/** Short label: "1.3" for built-in cards, "У-ab12" for participant cards. */
export const cardLabel = (c: Card) => (c.id.length > 10 ? `У-${c.id.slice(0, 4)}` : c.id);
