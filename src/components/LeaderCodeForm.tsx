import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { redeemLeaderCode } from "@/lib/leader-code.functions";

export function LeaderCodeForm() {
  const redeem = useServerFn(redeemLeaderCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await redeem({ data: { code } });
      if (r.ok) {
        toast.success("Доступ открыт");
        setTimeout(() => window.location.assign("/admin"), 600);
      } else toast.error("Неверный код");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold">🔐 Вход</h2>
      <p className="text-sm text-muted-foreground">Введите код доступа.</p>
      <div className="flex gap-2">
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код" className="w-full rounded-md border border-input bg-background px-3 py-2" />
        <button disabled={busy || !code.trim()} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Войти</button>
      </div>
    </form>
  );
}
