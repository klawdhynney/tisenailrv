import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { useLoading } from "@/lib/loading-context";
import { useStore } from "@/lib/store-context";
import { PRIORIDADES, type Ticket } from "@/lib/types";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
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
  const { tickets, regras, hidratado, updateTicket, removeTicket, isGestor } = useStore();
  const ticket = tickets.find(t => t.id === Number(ticketId));
  if (!ticket) {
    if (!hidratado) {
      return (
        <div className="py-16 text-center text-sm text-muted-foreground font-medium">
          Carregando chamado...
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
        <p className="text-muted-foreground">Chamado não encontrado.</p>
      </div>
    );
  }
  return <TicketEditor key={ticket.id} ticket={ticket} regras={regras} updateTicket={updateTicket} removeTicket={removeTicket} isGestor={isGestor} />;
}

function TicketEditor({
  ticket,
  regras,
  updateTicket,
  removeTicket,
  isGestor,
}: {
  ticket: Ticket;
  regras: ReturnType<typeof useStore>["regras"];
  updateTicket: ReturnType<typeof useStore>["updateTicket"];
  removeTicket: ReturnType<typeof useStore>["removeTicket"];
  isGestor: boolean;
}) {
  const navigate = useNavigate();
  const { wrapAsync, isLoading } = useLoading();
  const [draft, setDraft] = useState<Ticket>(() => ({ ...ticket, responsavel: "Claudinei Lima", status: ticket.status === "Aberto" ? "Em andamento" : ticket.status }));
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Ticket["prioridade"] | null>(null);
  const [gerandoRespostas, setGerandoRespostas] = useState(false);
  const [respostasTecnicas, setRespostasTecnicas] = useState<{ opcao1: string; opcao2: string } | null>(null);
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
    if (draft.solicitante.trim().length < 2 || draft.setor.trim().length < 2 || draft.descricao.trim().length < 10) { toast.error("Confira nome, setor e descrição."); return; }
    if (["Resolvido", "Cancelado"].includes(draft.status) && !["Resolvido", "Cancelado"].includes(ticket.status)) {
      const now = new Date(); patch.fechadoEm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; patch.horario = now.toTimeString().slice(0, 5);
    } else if (!["Resolvido", "Cancelado"].includes(draft.status) && ["Resolvido", "Cancelado"].includes(ticket.status)) {
      patch.fechadoEm = null; patch.horario = null;
    }
    setSaving(true);
    try {
      await wrapAsync(async () => {
        const ok = await updateTicket(ticket.id, patch);
        toast[ok ? "success" : "error"](ok ? "Chamado salvo." : "Não foi possível salvar o chamado.");
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
    try {
      const res = await sugerirRespostasAtendimento({
        data: {
          ticketId: ticket.id,
          solicitante: draft.solicitante,
          setor: draft.setor,
          local: draft.local,
          categoria: draft.categoria,
          descricao: draft.descricao,
          procedimentoAtual: draft.procedimento ?? undefined,
        },
      });
      setRespostasTecnicas(res);
      toast.info("A IA gerou 2 respostas técnicas e descritivas para você avaliar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar respostas técnicas.");
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
        <div className="flex items-center gap-2">
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

      {/* Header com destaque */}
      <div className="rounded-2xl border-2 border-g-blue/40 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-g-blue/15 px-2.5 py-1 text-xs font-black uppercase text-g-blue tracking-wider">
              Chamado de Suporte TI
            </span>
            <h1 className="mt-2 text-3xl font-black text-foreground">Chamado #{ticket.id}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Aberto em {formatarData(ticket.abertoEm, ticket.hora)} · Prazo: {formatarDataHora(sla.prazo)} · SLA: {sla.situacao}
            </p>
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

      {/* 1. Card: Dados do Solicitante */}
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

      {/* 2. Card: Descrição do Problema */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            2. Descrição do Problema
          </h2>
        </div>
        <TextoAssistido value={draft.descricao} onChange={(value) => field("descricao", value)} ocultarIa={true} />
      </div>

      {/* 3. Card: Procedimento Técnico */}
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
            <Sparkles className="size-3.5 animate-pulse" />
            {gerandoRespostas ? "Sugerindo resposta com IA…" : "Sugerir resposta com IA"}
          </Button>
        </div>

        {respostasTecnicas && (
          <div className="rounded-2xl border-2 border-g-blue/30 bg-muted/20 p-4 text-sm shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-g-blue" />
                <span className="font-bold text-foreground">
                  Sugestões técnicas e descritivas para o procedimento:
                </span>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRespostasTecnicas(null)}>
                Fechar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Opção 1 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-g-blue">
                <div>
                  <div className="mb-2">
                    <span className="rounded-full bg-g-blue/15 px-2.5 py-0.5 text-xs font-bold text-g-blue">
                      Opção 1 · Procedimento Passo a Passo
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{respostasTecnicas.opcao1}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant="google-blue"
                    className="w-full gap-1.5"
                    onClick={() => {
                      field("procedimento", respostasTecnicas.opcao1);
                      setRespostasTecnicas(null);
                      toast.success("Opção 1 aplicada no procedimento!");
                    }}
                  >
                    <Check className="size-3.5" /> Aplicar no procedimento
                  </Button>
                </div>
              </div>

              {/* Opção 2 */}
              <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-g-green">
                <div>
                  <div className="mb-2">
                    <span className="rounded-full bg-g-green/15 px-2.5 py-0.5 text-xs font-bold text-g-green">
                      Opção 2 · Parecer Técnico & Boas Práticas
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{respostasTecnicas.opcao2}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant="google-green"
                    className="w-full gap-1.5"
                    onClick={() => {
                      field("procedimento", respostasTecnicas.opcao2);
                      setRespostasTecnicas(null);
                      toast.success("Opção 2 aplicada no procedimento!");
                    }}
                  >
                    <Check className="size-3.5" /> Aplicar no procedimento
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <TextoAssistido
          value={draft.procedimento ?? ""}
          onChange={(value) => field("procedimento", value || null)}
        />
        {ticket.fechadoEm && (
          <p className="text-xs text-muted-foreground pt-1">
            Fechamento registrado em: {formatarData(ticket.fechadoEm, ticket.horario)}
          </p>
        )}
      </div>

      {/* 4. Card: Classificação e Status com Cores Estritas */}
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
                Aplicar sugestão da IA: {suggested}
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
                  onClick={() => field("status", s === "Em atendimento" ? "Em andamento" : s)}
                >
                  {s}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

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
    </div>
  );
}