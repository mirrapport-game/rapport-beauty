import { createFileRoute } from "@tanstack/react-router";
import { ClinicPanel } from "@/components/ClinicPanel";

export const Route = createFileRoute("/_authenticated/manager")({
  head: () => ({ meta: [{ title: "Панель руководителя салона — Раппорт" }] }),
  component: () => <ClinicPanel view="manager" />,
});
