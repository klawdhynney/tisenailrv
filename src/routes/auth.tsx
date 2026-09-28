import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailCorporativo, sessaoMicrosoft } from "@/lib/corporate";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Área do gestor | TI Senai LRV" },
      { name: "description", content: "Acesse os chamados com sua conta Microsoft institucional." },
      { property: "og:title", content: "Área do gestor | TI Senai LRV" },
      { property: "og:description", content: "Acesso com a conta Microsoft institucional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useStore();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (session && emailCorporativo(session.user.email) && sessaoMicrosoft(session.user.app_metadata?.provider)) navigate({ to: "/atendimento" });
  }, [session, navigate]);

  async function microsoft() {
    setCarregando(true);
    const r = await lovable.auth.signInWithOAuth("microsoft", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Microsoft.");
    setCarregando(false);
  }

  return (
    <div className="mx-auto max-w-md border-t-4 border-primary bg-card p-8">
      <h1 className="text-2xl font-bold">Acesso institucional</h1>
      <p className="mt-2 text-sm text-muted-foreground">A área de gestão é reservada à equipe autorizada. Entre com sua conta Microsoft institucional.</p>
      {session && (!emailCorporativo(session.user.email) || !sessaoMicrosoft(session.user.app_metadata?.provider)) && <p className="mt-4 text-sm text-destructive">Esta conta não é uma conta Microsoft institucional. Saia dela antes de entrar novamente.</p>}
      <Button className="mt-6 w-full" onClick={microsoft} disabled={carregando}>Entrar com Microsoft</Button>
    </div>
  );
}
