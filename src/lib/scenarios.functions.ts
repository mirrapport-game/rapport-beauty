import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DraftScenario = {
  rubric_no: number;
  title: string;
  situation: string;
  dialogue: { who: string; line: string }[];
  task: string;
  solution: string;
};

/** AI turns a free-text story into a structured scenario card (not saved yet). */
export const processScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; rubrics: string }) => {
    if (!d.text || d.text.length < 20 || d.text.length > 6000) throw new Error("Опишите ситуацию (20–6000 символов)");
    return d;
  })
  .handler(async ({ data }): Promise<{ draft: DraftScenario | null; error: string | null }> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "Ты методист обучающей игры для сотрудников салон красоты. Из рассказа сотрудника сделай карточку-сценарий: короткое название, ситуацию (2–4 предложения), диалог 3–6 реплик, где последняя реплика всегда {\"who\":\"Вы\",\"line\":\"…\"}, задачу игрока и эталонное решение (готовые фразы и шаги). Выбери подходящую рубрику по номеру. Пиши по-русски, без персональных данных.",
        input: [{ role: "user", content: `Рубрики:\n${data.rubrics}\n\nРассказ:\n${data.text}` }],
        text: {
          format: {
            type: "json_schema",
            name: "scenario",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["rubric_no", "title", "situation", "dialogue", "task", "solution"],
              properties: {
                rubric_no: { type: "integer" },
                title: { type: "string" },
                situation: { type: "string" },
                dialogue: {
                  type: "array",
                  items: { type: "object", additionalProperties: false, required: ["who", "line"], properties: { who: { type: "string" }, line: { type: "string" } } },
                },
                task: { type: "string" },
                solution: { type: "string" },
              },
            },
          },
        },
      });
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("");
      return { draft: JSON.parse(text) as DraftScenario, error: null };
    } catch (e) {
      console.error(e);
      if (e instanceof GatewayError && e.httpStatus === 402) return { draft: null, error: "Закончились кредиты ИИ" };
      if (e instanceof GatewayError && e.httpStatus === 429) return { draft: null, error: "Слишком много запросов, попробуйте через минуту" };
      return { draft: null, error: "Не удалось обработать текст, попробуйте ещё раз" };
    }
  });
