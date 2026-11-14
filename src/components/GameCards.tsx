import { MODES, MODE_HINTS } from "@/lib/game-cards";
import { useState, type ReactNode } from "react";
import { cardBack } from "@/lib/card-backs";
import { FlipCard, hasCardImage } from "@/components/FlipCard";
import { rubricHue, type Card, type Skill } from "@/lib/game";

export function Shell({ label, tone, children, title }: { label: string; tone: string; title?: string; children: ReactNode }) {
  return (
    <div className="animate-in fade-in zoom-in-95 overflow-hidden rounded-2xl border border-border bg-card shadow-lg duration-500">
      <div className="px-5 py-3 text-primary-foreground" style={{ background: tone }}>
        <div className="text-xs uppercase tracking-wider opacity-90">{label}</div>
        {title && <div className="text-lg font-semibold">{title}</div>}
      </div>
      <div className="space-y-3 p-5 text-base leading-relaxed">{children}</div>
    </div>
  );
}

export function SituationCard({ card }: { card: Card }) {
  const hue = rubricHue(card.rubric_no);
  const [open, setOpen] = useState(false);
  if (hasCardImage(card.id)) return <FlipCard id={card.id} alt={`${card.id} ${card.title}`} />;
  if (!open) {
    return (
      <div className="mx-auto w-full max-w-xs">
        <button type="button" onClick={() => setOpen(true)} aria-label="Перевернуть карточку"
          className="block aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border shadow-soft transition-transform hover:-translate-y-1">
          <img src={cardBack(card.rubric_no || 1)} alt={`Рубашка карточки · ${card.rubric}`} className="h-full w-full object-cover" />
        </button>
        <p className="mt-2 text-center text-sm text-muted-foreground">Нажмите на карточку, чтобы открыть ситуацию</p>
      </div>
    );
  }
  return (
    <Shell label={`Ситуация ${card.id.length > 10 ? "участника" : card.id} · ${card.rubric}`} title={card.title} tone="var(--gradient-rose-gold)">
      <p className="text-lg font-medium leading-snug">{card.situation}</p>
      <div className="space-y-1.5 rounded-lg bg-muted p-3 text-sm">
        {card.dialogue.map((d, i) => (
          <p key={i}><b style={{ color: `oklch(0.42 0.07 ${hue})` }}>{d.who}:</b> {d.line}</p>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-primary underline-offset-4 hover:underline">Показать рубашку</button>
    </Shell>
  );
}

export function RoleCard({ role, description }: { role: string; description?: string | null | undefined }) {
  return (
    <Shell label="Ваша роль" title={role} tone="oklch(0.42 0.04 40)">
      {description && <p className="whitespace-pre-line text-sm">{description}</p>}
      <p className="text-sm text-muted-foreground">Отыграйте сценку от лица этой роли.</p>
    </Shell>
  );
}

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Shell label="Навык" title={skill.title} tone="oklch(0.5 0.06 70)">
      <p className="rounded-lg bg-muted p-3 font-medium">{skill.formula}</p>
      <p className="text-sm">{skill.description}</p>
      {skill.how_to_apply?.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm">{skill.how_to_apply.map((h, i) => <li key={i}>{h}</li>)}</ul>
      )}
    </Shell>
  );
}

export function SolutionCard({ task, solution, playMode }: { task: string; solution: string; playMode?: string | null }) {
  return (
    <Shell label="Эталонное решение" tone="oklch(0.45 0.07 30)">
      {playMode && (
        <details className="rounded-lg border border-dashed border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">🎲 Режим этой карточки (спойлер)</summary>
          <div className="mt-2"><b>{MODES[playMode] ?? playMode}</b> — {MODE_HINTS[playMode]}</div>
        </details>
      )}
      <div className="rounded-lg bg-muted p-3 text-sm"><b>Ваша задача:</b> {task}</div>
      <p>{solution}</p>
    </Shell>
  );
}

export function Locked({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">🔒 {text}</div>
  );
}
