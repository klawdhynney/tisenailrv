import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { useStore } from "@/lib/store-context";
import { PRIORIDADES, type Ticket } from "@/lib/types";
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
    active: "bg-g-red text-white font-bold shadow-md ring-2 ring-g-red ring-offset-2 ring-offset-background",
    inactive: "border-2 border-g-red/40 text-g-red bg-g-red/10 hover:bg-g-red/20",
  },
  Alta: {
    active: "bg-g-yellow text-zinc-950 font-bold shadow-md ring-2 ring-g-yellow ring-offset-2 ring-offset-background",
    inactive: "border-2 border-g-yellow/40 text-g-yellow bg-g-yellow/10 hover:bg-g-yellow/20",
  },
  Média: {
    active: "bg-g-blue text-white font-bold shadow-md ring-2 ring-g-blue ring-offset-2 ring-offset-background",
    inactive: "border-2 border-g-blue/40 text-g-blue bg-g-blue/10 hover:bg-g-blue/20",
  },
  Baixa: {
    active: "bg-g-green text-white font-bold shadow-md ring-2 ring-g-green ring-offset-2 ring-offset-background",
    inactive: "border-2 border-g-green/40 text-g-green bg-g-green/10 hover:bg-g-green/20",
  },
};

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { tickets, regras, hidratado, updateTicket } = useStore();
  const ticket = tickets.find(t => t.id === Number(ticketId));
  if (!ticket) return <div className="space-y-4"><Button asChild variant="outline"><Link to="/atendimento"><ArrowLeft className="size-4" /> Atendimento</Link></Button><p className="text-muted-foreground">{hidratado ? "Chamado não encontrado." : "Carregando chamado…"}</p></div>;
  return <TicketEditor key={ticket.id} ticket={ticket} regras={regras} updateTicket={updateTicket} />;
}

function TicketEditor({
  ticket,
  regras,
  updateTicket,
}: {
  ticket: Ticket;
  regras: ReturnType<typeof useStore>["regras"];
  updateTicket: ReturnType<typeof useStore>["updateTicket"];
}) {
  const [draft, setDraft] = useState<Ticket>(() => ({ ...ticket, responsavel: "Claudinei Lima", status: ticket.status === "Aberto" ? "Em andamento" : ticket.status }));
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Ticket["prioridade"] | null>(null);
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
       <div className="flex-1 text-center">
        <h1 className="text-3xl font-bold">Chamado #{ticket.id}</h1>
        <p className="mt-1 text-muted-foreground">Aberto em {formatarData(ticket.abertoEm, ticket.hora)} · Prazo: {formatarDataHora(sla.prazo)} · {sla.situacao}</p>
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Solicitante<Input value={draft.solicitante} onChange={e => field("solicitante", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">E-mail do solicitante<Input value={ticket.solicitanteEmail || "Não informado na planilha original"} readOnly /></label>
      <label className="grid gap-2 text-sm font-medium">WhatsApp<Input value={draft.contato ?? ""} onChange={e => field("contato", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Setor<Input value={draft.setor} onChange={e => field("setor", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Local exato<Input value={draft.local} onChange={e => field("local", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Categoria<select className="h-10 rounded-xl border border-input bg-background px-3" value={draft.categoria ?? ""} onChange={e => field("categoria", e.target.value)}>{regras.categorias.map(c => <option key={c}>{c}</option>)}</select></label>
      
       <div className="space-y-2">
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

    </div>
    <label className="grid gap-2 text-sm font-medium">Descrição<TextoAssistido value={draft.descricao} onChange={value => field("descricao", value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Procedimento / atendimento<TextoAssistido value={draft.procedimento ?? ""} onChange={value => field("procedimento", value || null)} /></label>
    <p className="text-sm text-muted-foreground">Fechamento: {formatarData(ticket.fechadoEm, ticket.horario)}</p>
    <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-5 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-g-green">Responsável: Claudinei Lima</p>
      <div className="border-t border-border/70 pt-3">
        <p className="mb-2.5 text-sm font-semibold">Prioridade do chamado</p>
        <div className="flex flex-wrap gap-2.5">
          {PRIORIDADES.map(p => <Button key={p} type="button" size="sm" className={`rounded-xl transition-all ${draft.prioridade === p ? prioridadeEstilos[p].active : prioridadeEstilos[p].inactive}`} aria-pressed={draft.prioridade === p} onClick={() => alterarPrioridade(p)}>Prioridade {p}</Button>)}
        </div>
      </div>
    </div>
    <div className="space-y-3 border-t border-border pt-5"><p className="text-sm font-semibold">Status do chamado</p><div className="flex flex-wrap gap-2">{(["Em andamento", "Aguardando", "Resolvido", "Cancelado"] as const).map(s => <Button key={s} type="button" variant={draft.status === s ? s === "Cancelado" ? "google-red" : "google-green" : "outline"} aria-pressed={draft.status === s} onClick={() => field("status", s)}>{s}</Button>)}</div></div>
    <div className="flex justify-end border-t border-border pt-5">
      <ConfirmAction title={`Salvar alterações no chamado #${ticket.id}?`} description="Confira os dados antes de confirmar. As alterações aparecerão no acompanhamento do chamado." confirmLabel="Sim, salvar" onConfirm={save} disabled={!hasChanges || saving}>
        <Save className="size-4" /> {saving ? "Salvando…" : "Salvar"}
      </ConfirmAction>
    </div>
  </div>;
}