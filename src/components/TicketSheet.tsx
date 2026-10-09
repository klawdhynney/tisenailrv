import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileSpreadsheet, FileText, Headset, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora, segundosUteis } from "@/lib/sla";
import {
  ATENDIMENTO_PADRAO,
  COLUNAS_ATENDIMENTO_PADRAO,
  MESES_DISPONIVEIS,
  extrairSetor,
  extrairLocal,
  obterRotuloStatus,
  type ColunaPlanilhaConfig,
  type Ticket,
} from "@/lib/types";
import { exportarPdf, exportarXlsx, ticketsParaLinhasAtendimento } from "@/lib/exportar";

interface TicketSheetProps {
  attendance?: boolean;
}

export function TicketSheet({ attendance = false }: TicketSheetProps) {
  const { tickets, regras, hidratado } = useStore();
  const configAtendimento = { ...ATENDIMENTO_PADRAO, ...(regras.atendimento ?? {}) };

  // Colunas ativas e configuradas
  const colunasConfig: ColunaPlanilhaConfig[] = useMemo(() => {
    const salvas = configAtendimento.colunas;
    if (Array.isArray(salvas) && salvas.length > 0) {
      return salvas;
    }
    return COLUNAS_ATENDIMENTO_PADRAO;
  }, [configAtendimento.colunas]);

  const colunasVisiveis = useMemo(() => {
    return colunasConfig.filter((c) => c.ativa);
  }, [colunasConfig]);

  // Filtros
  const [month, setMonth] = useState(() => configAtendimento.mesInicialPadrao || "todos");
  const [statusFiltro, setStatusFiltro] = useState(() => configAtendimento.statusInicialPadrao || "todos");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sector, setSector] = useState("Todos");
  const [pageSize, setPageSize] = useState(() => configAtendimento.itensPorPaginaPadrao || 20);
  const [page, setPage] = useState(1);

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  // Tickets do mês selecionado para calcular as contagens dos chips de status
  const ticketsDoMes = useMemo(() => {
    return tickets.filter((t) => month === "todos" || t.abertoEm.startsWith(month));
  }, [tickets, month]);

  // Contagens dinâmicas por status
  const contagensStatus = useMemo(() => {
    const c: Record<string, number> = {
      todos: ticketsDoMes.length,
      Aberto: 0,
      "Em atendimento": 0,
      Aguardando: 0,
      Finalizados: 0,
      Cancelados: 0,
    };
    for (const t of ticketsDoMes) {
      if (t.status === "Aberto") c.Aberto++;
      else if (t.status === "Em andamento" || t.status === "Em atendimento") c["Em atendimento"]++;
      else if (t.status === "Aguardando") c.Aguardando++;
      else if (t.status === "Resolvido" || (t.status as string) === "Finalizado" || (t.status as string) === "Concluído") c.Finalizados++;
      else if (t.status === "Cancelado") c.Cancelados++;
    }
    return c;
  }, [ticketsDoMes]);

  // Lista de botões de status disponíveis
  const botoesStatusDefinidos = useMemo(() => {
    const lista = configAtendimento.ordemBotoesStatus || [
      "Todos",
      "Aberto",
      "Em atendimento",
      "Aguardando",
      "Finalizados",
      "Cancelados",
    ];
    const visiveis = configAtendimento.botoesStatusVisiveis || lista;
    return lista.filter((b) => visiveis.includes(b));
  }, [configAtendimento.ordemBotoesStatus, configAtendimento.botoesStatusVisiveis]);

  // Filtra as linhas conforme mês, status, categoria, setor e busca
  const rows = useMemo(() => {
    return tickets
      .filter((t) => {
        // Mês
        if (month !== "todos" && !t.abertoEm.startsWith(month)) return false;

        // Status
        if (statusFiltro !== "todos") {
          if (statusFiltro === "Finalizados") {
            if (!["Resolvido", "Finalizado", "Concluído"].includes(t.status)) return false;
          } else if (statusFiltro === "Em atendimento") {
            if (!["Em andamento", "Em atendimento"].includes(t.status)) return false;
          } else if (statusFiltro === "Cancelados") {
            if (t.status !== "Cancelado") return false;
          } else {
            if (t.status !== statusFiltro) return false;
          }
        }

        // Categoria (se houver seletor ativo)
        if (category !== "Todas" && t.categoria !== category) return false;

        // Setor (se houver seletor ativo)
        if (sector !== "Todos" && extrairSetor(t.setor) !== sector) return false;

        // Busca textual
        if (search) {
          const q = search.toLowerCase();
          const searchable = [
            t.id,
            t.solicitante,
            extrairSetor(t.setor),
            extrairLocal(t),
            t.descricao,
            t.responsavel,
            t.procedimento,
          ]
            .join(" ")
            .toLowerCase();
          if (!searchable.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (configAtendimento.ordenacaoPadrao === "antigos") return a.id - b.id;
        if (configAtendimento.ordenacaoPadrao === "prioridade") {
          const pOrder = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
          const diff = (pOrder[b.prioridade] ?? 0) - (pOrder[a.prioridade] ?? 0);
          if (diff !== 0) return diff;
        }
        return b.id - a.id;
      });
  }, [tickets, month, statusFiltro, category, sector, search, configAtendimento.ordenacaoPadrao]);

  useEffect(() => {
    setPage(1);
  }, [month, statusFiltro, category, sector, search, pageSize]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);

  useEffect(() => {
    if (topRef.current && bottomRef.current) {
      topRef.current.firstElementChild?.setAttribute(
        "style",
        `width:${bottomRef.current.scrollWidth}px;height:1px`,
      );
    }
  }, [visible]);

  function sync(from: "top" | "bottom") {
    if (syncing.current) return;
    const source = from === "top" ? topRef.current : bottomRef.current;
    const target = from === "top" ? bottomRef.current : topRef.current;
    if (!source || !target) return;
    syncing.current = true;
    target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }

  // Exportação com as colunas visíveis e respeitando mês e status filtrados
  const dispararExportacaoXlsx = () => {
    const colunasParaExportar = colunasVisiveis
      .filter((c) => c.exportarExcel !== false && c.id !== "atender")
      .map((c) => ({ id: c.id, label: c.label }));
    const dados = ticketsParaLinhasAtendimento(rows, colunasParaExportar, regras);
    exportarXlsx(dados, "Planilha_Atendimento_TI");
  };

  const dispararExportacaoPdf = () => {
    const colunasParaExportar = colunasVisiveis
      .filter((c) => c.exportarPdf !== false && c.id !== "atender")
      .map((c) => ({ id: c.id, label: c.label }));
    const dados = ticketsParaLinhasAtendimento(rows, colunasParaExportar, regras);
    exportarPdf(dados, "Planilha_Atendimento_TI", "Planilha de Atendimento de Chamados");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <section className="space-y-4">
        {/* Linha de Filtros & Chips de Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-2xs">
          {/* Lado Esquerdo: Filtro de Mês */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span>Mês:</span>
              <select
                aria-label="Mês da planilha"
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold shadow-2xs hover:border-g-blue/60 focus:ring-2 focus:ring-g-blue"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="todos">Todos os meses</option>
                {MESES_DISPONIVEIS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Chips de Status Dinâmicos com Contagens */}
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Filtrar por status">
              {botoesStatusDefinidos.map((st) => {
                const chaveContagem =
                  st.toLowerCase() === "todos"
                    ? "todos"
                    : st === "Finalizado" || st === "Finalizados"
                    ? "Finalizados"
                    : st === "Em andamento" || st === "Em atendimento"
                    ? "Em atendimento"
                    : st === "Cancelado" || st === "Cancelados"
                    ? "Cancelados"
                    : st;

                const contagem = contagensStatus[chaveContagem] ?? 0;
                const valorFiltro =
                  st.toLowerCase() === "todos"
                    ? "todos"
                    : st === "Finalizados" || st === "Finalizado"
                    ? "Finalizados"
                    : st === "Em atendimento" || st === "Em andamento"
                    ? "Em atendimento"
                    : st === "Cancelados" || st === "Cancelado"
                    ? "Cancelados"
                    : st;

                const isAtivo = statusFiltro === valorFiltro;

                // Cores fiéis aos chips do site
                const estiloAtivo: Record<string, string> = {
                  todos: "bg-foreground text-background border-foreground shadow-xs",
                  Aberto: "bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs",
                  "Em atendimento": "bg-[#34A853] text-white border-[#34A853] shadow-xs",
                  Aguardando: "bg-[#FA7B17] text-white border-[#FA7B17] shadow-xs",
                  Finalizados: "bg-[#0D652D] text-white border-[#0D652D] shadow-xs",
                  Cancelados: "bg-[#5F6368] text-white border-[#5F6368] shadow-xs",
                };

                const estiloInativo: Record<string, string> = {
                  todos: "border-border text-foreground hover:bg-muted/70",
                  Aberto: "border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40",
                  "Em atendimento": "border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/40",
                  Aguardando: "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                  Finalizados: "border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                  Cancelados: "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40",
                };

                const classesAtivo = estiloAtivo[valorFiltro] || "bg-g-blue text-white";
                const classesInativo = estiloInativo[valorFiltro] || "border-border text-foreground";

                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={isAtivo}
                    onClick={() => setStatusFiltro(valorFiltro)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      isAtivo ? classesAtivo : `${classesInativo} bg-card/60`
                    }`}
                  >
                    <span>{st === "Resolvido" || st === "Resolvidos" ? "Finalizados" : st}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
                        isAtivo ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {contagem}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lado Direito: Busca & Ações de Exportação */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="relative min-w-44 sm:min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-xs bg-background rounded-xl border-input"
                placeholder={configAtendimento.placeholderBusca || "Buscar na planilha..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={dispararExportacaoXlsx}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 shadow-2xs hover:border-g-green/50"
              title="Baixar planilha Excel com os filtros e colunas visíveis"
            >
              <FileSpreadsheet className="size-3.5 text-g-green" />
              <span>{configAtendimento.botaoBaixarExcel || "Baixar Excel"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={dispararExportacaoPdf}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 shadow-2xs hover:border-g-red/50"
              title="Baixar relatório PDF com os filtros e colunas visíveis"
            >
              <FileText className="size-3.5 text-g-red" />
              <span>{configAtendimento.botaoBaixarPdf || "Baixar PDF"}</span>
            </Button>
          </div>
        </div>

        {/* Visão Mobile: Cards Interativos */}
        <div className="grid gap-3.5 md:hidden">
          {visible.map((t) => (
            <TicketCard key={t.id} ticket={t} attendance={attendance} />
          ))}
          {!visible.length && (
            <div className="rounded-2xl border-2 border-dashed border-border py-10 text-center text-muted-foreground text-sm">
              {hidratado ? "Nenhum chamado encontrado com os filtros selecionados." : "Carregando chamados..."}
            </div>
          )}
        </div>

        {/* Visão Desktop / Tablet: Tabela Completa com Colunas Sticky e Responsivas */}
        <div className="hidden md:block space-y-1">
          <div ref={topRef} className="overflow-x-auto" onScroll={() => sync("top")} aria-label="Rolagem horizontal superior">
            <div className="h-px" />
          </div>

          <div
            ref={bottomRef}
            className="overflow-x-auto rounded-xl border-2 border-g-blue/30 bg-card shadow-md max-h-[720px] overflow-y-auto"
            onScroll={() => sync("bottom")}
          >
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-30 shadow-xs">
                <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-bold tracking-wide">
                  {colunasVisiveis.map((c) => {
                    const isAtender = c.id === "atender" || c.label === "Atender";
                    const isNumero = c.id === "numero" || c.label === "Nº";

                    let larguraCls = "min-w-[130px]";
                    if (isAtender) larguraCls = "w-[58px] min-w-[58px] max-w-[58px]";
                    else if (isNumero) larguraCls = "w-[72px] min-w-[72px] max-w-[72px]";
                    else if (c.id === "prioridade") larguraCls = "w-[100px] min-w-[95px]";
                    else if (c.id === "abertoEm" || c.id === "fechadoEm") larguraCls = "w-[125px] min-w-[120px]";
                    else if (c.id === "solicitante") larguraCls = "w-[150px] min-w-[130px] max-w-[180px]";
                    else if (c.id === "setor") larguraCls = "w-[145px] min-w-[125px] max-w-[165px]";
                    else if (c.id === "descricao") larguraCls = "min-w-[220px] max-w-[340px]";
                    else if (c.id === "procedimento") larguraCls = "min-w-[180px] max-w-[280px]";
                    else if (c.id === "slaPrazo") larguraCls = "w-[160px] min-w-[145px]";
                    else if (c.id === "status") larguraCls = "w-[130px] min-w-[120px]";

                    const stickyCls = isAtender
                      ? "sticky left-0 z-40 bg-blue-800 text-center"
                      : isNumero
                      ? "sticky left-[58px] z-40 bg-blue-800 border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]"
                      : "";

                    return (
                      <th
                        key={c.id}
                        className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10 last:border-r-0 ${larguraCls} ${stickyCls}`}
                      >
                        {c.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    colunas={colunasVisiveis}
                    attendance={attendance}
                  />
                ))}
                {!visible.length && (
                  <tr>
                    <td
                      colSpan={Math.max(1, colunasVisiveis.length)}
                      className="px-4 py-12 text-center text-muted-foreground text-sm"
                    >
                      {hidratado ? "Nenhum chamado encontrado com os filtros selecionados." : "Carregando chamados..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé da Tabela: Paginação */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm pt-1">
          <span className="text-muted-foreground font-medium">
            {rows.length} chamado(s) encontrado(s) · página {Math.min(page, pages)} de {pages}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5 mr-2">
              <span>Por página:</span>
              <select
                aria-label="Chamados por página"
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 20, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 text-xs font-semibold"
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs font-semibold"
            >
              Próxima
            </Button>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function TicketRow({
  ticket: t,
  colunas,
  attendance = false,
}: {
  ticket: Ticket;
  colunas: ColunaPlanilhaConfig[];
  attendance?: boolean;
}) {
  const { regras } = useStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!attendance) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [attendance]);

  const sla = calcularSla(t, regras, now);
  const atrasado = Boolean(sla.prazo && now > sla.prazo && !t.slaPausado);
  const restanteSeg = t.slaPausado
    ? sla.restanteMin !== null
      ? Math.max(0, sla.restanteMin * 60)
      : null
    : sla.prazo
    ? atrasado
      ? segundosUteis(sla.prazo, now, regras)
      : segundosUteis(now, sla.prazo, regras)
    : null;

  const relogio =
    restanteSeg === null
      ? "—"
      : `${atrasado ? "−" : ""}${String(Math.floor(restanteSeg / 3600)).padStart(2, "0")}:${String(
          Math.floor((restanteSeg % 3600) / 60),
        ).padStart(2, "0")}:${String(restanteSeg % 60).padStart(2, "0")}${
          t.slaPausado ? " (pausado)" : ""
        }`;

  // Botão Atender (somente ícone, tamanho adequado, cor verde, tooltip e aria-label)
  const botaoAtender = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="sm"
          variant="google-green"
          className="size-9 p-0 rounded-xl shrink-0 shadow-2xs hover:scale-105 transition-transform flex items-center justify-center mx-auto"
          aria-label={`Atender chamado #${t.id}`}
        >
          <Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}>
            <Headset className="size-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Atender chamado</TooltipContent>
    </Tooltip>
  );

  const setorLimpo = extrairSetor(t.setor);
  const localLimpo = extrairLocal(t);

  // Mapeamento das células
  const renderCellContent = (col: ColunaPlanilhaConfig) => {
    switch (col.id) {
      case "atender":
        return botaoAtender;
      case "numero":
        return (
          <Link
            to="/chamados/$ticketId"
            params={{ ticketId: String(t.id) }}
            className="font-mono font-bold text-g-blue hover:underline"
            title={`Abrir chamado #${t.id}`}
          >
            #{t.id}
          </Link>
        );
      case "abertoEm":
        return <span className="font-medium text-xs whitespace-nowrap">{formatarData(t.abertoEm, t.hora)}</span>;
      case "prioridade":
        return <PrioridadeChip valor={t.prioridade} />;
      case "solicitante":
        return (
          <span className="font-semibold text-foreground text-xs line-clamp-2" title={t.solicitante}>
            {t.solicitante}
          </span>
        );
      case "setor":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="block text-xs font-medium text-foreground cursor-default line-clamp-2 break-words"
                title={setorLimpo}
              >
                {setorLimpo || "—"}
              </span>
            </TooltipTrigger>
            <TooltipContent max-w-xs>{setorLimpo || "Não informado"}</TooltipContent>
          </Tooltip>
        );
      case "descricao":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="text-xs text-foreground/90 leading-relaxed cursor-default line-clamp-2 break-words"
                title={t.descricao}
              >
                {t.descricao}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-3 whitespace-pre-wrap">{t.descricao}</TooltipContent>
          </Tooltip>
        );
      case "status":
        return <StatusChip valor={t.status} />;
      case "slaPrazo":
        return (
          <div className="flex flex-col gap-1 min-w-[135px]">
            <div className="flex items-center gap-1.5">
              <SlaChip valor={sla.situacao} />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
              {formatarDataHora(sla.prazo)}
            </span>
            {!["Resolvido", "Cancelado"].includes(t.status) && (
              <span
                className="font-mono text-[11px] tabular-nums text-g-blue font-bold tracking-tight"
                title="Tempo útil restante conforme expediente"
              >
                {relogio}
              </span>
            )}
          </div>
        );
      case "procedimento":
        return t.procedimento ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="text-xs text-muted-foreground leading-relaxed cursor-default line-clamp-2 break-words"
                title={t.procedimento}
              >
                {t.procedimento}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-3 whitespace-pre-wrap">{t.procedimento}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case "fechadoEm":
        return (
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {formatarData(t.fechadoEm, t.horario)}
          </span>
        );
      case "responsavel":
        return (
          <span className="text-xs font-medium text-foreground">
            {t.responsavel || "—"}
          </span>
        );
      case "local":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block text-xs font-medium text-foreground line-clamp-2 break-words" title={localLimpo}>
                {localLimpo || "—"}
              </span>
            </TooltipTrigger>
            <TooltipContent>{localLimpo || "Não especificado"}</TooltipContent>
          </Tooltip>
        );
      case "categoria":
        return (
          <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            {t.categoria || "Geral"}
          </span>
        );
      case "email":
        return (
          <span className="text-xs text-muted-foreground truncate block max-w-[170px]" title={t.solicitanteEmail || ""}>
            {t.solicitanteEmail || "—"}
          </span>
        );
      case "whatsapp":
        return <span className="text-xs text-muted-foreground">{t.contato || "—"}</span>;
      default:
        return null;
    }
  };

  return (
    <tr className="align-middle border-b border-border/80 transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/30 even:bg-muted/20">
      {colunas.map((c) => {
        const isAtender = c.id === "atender" || c.label === "Atender";
        const isNumero = c.id === "numero" || c.label === "Nº";

        const stickyCls = isAtender
          ? "sticky left-0 z-20 bg-card text-center"
          : isNumero
          ? "sticky left-[58px] z-20 bg-card border-r border-border/80 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
          : "";

        return (
          <td
            key={c.id}
            className={`border-b border-border/70 px-3.5 py-3 ${stickyCls}`}
          >
            {renderCellContent(c)}
          </td>
        );
      })}
    </tr>
  );
}

