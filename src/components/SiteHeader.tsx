import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

const item = "block rounded-xl px-4 py-3 font-medium hover:bg-accent";
const active = { className: "bg-accent text-primary" };

export function SiteHeader() {
  const { user, is } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [path]);
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="relative z-40 border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to={user ? "/dashboard" : "/"} className="min-w-0">
          <span className="truncate font-[family-name:var(--font-display)] text-xl font-semibold leading-none sm:text-2xl">Раппорт <span className="font-[family-name:var(--font-script)] text-2xl font-normal text-rose-gold sm:text-3xl">Beauty</span></span>
        </Link>
        {user ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/dashboard" className="rounded-full bg-rose-gold px-4 py-2 text-sm font-semibold text-primary-foreground">Кабинет</Link>
            <button onClick={() => setOpen((o) => !o)} aria-label="Меню" aria-expanded={open} className="rounded-full border border-input px-3 py-2 text-sm font-semibold">
              {open ? "✕" : "☰"} Меню
            </button>
          </div>
        ) : (
          <Link to="/auth" className="rounded-full bg-rose-gold px-4 py-2 text-sm font-semibold text-primary-foreground">Вход</Link>
        )}
      </div>
      {user && open && (
        <nav className="absolute inset-x-0 top-full border-b border-border bg-card shadow-soft">
          <div className="mx-auto grid max-w-6xl gap-1 p-3 sm:grid-cols-2">
            <Link to="/join" className={item} activeProps={active}>🎲 Войти в игру по коду</Link>
            <Link to="/solo" className={item} activeProps={active}>🤖 Тренировка с ИИ</Link>
            {(is("leader") || is("admin")) && <Link to="/cards" className={item} activeProps={active}>🃏 Карточки</Link>}
            <Link to="/skills" className={item} activeProps={active}>💡 Навыки</Link>
            <Link to="/clinic" className={item} activeProps={active}>💇 Мой салон</Link>
            <Link to="/profile" className={item} activeProps={active}>👤 Мой профиль</Link>
            {(is("leader") || is("admin")) && <Link to="/leader" className={item} activeProps={active}>🎙️ Ведущий</Link>}
            {(is("leader") || is("admin")) && <Link to="/offline" className={item} activeProps={active}>📴 Игра без интернета</Link>}
            {is("admin") && <Link to="/admin" className={item} activeProps={active}>⚙️ Админ</Link>}
            <button onClick={signOut} className={`${item} text-left text-muted-foreground`}>Выйти</button>
          </div>
        </nav>
      )}
    </header>
  );
}
