import { createFileRoute } from "@tanstack/react-router";
import { ClinicPanel } from "@/components/ClinicPanel";

export const Route = createFileRoute("/_authenticated/clinic")({
  head: () => ({ meta: [{ title: "Моя салон — Раппорт" }] }),
  component: () => <ClinicPanel view="member" />,
});
