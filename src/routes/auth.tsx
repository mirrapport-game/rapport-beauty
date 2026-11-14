import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useUser } from "@/hooks/use-user";
import { PROF_ROLES, PLAY_SCOPES } from "@/lib/prof-roles";

type Search = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const n = s["next"];
    return { next: typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : undefined };
  },
  head: () => ({
    meta: [
      { title: "Вход — Раппорт Beauty" },
      { name: "description", content: "Войдите, чтобы играть или вести сессию." },
      { property: "og:title", content: "Вход — Раппорт Beauty" },
      { property: "og:description", content: "Войдите, чтобы играть или вести сессию." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useUser();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [prof, setProf] = useState("");
  const [scope, setScope] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem("auth_next");
      sessionStorage.removeItem("auth_next");
      navigate({ to: next ?? saved ?? "/dashboard" });
    }
  }, [user, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Неверный email или пароль");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + (next ?? "/join"), data: { full_name: name, prof_role: prof, play_scope: scope } },
      });
      if (error) toast.error(error.message);
      else toast.success("Проверьте почту и подтвердите адрес");
    }
    setBusy(false);
  };

  const google = async () => {
    if (next) sessionStorage.setItem("auth_next", next);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Не удалось войти через Google");
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Вход" : "Регистрация"}</h1>
      <button onClick={google} className="mt-6 w-full rounded-md border border-input bg-card py-2.5 font-medium">
        Продолжить с Google
      </button>
      <div className="my-4 text-center text-xs text-muted-foreground">или по почте</div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя (видно в игре)"
            className="w-full rounded-md border border-input bg-background px-3 py-2" />
        )}
        {mode === "up" && (
          <>
            <select required value={prof} onChange={(e) => setProf(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
              <option value="">Ваша роль в салоне…</option>
              {PROF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <fieldset className="space-y-1 text-sm">
              <legend className="mb-1 font-medium">Какие роли хотите проигрывать?</legend>
              {PLAY_SCOPES.map((o) => (
                <label key={o.id} className="flex items-center gap-2">
                  <input type="radio" name="scope" checked={scope === o.id} onChange={() => setScope(o.id)} />{o.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full rounded-md border border-input bg-background px-3 py-2" />
        <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль"
          className="w-full rounded-md border border-input bg-background px-3 py-2" />
        <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60">
          {mode === "in" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-primary">
        {mode === "in" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
      </button>
    </main>
  );
}
