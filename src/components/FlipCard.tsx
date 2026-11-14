import { useState } from "react";
import images from "@/data/card-images.json";

const map = images as Record<string, { front?: string; back?: string }>;
export const hasCardImage = (id: string) => !!map[id]?.front;

/** Printed card art; tap or swipe to flip between situation (front) and dialogue (back). */
export function FlipCard({ id, alt, side, onSide }: { id: string; alt: string; side?: "front" | "back"; onSide?: (s: "front" | "back") => void }) {
  const [own, setOwn] = useState<"front" | "back">("front");
  const cur = side ?? own;
  const set = onSide ?? setOwn;
  const img = map[id];
  const [x0, setX0] = useState<number | null>(null);
  if (!img?.front) return null;
  const flip = () => set(cur === "front" ? "back" : "front");
  return (
    <div className="mx-auto w-full max-w-sm select-none [perspective:1200px]">
      <button
        type="button"
        onClick={flip}
        onTouchStart={(e) => setX0(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const x = e.changedTouches[0]?.clientX;
          if (x0 != null && x != null && Math.abs(x - x0) > 40) flip();
          setX0(null);
        }}
        aria-label={cur === "front" ? "Перевернуть: диалог" : "Перевернуть: ситуация"}
        className="relative block aspect-[2/3] w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: cur === "back" ? "rotateY(180deg)" : undefined }}
      >
        <img src={img.front} alt={`${alt} — ситуация`} className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-xl [backface-visibility:hidden]" />
        <img src={img.back} alt={`${alt} — диалог`} className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]" />
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Нажмите или смахните, чтобы перевернуть</p>
    </div>
  );
}
