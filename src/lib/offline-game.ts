// Offline single-device game: the deck is downloaded while online and kept in localStorage.
export type OCard = {
  id: string; type: string; category_id: string | null; title: string; description: string | null;
  opening_line: string | null; level: number | null; scenario_id: string | null; card_no: string | null;
  linked_skill_id: string | null; formula: string | null; how_to_apply: unknown; why_learn: string | null;
  task: string | null; example_dialogue: string | null;
};
export type OCat = { id: string; title: string; deck: string | null; sort_order: number };
export type ODeck = { savedAt: string; cats: OCat[]; cards: OCard[]; scenarios: { id: string; solution_id: string | null }[] };
export type OTurn = { player: string; cardId: string; score: number | null };
export type OSession = { id: string; title: string; createdAt: string; players: string[]; catIds: string[]; turns: OTurn[]; finished: boolean };

const DECK = "offline_deck";
const SESS = "offline_sessions";

export const loadDeck = (): ODeck | null => { try { return JSON.parse(localStorage.getItem(DECK) ?? "null"); } catch { return null; } };
export const saveDeck = (d: ODeck) => localStorage.setItem(DECK, JSON.stringify(d));
export const loadSessions = (): OSession[] => { try { return JSON.parse(localStorage.getItem(SESS) ?? "[]"); } catch { return []; } };
export const saveSessions = (s: OSession[]) => localStorage.setItem(SESS, JSON.stringify(s));

/** Cards of one scenario series (1.1/1.2/1.3) share a family; one family is dealt once per game. */
export const familyOf = (c: Pick<OCard, "scenario_id" | "card_no" | "id">) =>
  c.scenario_id ? c.scenario_id.replace(/_\d+$/, "") : (c.card_no ?? c.id).split(".")[0];

export function dealPool(deck: ODeck, s: OSession): OCard[] {
  const used = new Set(s.turns.map((t) => deck.cards.find((c) => c.id === t.cardId)).filter(Boolean).map((c) => familyOf(c!)));
  return deck.cards.filter((c) => c.type === "situation" && c.category_id && s.catIds.includes(c.category_id) && !used.has(familyOf(c)));
}
