import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Headset, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora, segundosUteis } from "@/lib/sla";
import { COLUNAS_PLANILHA, FILTROS_PLANILHA, MESES_DISPONIVEIS, type Ticket } from "@/lib/types";

export function TicketSheet({ attendance = false }: { attendance?: boolean }) {
  const { tickets, regras, hidratado } = useStore();
  const configuradas = regras.planilha?.colunas ?? [...COLUNAS_PLANILHA];
  const colunas = COLUNAS_PLANILHA.filter(c => configuradas.includes(c) || (c === "Setor" && configuradas.includes("Setor / local")) || (c === "Descrição do problema" && configuradas.includes("Descrição")));
  const filtros = attendance ? ["Mês", "SLA"] : (regras.planilha?.filtros ?? [...FILTROS_PLANILHA]).filter(f => !["Prioridade", "Status", "Responsável"].includes(f));
  const [fila, setFila] = useState<"abertos" | "finalizados">("abertos");
  const [month, setMonth] = useState("todos"), [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas"), [sector, setSector] = useState("Todos"), [slaFilter, setSlaFilter] = useState("Todos");
  const [pageSize, setPageSize] = useState(10), [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null), bottomRef = useRef<HTMLDivElement>(null), syncing = useRef(false);
  const rows = useMemo(() => tickets.filter(t => (!attendance || (["Resolvido", "Cancelado"].includes(t.status) === (fila === "finalizados"))) && (!filtros.includes("Mês") || month === "todos" || t.abertoEm.startsWith(month)) && (!filtros.includes("Categoria") || category === "Todas" || t.categoria === category) && (!filtros.includes("Setor") || sector === "Todos" || t.setor === sector) && (!filtros.includes("SLA") || slaFilter === "Todos" || calcularSla(t, regras).situacao === slaFilter) && (!filtros.includes("Busca") || !search || [t.id, t.solicitante, t.setor, t.local, t.descricao, t.responsavel].join(" ").toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => b.id - a.id), [tickets, month, category, sector, slaFilter, search, attendance, fila, regras]);
  useEffect(() => setPage(1), [month, category, sector, slaFilter, search, pageSize, fila]);
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

  const renderFiltro = (f: string) => {
    switch (f) {
      case "Mês":
        return (
          <label key="Mês" className="grid gap-1 text-sm font-medium">
            Mês
            <select
              aria-label="Mês da planilha"
              className="h-10 rounded-xl border border-input bg-background px-3"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="todos">Todos</option>
              {MESES_DISPONIVEIS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </label>
        );
      case "Categoria":
        return (
          <label key="Categoria" className="grid gap-1 text-sm font-medium">
            Categoria
            <select
              aria-label="Categoria da planilha"
              className="h-10 rounded-xl border border-input bg-background px-3"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Todas</option>
              {[...new Set(tickets.map((t) => t.categoria).filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        );
      case "Setor":
        return (
          <label key="Setor" className="grid gap-1 text-sm font-medium">
            Setor
            <select
              aria-label="Setor da planilha"
              className="h-10 rounded-xl border border-input bg-background px-3"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option>Todos</option>
              {[...new Set(tickets.map((t) => t.setor))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        );
      case "SLA":
        return (
          <label key="SLA" className="grid gap-1 text-sm font-medium">
            SLA
            <select
              aria-label="SLA da planilha"
              className="h-10 rounded-xl border border-input bg-background px-3"
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
            >
              {["Todos", "No prazo", "Estourado", "Cancelado"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        );
      case "Busca":
        return (
          <label key="Busca" className="relative min-w-48 flex-1">
            <span className="sr-only">Buscar chamados</span>
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar chamado"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        );
      case "Por página":
        return (
          <label key="Por página" className="grid gap-1 text-sm font-medium">
            Por página
            <select
              aria-label="Chamados por página"
              className="h-10 rounded-xl border border-input bg-background px-3"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        );
      default:
        return null;
    }
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      {filtros.map((f) => renderFiltro(f))}
      {attendance && (
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant={fila === "abertos" ? "google-green" : "outline"} aria-pressed={fila === "abertos"} onClick={() => setFila("abertos")}>Chamados abertos</Button>
          <Button type="button" variant={fila === "finalizados" ? "google-blue" : "outline"} aria-pressed={fila === "finalizados"} onClick={() => setFila("finalizados")}>Chamados finalizados</Button>
        </div>
      )}
    </div>
    <div ref={topRef} className="overflow-x-auto" onScroll={() => sync("top")} aria-label="Rolagem horizontal superior"><div className="h-px" /></div>
    <div ref={bottomRef} className="overflow-x-auto rounded-xl border-2 border-g-blue/30 bg-card shadow-md" onScroll={() => sync("bottom")}>
       <table className="w-full min-w-[1850px] border-separate border-spacing-0 text-sm">
         <thead>
           <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-bold tracking-wide shadow-sm">
             {colunas.map(h => (
               <th key={h} className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10 last:border-r-0">
                 {h}
               </th>
             ))}
           </tr>
         </thead>
         <tbody>
           {visible.map(t => <TicketRow key={t.id} ticket={t} colunas={colunas} attendance={attendance} />)}
           {!visible.length && <tr><td colSpan={Math.max(1, colunas.length)} className="px-4 py-12 text-center text-muted-foreground">{hidratado ? "Nenhum chamado encontrado." : "Carregando chamados…"}</td></tr>}
         </tbody>
       </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{rows.length} chamado(s) · página {Math.min(page, pages)} de {pages}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</Button></div></div>
  </section>;
}

function TicketRow({ ticket: t, colunas, attendance = false }: { ticket: Ticket; colunas: string[]; attendance?: boolean }) {
  const { regras } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (!attendance) return; const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, [attendance]);
  const sla = calcularSla(t, regras, now);
  const atrasado = Boolean(sla.prazo && now > sla.prazo);
  const restanteSeg = sla.prazo ? atrasado ? segundosUteis(sla.prazo, now, regras) : segundosUteis(now, sla.prazo, regras) : null;
  const relogio = restanteSeg === null ? "—" : `${atrasado ? "−" : ""}${String(Math.floor(restanteSeg / 3600)).padStart(2, "0")}:${String(Math.floor((restanteSeg % 3600) / 60)).padStart(2, "0")}:${String(restanteSeg % 60).padStart(2, "0")}`;
  const action = (
    <Button asChild size="sm" variant={attendance ? "google-green" : "google-blue"}>
      <Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}>
        {attendance ? <Headset className="size-4" /> : <Eye className="size-4" />}
        {attendance ? "Atender" : "Ver chamado"}
      </Link>
    </Button>
  );
  const cells: Record<string, React.ReactNode> = {
    "Ver chamado": action,
    "Nº": <strong className="font-mono font-bold text-g-blue">#{t.id}</strong>,
    "Aberto em": <span className="font-medium">{formatarData(t.abertoEm, t.hora)}</span>,
    "Solicitante": <span className="font-semibold text-foreground">{t.solicitante}</span>,
    "E-mail": t.solicitanteEmail || "—",
    "WhatsApp": t.contato || "—",
    "Setor": <span className="block max-w-52 font-medium">{t.setor}{t.local ? ` · ${t.local}` : ""}</span>,
    "Descrição do problema": <span className="line-clamp-2 max-w-72">{t.descricao}</span>,
    "Categoria": <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">{t.categoria}</span>,
    "Prioridade": <PrioridadeChip valor={t.prioridade} />,
    "Responsável": t.responsavel ? <span className="font-medium text-foreground">{t.responsavel}</span> : "—",
    "Status": <StatusChip valor={t.status} />,
    "Procedimento": <span className="line-clamp-2 max-w-72">{t.procedimento || "—"}</span>,
    "Fechado em": formatarData(t.fechadoEm, t.horario),
    "Prazo": <span className="text-xs font-medium">{formatarDataHora(sla.prazo)}</span>,
    "SLA": <span className="flex flex-col gap-1"><SlaChip valor={sla.situacao} />{attendance && !["Resolvido", "Cancelado"].includes(t.status) && <span className="font-mono text-xs tabular-nums text-g-blue font-bold" title="Tempo útil restante conforme o expediente">{relogio}</span>}</span>,
  };
  return <tr className="align-top border-b border-border transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/30 even:bg-muted/30">{colunas.map(c => <td key={c} className="whitespace-nowrap border-b border-border/80 px-3.5 py-3.5">{cells[c]}</td>)}</tr>;
}
