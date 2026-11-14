import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Card, Skill } from "@/lib/game";
import type { CardRow } from "@/lib/library";

export type Category = { id: string; title: string; rubric_no: number | null; sort_order: number; is_active: boolean; deck?: string };
export type TurnCard = { assignment_id: string; participant_id: string; card_type: string; revealed: boolean; card: CardRow };

export const MODES: Record<string, string> = {
  classic: "Классический", group: "Групповой", flipped: "Перевёрнутый", blind_skill: "Навык вслепую",
  role_swap: "Смена ролей", time_pressure: "На время", random: "Рандомный",
};
export const MODE_HINTS: Record<string, string> = {
  classic: "Обычный ход: участник получает роль и ситуацию, отыгрывает, получает отзыв, затем открывается навык и второй отыгрыш.",
  group: "Ситуацию отыгрывают несколько участников одновременно, остальные наблюдают и дают обратную связь.",
  flipped: "Участник играет «другую сторону»: например, не администратора, а клиента — чтобы понять его чувства.",
  blind_skill: "Навык не открывается перед вторым отыгрышем — участник сам догадывается, какой приём нужен.",
  role_swap: "После первого отыгрыша партнёры меняются ролями и играют ту же ситуацию снова.",
  time_pressure: "Отыгрыш на сокращённом таймере — тренировка быстрых и точных ответов.",
  random: "Для каждой карточки режим выбирается случайно. Какой — увидите в карточке решения под спойлером.",
};
export const DURATION_STAGES = [
  ["assign_cards", "Выдача карточек"], ["first_play", "Первый отыгрыш"],
  ["feedback", "Обратная связь"], ["second_play", "Второй отыгрыш"],
] as const;
/** Session stage number (1..7) → timer key. */
export const STAGE_TIMER: Record<number, string> = { 1: "assign_cards", 2: "first_play", 3: "feedback", 5: "second_play" };

/** Library card row → the shape the card components render. */
export function toGameCard(r: CardRow, cats: Category[]): Card {
  const cat = cats.find((c) => c.id === r.category_id);
  return {
    id: r.card_no ?? r.id,
    rubric_no: cat?.rubric_no ?? 0,
    rubric: cat?.title ?? "",
    title: r.title,
    situation: r.description ?? "",
    dialogue: (r.dialogue as Card["dialogue"] | null) ?? (r.opening_line ? [{ who: "Собеседник", line: r.opening_line }] : []),
  };
}
export function toSkill(r: CardRow): Skill {
  return {
    id: r.id, title: r.title, formula: r.formula ?? "", description: r.description ?? "",
    how_to_apply: (r.how_to_apply as string[] | null) ?? [], why_learn: r.why_learn ?? "", tags: (r.tags as string[] | null) ?? [],
  };
}

export function useCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    supabase.from("categories").select("id,title,rubric_no,sort_order,is_active,deck").order("sort_order").then(({ data }) => setCats((data as Category[]) ?? []));
  }, []);
  return cats;
}

/** Cards of the current turn the caller may see (hidden skill/solution are not returned until revealed). */
export function useTurnCards(sessionId: string, turnNo: number | undefined) {
  const [cards, setCards] = useState<TurnCard[]>([]);
  const load = useCallback(async () => {
    if (!turnNo) { setCards([]); return; }
    const { data } = await supabase.rpc("session_cards", { _sid: sessionId, _turn: turnNo });
    setCards((data as unknown as TurnCard[]) ?? []);
  }, [sessionId, turnNo]);
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`assign-${sessionId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_assignments", filter: `session_id=eq.${sessionId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, load]);
  return { cards, reload: load };
}
