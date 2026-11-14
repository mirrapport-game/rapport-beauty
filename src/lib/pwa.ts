const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;

function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname.toLowerCase();
  const label = h.split(".")[0] ?? "";
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h) && PREVIEW_LABEL.test(label)) return true;
  if (/^project--[^.]+-dev\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h)) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

/** Only registrar of the offline worker. Call from useEffect. */
export async function registerOffline() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export const offlineAvailable = () => typeof window !== "undefined" && !refused();
