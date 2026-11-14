import type { Database } from "@/integrations/supabase/types";

export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
export type ScenarioInsert = Database["public"]["Tables"]["scenarios"]["Insert"];
export type CardType = "role" | "situation" | "skill" | "solution";

export const TYPE_LABEL: Record<CardType, string> = {
  role: "Роль", situation: "Ситуация", skill: "Навык", solution: "Решение",
};

export const ARRAY_FIELDS = ["how_to_apply", "steps", "criteria", "tags", "categories", "skill_ids"] as const;

/** Columns allowed for card import/export (everything except timestamps). */
export const CARD_COLUMNS = [
  "id", "type", "category_id", "direction_id", "scenario_id", "title", "description",
  "opening_line", "task", "claim_type", "level", "formula", "how_to_apply", "why_learn",
  "linked_skill_id", "steps", "criteria", "example_dialogue", "tags", "categories",
  "paired_with", "card_no", "batch_id", "is_active",
] as const;

export const SCENARIO_COLUMNS = [
  "id", "category_id", "direction_id", "claim_type", "title", "level",
  "situation_id", "skill_ids", "solution_id", "batch_id",
] as const;

export const REQUIRED: Record<CardType, string[]> = {
  role: ["id", "title"],
  situation: ["id", "title", "description"],
  skill: ["id", "title", "formula"],
  solution: ["id", "title", "scenario_id"],
};

export type ImportFile = {
  meta?: { batch_id?: string; version?: string };
  skills?: Record<string, unknown>[];
  solutions?: Record<string, unknown>[];
  situations?: Record<string, unknown>[];
  scenarios?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
};

export type Issue = { id: string; reason: string };
export type Plan = {
  cards: CardInsert[];
  scenarios: ScenarioInsert[];
  errors: Issue[];
  skipped: Issue[];
  counts: Record<string, number>;
};

const pick = <T extends readonly string[]>(o: Record<string, unknown>, cols: T) => {
  const r: Record<string, unknown> = {};
  for (const c of cols) if (o[c] !== undefined && o[c] !== "") r[c] = o[c];
  return r;
};

/**
 * Validate an import batch against already-existing ids.
 * New rows never overwrite existing ones: duplicates of existing ids are skipped,
 * duplicates inside the file and broken references are errors.
 */
export function planImport(
  file: ImportFile,
  batchId: string,
  existingCards: Set<string>,
  existingScenarios: Set<string>,
): Plan {
  const errors: Issue[] = [];
  const skipped: Issue[] = [];
  const cards: CardInsert[] = [];
  const scenarios: ScenarioInsert[] = [];
  const seen = new Set<string>();
  const groups: [keyof ImportFile, CardType][] = [
    ["skills", "skill"], ["situations", "situation"], ["solutions", "solution"], ["roles", "role"],
  ];
  const counts: Record<string, number> = {};

  for (const [key, type] of groups) {
    const list = (file[key] as Record<string, unknown>[] | undefined) ?? [];
    counts[key] = 0;
    for (const raw of list) {
      const id = String(raw["id"] ?? "").trim();
      const t = (raw["type"] as CardType) ?? type;
      const missing = REQUIRED[t]?.filter((f) => raw[f] === undefined || raw[f] === null || raw[f] === "") ?? ["type"];
      if (missing.length) { errors.push({ id: id || "(без id)", reason: `нет полей: ${missing.join(", ")}` }); continue; }
      if (seen.has(id)) { errors.push({ id, reason: "id повторяется в файле" }); continue; }
      seen.add(id);
      const lvl = raw["level"] === undefined || raw["level"] === "" ? undefined : Number(raw["level"]);
      if (lvl !== undefined && !(lvl >= 1 && lvl <= 3)) { errors.push({ id, reason: "level должен быть 1–3" }); continue; }
      if (existingCards.has(id)) { skipped.push({ id, reason: "уже существует" }); continue; }
      cards.push({ ...pick(raw, CARD_COLUMNS), id, type: t, level: lvl, batch_id: batchId } as CardInsert);
      counts[key]++;
    }
  }

  counts["scenarios"] = 0;
  for (const raw of file.scenarios ?? []) {
    const id = String(raw["id"] ?? "").trim();
    if (!id) { errors.push({ id: "(без id)", reason: "нет id сценария" }); continue; }
    if (seen.has(id)) { errors.push({ id, reason: "id повторяется в файле" }); continue; }
    seen.add(id);
    if (existingScenarios.has(id)) { skipped.push({ id, reason: "уже существует" }); continue; }
    scenarios.push({ ...pick(raw, SCENARIO_COLUMNS), id, batch_id: batchId } as ScenarioInsert);
    counts["scenarios"]++;
  }

  // Referential integrity
  const cardIds = new Set([...existingCards, ...cards.map((c) => c.id)]);
  const scnIds = new Set([...existingScenarios, ...scenarios.map((s) => s.id)]);
  const bad = new Set<string>();
  for (const c of cards) {
    if ((c.type === "situation" || c.type === "solution") && c.scenario_id && !scnIds.has(c.scenario_id)) {
      errors.push({ id: c.id, reason: `scenario_id «${c.scenario_id}» не найден` }); bad.add(c.id);
    }
    if (c.linked_skill_id && !cardIds.has(c.linked_skill_id)) {
      errors.push({ id: c.id, reason: `linked_skill_id «${c.linked_skill_id}» не найден` }); bad.add(c.id);
    }
  }
  for (const s of scenarios) {
    const refs = [s.situation_id, s.solution_id, ...((s.skill_ids as string[] | null) ?? [])].filter(Boolean) as string[];
    const miss = refs.filter((r) => !cardIds.has(r));
    if (miss.length) { errors.push({ id: s.id, reason: `ссылки не найдены: ${miss.join(", ")}` }); bad.add(s.id); }
  }

  return {
    cards: cards.filter((c) => !bad.has(c.id)),
    scenarios: scenarios.filter((s) => !bad.has(s.id)),
    errors, skipped, counts,
  };
}

/* ---------- CSV ---------- */

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!head) return [];
  const h = head.map((x) => x.trim().replace(/^\uFEFF/, ""));
  return body.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}

/** CSV rows → import file; arrays are split by ";" inside a cell. */
export function csvToImport(rows: Record<string, string>[]): ImportFile {
  const f: ImportFile = { skills: [], solutions: [], situations: [], scenarios: [], roles: [] };
  for (const r of rows) {
    const o: Record<string, unknown> = { ...r };
    for (const a of ARRAY_FIELDS) if (typeof r[a] === "string") o[a] = r[a] ? r[a].split(";").map((s) => s.trim()).filter(Boolean) : [];
    const key = ({ skill: "skills", solution: "solutions", situation: "situations", role: "roles", scenario: "scenarios" } as const)[r["type"] as "skill"];
    if (key) f[key]!.push(o);
  }
  return f;
}

export function toCsv(rows: Record<string, unknown>[], cols: readonly string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join(";") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
