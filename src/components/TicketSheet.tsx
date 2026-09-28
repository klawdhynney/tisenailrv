import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import { COLUNAS_PLANILHA, FILTROS_PLANILHA, MESES_DISPONIVEIS, PRIORIDADES, STATUS_LIST, type Ticket } from "@/lib/types";

export function TicketSheet({ attendance = false }: { attendance?: boolean }) {
  const { tickets, regras, hidratado } = useStore();
  const colunas = COLUNAS_PLANILHA.filter(c => (regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).includes(c));
  const filtros = regras.planilha?.filtros ?? [...FILTROS_PLANILHA];
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
      <label className="grid gap-1 text-sm font-medium">Mês<select aria-label="Mês da planilha" className="h-10 rounded-xl border border-input bg-background px-3" value={month} onChange={e => setMonth(e.target.value)}><option value="todos">Todos</option>{MESES_DISPONIVEIS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Prioridade<select aria-label="Prioridade da planilha" className="h-10 rounded-xl border border-input bg-background px-3" value={priority} onChange={e => setPriority(e.target.value)}><option>Todas</option>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Status<select aria-label="Status da planilha" className="h-10 rounded-xl border border-input bg-background px-3" value={status} onChange={e => setStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="relative min-w-48 flex-1"><span className="sr-only">Buscar chamados</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar chamado" value={search} onChange={e => setSearch(e.target.value)} /></label>}
      <label className="grid gap-1 text-sm font-medium">Por página<select aria-label="Chamados por página" className="h-10 rounded-xl border border-input bg-background px-3" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[10,30,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <div ref={topRef} className="overflow-x-auto" onScroll={() => sync("top")} aria-label="Rolagem horizontal superior"><div className="h-px" /></div>
    <div ref={bottomRef} className="overflow-x-auto rounded-xl border border-border" onScroll={() => sync("bottom")}>
       <table className="w-full min-w-[1850px] border-separate border-spacing-0 text-sm"><thead><tr className="border-b-2 border-g-blue bg-muted text-left text-foreground">{colunas.map(h => <th key={h} className="whitespace-nowrap px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
         <tbody>{visible.map(t => <TicketRow key={t.id} ticket={t} colunas={colunas} />)}{!visible.length && <tr><td colSpan={Math.max(1, colunas.length)} className="px-4 py-12 text-center text-muted-foreground">{hidratado ? "Nenhum chamado encontrado." : "Carregando chamados…"}</td></tr>}</tbody></table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{rows.length} chamado(s) · página {Math.min(page, pages)} de {pages}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</Button></div></div>
  </section>;
}

function TicketRow({ ticket: t, colunas }: { ticket: Ticket; colunas: string[] }) {
  const { regras } = useStore();
  const sla = calcularSla(t, regras);
  const action = <Button asChild size="sm" variant="google-blue"><Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}><Eye className="size-4" /> Ver chamado</Link></Button>;
  const cells: Record<string, React.ReactNode> = {
    "Ver chamado": action, "Nº": <strong>#{t.id}</strong>, "Aberto em": formatarData(t.abertoEm, t.hora),
    "Solicitante": t.solicitante, "E-mail": t.solicitanteEmail || "—", "WhatsApp": t.contato || "—",
    "Setor / local": <span className="block max-w-52">{t.setor} · {t.local}</span>,
    "Descrição": <span className="line-clamp-2 max-w-72">{t.descricao}</span>, "Categoria": t.categoria,
    "Prioridade": <PrioridadeChip valor={t.prioridade} />, "Responsável": t.responsavel || "—",
    "Status": <StatusChip valor={t.status} />,
    "Procedimento": <span className="line-clamp-2 max-w-72">{t.procedimento || "—"}</span>,
    "Fechado em": formatarData(t.fechadoEm, t.horario), "Prazo": formatarDataHora(sla.prazo), "SLA": <SlaChip valor={sla.situacao} />,
  };
  return <tr className="align-top even:bg-muted/40">{colunas.map(c => <td key={c} className="whitespace-nowrap border-b border-border px-3 py-3">{cells[c]}</td>)}</tr>;
}
