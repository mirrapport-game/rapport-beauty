import { useEffect, useState } from "react";
import images from "@/data/card-images.json";
import box from "@/assets/rapport-box-communication.jpg";
import { ALL_BACKS } from "@/lib/card-backs";
import { offlineAvailable } from "@/lib/pwa";

const urls = [box, ...ALL_BACKS, ...Object.values(images as Record<string, { front?: string; back?: string }>).flatMap((v) => [v.front, v.back])]
  .filter((u): u is string => !!u);

/** Downloads every card image into the device cache so cards open without internet. */
export function SaveOffline() {
  const [done, setDone] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "unavailable">("idle");
  useEffect(() => {
    if (!("caches" in window)) return setState("unavailable");
    if (localStorage.getItem("cards_saved") === String(urls.length)) setState("saved");
  }, []);
  const save = async () => {
    setState("busy");
    setDone(0);
    const cache = await caches.open("card-images");
    let n = 0;
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async (u) => {
        try {
          if (!(await cache.match(u))) await cache.add(u);
        } catch { /* skip one failed image */ }
        setDone(++n);
      }));
    }
    localStorage.setItem("cards_saved", String(urls.length));
    setState("saved");
  };
  if (state === "unavailable") return null;
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">Карточки на устройстве</div>
          <div className="text-sm text-muted-foreground">
            {state === "saved" ? "✅ Сохранены — открываются без интернета" :
              state === "busy" ? `Сохраняем… ${done} из ${urls.length}` :
              "Сохраните все 68 карточек, чтобы играть без интернета"}
          </div>
        </div>
        <button onClick={save} disabled={state === "busy"}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {state === "saved" ? "Обновить" : "Сохранить на устройство"}
        </button>
      </div>
      {state === "busy" && <div className="mt-3 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(done / urls.length) * 100}%` }} /></div>}
      {!offlineAvailable() && state === "saved" && (
        <p className="mt-2 text-xs text-muted-foreground">Работа без интернета включится в опубликованном приложении (в окне редактора она отключена).</p>
      )}
    </div>
  );
}
