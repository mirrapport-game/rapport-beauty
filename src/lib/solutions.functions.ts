import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sol = { task: string; solution: string };
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

async function lookup(cardId: string): Promise<Sol | null> {
  if (isUuid(cardId)) {
    // Participant-made card: solution table is not readable by players; read it server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("get_user_solution", { _card: cardId });
    return data?.[0] ?? null;
  }
  const all = (await import("@/server/solutions.json")).default as Record<string, Sol>;
  return all[cardId] ?? null;
}

/** Returns the solution only when the database confirms the caller may see it. */
export const getSessionSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: cardId } = await context.supabase.rpc("solution_access", { _sid: data.sessionId });
    if (!cardId) return null;
    return lookup(cardId as string);
  });

/** Solo practice: any signed-in user can open a solution for self-study. */
export const getPracticeSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cardId: string }) => d)
  .handler(async ({ data }) => lookup(data.cardId));
