import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota antiga do login simulado: agora o login é feito pelo Clerk em /sign-in. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/sign-in/$", params: { _splat: "" } });
  },
});
