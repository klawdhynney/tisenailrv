import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/regras/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/usuarios" });
  },
  component: () => null,
});
