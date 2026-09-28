import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Phone, Play, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularSla, formatarData, formatarDataHora, formatarDuracao } from "@/lib/sla";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LIST, PRIORIDADES, type Status, type Ticket } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento de Chamados | Central de TI" },
      { name: "description", content: "Fila de chamados recebidos para a equipe de TI assumir, atualizar e resolver." },
      { property: "og:title", content: "Atendimento de Chamados" },
      { property: "og:description", content: "Fila de atendimento da equipe de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Atendimento,
});

const FILTROS = ["Pendentes", "Meus", "Todos"] as const;
const ordemPrioridade = { Crítica: 0, Alta: 1, Média: 2, Baixa: 3 } as const;

function Atendimento() {
  const { tickets, regras, hidratado } = useStore();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Pendentes");
  const [tecnico, setTecnico] = useState("");

  const lista = useMemo(() => {
    let l = tickets;
    if (filtro !== "Todos") l = l.filter((t) => !["Resolvido", "Cancelado"].includes(t.status));
    if (filtro === "Meus" && tecnico) l = l.filter((t) => t.responsavel === tecnico);
    return [...l].sort((a, b) => {
      const sa = calcularSla(a, regras).restanteMin ?? 1e9;
      const sb = calcularSla(b, regras).restanteMin ?? 1e9;
      return ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] || sa - sb;
    });
  }, [tickets, regras, filtro, tecnico]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atendimento</h1>
          <p className="text-muted-foreground">Assuma, atualize e resolva os chamados. O dashboard se atualiza na hora.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-lg border-2 border-[var(--g-blue)] bg-card px-3 text-sm"
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
          >
            <option value="">Sou… (escolha seu nome)</option>
            {regras.responsaveis.map((r) => <option key={r}>{r}</option>)}
          </select>
          {FILTROS.map((f) => (
            <Button key={f} variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      {!hidratado ? (
        <p className="text-muted-foreground">Carregando chamados…</p>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum chamado nesta fila. 🎉
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((t) => <CartaoChamado key={t.id} t={t} tecnico={tecnico} />)}
        </div>
      )}
    </div>
  );
}

function CartaoChamado({ t, tecnico }: { t: Ticket; tecnico: string }) {
  const { regras, updateTicket } = useStore();
  const [proc, setProc] = useState(t.procedimento ?? "");
  const sla = calcularSla(t, regras);
  const fechado = t.status === "Resolvido" || t.status === "Cancelado";

  const agora = () => {
    const d = new Date();
    return {
      data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      hora: d.toTimeString().slice(0, 5),
    };
  };

  function mudarStatus(status: Status) {
    const patch: Partial<Ticket> = { status };
    if (status === "Resolvido" || status === "Cancelado") {
      const a = agora();
      patch.fechadoEm = a.data;
      patch.horario = a.hora;
      patch.procedimento = proc.trim() || null;
    } else {
      patch.fechadoEm = null;
      patch.horario = null;
    }
    updateTicket(t.id, patch);
    toast.success(`Chamado nº ${t.id}: ${status}`);
  }

  function assumir() {
    if (!tecnico) return toast.error("Escolha seu nome no topo da página.");
    updateTicket(t.id, { responsavel: tecnico, status: "Em andamento" });
    toast.success(`Você assumiu o chamado nº ${t.id}`);
  }

  function resolver() {
    if (proc.trim().length < 5) return toast.error("Descreva o que foi feito antes de resolver.");
    mudarStatus("Resolvido");
  }

  return (
    <article
      className="rounded-2xl border-2 bg-card p-5"
      style={{ borderColor: sla.situacao === "Estourado" ? "var(--g-red)" : "var(--border)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">#{t.id}</span>
        <PrioridadeChip valor={t.prioridade} />
        <StatusChip valor={t.status} />
        <SlaChip valor={sla.situacao} />
        <span className="ml-auto text-xs text-muted-foreground">Aberto {formatarData(t.abertoEm, t.hora)}</span>
      </div>
      <p className="mt-3 font-medium">{t.descricao}</p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p>{t.solicitante} · {t.setor}{t.categoria ? ` · ${t.categoria}` : ""}</p>
        {t.local && <p className="flex items-center gap-1"><MapPin className="h-4 w-4 text-[var(--g-red)]" /> {t.local}</p>}
        {t.contato && <p className="flex items-center gap-1"><Phone className="h-4 w-4 text-[var(--g-green)]" /> {t.contato}</p>}
        <p>
          Prazo: {formatarDataHora(sla.prazo)}
          {sla.restanteMin != null && !fechado && ` · restam ${formatarDuracao(sla.restanteMin)}`}
          {sla.pausadoPor && ` · pausado: ${sla.pausadoPor}`}
        </p>
        <p>Responsável: <strong className="text-foreground">{t.responsavel || "ninguém ainda"}</strong></p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <select
          className="h-9 rounded-lg border-2 border-border bg-background px-2 text-sm"
          value={t.prioridade}
          onChange={(e) => updateTicket(t.id, { prioridade: e.target.value as Ticket["prioridade"] })}
        >
          {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border-2 border-border bg-background px-2 text-sm"
          value={t.status}
          onChange={(e) => mudarStatus(e.target.value as Status)}
        >
          {STATUS_LIST.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Textarea
        className="mt-3"
        placeholder="O que foi feito (procedimento)…"
        value={proc}
        onChange={(e) => setProc(e.target.value)}
        onBlur={() => proc !== (t.procedimento ?? "") && updateTicket(t.id, { procedimento: proc.trim() || null })}
      />

      {!fechado && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.responsavel !== tecnico && (
            <Button size="sm" onClick={assumir}><Play className="mr-1 h-4 w-4" /> Assumir</Button>
          )}
          <Button size="sm" variant="secondary" onClick={resolver}><CheckCircle2 className="mr-1 h-4 w-4" /> Resolver</Button>
          <Button size="sm" variant="outline" onClick={() => mudarStatus("Cancelado")}><XCircle className="mr-1 h-4 w-4" /> Cancelar</Button>
        </div>
      )}
    </article>
  );
}
