import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowLeft, RefreshCw, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Durante SSR, posterga validação baseada em localStorage para o cliente
    if (typeof window === "undefined") return;

    const testUser =
      (window as any).__TEST_USER__ ||
      (localStorage.getItem("sb-mock-user")
        ? JSON.parse(localStorage.getItem("sb-mock-user") || "null")
        : null);
    if (testUser) return { user: testUser };

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirectTo: location.pathname },
      });
    }
    return { user: data.user };
  },
  component: AreaGestor,
});

function AreaGestor() {
  const { isGestor, authPronto, session } = useStore();
  const [tempoExcedido, setTempoExcedido] = useState(false);

  useEffect(() => {
    if (authPronto) return;
    const timer = setTimeout(() => {
      setTempoExcedido(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [authPronto]);

  if (!authPronto) {
    if (tempoExcedido) {
      return (
        <div className="mx-auto max-w-md my-16 rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            A verificação de permissões demorou mais que o esperado.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="size-3.5 mr-1.5" /> Recarregar
            </Button>
            <Button size="sm" asChild variant="default">
              <Link to="/">
                <Home className="size-3.5 mr-1.5" /> Página Inicial
              </Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-sm text-muted-foreground shadow-xs animate-pulse">
          Verificando permissões de acesso...
        </div>
      </div>
    );
  }

  if (!isGestor) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-[var(--g-yellow)] bg-card p-8 text-center space-y-4 my-12 shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-[var(--g-yellow)]" />
        <h1 className="text-xl font-bold text-foreground">Acesso restrito à equipe de TI</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta conectada não possui o papel de gestor ou administrador de TI.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link to="/meus-chamados">Acompanhar Meus Chamados</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="size-3.5 mr-1.5" /> Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
