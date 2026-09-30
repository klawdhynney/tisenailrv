import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Save, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { useStore } from "@/lib/store-context";
import { PRIORIDADES, STATUS_LIST, type Ticket } from "@/lib/types";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import { sugerirPrioridade } from "@/lib/sugerir-prioridade.functions";

export const Route = createFileRoute("/_authenticated/chamados/$ticketId")({
  head: () => ({ meta: [
    { title: "Atender chamado | TI Senai LRV" },
    { name: "description", content: "Atendimento e atualização de um chamado de TI pela equipe autorizada." },
    { property: "og:title", content: "Atender chamado | TI Senai LRV" },
    { property: "og:description", content: "Detalhes e atualização de chamado para gestores." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: TicketDetail,
});

const prioridadeEstilos: Record<Ticket["prioridade"], { active: string; inactive: string }> = {
  Crítica: {
    active: "bg-red-600 hover:bg-red-700 text-white font-bold shadow-md ring-2 ring-red-600 ring-offset-2 ring-offset-background",
    inactive: "border-2 border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20",
  },
  Alta: {
    active: "bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
    inactive: "border-2 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20",
  },
  Média: {
    active: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md ring-2 ring-emerald-600 ring-offset-2 ring-offset-background",
    inactive: "border-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  Baixa: {
    active: "bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md ring-2 ring-sky-600 ring-offset-2 ring-offset-background",
    inactive: "border-2 border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20",
  },
};

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { tickets, regras, hidratado, updateTicket, session } = useStore();
  const ticket = tickets.find(t => t.id === Number(ticketId));
  if (!ticket) return <div className="space-y-4"><Button asChild variant="outline"><Link to="/atendimento"><ArrowLeft className="size-4" /> Atendimento</Link></Button><p className="text-muted-foreground">{hidratado ? "Chamado não encontrado." : "Carregando chamado…"}</p></div>;
  return <TicketEditor key={ticket.id} ticket={ticket} regras={regras} updateTicket={updateTicket} session={session} />;
}

function TicketEditor({
  ticket,
  regras,
  updateTicket,
  session,
}: {
  ticket: Ticket;
  regras: ReturnType<typeof useStore>["regras"];
  updateTicket: ReturnType<typeof useStore>["updateTicket"];
  session: ReturnType<typeof useStore>["session"];
}) {
  const [draft, setDraft] = useState(ticket);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Ticket["prioridade"] | null>(null);
  const autoSuggestedId = useRef<number | null>(null);
  useEffect(() => setDraft(ticket), [ticket]);
  useEffect(() => {
    if (ticket.status !== "Aberto" || autoSuggestedId.current === ticket.id) return;
    autoSuggestedId.current = ticket.id;
    void suggestPriority();
  }, [ticket.id, ticket.status]);
  const sla = calcularSla(ticket, regras);
  const field = <K extends keyof Ticket>(key: K, value: Ticket[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const editable = ["solicitante", "setor", "local", "descricao", "categoria", "prioridade", "responsavel", "status", "procedimento", "contato"] as const;

  const usuarioAtual =
    (session?.user?.user_metadata?.["full_name"] as string | undefined) ||
    session?.user?.email?.split("@")[0] ||
    regras.responsaveis[0] ||
    "Atendente";

  function assumirChamado() {
    setDraft(prev => ({
      ...prev,
      responsavel: usuarioAtual,
      status: prev.status === "Aberto" ? "Em andamento" : prev.status,
    }));
    toast.success(`Você assumiu o chamado #${ticket.id}! Salve as alterações para confirmar.`);
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
    if (draft.solicitante.trim().length < 2 || draft.setor.trim().length < 2 || draft.local.trim().length < 3 || draft.descricao.trim().length < 10) { toast.error("Confira nome, setor, local e descrição."); return; }
    if (["Resolvido", "Cancelado"].includes(draft.status) && !["Resolvido", "Cancelado"].includes(ticket.status)) {
      const now = new Date(); patch.fechadoEm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; patch.horario = now.toTimeString().slice(0, 5);
    } else if (!["Resolvido", "Cancelado"].includes(draft.status) && ["Resolvido", "Cancelado"].includes(ticket.status)) {
      patch.fechadoEm = null; patch.horario = null;
    }
    setSaving(true);
    try { const ok = await updateTicket(ticket.id, patch); toast[ok ? "success" : "error"](ok ? "Chamado salvo." : "Não foi possível salvar o chamado."); }
    finally { setSaving(false); }
  }
  const hasChanges = editable.some(k => draft[k] !== ticket[k]);
  async function suggestPriority() {
    setSuggesting(true);
    try { setSuggested(await sugerirPrioridade({ data: { id: ticket.id } })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível sugerir uma prioridade."); }
    finally { setSuggesting(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6">
    <Button asChild variant="outline"><Link to="/atendimento"><ArrowLeft className="size-4" /> Voltar à planilha</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-3xl font-bold">Chamado #{ticket.id}</h1>
        <p className="mt-1 text-muted-foreground">Aberto em {formatarData(ticket.abertoEm, ticket.hora)} · Prazo: {formatarDataHora(sla.prazo)} · {sla.situacao}</p>
      </div>
    </div>

    {/* Painel de ações rápidas de atendimento */}
    <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-g-blue">Ações de atendimento</span>
          <h2 className="text-lg font-bold">Gestão rápida do chamado</h2>
        </div>
        <div className="flex items-center gap-2">
          {draft.responsavel === usuarioAtual ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Assumido por você ({usuarioAtual})
            </span>
          ) : (
            <Button type="button" variant="google-green" size="default" onClick={assumirChamado} className="font-semibold shadow-sm">
              <UserCheck className="size-4" /> Assumir chamado
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border/70 pt-3">
        <p className="mb-2.5 text-xs font-bold text-muted-foreground">Alterar prioridade (clique para aplicar):</p>
        <div className="flex flex-wrap gap-2.5">
          {PRIORIDADES.map((p) => {
            const isAtiva = draft.prioridade === p;
            const estilo = prioridadeEstilos[p];
            return (
              <Button
                key={p}
                type="button"
                size="sm"
                className={`rounded-xl transition-all ${isAtiva ? estilo.active : estilo.inactive}`}
                onClick={() => alterarPrioridade(p)}
              >
                {isAtiva && <span className="mr-1">✓</span>}
                Prioridade {p}
              </Button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Solicitante<Input value={draft.solicitante} onChange={e => field("solicitante", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">E-mail do solicitante<Input value={ticket.solicitanteEmail || "Não informado na planilha original"} readOnly /></label>
      <label className="grid gap-2 text-sm font-medium">WhatsApp<Input value={draft.contato ?? ""} onChange={e => field("contato", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Setor<Input value={draft.setor} onChange={e => field("setor", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Local exato<Input value={draft.local} onChange={e => field("local", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Categoria<select className="h-10 rounded-xl border border-input bg-background px-3" value={draft.categoria ?? ""} onChange={e => field("categoria", e.target.value)}>{regras.categorias.map(c => <option key={c}>{c}</option>)}</select></label>
      
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Responsável</label>
          {draft.responsavel !== usuarioAtual && (
            <button type="button" onClick={assumirChamado} className="text-xs font-semibold text-g-green hover:underline inline-flex items-center gap-1">
              <UserCheck className="size-3.5" /> Assumir este chamado
            </button>
          )}
        </div>
        <select className="h-10 rounded-xl border border-input bg-background px-3" value={draft.responsavel ?? ""} onChange={e => field("responsavel", e.target.value || null)}>
          <option value="">Não atribuído</option>
          {regras.responsaveis.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label className="grid gap-2 text-sm font-medium">Prioridade
          <select className="h-10 rounded-xl border border-input bg-background px-3" value={draft.prioridade} onChange={e => field("prioridade", e.target.value as Ticket["prioridade"])}>
            {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
        <Button type="button" size="sm" variant="outline" disabled={suggesting} onClick={suggestPriority}>
          <Sparkles className="size-4" /> {suggesting ? "Analisando…" : "Sugerir prioridade com IA"}
        </Button>
        {suggested && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Sugestão: <strong>{suggested}</strong>
            <Button size="sm" type="button" variant="google-green" onClick={() => { field("prioridade", suggested); setSuggested(null); }}>
              Aplicar no rascunho
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Chamados abertos recebem uma sugestão automática ao serem visualizados. A prioridade só muda após você aplicar e salvar.</p>
      </div>

      <label className="grid gap-2 text-sm font-medium">Status
        <select className="h-10 rounded-xl border border-input bg-background px-3" value={draft.status} onChange={e => field("status", e.target.value as Ticket["status"])}>
          {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
      </label>
    </div>
    <label className="grid gap-2 text-sm font-medium">Descrição<TextoAssistido value={draft.descricao} onChange={value => field("descricao", value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Procedimento / atendimento<TextoAssistido value={draft.procedimento ?? ""} onChange={value => field("procedimento", value || null)} /></label>
    <p className="text-sm text-muted-foreground">Fechamento: {formatarData(ticket.fechadoEm, ticket.horario)}</p>
    <div className="flex justify-end border-t border-border pt-5">
      <ConfirmAction title={`Salvar alterações no chamado #${ticket.id}?`} description="Confira os dados antes de confirmar. As alterações aparecerão no acompanhamento do chamado." confirmLabel="Sim, salvar" onConfirm={save} disabled={!hasChanges || saving}>
        <Save className="size-4" /> {saving ? "Salvando…" : "Salvar"}
      </ConfirmAction>
    </div>
  </div>;
}