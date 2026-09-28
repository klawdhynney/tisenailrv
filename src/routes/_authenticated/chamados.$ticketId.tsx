import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useStore } from "@/lib/store-context";
import { PRIORIDADES, STATUS_LIST, type Ticket } from "@/lib/types";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";

export const Route = createFileRoute("/_authenticated/chamados/$ticketId")({
  head: () => ({ meta: [
    { title: "Atender chamado | TI Senai LRV" },
    { name: "description", content: "Atendimento e atualização de um chamado de TI pela equipe autorizada." },
    { property: "og:title", content: "Atender chamado | TI Senai LRV" },
    { property: "og:description", content: "Detalhes e atualização de chamado para gestores." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: TicketDetail,
});

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { tickets, regras, hidratado, updateTicket } = useStore();
  const ticket = tickets.find(t => t.id === Number(ticketId));
  if (!ticket) return <div className="space-y-4"><Button asChild variant="outline"><Link to="/atendimento"><ArrowLeft className="size-4" /> Atendimento</Link></Button><p className="text-muted-foreground">{hidratado ? "Chamado não encontrado." : "Carregando chamado…"}</p></div>;
  return <TicketEditor key={ticket.id} ticket={ticket} regras={regras} updateTicket={updateTicket} />;
}

function TicketEditor({ ticket, regras, updateTicket }: { ticket: Ticket; regras: ReturnType<typeof useStore>["regras"]; updateTicket: ReturnType<typeof useStore>["updateTicket"] }) {
  const [draft, setDraft] = useState(ticket);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(ticket), [ticket]);
  const sla = calcularSla(ticket, regras);
  const field = <K extends keyof Ticket>(key: K, value: Ticket[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  async function save() {
    const patch: Partial<Ticket> = {};
    for (const key of ["solicitante", "setor", "local", "descricao", "categoria", "prioridade", "responsavel", "status", "procedimento", "contato"] as const) {
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
  const hasChanges = ["solicitante", "setor", "local", "descricao", "categoria", "prioridade", "responsavel", "status", "procedimento", "contato"].some(k => draft[k as keyof Ticket] !== ticket[k as keyof Ticket]);
  return <div className="mx-auto max-w-4xl space-y-6">
    <Button asChild variant="outline"><Link to="/atendimento"><ArrowLeft className="size-4" /> Voltar à planilha</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"><div><h1 className="text-3xl font-bold">Chamado #{ticket.id}</h1><p className="mt-1 text-muted-foreground">Aberto em {formatarData(ticket.abertoEm, ticket.hora)} · Prazo: {formatarDataHora(sla.prazo)} · {sla.situacao}</p></div>
      <ConfirmAction title={`Salvar alterações no chamado #${ticket.id}?`} description="Confira os dados antes de confirmar. As alterações aparecerão no acompanhamento do chamado." confirmLabel="Sim, salvar" onConfirm={save} disabled={!hasChanges || saving}><Save className="size-4" /> {saving ? "Salvando…" : "Salvar"}</ConfirmAction></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Solicitante<Input value={draft.solicitante} onChange={e => field("solicitante", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">E-mail do solicitante<Input value={ticket.solicitanteEmail || "Não informado na planilha original"} readOnly /></label>
      <label className="grid gap-2 text-sm font-medium">WhatsApp<Input value={draft.contato ?? ""} onChange={e => field("contato", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Setor<Input value={draft.setor} onChange={e => field("setor", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Local exato<Input value={draft.local} onChange={e => field("local", e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Categoria<select className="h-10 rounded border border-input bg-background px-3" value={draft.categoria ?? ""} onChange={e => field("categoria", e.target.value)}>{regras.categorias.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Responsável<select className="h-10 rounded border border-input bg-background px-3" value={draft.responsavel ?? ""} onChange={e => field("responsavel", e.target.value || null)}><option value="">Não atribuído</option>{regras.responsaveis.map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Prioridade<select className="h-10 rounded border border-input bg-background px-3" value={draft.prioridade} onChange={e => field("prioridade", e.target.value as Ticket["prioridade"])}>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Status<select className="h-10 rounded border border-input bg-background px-3" value={draft.status} onChange={e => field("status", e.target.value as Ticket["status"])}>{STATUS_LIST.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    <label className="grid gap-2 text-sm font-medium">Descrição<Textarea rows={5} value={draft.descricao} onChange={e => field("descricao", e.target.value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Procedimento / atendimento<Textarea rows={5} value={draft.procedimento ?? ""} onChange={e => field("procedimento", e.target.value || null)} /></label>
    <p className="text-sm text-muted-foreground">Fechamento: {formatarData(ticket.fechadoEm, ticket.horario)}</p>
  </div>;
}