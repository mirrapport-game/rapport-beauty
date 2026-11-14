import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CRITERIA } from "@/lib/feedback";

export const SOLO_MAX_USER_MESSAGES = 20;

type Ctx = { supabase: any; userId: string };

async function ownSession(ctx: Ctx, id: string) {
  const { data, error } = await ctx.supabase.from("solo_sessions").select("*").eq("id", id).maybeSingle();
  if (error || !data || data.user_id !== ctx.userId) throw new Error("Сессия не найдена");
  return data as { id: string; status: string; situation_id: string | null; solution_id: string | null; scenario_id: string | null };
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

function outText(res: { output: any[] }) {
  return res.output
    .flatMap((o: any) => (o.type === "message" ? o.content : []))
    .map((c: any) => (c.type === "output_text" ? c.text : ""))
    .join("");
}

function aiError(e: unknown, GatewayError: any) {
  console.error(e);
  if (e instanceof GatewayError && (e as any).httpStatus === 402) return "Закончились кредиты ИИ";
  if (e instanceof GatewayError && (e as any).httpStatus === 429) return "Слишком много запросов, попробуйте через минуту";
  return "ИИ не ответил, попробуйте ещё раз";
}

/** Start a solo session for a scenario (or a random one). Bot's first line = the situation's opening line. */
export const startSolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenarioId?: string | undefined; categoryId?: string | undefined; level?: number | undefined }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    let q = db.from("scenarios").select("id, situation_id, solution_id, category_id, level").eq("is_active", true);
    if (data.scenarioId) q = q.eq("id", data.scenarioId);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.level) q = q.eq("level", data.level);
    const { data: list } = await q;
    if (!list?.length) throw new Error("Подходящих ситуаций нет");
    const sc = list[Math.floor(Math.random() * list.length)]!;
    const { data: s, error } = await context.supabase
      .from("solo_sessions")
      .insert({ user_id: context.userId, scenario_id: sc.id, situation_id: sc.situation_id, solution_id: sc.solution_id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { data: sit } = await db.from("cards").select("opening_line").eq("id", sc.situation_id!).maybeSingle();
    if (sit?.opening_line) await db.from("solo_messages").insert({ solo_session_id: s.id, sender: "bot", content: sit.opening_line });
    return { id: s.id as string };
  });

/** Save user message, ask the bot to answer in character. */
export const soloSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; text: string }) => {
    if (!d.text?.trim() || d.text.length > 2000) throw new Error("Сообщение 1–2000 символов");
    return d;
  })
  .handler(async ({ data, context }) => {
    const s = await ownSession(context, data.id);
    if (s.status !== "active") throw new Error("Диалог уже завершён");
    const db = await admin();
    const { data: hist } = await db.from("solo_messages").select("sender, content").eq("solo_session_id", s.id).order("created_at");
    const userCount = (hist ?? []).filter((m) => m.sender === "user").length;
    if (userCount >= SOLO_MAX_USER_MESSAGES) return { reply: null, limit: true, error: null };
    await db.from("solo_messages").insert({ solo_session_id: s.id, sender: "user", content: data.text.trim() });
    const { data: sit } = await db.from("cards").select("title, description, opening_line, category_id").eq("id", s.situation_id!).maybeSingle();
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `Ты актёр в обучающей игре для сотрудников салон красоты. Играй собеседника из ситуации (клиент, клиент или коллега) реалистично и эмоционально, коротко (1–3 предложения), по-русски. Не сдавайся слишком быстро: смягчайся только когда сотрудник проявляет эмпатию, слушает и предлагает конкретное решение. Не выходи из роли, не давай советов и не оценивай.\n\nСитуация «${sit?.title ?? ""}»: ${sit?.description ?? ""}\nТвоя первая реплика была: «${sit?.opening_line ?? ""}»`,
        input: [
          ...(hist ?? []).map((m) => ({ role: (m.sender === "bot" ? "assistant" : "user") as "assistant" | "user", content: m.content })),
          { role: "user" as const, content: data.text.trim() },
        ],
      });
      const reply = outText(res).trim() || "…";
      await db.from("solo_messages").insert({ solo_session_id: s.id, sender: "bot", content: reply });
      return { reply, limit: userCount + 1 >= SOLO_MAX_USER_MESSAGES, error: null };
    } catch (e) {
      return { reply: null, limit: false, error: aiError(e, GatewayError) };
    }
  });

export type SoloResult = {
  scores: Record<string, number>;
  what_worked: string;
  what_to_improve: string;
  solution: { title: string; description: string | null; steps: string[] | null } | null;
};

/** Finish: AI rates the dialogue on 6 criteria, then the reference solution is revealed. */
export const soloFinish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<SoloResult & { error: string | null }> => {
    const s = await ownSession(context, data.id);
    const db = await admin();
    const { data: sol } = s.solution_id
      ? await db.from("cards").select("title, description, steps").eq("id", s.solution_id).maybeSingle().then((r) => ({ data: r.data ? { ...r.data, steps: Array.isArray(r.data.steps) ? (r.data.steps as unknown[]).map(String) : null } : null }))
      : { data: null };
    const { data: prev } = await db.from("solo_feedback").select("*").eq("solo_session_id", s.id).maybeSingle();
    if (prev) return { scores: prev.scores as any, what_worked: prev.comments_what_worked ?? "", what_to_improve: prev.comments_what_to_improve ?? "", solution: sol, error: null };
    const { data: hist } = await db.from("solo_messages").select("sender, content").eq("solo_session_id", s.id).order("created_at");
    const { data: sit } = await db.from("cards").select("title, description").eq("id", s.situation_id!).maybeSingle();
    const dialog = (hist ?? []).map((m) => `${m.sender === "user" ? "Сотрудник" : "Собеседник"}: ${m.content}`).join("\n");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const keys = CRITERIA.map(([k]) => k);
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `Ты методист-тренер по коммуникации в салон красоты. Оцени реплики СОТРУДНИКА по критериям (1–5): ${CRITERIA.map(([k, l]) => `${k} — ${l}`).join(", ")}. Если критерий неприменим, ставь 3. Сравни с эталоном. Комментарии — по-русски, конкретно, 2–4 пункта, с цитатами.`,
        input: [{ role: "user", content: `Ситуация: ${sit?.title}. ${sit?.description}\n\nЭталон: ${sol?.title ?? ""}\n${sol?.description ?? ""}\n${JSON.stringify(sol?.steps ?? "")}\n\nДиалог:\n${dialog}` }],
        text: {
          format: {
            type: "json_schema",
            name: "feedback",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["scores", "what_worked", "what_to_improve"],
              properties: {
                scores: { type: "object", additionalProperties: false, required: keys, properties: Object.fromEntries(keys.map((k) => [k, { type: "integer" }])) },
                what_worked: { type: "string" },
                what_to_improve: { type: "string" },
              },
            },
          },
        },
      });
      const fb = JSON.parse(outText(res)) as { scores: Record<string, number>; what_worked: string; what_to_improve: string };
      for (const k of keys) fb.scores[k] = Math.min(5, Math.max(1, Math.round(fb.scores[k] ?? 3)));
      await db.from("solo_feedback").insert({ solo_session_id: s.id, scores: fb.scores, comments_what_worked: fb.what_worked, comments_what_to_improve: fb.what_to_improve });
      await db.from("solo_sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", s.id);
      return { ...fb, solution: sol, error: null };
    } catch (e) {
      return { scores: {}, what_worked: "", what_to_improve: "", solution: null, error: aiError(e, GatewayError) };
    }
  });
