import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área do gestor | TI Senai LRV" },
      { name: "description", content: "Acesse a gestão de chamados com uma conta autorizada Google ou Microsoft." },
      { property: "og:title", content: "Área do gestor | TI Senai LRV" },
      { property: "og:description", content: "Acesso de gestores com Google ou Microsoft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, isGestor, authPronto, sair } = useStore();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (session && authPronto && isGestor) navigate({ to: "/atendimento" });
  }, [session, authPronto, isGestor, navigate]);

  async function entrar(provider: "microsoft" | "google") {
    setCarregando(true);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(`Não foi possível entrar com ${provider === "google" ? "Google" : "Microsoft"}.`);
    setCarregando(false);
  }

  return (
    <div className="mx-auto max-w-md border-t-4 border-primary bg-card p-8">
      <h1 className="text-2xl font-bold">Acesso do gestor</h1>
      <p className="mt-2 text-sm text-muted-foreground">Entre com uma das contas autorizadas para gerenciar os chamados.</p>
      {session && authPronto && !isGestor && <p className="mt-4 text-sm text-destructive">A conta {session.user.email} não tem acesso à gestão. Entre com outra conta.</p>}
      {session && authPronto && !isGestor && <Button variant="outline" className="mt-4 w-full" onClick={() => sair()}>Sair desta conta</Button>}
      <div className="mt-6 grid gap-3">
        <Button className="w-full" onClick={() => entrar("microsoft")} disabled={carregando}>Entrar com Microsoft</Button>
        <Button variant="outline" className="w-full" onClick={() => entrar("google")} disabled={carregando}>Entrar com Google</Button>
      </div>
    </div>
  );
}
