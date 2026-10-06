import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { GestaoUsuarios } from "@/components/GestaoUsuarios";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários | TI SENAI LRV" },
      { name: "description", content: "Gerenciamento de usuários, logins, permissões e perfis de acesso do TI SENAI LRV." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaUsuarios,
});

function PaginaUsuarios() {
  const { isAdmin, isGestor, authPronto } = useStore();

  if (!authPronto) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm text-muted-foreground shadow-xs animate-pulse">
          Verificando permissões de acesso...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-destructive/40 bg-card p-8 text-center space-y-4 my-12 shadow-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Acesso Restrito a Administradores</h1>
        <p className="text-sm text-muted-foreground">
          A página de gestão de usuários e controle de logins é restrita exclusivamente a administradores do sistema.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          {isGestor && (
            <Button asChild variant="default" size="sm">
              <Link to="/regras">
                <Settings2 className="size-4 mr-2" /> Ir para Painel de Ajustes
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" /> Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <Link to="/regras">
              <Settings2 className="size-3.5 mr-1 text-g-blue" /> Painel de Ajustes
            </Link>
          </Button>
          <span className="text-muted-foreground/40">•</span>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="size-3.5 mr-1" /> Página Inicial
            </Link>
          </Button>
        </div>
      </div>

      <GestaoUsuarios />
    </div>
  );
}