function TicketCard({ ticket: t, attendance = false }: { ticket: Ticket; attendance?: boolean }) {
  const { regras } = useStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!attendance) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [attendance]);

  const sla = calcularSla(t, regras, now);
  const atrasado = Boolean(sla.prazo && now > sla.prazo && !t.slaPausado);
  const restanteSeg = t.slaPausado
    ? sla.restanteMin !== null
      ? Math.max(0, sla.restanteMin * 60)
      : null
    : sla.prazo
    ? atrasado
      ? segundosUteis(sla.prazo, now, regras)
      : segundosUteis(now, sla.prazo, regras)
    : null;

  const relogio =
    restanteSeg === null
      ? "—"
      : `${atrasado ? "−" : ""}${String(Math.floor(restanteSeg / 3600)).padStart(2, "0")}:${String(
          Math.floor((restanteSeg % 3600) / 60),
        ).padStart(2, "0")}:${String(restanteSeg % 60).padStart(2, "0")}${
          t.slaPausado ? " (pausado)" : ""
        }`;

  const setorLimpo = extrairSetor(t.setor);

  return (
    <div className="rounded-2xl border-2 border-border/80 bg-card p-4 shadow-2xs space-y-3 transition-all hover:border-g-blue/50">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <strong className="font-mono text-base font-black text-g-blue">#{t.id}</strong>
          <span className="text-xs text-muted-foreground">{formatarData(t.abertoEm, t.hora)}</span>
        </div>
        <StatusChip valor={t.status} />
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Solicitante:</span>
          <span className="font-bold text-foreground text-right">{t.solicitante}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Setor:</span>
          <span className="font-semibold text-foreground text-right">{setorLimpo || "—"}</span>
        </div>
        {t.categoria && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Categoria:</span>
            <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              {t.categoria}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2.5 rounded-xl border border-border/40 leading-relaxed">
        {t.descricao}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5">
          <PrioridadeChip valor={t.prioridade} />
          <SlaChip valor={sla.situacao} />
        </div>
        {!["Resolvido", "Cancelado"].includes(t.status) && (
          <span className="font-mono text-xs tabular-nums text-g-blue font-bold">
            {relogio}
          </span>
        )}
      </div>

      <Button
        asChild
        size="sm"
        variant={attendance ? "google-green" : "google-blue"}
        className="w-full min-h-[44px] font-bold text-xs shadow-xs gap-1.5 rounded-xl"
      >
        <Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}>
          {attendance ? <Headset className="size-4" /> : <Eye className="size-4" />}
          {attendance ? "Atender chamado" : "Ver chamado"}
        </Link>
      </Button>
    </div>
  );
}
