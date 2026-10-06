import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, CheckCircle2, Shield, ArrowLeft, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/preferencias-email")({
  head: () => ({
    meta: [
      { title: "Preferências de E-mail | TI SENAI LRV" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Gerencie suas preferências de alertas e notificações por e-mail dos chamados de TI." },
    ],
  }),
  component: PreferenciasEmailPage,
});

function PreferenciasEmailPage() {
  const { session, emailAlertsAtivos, alternarEmailAlertas } = useStore();
  const [salvando, setSalvando] = useState(false);
  const [ativoLocal, setAtivoLocal] = useState(emailAlertsAtivos);

  useEffect(() => {
    setAtivoLocal(emailAlertsAtivos);
  }, [emailAlertsAtivos]);

  const handleToggle = async (novoValor: boolean) => {
    setAtivoLocal(novoValor);
    setSalvando(true);
    try {
      if (session) {
        const ok = await alternarEmailAlertas(novoValor);
        if (ok) {
          toast.success(
            novoValor
              ? "Alertas por e-mail ativados com sucesso!"
              : "Alertas por e-mail desativados. Você não receberá mais e-mails automáticos."
          );
        } else {
          toast.error("Não foi possível atualizar suas preferências. Tente novamente.");
          setAtivoLocal(!novoValor);
        }
      } else {
        // Se não autenticado, atualiza localmente e orienta entrar
        localStorage.setItem("notificacoes_email_anon_pref", String(novoValor));
        toast.info("Preferência registrada neste navegador. Conecte-se para sincronizar com sua conta.");
      }
    } finally {
      setSalvando(false);
    }
  };

  const emailUsuario = session?.user.email || "Não conectado";

  return (
    <div className="py-6 sm:py-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link to="/">
            <ArrowLeft className="size-4" /> Voltar ao Início
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        <CardHeader className="p-6 sm:p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Mail className="size-6" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black text-foreground">
                Preferências de Alertas por E-mail
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Controle o envio automático de notificações e avisos de acompanhamento dos seus chamados de TI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-2 space-y-6">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Receber alertas de chamados por e-mail
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando ativado, você recebe um e-mail a cada atualização de status, resposta técnica da equipe ou quando o chamado for finalizado.
              </p>
              {session && (
                <p className="text-[11px] text-primary font-mono mt-1">
                  Conta vinculada: <strong>{emailUsuario}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {ativoLocal ? "Ativado" : "Desativado"}
              </span>
              <Switch
                checked={ativoLocal}
                disabled={salvando}
                onCheckedChange={handleToggle}
                aria-label="Receber alertas por e-mail"
                className="scale-110"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-g-green shrink-0 mt-0.5" />
              <span>
                <strong>Sem duplicidade:</strong> Atualizações ocorridas em sequência no mesmo chamado dentro de 3 minutos são agrupadas em um único e-mail para evitar sobrecarga na sua caixa postal.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Shield className="size-4 text-g-blue shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade garantida:</strong> Nossos e-mails não contêm imagens de rastreamento e cumprem rigorosamente a nossa <Link to="/lgpd" className="underline font-semibold text-foreground">Política de Privacidade (LGPD)</Link>.
              </span>
            </div>
          </div>

          {!session && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-foreground">Você não está conectado.</p>
                <p className="text-muted-foreground">
                  Para que a sua preferência seja sincronizada permanentemente em todos os seus chamados, faça login com a sua conta institucional.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 font-bold">
                <Link to="/auth">
                  <LogIn className="size-3.5" /> Fazer Login
                </Link>
              </Button>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground">
            <span>TI SENAI Lucas do Rio Verde</span>
            <Link to="/" className="text-primary hover:underline font-semibold">
              Ir para o Portal de Chamados
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
