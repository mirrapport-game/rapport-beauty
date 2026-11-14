/** Rubric title = a pair of roles, e.g. "Мастер → Клиент". Either side can be played. */
export type PairSide = "left" | "right";

export const splitPair = (t: string) => t.split("→").map((x) => x.trim()) as [string, string];

/** The role a player who sits on `side` performs. */
export const roleAt = (t: string, side: PairSide) => splitPair(t)[side === "left" ? 0 : 1];

/** The counterpart role for a player who sits on `side`. */
export const partnerAt = (t: string, side: PairSide) => splitPair(t)[side === "left" ? 1 : 0];

export const sideOf = (v: string | null | undefined): PairSide => (v === "right" ? "right" : "left");

/** Every distinct role a participant may pick from the given rubric titles. */
export const allRoles = (titles: string[]) => Array.from(new Set(titles.flatMap((t) => splitPair(t))));
