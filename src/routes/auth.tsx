import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | TI Senai LRV" },
      { name: "description", content: "Entre com Google ou Microsoft para acompanhar seus chamados ou gerenciar o atendimento." },
      { property: "og:title", content: "Entrar | TI Senai LRV" },
      { property: "og:description", content: "Acompanhe seus chamados com seu e-mail confirmado." },
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
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-sm text-muted-foreground">Entre com a conta Google ou Microsoft do e-mail informado no chamado.</p>
      {session && authPronto && !isGestor && <div className="mt-4 space-y-3"><p className="text-sm">Conectado como {session.user.email}</p><Button asChild className="w-full"><a href="/meus-chamados">Ver meus chamados</a></Button><Button variant="outline" className="w-full" onClick={() => sair()}>Sair desta conta</Button></div>}
      <div className="mt-6 grid gap-3">
        <Button className="w-full" onClick={() => entrar("microsoft")} disabled={carregando}>Entrar com Microsoft</Button>
        <Button variant="outline" className="w-full" onClick={() => entrar("google")} disabled={carregando}>Entrar com Google</Button>
      </div>
    </div>
  );
}
