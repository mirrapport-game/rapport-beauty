import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DailyFeedback = { checks: { criterion: string; score: number }[]; comment: string };

export type Slot = "morning" | "day" | "evening";
/** Morning = open question, day = mini-case, evening = role-play line. */
export const SLOT_TYPE: Record<Slot, string> = { morning: "open", day: "mini_case", evening: "roleplay" };

async function load(ctx: { supabase: any; userId: string }, id: string, slot: Slot) {
  const { data } = await ctx.supabase.from("daily_cards").select("*").eq("id", id).maybeSingle();
  if (!data || data.user_id !== ctx.userId) throw new Error("Карточка не найдена");
  const db = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const { data: task } = await db.from("daily_tasks").select("*").eq("role_id", data.role_id).eq("type", SLOT_TYPE[slot]).maybeSingle();
  const { data: ans } = await db.from("daily_answers").select("*").eq("card_id", id).eq("slot", slot).maybeSingle();
  return { card: data, task, ans, db };
}

/** Reference answer is returned only once the card is answered. */
export const getDailyModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; slot: Slot }) => d)
  .handler(async ({ data, context }) => {
    const { task, ans } = await load(context, data.id, data.slot);
    if (!ans) return { model: null as string | null };
    return { model: (task?.model_answer as string | null) ?? null };
  });

export const submitDaily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; slot: Slot; answer: string }) => {
    if (!(d.slot in SLOT_TYPE)) throw new Error("Неверная часть дня");
    if (!d.answer?.trim() || d.answer.length > 4000) throw new Error("Ответ 1–4000 символов");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ feedback: DailyFeedback | null; error: string | null }> => {
    const { card, task, ans, db } = await load(context, data.id, data.slot);
    if (ans) return { feedback: ans.feedback_json as DailyFeedback, error: null };
    if (!task) return { feedback: null, error: "Для этой роли нет задания" };
    const criteria = (Array.isArray(task?.criteria) ? task.criteria : []) as string[];
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `Ты тренер по коммуникации в салон красоты. Оцени ответ сотрудника на задание по каждому критерию от 1 до 5 (критерии: ${criteria.join("; ")}). Дай короткий доброжелательный комментарий (2–4 предложения) с конкретным советом. По-русски.`,
        input: [{ role: "user", content: `Задание: ${task?.question}\nЭталон: ${task?.model_answer}\n\nОтвет сотрудника: ${data.answer}` }],
        text: {
          format: {
            type: "json_schema", name: "daily", strict: true,
            schema: {
              type: "object", additionalProperties: false, required: ["checks", "comment"],
              properties: {
                checks: { type: "array", items: { type: "object", additionalProperties: false, required: ["criterion", "score"], properties: { criterion: { type: "string" }, score: { type: "integer" } } } },
                comment: { type: "string" },
              },
            },
          },
        },
      });
      const text = res.output.flatMap((o: any) => (o.type === "message" ? o.content : [])).map((c: any) => (c.type === "output_text" ? c.text : "")).join("");
      const fb = JSON.parse(text) as DailyFeedback;
      fb.checks = fb.checks.map((c) => ({ ...c, score: Math.min(5, Math.max(1, Math.round(c.score))) }));
      await db.from("daily_answers").insert({ card_id: card.id, user_id: context.userId, slot: data.slot, task_id: task.id, answer_text: data.answer.trim(), feedback_json: fb as any });
      const { count } = await db.from("daily_answers").select("id", { count: "exact", head: true }).eq("card_id", card.id);
      if ((count ?? 0) >= 3) await db.from("daily_cards").update({ status: "answered", answer_text: data.answer.trim(), feedback_json: fb as any }).eq("id", card.id);
      return { feedback: fb, error: null };
    } catch (e) {
      console.error(e);
      if (e instanceof GatewayError && e.httpStatus === 402) return { feedback: null, error: "Закончились кредиты ИИ" };
      if (e instanceof GatewayError && e.httpStatus === 429) return { feedback: null, error: "Слишком много запросов, попробуйте через минуту" };
      return { feedback: null, error: "Не удалось оценить ответ, попробуйте ещё раз" };
    }
  });

export type PracticeCard = {
  situation: { id: string; title: string; description: string | null; opening_line: string | null; level: number | null };
  skill: { title: string; description: string | null; formula: string | null; how_to_apply: string[]; why_learn: string | null } | null;
};

