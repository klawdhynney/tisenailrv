import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Pause,
  Play,
  Clock,
  History,
  MessageSquare,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { TicketChat } from "@/components/TicketChat";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useLoading } from "@/lib/loading-context";
import { useStore } from "@/lib/store-context";
import { fromRow } from "@/lib/store";
import { PRIORIDADES, type Ticket, obterDataHojeCuiaba, obterHoraAgoraCuiaba } from "@/lib/types";
import { calcularSla, formatarData, formatarDataHora, formatarDuracao, segundosUteis } from "@/lib/sla";
import { sugerirPrioridade } from "@/lib/sugerir-prioridade.functions";
import { sugerirRespostasAtendimento } from "@/lib/revisar-texto.functions";

export const Route = createFileRoute("/_authenticated/chamados/$ticketId")({
  head: () => ({ meta: [
    { title: "Atender chamado | TI Senai LRV" },
    { name: "description", content: "Atendimento e atualização de um chamado de TI pela equipe autorizada." },
    { property: "og:title", content: "Atender chamado | TI Senai LRV" },
    { property: "og:description", content: "Detalhes e atualização de chamado para gestores." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: TicketDetail,
});

const prioridadeEstilos: Record<string, { active: string; inactive: string }> = {
  Crítico: {
    active: "bg-[#EA4335] text-white font-bold shadow-md ring-2 ring-[#EA4335] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#EA4335]/40 text-[#EA4335] bg-[#EA4335]/10 hover:bg-[#EA4335]/20",
  },
  Crítica: {
    active: "bg-[#EA4335] text-white font-bold shadow-md ring-2 ring-[#EA4335] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#EA4335]/40 text-[#EA4335] bg-[#EA4335]/10 hover:bg-[#EA4335]/20",
  },
  Alta: {
    active: "bg-[#FBBC04] text-zinc-950 font-bold shadow-md ring-2 ring-[#FBBC04] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#FBBC04]/40 text-amber-700 dark:text-amber-400 bg-[#FBBC04]/10 hover:bg-[#FBBC04]/20",
  },
  Média: {
    active: "bg-[#34A853] text-white font-bold shadow-md ring-2 ring-[#34A853] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#34A853]/40 text-[#34A853] bg-[#34A853]/10 hover:bg-[#34A853]/20",
  },
  Baixa: {
    active: "bg-[#1A73E8] text-white font-bold shadow-md ring-2 ring-[#1A73E8] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#1A73E8]/40 text-[#1A73E8] bg-[#1A73E8]/10 hover:bg-[#1A73E8]/20",
  },
};

const statusEstilos: Record<string, { active: string; inactive: string }> = {
  "Em atendimento": {
    active: "bg-[#34A853] text-white font-bold shadow-md ring-2 ring-[#34A853] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#34A853]/40 text-[#34A853] bg-[#34A853]/10 hover:bg-[#34A853]/20",
  },
  "Em andamento": {
    active: "bg-[#34A853] text-white font-bold shadow-md ring-2 ring-[#34A853] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#34A853]/40 text-[#34A853] bg-[#34A853]/10 hover:bg-[#34A853]/20",
  },
  Aguardando: {
    active: "bg-[#FA7B17] text-white font-bold shadow-md ring-2 ring-[#FA7B17] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#FA7B17]/40 text-[#FA7B17] bg-[#FA7B17]/10 hover:bg-[#FA7B17]/20",
  },
  Cancelado: {
    active: "bg-[#5F6368] text-white font-bold shadow-md ring-2 ring-[#5F6368] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#5F6368]/40 text-[#5F6368] bg-[#5F6368]/10 hover:bg-[#5F6368]/20",
  },
  Aberto: {
    active: "bg-[#1A73E8] text-white font-bold shadow-md ring-2 ring-[#1A73E8] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#1A73E8]/40 text-[#1A73E8] bg-[#1A73E8]/10 hover:bg-[#1A73E8]/20",
  },
  Resolvido: {
    active: "bg-[#0D652D] text-white font-bold shadow-md ring-2 ring-[#0D652D] ring-offset-2 ring-offset-background",
    inactive: "border-2 border-[#0D652D]/40 text-[#0D652D] bg-[#0D652D]/10 hover:bg-[#0D652D]/20",
  },
};

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { tickets, regras, hidratado, updateTicket, removeTicket, isGestor, session } = useStore();
  const ticketFromStore = tickets.find(t => t.id === Number(ticketId));
  const [directTicket, setDirectTicket] = useState<Ticket | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketFromStore) return;
    let cancel = false;
    async function carregarDireto() {
      setDirectLoading(true);
      setDirectError(null);
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", Number(ticketId))
          .maybeSingle();

        if (cancel) return;
        if (error) {
          setDirectError(error.message);
        } else if (data) {
          setDirectTicket(fromRow(data));
        } else {
          setDirectError("Chamado não encontrado.");
        }
      } catch (err: any) {
        if (!cancel) setDirectError(err.message || "Erro ao carregar chamado.");
      } finally {
        if (!cancel) setDirectLoading(false);
      }
    }

    carregarDireto();
    return () => {
      cancel = true;
    };
  }, [ticketId, ticketFromStore]);

  const ticket = ticketFromStore || directTicket;

  if (!ticket) {
    if (!hidratado || directLoading) {
      return (
        <div className="py-16 text-center text-sm text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
          <Clock className="size-6 animate-spin text-g-blue" />
          <span>Carregando chamado #{ticketId}...</span>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to="/atendimento">
            <ArrowLeft className="size-4" /> Atendimento
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
          <p className="font-bold text-destructive">Chamado #{ticketId} não encontrado.</p>
          <p className="text-xs text-muted-foreground">
            {directError || "Verifique se o número do chamado está correto ou se você possui autorização para acessá-lo."}
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/atendimento">Voltar para a planilha</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <TicketEditor
      key={ticket.id}
      ticket={ticket}
      regras={regras}
      updateTicket={updateTicket}
      removeTicket={removeTicket}
      isGestor={isGestor}
      session={session}
    />
  );
}

function TicketEditor({
  ticket,
  regras,
  updateTicket,
  removeTicket,
  isGestor,
  session,
}: {
  ticket: Ticket;
  regras: ReturnType<typeof useStore>["regras"];
  updateTicket: ReturnType<typeof useStore>["updateTicket"];
  removeTicket: ReturnType<typeof useStore>["removeTicket"];
  isGestor: boolean;
  session: ReturnType<typeof useStore>["session"];
}) {
  const navigate = useNavigate();
  const { wrapAsync, isLoading } = useLoading();
  const [draft, setDraft] = useState<Ticket>(() => ({ ...ticket, responsavel: "Claudinei Lima", status: ticket.status === "Aberto" ? "Em andamento" : ticket.status }));
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Ticket["prioridade"] | null>(null);
  const [gerandoRespostas, setGerandoRespostas] = useState(false);
  const [erroRespostas, setErroRespostas] = useState<string | null>(null);
  const [respostasTecnicas, setRespostasTecnicas] = useState<{ opcao1: string; opcao2: string } | null>(null);
  const [edicaoOpcao1, setEdicaoOpcao1] = useState("");
  const [edicaoOpcao2, setEdicaoOpcao2] = useState("");
  const autoSuggestedId = useRef<number | null>(null);
  const autoAssignedId = useRef<number | null>(null);
  useEffect(() => setDraft(prev => ({ ...ticket, responsavel: "Claudinei Lima", status: prev.status === "Aberto" && ticket.status === "Aberto" ? "Em andamento" : ticket.status })), [ticket]);
  useEffect(() => {
    if (autoAssignedId.current === ticket.id || ["Resolvido", "Cancelado"].includes(ticket.status)) return;
    autoAssignedId.current = ticket.id;
    if (ticket.responsavel === "Claudinei Lima" && ticket.status !== "Aberto") return;
    void updateTicket(ticket.id, { responsavel: "Claudinei Lima", ...(ticket.status === "Aberto" ? { status: "Em andamento" as const } : {}) });
  }, [ticket.id, ticket.responsavel, ticket.status, updateTicket]);
  useEffect(() => {
    if (ticket.status !== "Aberto" || autoSuggestedId.current === ticket.id) return;
    autoSuggestedId.current = ticket.id;
    void suggestPriority();
  }, [ticket.id, ticket.status]);
  const sla = calcularSla(ticket, regras);
  const field = <K extends keyof Ticket>(key: K, value: Ticket[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const editable = ["solicitante", "setor", "local", "descricao", "categoria", "prioridade", "responsavel", "status", "procedimento", "contato"] as const;

  // Estado e controle de Pausa de SLA
  const [modalPausaAberto, setModalPausaAberto] = useState(false);
  const motivosDisponiveis = regras.motivosPausaSla && regras.motivosPausaSla.length > 0
    ? regras.motivosPausaSla
    : [
        "Aguardando resposta do usuário",
        "Aguardando peça ou fornecedor",
        "Aguardando validação externa",
        "Equipamento em bancada",
        "Aguardando agendamento",
        "Outros",
      ];
  const [motivoPausa, setMotivoPausa] = useState(motivosDisponiveis[0] || "Aguardando resposta do usuário");
  const [motivoCustom, setMotivoCustom] = useState("");
  const [mostrarHistoricoPausas, setMostrarHistoricoPausas] = useState(false);

  // Estado e controle de Finalizar e Cancelar Chamado
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [procedimentoFinalizacao, setProcedimentoFinalizacao] = useState(draft.procedimento || "");
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  async function executarFinalizacaoChamado() {
    const proc = procedimentoFinalizacao.trim() || draft.procedimento || "Atendimento concluído e resolvido com sucesso pela equipe técnica.";
    const hoje = obterDataHojeCuiaba();
    const hora = obterHoraAgoraCuiaba();
    const patch: Partial<Ticket> = {
      status: "Resolvido",
      fechadoEm: hoje,
      horario: hora,
      procedimento: proc,
      slaPausado: false,
      slaPausadoEm: null,
      slaPausaMotivo: null,
    };

    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, patch);
        if (ok) {
          setDraft((prev) => ({ ...prev, ...patch }));
          try {
            await supabase.from("ticket_mensagens").insert({
              ticket_id: ticket.id,
              autor_nome: session?.user?.user_metadata?.full_name || session?.user?.email || "Claudinei Lima",
              autor_email: session?.user?.email || "claudinei.lima@senaimt.ind.br",
              autor_tipo: "tecnico",
              evento_tipo: "status_finalizado",
              mensagem: `Chamado finalizado como Resolvido. Procedimento: ${proc}`,
            });
          } catch {
            // Silencioso se tabela ausente
          }
          toast.success(`Chamado #${ticket.id} finalizado com sucesso!`);
          setModalFinalizarAberto(false);
        } else {
          toast.error("Não foi possível finalizar o chamado. Tente novamente.");
        }
      }, "Finalizando chamado...");
    } finally {
      setSaving(false);
    }
  }

  async function executarCancelamentoChamado() {
    const motivo = motivoCancelamento.trim() || "Cancelado pela equipe de atendimento.";
    const hoje = obterDataHojeCuiaba();
    const hora = obterHoraAgoraCuiaba();
    const proc = draft.procedimento ? `${draft.procedimento}\n\n[Cancelamento]: ${motivo}` : `[Cancelamento]: ${motivo}`;
    const patch: Partial<Ticket> = {
      status: "Cancelado",
      fechadoEm: hoje,
      horario: hora,
      procedimento: proc,
      slaPausado: false,
      slaPausadoEm: null,
      slaPausaMotivo: null,
    };

    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, patch);
        if (ok) {
          setDraft((prev) => ({ ...prev, ...patch }));
          try {
            await supabase.from("ticket_mensagens").insert({
              ticket_id: ticket.id,
              autor_nome: session?.user?.user_metadata?.full_name || session?.user?.email || "Claudinei Lima",
              autor_email: session?.user?.email || "claudinei.lima@senaimt.ind.br",
              autor_tipo: "tecnico",
              evento_tipo: "status_alterado",
              mensagem: `Chamado cancelado: ${motivo}`,
            });
          } catch {
            // Silencioso se tabela ausente
          }
          toast.success(`Chamado #${ticket.id} cancelado com sucesso.`);
          setModalCancelarAberto(false);
          setMotivoCancelamento("");
        } else {
          toast.error("Não foi possível cancelar o chamado.");
        }
      }, "Cancelando chamado...");
    } finally {
      setSaving(false);
    }
  }

  async function pausarSla() {
    const motivoFinal = motivoPausa === "Outros" && motivoCustom.trim() ? motivoCustom.trim() : motivoPausa;
    const agoraIso = new Date().toISOString();
    const autor = session?.user?.user_metadata?.full_name || session?.user?.email || "Equipe de TI";
    const historico = [
      ...(ticket.slaHistoricoPausas || []),
      {
        id: crypto.randomUUID(),
        inicio: agoraIso,
        fim: null,
        motivo: motivoFinal,
        autor,
      },
    ];

    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, {
          slaPausado: true,
          slaPausadoEm: agoraIso,
          slaPausaMotivo: motivoFinal,
          slaPausaAutor: autor,
          slaHistoricoPausas: historico,
        });
        if (ok) {
          toast.success("SLA pausado com sucesso! O relógio foi parado.");
          setModalPausaAberto(false);
          setMotivoCustom("");
          try {
            await supabase.from("ticket_mensagens").insert({
              ticket_id: ticket.id,
              autor_nome: "Sistema",
              autor_email: "sistema@senailrv.local",
              autor_tipo: "sistema",
              evento_tipo: "sla_pausado",
              mensagem: `SLA pausado${motivoFinal ? `: ${motivoFinal}` : ""}.`,
            });
          } catch {
            // Trigger do banco assegura persistência
          }
        } else {
          toast.error("Não foi possível pausar o SLA.");
        }
      }, "Pausando SLA...");
    } finally {
      setSaving(false);
    }
  }

  async function retomarSla() {
    const agora = new Date();
    const inicioPausa = ticket.slaPausadoEm ? new Date(ticket.slaPausadoEm) : agora;
    const segPausados = segundosUteis(inicioPausa, agora, regras);
    const novoAcumulado = (ticket.slaSegundosPausadosAcumulados || 0) + segPausados;

    const historico = [...(ticket.slaHistoricoPausas || [])];
    if (historico.length > 0) {
      const ult = historico[historico.length - 1];
      historico[historico.length - 1] = {
        ...ult,
        fim: agora.toISOString(),
        segundosUteisPausados: segPausados,
      };
    }

    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, {
          slaPausado: false,
          slaPausadoEm: null,
          slaPausaMotivo: null,
          slaPausaAutor: null,
          slaHistoricoPausas: historico,
          slaSegundosPausadosAcumulados: novoAcumulado,
        });
        if (ok) {
          toast.success("SLA retomado! O tempo de pausa foi somado ao prazo limite.");
          try {
            await supabase.from("ticket_mensagens").insert({
              ticket_id: ticket.id,
              autor_nome: "Sistema",
              autor_email: "sistema@senailrv.local",
              autor_tipo: "sistema",
              evento_tipo: "sla_retomado",
              mensagem: "SLA retomado pela equipe de suporte.",
            });
          } catch {
            // Trigger do banco assegura persistência
          }
        } else {
          toast.error("Não foi possível retomar o SLA.");
        }
      }, "Retomando SLA...");
    } finally {
      setSaving(false);
    }
  }

  function alterarPrioridade(novaPrioridade: Ticket["prioridade"]) {
    field("prioridade", novaPrioridade);
    toast.info(`Prioridade alterada para "${novaPrioridade}" no rascunho.`);
  }

  async function save() {
    const patch: Partial<Ticket> = {};
    for (const key of editable) {
      if (draft[key] !== ticket[key]) Object.assign(patch, { [key]: draft[key] });
    }
    if (!Object.keys(patch).length) return;
    if (draft.solicitante.trim().length < 1 || draft.descricao.trim().length < 1) {
      toast.error("Preencha solicitante e descrição.");
      return;
    }
    if (["Resolvido", "Cancelado"].includes(draft.status) && !["Resolvido", "Cancelado"].includes(ticket.status)) {
      patch.fechadoEm = obterDataHojeCuiaba();
      patch.horario = obterHoraAgoraCuiaba();
    } else if (!["Resolvido", "Cancelado"].includes(draft.status) && ["Resolvido", "Cancelado"].includes(ticket.status)) {
      patch.fechadoEm = null;
      patch.horario = null;
    }
    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, patch);
        if (ok) {
          if (patch.status && patch.status !== ticket.status) {
            try {
              const isFin = ["Resolvido", "Concluído"].includes(patch.status);
              await supabase.from("ticket_mensagens").insert({
                ticket_id: ticket.id,
                autor_nome: "Sistema",
                autor_email: "sistema@senailrv.local",
                autor_tipo: "sistema",
                evento_tipo: isFin ? "status_finalizado" : "status_alterado",
                mensagem: isFin
                  ? `Chamado finalizado como ${patch.status}.`
                  : `Status alterado de "${ticket.status}" para "${patch.status}".`,
              });
            } catch {
              // Trigger do banco assegura persistência
            }
          }
          toast.success("Chamado salvo.");
        } else {
          toast.error("Não foi possível salvar o chamado.");
        }
      }, "Salvando chamado...");
    } finally {
      setSaving(false);
    }
  }

  async function excluirChamado() {
    await wrapAsync(async () => {
      const ok = await removeTicket(ticket.id);
      if (ok) {
        toast.success(`Chamado #${ticket.id} excluído com sucesso.`);
        navigate({ to: "/atendimento" });
      } else {
        toast.error("Não foi possível excluir o chamado.");
      }
    }, "Excluindo chamado...");
  }

  const hasChanges = editable.some(k => draft[k] !== ticket[k]);
  async function suggestPriority() {
    setSuggesting(true);
    try { setSuggested(await sugerirPrioridade({ data: { id: ticket.id } })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível sugerir uma prioridade."); }
    finally { setSuggesting(false); }
  }

  async function gerarRespostasTecnicas() {
    setGerandoRespostas(true);
    setErroRespostas(null);
    try {
      const res = await sugerirRespostasAtendimento({
        data: {
          ticketId: ticket.id,
          titulo: draft.categoria ? `${draft.categoria} (Chamado #${ticket.id})` : `Chamado #${ticket.id}`,
          categoria: draft.categoria,
          prioridade: draft.prioridade,
          local: draft.local,
          descricao: draft.descricao,
          procedimentoAtual: draft.procedimento ?? undefined,
        },
      });
      const respostaFinal = res.texto || res.opcao1 || "";
      setRespostasTecnicas(res);
      setEdicaoOpcao1(respostaFinal);
      setEdicaoOpcao2(respostaFinal);
      toast.success("Resposta técnica gerada com sucesso!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível gerar a resposta técnica.";
      setErroRespostas(msg);
      toast.error(msg);
    } finally {
      setGerandoRespostas(false);
    }
  }

  const LISTA_PRIORIDADES = ["Crítico", "Alta", "Média", "Baixa"] as const;
  const LISTA_STATUS = ["Em atendimento", "Aguardando", "Cancelado", "Aberto", "Resolvido"] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Botão de retorno e cabeçalho principal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link to="/atendimento">
            <ArrowLeft className="size-4" /> Voltar à planilha de atendimento
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {draft.status !== "Resolvido" && (
            <Button
              type="button"
              variant="google-green"
              size="sm"
              onClick={() => {
                setProcedimentoFinalizacao(draft.procedimento || "");
                setModalFinalizarAberto(true);
              }}
              className="font-bold gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="size-4" /> Finalizar chamado
            </Button>
          )}

          {draft.status !== "Cancelado" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalCancelarAberto(true)}
              className="text-xs text-muted-foreground hover:text-destructive border-border/80 gap-1.5"
            >
              <X className="size-3.5" /> Cancelar chamado
            </Button>
          )}

          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-bold text-muted-foreground uppercase">Status atual:</span>
            <span
              className="rounded-full px-3 py-0.5 text-xs font-bold text-white shadow-xs"
              style={{
                backgroundColor:
                  draft.status === "Resolvido"
                    ? "#0D652D"
                    : draft.status === "Aguardando"
                      ? "#FA7B17"
                      : draft.status === "Cancelado"
                        ? "#5F6368"
                        : draft.status === "Aberto"
                          ? "#1A73E8"
                          : "#34A853",
              }}
            >
              {draft.status === "Em andamento" ? "Em atendimento" : draft.status}
            </span>
          </div>
        </div>
      </div>

      {/* Header com destaque e SLA */}
      <SectionErrorBoundary name="Cabeçalho e SLA">
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-g-blue/40 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded-md bg-g-blue/15 px-2.5 py-1 text-xs font-black uppercase text-g-blue tracking-wider">
                  Chamado de Suporte TI
                </span>
                <h1 className="mt-2 text-3xl font-black text-foreground">Chamado #{ticket.id}</h1>
                <div className="mt-1 text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                  <span>Aberto em {formatarData(ticket.abertoEm, ticket.hora)}</span>
                  <span>·</span>
                  <span>Prazo: {formatarDataHora(sla.prazo)}</span>
                  <span>·</span>
                  <span>SLA:</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs inline-flex items-center gap-1 ${
                      ticket.slaPausado
                        ? "bg-[#F59E0B] text-black ring-2 ring-[#F59E0B]/40 font-black"
                        : sla.situacao === "Estourado"
                        ? "bg-[#EA4335] text-white"
                        : sla.situacao === "No prazo"
                        ? "bg-[#34A853] text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {ticket.slaPausado && <Pause className="size-3 shrink-0" />}
                    {ticket.slaPausado ? "SLA pausado" : sla.situacao}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Prioridade:</span>
                  <span
                    className="rounded-full px-3 py-0.5 text-xs font-bold text-white shadow-xs"
                    style={{
                      backgroundColor:
                        draft.prioridade === "Crítica"
                          ? "#EA4335"
                          : draft.prioridade === "Alta"
                            ? "#FBBC04"
                            : draft.prioridade === "Média"
                              ? "#34A853"
                              : "#1A73E8",
                      color: draft.prioridade === "Alta" ? "#202124" : "#FFFFFF",
                    }}
                  >
                    {draft.prioridade}
                  </span>
                </div>
                <p className="text-xs font-semibold text-g-green">Responsável: Claudinei Lima</p>
              </div>
            </div>
          </div>

          {/* Banner de SLA Pausado ou Controles de Pausa */}
          {ticket.slaPausado ? (
            <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500 text-black px-2.5 py-0.5 text-xs font-black uppercase inline-flex items-center gap-1 shadow-2xs">
                      <Pause className="size-3" /> SLA pausado
                    </span>
                    <span className="text-xs font-bold text-foreground">Relógio operacional interrompido</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium">
                    <strong>Motivo da pausa:</strong> {ticket.slaPausaMotivo || "Aguardando tratativa"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Pausado em {ticket.slaPausadoEm ? new Date(ticket.slaPausadoEm).toLocaleString("pt-BR") : "—"} por {ticket.slaPausaAutor || "Gestor"}.
                    {sla.restanteMin !== null && (
                      <span className="ml-2 font-semibold text-amber-700 dark:text-amber-400">
                        Tempo restante congelado: {formatarDuracao(sla.restanteMin)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ticket.slaHistoricoPausas && ticket.slaHistoricoPausas.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarHistoricoPausas((v) => !v)}
                      className="text-xs gap-1 border-amber-400/40"
                    >
                      <History className="size-3.5" />
                      {mostrarHistoricoPausas ? "Ocultar histórico" : "Ver histórico"}
                    </Button>
                  )}
                  <ConfirmAction
                    title={`Retomar SLA do chamado #${ticket.id}?`}
                    description="O relógio do SLA voltará a correr. O tempo em que o chamado ficou pausado será automaticamente somado ao prazo limite útil."
                    confirmLabel="Sim, retomar SLA"
                    variant="google-green"
                    onConfirm={retomarSla}
                  >
                    <Button type="button" variant="google-green" size="sm" className="font-bold gap-1.5 shadow-xs">
                      <Play className="size-4" /> Retomar SLA
                    </Button>
                  </ConfirmAction>
                </div>
              </div>
            </div>
          ) : !["Resolvido", "Cancelado"].includes(ticket.status) ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="size-4 text-g-blue" />
                <span className="font-semibold text-foreground">Situação do SLA:</span>
                <span className={`font-bold ${sla.situacao === "Estourado" ? "text-red-600" : "text-emerald-600"}`}>
                  {sla.situacao}
                </span>
                {sla.restanteMin !== null && (
                  <span className="text-muted-foreground">({formatarDuracao(sla.restanteMin)})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {ticket.slaHistoricoPausas && ticket.slaHistoricoPausas.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMostrarHistoricoPausas((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1 h-8"
                  >
                    <History className="size-3.5" />
                    {mostrarHistoricoPausas ? "Ocultar histórico" : `Histórico (${ticket.slaHistoricoPausas.length})`}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPausaAberto(true)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-400/40 hover:bg-amber-500/10 gap-1.5 h-8"
                >
                  <Pause className="size-3.5" /> Pausar SLA
                </Button>
              </div>
            </div>
          ) : null}

          {/* Histórico detalhado de pausas (quando aberto) */}
          {mostrarHistoricoPausas && ticket.slaHistoricoPausas && ticket.slaHistoricoPausas.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <History className="size-3.5 text-amber-500" /> Histórico de Pausas de SLA
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Total acumulado: {formatarDuracao(Math.round((ticket.slaSegundosPausadosAcumulados || 0) / 60))}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {ticket.slaHistoricoPausas.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="rounded-xl border border-border/60 bg-background/80 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">{p.motivo}</span>
                      <p className="text-[11px] text-muted-foreground">
                        Por: {p.autor} · Início: {new Date(p.inicio).toLocaleString("pt-BR")}
                        {p.fim ? ` · Fim: ${new Date(p.fim).toLocaleString("pt-BR")}` : " (Em andamento)"}
                      </p>
                    </div>
                    {p.segundosUteisPausados !== undefined && (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                        +{formatarDuracao(Math.round(p.segundosUteisPausados / 60))} adicionados
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionErrorBoundary>

      {/* 1. Card: Dados do Solicitante */}
      <SectionErrorBoundary name="Dados do solicitante">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-g-blue uppercase tracking-wider">
            1. Dados do Solicitante e Categoria
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-foreground">
              Solicitante
              <Input
                className="h-10 text-sm font-medium"
                value={draft.solicitante}
                onChange={(e) => field("solicitante", e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-foreground">
              E-mail do solicitante
              <Input
                className="h-10 text-sm bg-muted/40 font-medium"
                value={ticket.solicitanteEmail || "Não informado na abertura"}
                readOnly
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-foreground">
              Setor
              <Input
                className="h-10 text-sm font-medium"
                value={draft.setor}
                onChange={(e) => field("setor", e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-foreground">
              Categoria do problema
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium"
                value={draft.categoria ?? ""}
                onChange={(e) => field("categoria", e.target.value)}
              >
                {regras.categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </SectionErrorBoundary>

      {/* 2. Card: Descrição do Problema */}
      <SectionErrorBoundary name="Descrição do problema">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              2. Descrição do Problema
            </h2>
          </div>
          <TextoAssistido value={draft.descricao} onChange={(value) => field("descricao", value)} ocultarIa={true} />
        </div>
      </SectionErrorBoundary>

      {/* Conversa e Interação Direta com o Solicitante (Chat) */}
      <SectionErrorBoundary name="Chat do chamado">
        <div className="space-y-3">
          <TicketChat
            ticketId={ticket.id}
            solicitanteNome={ticket.solicitante}
            solicitanteEmail={ticket.solicitanteEmail}
            ticketDescricao={ticket.descricao}
            ticketAbertoEm={ticket.abertoEm}
            ticketHora={ticket.hora}
            ticketProcedimento={draft.procedimento}
            ticketStatus={draft.status || ticket.status}
            ticketFechadoEm={draft.fechadoEm || ticket.fechadoEm}
            ticketSlaPausado={ticket.slaPausado}
            ticketSlaPausadoEm={ticket.slaPausadoEm}
            ticketSlaPausaMotivo={ticket.slaPausaMotivo}
            slaHistoricoPausas={ticket.slaHistoricoPausas}
            currentUserEmail={session?.user?.email}
            currentUserName={session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Claudinei Lima"}
            isGestorOrAdmin={true}
            onMensagemEnviada={(msg) => {
              field("procedimento", msg);
            }}
          />
        </div>
      </SectionErrorBoundary>

      {/* 3. Card: Procedimento Técnico */}
      <SectionErrorBoundary name="Procedimento técnico">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-g-green dark:text-green-400 uppercase tracking-wider">
              3. Procedimento / Atendimento Técnico
            </h2>
            <Button
              type="button"
              size="sm"
              disabled={gerandoRespostas || draft.descricao.trim().length < 5}
              onClick={gerarRespostasTecnicas}
              className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-xs hover:shadow-md transition-all border-0 text-xs px-3 py-1.5"
            >
              <Sparkles className="size-3.5" />
              {gerandoRespostas ? "Gerando resposta técnica…" : "Resposta técnica"}
            </Button>
          </div>

          {erroRespostas && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs flex items-center justify-between gap-2 text-destructive">
              <span>{erroRespostas}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-destructive/40"
                onClick={gerarRespostasTecnicas}
              >
                <RotateCcw className="size-3 mr-1" /> Tentar de novo
              </Button>
            </div>
          )}

          {respostasTecnicas && (
            <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-4 text-sm shadow-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-g-blue" />
                  <span className="font-bold text-foreground">
                    Resposta com IA (editável antes de usar):
                  </span>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setRespostasTecnicas(null)}>
                  Fechar
                </Button>
              </div>

              <div className="space-y-3">
                <Textarea
                  rows={5}
                  value={edicaoOpcao1}
                  onChange={(e) => setEdicaoOpcao1(e.target.value)}
                  className="text-xs sm:text-sm bg-background/80 font-sans leading-relaxed"
                  placeholder="Resposta técnica pronta para uso..."
                />
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant="google-blue"
                    className="gap-1.5 font-bold text-xs"
                    onClick={() => {
                      field("procedimento", edicaoOpcao1);
                      setRespostasTecnicas(null);
                      toast.success("Resposta aplicada no procedimento!");
                    }}
                  >
                    <Check className="size-3.5" /> Aplicar no procedimento
                  </Button>
                </div>
              </div>
            </div>
          )}

          <TextoAssistido
            value={draft.procedimento ?? ""}
            onChange={(value) => field("procedimento", value || null)}
            ticketId={ticket.id}
            titulo={draft.categoria ? `${draft.categoria} (Chamado #${ticket.id})` : `Chamado #${ticket.id}`}
            categoria={draft.categoria}
            local={draft.local}
            descricao={draft.descricao}
          />
          {ticket.fechadoEm && (
            <p className="text-xs text-muted-foreground pt-1">
              Fechamento registrado em: {formatarData(ticket.fechadoEm, ticket.horario)}
            </p>
          )}
        </div>
      </SectionErrorBoundary>

      {/* 4. Card: Classificação e Status com Cores Estritas */}
      <SectionErrorBoundary name="Classificação e status">
        <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-5 shadow-sm space-y-5">
          {/* Prioridades na ordem estrita: Crítico (Vermelho), Alta (Amarelo), Média (Verde) e Baixa (Azul) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-foreground">
                Prioridade do Chamado (Ordem: Crítico, Alta, Média, Baixa)
              </h2>
              {suggested && (
                <Button
                  size="sm"
                  type="button"
                  variant="google-green"
                  className="h-7 text-xs"
                  onClick={() => {
                    field("prioridade", suggested);
                    setSuggested(null);
                  }}
                >
                  Aplicar prioridade técnica: {suggested}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {LISTA_PRIORIDADES.map((p) => {
                const ativo = draft.prioridade === p || (p === "Crítico" && draft.prioridade === "Crítica");
                return (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    className={`rounded-xl transition-all ${
                      ativo ? prioridadeEstilos[p]?.active : prioridadeEstilos[p]?.inactive
                    }`}
                    aria-pressed={ativo}
                    onClick={() => alterarPrioridade(p === "Crítico" ? "Crítica" : p)}
                  >
                    Prioridade {p}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Status na ordem estrita: Em atendimento (Verde), Aguardando (Laranja), Cancelado (Grafite), Aberto (Azul) e Resolvido (Verde escuro) */}
          <div className="border-t border-border/80 pt-4">
            <h2 className="mb-2 text-sm font-bold text-foreground">
              Status do Chamado (Ordem: Em atendimento, Aguardando, Cancelado, Aberto, Resolvido)
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {LISTA_STATUS.map((s) => {
                const ativo =
                  draft.status === s || (s === "Em atendimento" && draft.status === "Em andamento");
                return (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    className={`rounded-xl transition-all ${
                      ativo ? statusEstilos[s]?.active : statusEstilos[s]?.inactive
                    }`}
                    aria-pressed={ativo}
                    onClick={() => {
                      if (s === "Resolvido") {
                        setProcedimentoFinalizacao(draft.procedimento || "");
                        setModalFinalizarAberto(true);
                      } else if (s === "Cancelado") {
                        setModalCancelarAberto(true);
                      } else {
                        field("status", s === "Em atendimento" ? "Em andamento" : s);
                      }
                    }}
                  >
                    {s}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionErrorBoundary>

      {/* Barra inferior de ações padronizada */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {isGestor && (
          <ConfirmAction
            title={`Excluir chamado #${ticket.id}?`}
            description="Atenção: esta ação é irreversível. O chamado será removido permanentemente do banco de dados."
            confirmLabel="Sim, excluir definitivamente"
            variant="google-red"
            onConfirm={excluirChamado}
          >
            <Trash2 className="size-4" /> Excluir chamado
          </ConfirmAction>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (hasChanges && !window.confirm("Deseja descartar as alterações e voltar?")) return;
              navigate({ to: "/atendimento" });
            }}
          >
            Cancelar
          </Button>
          <ConfirmAction
            title={`Salvar alterações no chamado #${ticket.id}?`}
            description="Confira os dados antes de confirmar. As alterações aparecerão imediatamente na planilha e no acompanhamento."
            confirmLabel="Sim, salvar chamado"
            variant="google-green"
            onConfirm={save}
            disabled={!hasChanges || saving}
          >
            <Save className="size-4" /> {saving ? "Salvando…" : "Salvar alterações"}
          </ConfirmAction>
        </div>
      </div>

      {/* Modal de Pausa do SLA */}
      {modalPausaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Pause className="size-5 text-amber-500" /> Pausar Contagem de SLA
              </h3>
              <button
                type="button"
                onClick={() => setModalPausaAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao pausar o SLA, o relógio de atendimento para imediatamente e não contará como atrasado. Selecione o motivo oficial da pausa:
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Motivo da pausa</label>
                <select
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {motivosDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {motivoPausa === "Outros" && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-foreground">Descreva o motivo da pausa</label>
                  <Input
                    value={motivoCustom}
                    onChange={(e) => setMotivoCustom(e.target.value)}
                    placeholder="Ex.: Aguardando retorno da concessionária de energia..."
                    className="text-xs sm:text-sm"
                  />
                </div>
              )}

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground/90 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-4 shrink-0" /> Como funciona a retomada:
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Quando você ou outro gestor clicar em "Retomar SLA", todo o tempo em que o chamado permaneceu pausado será acrescido ao prazo útil final.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPausaAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={motivoPausa === "Outros" && !motivoCustom.trim()}
                onClick={pausarSla}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
              >
                <Pause className="size-3.5" /> Confirmar pausa do SLA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalizar Chamado */}
      {modalFinalizarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border-2 border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-g-green" /> Finalizar Chamado #{ticket.id}
              </h3>
              <button
                type="button"
                onClick={() => setModalFinalizarAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao finalizar, o status do chamado mudará para <strong>Resolvido</strong>, o horário de encerramento será gravado no fuso oficial e o atendimento será concluído.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Procedimento / Solução Técnica</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={gerarRespostasTecnicas}
                    disabled={gerandoRespostas}
                    className="text-xs text-purple-600 h-6 gap-1"
                  >
                    <Sparkles className="size-3" /> Sugerir com IA
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  value={procedimentoFinalizacao}
                  onChange={(e) => setProcedimentoFinalizacao(e.target.value)}
                  placeholder="Descreva a solução técnica aplicada para o solicitante..."
                  className="text-xs sm:text-sm bg-background"
                />
              </div>

              <div className="rounded-xl border border-g-green/30 bg-g-green/10 p-3 text-xs text-foreground/90 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-g-green dark:text-green-400">
                  <Check className="size-4 shrink-0" /> Confirmação de encerramento:
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O SLA será finalizado com a data e horário atuais e o histórico será registrado.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFinalizarAberto(false)}
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="google-green"
                size="sm"
                disabled={saving}
                onClick={executarFinalizacaoChamado}
                className="font-bold text-xs gap-1.5"
              >
                <Check className="size-3.5" /> Confirmar e Finalizar Chamado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelar Chamado */}
      {modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <X className="size-5 text-destructive" /> Cancelar Chamado #{ticket.id}
              </h3>
              <button
                type="button"
                onClick={() => setModalCancelarAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tem certeza que deseja cancelar este chamado? O chamado será marcado como <strong>Cancelado</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Motivo do cancelamento (opcional)</label>
                <Input
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Ex.: Solicitação duplicada, resolvido pelo usuário..."
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCancelarAberto(false)}
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={executarCancelamentoChamado}
                className="font-bold text-xs gap-1.5"
              >
                <X className="size-3.5" /> Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}