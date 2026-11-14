import { useEffect, useRef } from "react";
import { beep, fmt, timerLeft, useNow, type GameSession } from "@/lib/session";

export function TimerRing({ s, size = 120 }: { s: GameSession; size?: number }) {
  const now = useNow();
  const left = timerLeft(s, now);
  const total = s.timer_duration || 1;
  const frac = Math.min(1, left / total);
  const running = !!s.timer_started_at;
  const prev = useRef(left);
  useEffect(() => {
    if (running && prev.current > 0 && left === 0) beep();
    prev.current = left;
  }, [left, running]);
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} className={`fill-none ${left === 0 ? "stroke-destructive" : "stroke-primary"}`} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .5s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{fmt(left)}</span>
        <span className="text-[10px] text-muted-foreground">{running ? "идёт" : "пауза"}</span>
      </div>
    </div>
  );
}
