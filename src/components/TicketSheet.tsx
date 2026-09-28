import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import { MESES_DISPONIVEIS, PRIORIDADES, STATUS_LIST, type Ticket } from "@/lib/types";

export function TicketSheet({ attendance = false }: { attendance?: boolean }) {
  const { tickets, regras, hidratado } = useStore();
  const [month, setMonth] = useState("todos"), [status, setStatus] = useState("Todos"), [priority, setPriority] = useState("Todas"), [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10), [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null), bottomRef = useRef<HTMLDivElement>(null), syncing = useRef(false);
  const rows = useMemo(() => tickets.filter(t => (month === "todos" || t.abertoEm.startsWith(month)) && (status === "Todos" || t.status === status) && (priority === "Todas" || t.prioridade === priority) && (!search || [t.id, t.solicitante, t.setor, t.local, t.descricao, t.responsavel].join(" ").toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => attendance ? (Number(["Resolvido", "Cancelado"].includes(a.status)) - Number(["Resolvido", "Cancelado"].includes(b.status)) || b.id - a.id) : b.id - a.id), [tickets, month, status, priority, search, attendance]);
  useEffect(() => setPage(1), [month, status, priority, search, pageSize]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  useEffect(() => { if (topRef.current && bottomRef.current) topRef.current.firstElementChild?.setAttribute("style", `width:${bottomRef.current.scrollWidth}px;height:1px`); }, [visible]);
  function sync(from: "top" | "bottom") {
    if (syncing.current) return;
    const source = from === "top" ? topRef.current : bottomRef.current;
    const target = from === "top" ? bottomRef.current : topRef.current;
    if (!source || !target) return;
    syncing.current = true; target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }
  return <section className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm font-medium">Mês<select aria-label="Mês da planilha" className="h-10 rounded border border-input bg-background px-3" value={month} onChange={e => setMonth(e.target.value)}><option value="todos">Todos</option>{MESES_DISPONIVEIS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Prioridade<select aria-label="Prioridade da planilha" className="h-10 rounded border border-input bg-background px-3" value={priority} onChange={e => setPriority(e.target.value)}><option>Todas</option>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Status<select aria-label="Status da planilha" className="h-10 rounded border border-input bg-background px-3" value={status} onChange={e => setStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="relative min-w-48 flex-1"><span className="sr-only">Buscar chamados</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar chamado" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-medium">Por página<select aria-label="Chamados por página" className="h-10 rounded border border-input bg-background px-3" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[10,30,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <div ref={topRef} className="overflow-x-auto" onScroll={() => sync("top")} aria-label="Rolagem horizontal superior"><div className="h-px" /></div>
    <div ref={bottomRef} className="overflow-x-auto" onScroll={() => sync("bottom")}>
      <table className="w-full min-w-[1450px] border-collapse text-sm"><thead><tr className="border-b-2 border-g-blue bg-muted text-left text-foreground">{["Nº", "Aberto em", "Solicitante", "Setor / local", "Descrição", "Categoria", "Prioridade", "Responsável", "Status", "Fechado em", "Prazo", "SLA", "Ação"].map(h => <th key={h} className="whitespace-nowrap px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{visible.map(t => <TicketRow key={t.id} ticket={t} />)}{!visible.length && <tr><td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">{hidratado ? "Nenhum chamado encontrado." : "Carregando chamados…"}</td></tr>}</tbody></table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{rows.length} chamado(s) · página {Math.min(page, pages)} de {pages}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</Button></div></div>
  </section>;
}

function TicketRow({ ticket: t }: { ticket: Ticket }) {
  const { regras } = useStore(); const sla = calcularSla(t, regras);
  return <tr className="border-b border-border align-top even:bg-muted/40"><td className="px-3 py-3 font-semibold">#{t.id}</td><td className="whitespace-nowrap px-3 py-3">{formatarData(t.abertoEm, t.hora)}</td><td className="px-3 py-3">{t.solicitante}</td><td className="max-w-52 px-3 py-3">{t.setor} · {t.local}</td><td className="max-w-72 px-3 py-3"><span className="line-clamp-2">{t.descricao}</span></td><td className="px-3 py-3">{t.categoria}</td><td className="px-3 py-3"><PrioridadeChip valor={t.prioridade} /></td><td className="px-3 py-3">{t.responsavel || "—"}</td><td className="px-3 py-3"><StatusChip valor={t.status} /></td><td className="whitespace-nowrap px-3 py-3">{formatarData(t.fechadoEm, t.horario)}</td><td className="whitespace-nowrap px-3 py-3">{formatarDataHora(sla.prazo)}</td><td className="px-3 py-3"><SlaChip valor={sla.situacao} /></td><td className="px-3 py-3"><Button asChild size="sm" variant="outline"><Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}><Eye className="size-4" /> Ver chamado</Link></Button></td></tr>;
}