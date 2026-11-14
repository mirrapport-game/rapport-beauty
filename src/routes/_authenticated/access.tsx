import { createFileRoute } from "@tanstack/react-router";
import { LeaderCodeForm } from "@/components/LeaderCodeForm";

export const Route = createFileRoute("/_authenticated/access")({
  head: () => ({ meta: [{ title: "Вход — Раппорт" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <main className="mx-auto max-w-md px-4 py-12">
      <LeaderCodeForm />
    </main>
  ),
});
