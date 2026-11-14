import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ONBOARDING, ONBOARDING_START } from "@/lib/copy";

/** One-time welcome for a player who has never opened the app before. */
export function OnboardingOnce({ userId }: { userId: string }) {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setSeen(!!data?.onboarded_at));
  }, [userId]);
  if (seen === null || seen) return null;
  return <Onboarding onDone={() => setSeen(true)} />;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const screen = ONBOARDING[i] ?? ONBOARDING[0]!;
  const last = i === ONBOARDING.length - 1;

  const finish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
    onDone();
    navigate({ to: "/assessment" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="mb-4 flex gap-1.5">
          {ONBOARDING.map((_, n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <h2 className="text-xl font-bold">{screen.title}</h2>
        <p className="mt-2 text-sm leading-relaxed">{screen.text}</p>
        <div className="mt-5 flex items-center justify-between gap-2">
          {i > 0 ? (
            <button onClick={() => setI(i - 1)} className="rounded-md border border-border px-4 py-2 text-sm">
              Назад
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            className="rounded-md bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
          >
            {last ? ONBOARDING_START : "Далее"}
          </button>
        </div>
        {!last && (
          <button onClick={finish} className="mt-3 w-full text-center text-xs text-muted-foreground underline">
            Пропустить
          </button>
        )}
      </section>
    </div>
  );
}