/** After a slot is answered: a harder situation from the same role's series + its linked skill card. attempt 1 → level 2, 2 → level 3. */
export const getDailyPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; slot: Slot; attempt: number }) => {
    if (!(d.slot in SLOT_TYPE)) throw new Error("Неверная часть дня");
    if (d.attempt !== 1) throw new Error("Повторить можно только один раз");
    return d;
  })
  .handler(async ({ data, context }): Promise<PracticeCard | null> => {
    const { card, ans, db } = await load(context, data.id, data.slot);
    if (!ans) return null;
    const { ROLE_QUICK_CATEGORIES, dayIndex } = await import("@/lib/daily-path");
    const cats = ROLE_QUICK_CATEGORIES[card.role_id] ?? [];
    const level = 2;
    let q = db.from("cards").select("id,title,description,opening_line,level,linked_skill_id").eq("type", "situation").eq("is_active", true).eq("level", level);
    if (cats.length) q = q.in("category_id", cats);
    const { data: pool } = await q.order("id");
    if (!pool?.length) return null;
    const s = pool[dayIndex(`${card.id}:${data.slot}`, pool.length)]!;
    let skill: PracticeCard["skill"] = null;
    if (s.linked_skill_id) {
      const { data: k } = await db.from("cards").select("title,description,formula,how_to_apply,why_learn").eq("id", s.linked_skill_id).maybeSingle();
      if (k) skill = { title: k.title, description: k.description, formula: k.formula, why_learn: k.why_learn, how_to_apply: Array.isArray(k.how_to_apply) ? (k.how_to_apply as string[]) : [] };
    }
    return { situation: { id: s.id, title: s.title, description: s.description, opening_line: s.opening_line, level: s.level }, skill };
  });

/** Scores a practice answer (not saved, does not affect the day's progress). */
export const scoreDailyPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; slot: Slot; situationId: string; answer: string }) => {
    if (!(d.slot in SLOT_TYPE)) throw new Error("Неверная часть дня");
    if (!d.answer?.trim() || d.answer.length > 4000) throw new Error("Ответ 1–4000 символов");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ feedback: DailyFeedback | null; error: string | null }> => {
    const { ans, db } = await load(context, data.id, data.slot);
    if (!ans) return { feedback: null, error: "Сначала ответьте на основное задание" };
    const { data: s } = await db.from("cards").select("title,description,opening_line,linked_skill_id").eq("id", data.situationId).eq("type", "situation").maybeSingle();
    if (!s) return { feedback: null, error: "Ситуация не найдена" };
    const { data: k } = s.linked_skill_id ? await db.from("cards").select("title,formula").eq("id", s.linked_skill_id).maybeSingle() : { data: null };
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `Ты тренер по коммуникации в салоне красоты. Оцени ответ сотрудника от 1 до 5 по критериям: «Спокойный тон», «Понимание клиента», «Применение навыка${k ? ` ${k.title} (${k.formula ?? ""})` : ""}», «Конкретное решение». Дай короткий доброжелательный комментарий (2–4 предложения) с конкретным советом. По-русски.`,
        input: [{ role: "user", content: `Ситуация: ${s.title}\n${s.description ?? ""}\nРеплика собеседника: ${s.opening_line ?? ""}\n\nОтвет сотрудника: ${data.answer}` }],
        text: { format: { type: "json_schema", name: "practice", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["checks", "comment"],
          properties: {
            checks: { type: "array", items: { type: "object", additionalProperties: false, required: ["criterion", "score"], properties: { criterion: { type: "string" }, score: { type: "integer" } } } },
            comment: { type: "string" },
          } } } },
      });
      const text = res.output.flatMap((o: any) => (o.type === "message" ? o.content : [])).map((c: any) => (c.type === "output_text" ? c.text : "")).join("");
      const fb = JSON.parse(text) as DailyFeedback;
      fb.checks = fb.checks.map((c) => ({ ...c, score: Math.min(5, Math.max(1, Math.round(c.score))) }));
      return { feedback: fb, error: null };
    } catch (e) {
      console.error(e);
      if (e instanceof GatewayError && e.httpStatus === 402) return { feedback: null, error: "Закончились кредиты ИИ" };
      if (e instanceof GatewayError && e.httpStatus === 429) return { feedback: null, error: "Слишком много запросов, попробуйте через минуту" };
      return { feedback: null, error: "Не удалось оценить ответ, попробуйте ещё раз" };
    }
  });
