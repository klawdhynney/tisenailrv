import { useEffect, useState } from "react";
import {
  Mail,
  Send,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Tag,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertasEmailSolicitanteConfig } from "@/lib/types";
import { renderizarEmailAlerta } from "@/lib/email-alertas/templates";
import {
  enviarEmailTesteServerFn,
  processarFilaAlertasServerFn,
  obterLogsAlertasServerFn,
  reenviarAlertaFalhaServerFn,
} from "@/lib/email-alertas/processor.server";
import { formatarDataHoraCuiaba } from "@/lib/types";

interface PainelAlertasEmailProps {
  config: AlertasEmailSolicitanteConfig;
  onChange: (patch: Partial<AlertasEmailSolicitanteConfig>) => void;
  userEmail: string;
}

export function PainelAlertasEmail({ config, onChange, userEmail }: PainelAlertasEmailProps) {
  const [emailTeste, setEmailTeste] = useState(userEmail || "");
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [processandoFila, setProcessandoFila] = useState(false);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Filtros da tabela de log
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroEvento, setFiltroEvento] = useState("todos");

  // Modelo ativo na pré-visualização
  const [previewEvento, setPreviewEvento] = useState<"aberto" | "atualizado" | "finalizado">("aberto");

  useEffect(() => {
    if (!emailTeste && userEmail) {
      setEmailTeste(userEmail);
    }
  }, [userEmail]);

  // Carrega os logs da fila
  const carregarLogs = async () => {
    setCarregandoLogs(true);
    try {
      const res = await obterLogsAlertasServerFn({
        data: {
          limite: 100,
          filtroStatus,
          filtroEvento,
        },
      });
      setLogs(res || []);
    } catch (e: any) {
      console.warn("Falha ao carregar logs de alertas:", e);
    } finally {
      setCarregandoLogs(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, [filtroStatus, filtroEvento]);

  // Disparo de teste
  const dispararTeste = async () => {
    if (!emailTeste || !emailTeste.includes("@")) {
      toast.error("Informe um endereço de e-mail válido para o teste.");
      return;
    }
    setEnviandoTeste(true);
    try {
      const res = await enviarEmailTesteServerFn({ data: { destinatario: emailTeste } });
      if (res.sucesso) {
        toast.success(res.mensagem || "E-mail de teste enviado com sucesso!");
        carregarLogs();
      } else {
        toast.error(res.erro || "Falha ao enviar e-mail de teste.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro inesperado ao disparar e-mail de teste.");
    } finally {
      setEnviandoTeste(false);
    }
  };

  // Processamento manual da fila
  const processarFilaAgora = async () => {
    setProcessandoFila(true);
    try {
      const res = await processarFilaAlertasServerFn();
      if (res.sucesso !== false) {
        toast.success(res.mensagem || `Fila processada: ${res.enviados} enviado(s).`);
        carregarLogs();
      } else {
        toast.error(res.mensagem || "Falha ao processar fila.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao processar fila.");
    } finally {
      setProcessandoFila(false);
    }
  };

  // Reenviar alerta que falhou
  const reenviarAlerta = async (logId: number) => {
    setReenviandoId(logId);
    try {
      const res = await reenviarAlertaFalhaServerFn({ data: { logId } });
      if (res.sucesso) {
        toast.success("Alerta reenviado com sucesso!");
        carregarLogs();
      } else {
        toast.error(res.erro || "Falha ao reenviar alerta.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reenviar alerta.");
    } finally {
      setReenviandoId(null);
    }
  };

  // Render da pré-visualização
  const previewDataExemplo = {
    numero: 42,
    solicitante: "Maria Oliveira",
    setor: "Coordenação Pedagógica",
    prioridade: "Média",
    status: previewEvento === "aberto" ? "Aberto" : previewEvento === "atualizado" ? "Em atendimento" : "Finalizado",
    local: "Bloco A - Sala 12",
    aberto_em: "12/10/2026 08:30",
    atualizado_em: "12/10/2026 09:15",
    finalizado_em: "12/10/2026 10:45",
    prazo: "12/10/2026 14:00",
    descricao: "Computador da sala dos professores não conecta à rede cabeada nem ao Wi-Fi institucional.",
    resposta: "Técnico efetuou a troca do cabo de rede e reconfigurou o endereço IP estático no equipamento.",
    autor_resposta: "Carlos Técnico",
    procedimento: "Substituição do conector RJ45 realizada, driver de rede atualizado e conexão restabelecida com velocidade normal.",
  };

  const previewRenderizado = renderizarEmailAlerta({
    evento: previewEvento,
    dados: previewDataExemplo,
    nomeRemetente: config.nomeRemetente || "TI SENAI LRV",
    textoRodape: config.textoRodape,
  });

  return (
    <div className="space-y-6">
      {/* 1. Ativação Geral do Sistema */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config.ativo ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                <Mail className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-foreground">
                    Alertas por E-mail para Solicitantes
                  </CardTitle>
                  <Badge variant={config.ativo ? "default" : "secondary"} className="text-[10px] uppercase font-bold">
                    {config.ativo ? "Sistema Ativo" : "Sistema Desligado (Modo Teste)"}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Envia notificações automáticas do domínio <strong>tisenailrv.app</strong> exclusivamente para o usuário que abriu o chamado.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto bg-muted/50 px-3.5 py-2 rounded-xl border border-border/60">
              <Label htmlFor="switch-alertas-ativo" className="text-xs font-semibold cursor-pointer">
                {config.ativo ? "Alertas Ativados" : "Alertas Desligados"}
              </Label>
              <Switch
                id="switch-alertas-ativo"
                checked={config.ativo}
                onCheckedChange={(val) => onChange({ ativo: val })}
                aria-label="Ativar ou desligar sistema de alertas por e-mail"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {/* Alertas Individuais por Evento */}
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
              <Sliders className="size-3.5 text-primary" /> Eventos Notificados:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Aberto */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors bg-card">
                <Switch
                  checked={config.eventos?.aberto ?? true}
                  onCheckedChange={(val) =>
                    onChange({ eventos: { ...(config.eventos || {}), aberto: val } as any })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-foreground block">Chamado Aberto</span>
                  <span className="text-muted-foreground text-[11px] leading-relaxed block">
                    Confirmação imediata com número, SLA, setor e resumo da solicitação.
                  </span>
                </div>
              </label>

              {/* Atualizado */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors bg-card">
                <Switch
                  checked={config.eventos?.atualizado ?? true}
                  onCheckedChange={(val) =>
                    onChange({ eventos: { ...(config.eventos || {}), atualizado: val } as any })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-foreground block">Chamado Atualizado</span>
                  <span className="text-muted-foreground text-[11px] leading-relaxed block">
                    Mudança de status ou nova resposta da equipe (com janela inteligente de 5 min).
                  </span>
                </div>
              </label>

              {/* Finalizado */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors bg-card">
                <Switch
                  checked={config.eventos?.finalizado ?? true}
                  onCheckedChange={(val) =>
                    onChange({ eventos: { ...(config.eventos || {}), finalizado: val } as any })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-foreground block">Chamado Finalizado</span>
                  <span className="text-muted-foreground text-[11px] leading-relaxed block">
                    Procedimento aplicado e convite para avaliar o atendimento.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Dados do Remetente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome do Remetente</Label>
              <Input
                value={config.nomeRemetente || "TI SENAI LRV"}
                onChange={(e) => onChange({ nomeRemetente: e.target.value })}
                placeholder="TI SENAI LRV"
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Nome exibido na caixa de entrada do solicitante.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">E-mail Remetente / Reply-To</Label>
              <Input
                value={config.emailRemetente || "avisos@tisenailrv.app"}
                onChange={(e) => onChange({ emailRemetente: e.target.value })}
                placeholder="avisos@tisenailrv.app"
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Endereço no domínio autenticado tisenailrv.app.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Janela de Agrupamento</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={config.janelaAgrupamentoMinutos || 5}
                  onChange={(e) => onChange({ janelaAgrupamentoMinutos: Number(e.target.value) || 5 })}
                  className="text-xs w-24"
                />
                <span className="text-xs text-muted-foreground">minutos</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Agrupa mensagens seguidas sem poluir a caixa do usuário.</p>
            </div>
          </div>

          {/* Rodapé e Modo de Teste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Texto de Explicação no Rodapé</Label>
              <Textarea
                rows={2}
                value={config.textoRodape || ""}
                onChange={(e) => onChange({ textoRodape: e.target.value })}
                placeholder="Você recebeu este e-mail porque abriu uma solicitação no portal de suporte..."
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ambiente de Teste / Staging</Label>
              <Select
                value={config.modoAmbienteTeste || "redirecionar"}
                onValueChange={(val: any) => onChange({ modoAmbienteTeste: val })}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="redirecionar">Redirecionar para e-mail de teste do administrador</SelectItem>
                  <SelectItem value="apenas_log">Apenas registrar no log (sem disparar e-mail)</SelectItem>
                  <SelectItem value="desativado">Desativado completamente em teste</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Garante que testes em preview ou desenvolvimento nunca enviem e-mails para usuários reais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Disparo de E-mail de Teste */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-g-blue">
              <Send className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Enviar E-mail de Teste Imediato
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Dispare um teste para validar a entrega no domínio institucional e a formatação do template.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="flex-1">
              <Input
                type="email"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
                placeholder="Digite seu e-mail para receber o teste"
                className="text-xs"
              />
            </div>
            <Button
              type="button"
              onClick={dispararTeste}
              disabled={enviandoTeste}
              className="gap-2 shrink-0 bg-g-blue hover:bg-blue-600 text-white font-bold text-xs"
            >
              <Send className="size-4" />
              {enviandoTeste ? "Enviando teste..." : "Enviar E-mail de Teste"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pré-visualizador Interativo de Modelos */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                <Eye className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Pré-visualização dos Modelos de E-mail
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Veja com fidelidade visual como cada notificação é renderizada na caixa de entrada do solicitante.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl">
              <Button
                type="button"
                variant={previewEvento === "aberto" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreviewEvento("aberto")}
                className="text-xs h-7 font-bold"
              >
                Aberto
              </Button>
              <Button
                type="button"
                variant={previewEvento === "atualizado" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreviewEvento("atualizado")}
                className="text-xs h-7 font-bold"
              >
                Atualizado
              </Button>
              <Button
                type="button"
                variant={previewEvento === "finalizado" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreviewEvento("finalizado")}
                className="text-xs h-7 font-bold"
              >
                Finalizado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold px-2 text-muted-foreground">
              <span>Assunto: <strong className="text-foreground">{previewRenderizado.assunto}</strong></span>
              <span className="text-[11px] font-mono">HTML Responsivo Sanitizado</span>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-slate-100 dark:bg-slate-900 p-2 sm:p-4">
              <div className="max-w-[620px] mx-auto bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200">
                <div dangerouslySetInnerHTML={{ __html: previewRenderizado.html }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Log de Envios e Fila Outbox */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Fila de Notificações e Histórico de Envios
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Acompanhamento em tempo real de cada alerta gerado pelos gatilhos do banco.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={processarFilaAgora}
                disabled={processandoFila}
                className="text-xs gap-1.5"
                title="Processar pendentes da fila agora"
              >
                <Zap className={`size-3.5 ${processandoFila ? "animate-pulse" : "text-amber-500"}`} />
                {processandoFila ? "Processando..." : "Processar Fila Agora"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={carregarLogs}
                disabled={carregandoLogs}
                className="text-xs gap-1.5"
                title="Atualizar lista"
              >
                <RefreshCw className={`size-3.5 ${carregandoLogs ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Status:</span>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="text-xs h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="falha">Falha</SelectItem>
                  <SelectItem value="ignorado">Ignorado</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Evento:</span>
              <Select value={filtroEvento} onValueChange={setFiltroEvento}>
                <SelectTrigger className="text-xs h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="atualizado">Atualizado</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border sticky top-0 backdrop-blur-xs">
                  <tr>
                    <th className="py-2.5 px-3">Data / Hora (Cuiabá)</th>
                    <th className="py-2.5 px-3">Chamado</th>
                    <th className="py-2.5 px-3">Destinatário</th>
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Tentativas</th>
                    <th className="py-2.5 px-3">Detalhes / Erro</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        {carregandoLogs ? "Carregando registros..." : "Nenhum alerta registrado na fila até o momento."}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const statusBadge =
                        log.status === "enviado"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : log.status === "falha"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : log.status === "processando"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : log.status === "ignorado"
                          ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";

                      return (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                            {formatarDataHoraCuiaba(log.created_at || log.enviado_em)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground">
                            #{log.ticket_id}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-foreground truncate max-w-[170px]" title={log.destinatario}>
                            {log.destinatario}
                          </td>
                          <td className="py-2.5 px-3 capitalize font-medium text-foreground">
                            {log.evento}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-center">
                            {log.tentativas} / {log.max_tentativas || 5}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-[220px] truncate" title={log.erro_detalhes || log.motivo_ignorado || "-"}>
                            {log.erro_detalhes ? (
                              <span className="text-destructive font-medium">{log.erro_detalhes}</span>
                            ) : log.motivo_ignorado ? (
                              <span className="text-muted-foreground italic">{log.motivo_ignorado}</span>
                            ) : (
                              log.provider_message_id ? `ID: ${log.provider_message_id}` : "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {log.status === "falha" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => reenviarAlerta(log.id)}
                                disabled={reenviandoId === log.id}
                                className="h-6 text-[10px] px-2"
                              >
                                {reenviandoId === log.id ? "Reenviando..." : "Reenviar"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
