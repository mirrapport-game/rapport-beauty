import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const normalizeLeaderCode = (s: string) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase().replace(/ё/g, "е");

/** Grants the leader role when the user enters the secret access code. */
export const redeemLeaderCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => {
    if (typeof d?.code !== "string" || d.code.length > 200) throw new Error("Неверный код");
    return d;
  })
  .handler(async ({ data, context }) => {
    const expected = process.env["LEADER_ACCESS_CODE"];
    if (!expected) throw new Error("Код ведущего не настроен");
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const h = (s: string) => createHash("sha256").update(normalizeLeaderCode(s)).digest();
    if (!timingSafeEqual(h(data.code), h(expected))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").upsert([{ user_id: context.userId, role: "leader" }, { user_id: context.userId, role: "admin" }], { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
