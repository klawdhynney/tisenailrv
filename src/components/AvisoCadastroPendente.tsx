import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { UserCheck, ArrowRight, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store-context";

export function AvisoCadastroPendente() {
  const { session, authPronto, perfilUsuario } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!authPronto || !session?.user || !perfilUsuario) {
      setAberto(false);
      return;
    }

    // Não exibe se já estiver na tela Meu Cadastro ou na tela de Login
    if (location.pathname === "/meu-cadastro" || location.pathname === "/auth") {
      setAberto(false);
      return;
    }

    // Se o setor estiver pendente ou vazio
    const setorPendente = !perfilUsuario.setor || perfilUsuario.setor === "Pendente";
    if (!setorPendente) {
      setAberto(false);
      return;
    }

    // Verifica se já dispensou o aviso nesta sessão do navegador
    try {
      const dispensado = sessionStorage.getItem(`aviso_cadastro_dispensado_${session.user.id}`);
      if (dispensado === "true") {
        setAberto(false);
        return;
      }
    } catch {}

    // Exibe o diálogo após breve intervalo para montagem suave
    const timer = setTimeout(() => {
      setAberto(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [authPronto, session?.user, perfilUsuario, location.pathname]);

  const dispensar = () => {
    setAberto(false);
    if (session?.user?.id) {
      try {
        sessionStorage.setItem(`aviso_cadastro_dispensado_${session.user.id}`, "true");
      } catch {}
    }
  };

  const irParaCadastro = () => {
    dispensar();
    navigate({ to: "/meu-cadastro" });
  };

  if (!aberto) return null;

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogContent className="max-w-md rounded-2xl p-6 shadow-xl border border-border">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <UserCheck className="size-6" />
            </span>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
              Complete seu cadastro básico
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Identificamos que o seu setor ainda está pendente de definição. Completar seus dados básicos
            agiliza o preenchimento automático e a resolução dos seus chamados de TI.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel
            onClick={dispensar}
            className="w-full sm:w-auto rounded-xl text-xs sm:text-sm font-medium"
          >
            <Clock className="size-3.5 mr-1.5" /> Lembrar mais tarde
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={irParaCadastro}
            className="w-full sm:w-auto rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Completar agora <ArrowRight className="size-3.5 ml-1.5" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
