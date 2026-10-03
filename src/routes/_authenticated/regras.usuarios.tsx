import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { GestaoUsuarios } from "@/components/GestaoUsuarios";

export const Route = createFileRoute("/_authenticated/regras/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários | Painel de Ajustes | TI SENAI LRV" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaGestaoUsuarios,
});

function PaginaGestaoUsuarios() {
  const { isAdmin, authPronto } = useStore();

  if (!authPronto) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Verificando permissões...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-destructive/40 bg-card p-8 text-center space-y-4 my-12 shadow-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Acesso Negado</h1>
        <p className="text-sm text-muted-foreground">
          A página de gestão de usuários e perfis é restrita exclusivamente a administradores do sistema.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/regras">
              <ArrowLeft className="size-4 mr-2" /> Voltar ao Painel de Ajustes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          <Link to="/regras">
            <ArrowLeft className="size-3.5 mr-1" /> Voltar aos Ajustes
          </Link>
        </Button>
      </div>

      <GestaoUsuarios />
    </div>
  );
}
