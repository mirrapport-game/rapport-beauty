export type Theme = "light" | "dark";

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem("theme", t);
}

/** Call from useEffect on startup. */
export function initTheme() {
  const saved = localStorage.getItem("theme") as Theme | null;
  applyTheme(saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
}

export const currentTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
