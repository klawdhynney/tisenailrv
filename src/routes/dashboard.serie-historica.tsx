import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/serie-historica")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard",
      search: { tipo: "historico" },
    });
  },
  component: () => null,
});
