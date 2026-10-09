import { createFileRoute, Link, redirect, useNavigate, isRedirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  CheckCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutGrid,
  PieChartIcon,
  RotateCcw,
  Star,
  Table2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { cn } from "@/lib/utils";
import { calcularSla } from "@/lib/sla";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CORES_SLA, MESES_DISPONIVEIS, type Ticket, type TipoGrafico, obterDataHojeCuiaba } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLoading } from "@/lib/loading-context";
import { obterPaletaInfo } from "@/lib/tema";

export const Route = createFileRoute("/dashboard/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    tipo: typeof search.tipo === "string" ? search.tipo : undefined,
    mes: typeof search.mes === "string" ? search.mes : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard de Chamados | TI SENAI LRV" },
      { name: "description", content: "Gráficos interativos e indicadores de atendimento de TI SENAI LRV." },
      { property: "og:title", content: "Dashboard de Chamados | TI SENAI LRV" },
      { property: "og:description", content: "Acompanhe os indicadores dos chamados de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const CORES = [
  "#1a73e8", // Google Blue
  "#ea4335", // Google Red
  "#f9ab00", // Google Yellow
  "#34a853", // Google Green
  "#a142f4", // Google Purple
  "#24c1e0", // Google Cyan
  "#fa7b17", // Google Orange
  "#f439a0", // Google Pink
];

const VISOES = [
  { id: "problemas", label: "Chamados recorrentes", color: "blue" },
  { id: "setores", label: "Chamados por setores", color: "red" },
  { id: "prioridades", label: "Prioridades dos chamados", color: "yellow" },
  { id: "status", label: "Status dos chamados", color: "green" },
  { id: "sla", label: "SLA dos chamados", color: "purple" },
] as const;

const RECORRENTES = [
  { name: "WhatsApp / Comunicação", value: 14 },
  { name: "Contas, logins e usuários", value: 12 },
  { name: "Suporte a software e processos", value: 11 },
  { name: "Internet, rede e VPN", value: 10 },
  { name: "Impressoras e toner", value: 7 },
] as const;

type Visao = (typeof VISOES)[number]["id"];
type Item = { name: string; value: number };

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return reducedMotion;
}

function useTemaGrafico() {
  const { regras } = useStore();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const paletaAtiva = regras?.temaConfig?.paletaAtiva || "padrao";
  const customConfig = regras?.temaConfig?.paletaPersonalizada;
  const paletaInfo = obterPaletaInfo(paletaAtiva, customConfig);
  const coresGrafico = isDark ? paletaInfo.coresGraficoEscuro : paletaInfo.coresGraficoClaro;
  const serieHistorica = isDark ? paletaInfo.serieHistorica.escuro : paletaInfo.serieHistorica.claro;
  return { isDark, paletaInfo, coresGrafico, serieHistorica };
}

const mesAtualPadrao = () => {
  const d = new Date();
  const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return MESES_DISPONIVEIS.some((m) => m.key === chave) ? chave : MESES_DISPONIVEIS[0]?.key ?? "todos";
};

function Dashboard() {
  const { publicStats, dailyStats, isGestor, regras, session, authPronto } = useStore();
  const { wrapAsync, isLoading } = useLoading();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const tipoQuery = search?.tipo;
  const mesQuery = search?.mes;


  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const all: typeof progress = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) {
          console.error("Falha ao carregar SLA público", error.message);
          return;
        }
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (mounted) setProgress(all);
    };
    void load();
    const channel = supabase
      .channel("public-sla-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => void load())
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const [mes, setMes] = useState(() => {
    if (mesQuery && (mesQuery === "todos" || MESES_DISPONIVEIS.some((m) => m.key === mesQuery))) {
      return mesQuery;
    }
    return mesAtualPadrao();
  });

  useEffect(() => {
    if (mesQuery && (mesQuery === "todos" || MESES_DISPONIVEIS.some((m) => m.key === mesQuery))) {
      setMes(mesQuery);
    }
  }, [mesQuery]);

  const [filtroAberto, setFiltroAberto] = useState(false);
  const [visao, setVisao] = useState<Visao>(() => (regras.dashboard?.visaoPadrao as Visao) || "problemas");

  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>(() => {
    if (tipoQuery === "kpi" || tipoQuery === "pizza" || tipoQuery === "barras" || tipoQuery === "historico") {
      return tipoQuery;
    }
    const padrao = regras.dashboard?.tipoGraficoPadrao as any;
    if (padrao === "pizza" || padrao === "barras" || padrao === "historico" || padrao === "kpi") {
      return padrao;
    }
    return "kpi";
  });

  useEffect(() => {
    if (tipoQuery === "kpi" || tipoQuery === "pizza" || tipoQuery === "barras" || tipoQuery === "historico") {
      setTipoGrafico(tipoQuery);
    }
  }, [tipoQuery]);

  const linhas = useMemo(
    () => (publicStats || []).filter((r) => r && (mes === "todos" || r.mes === mes)),
    [publicStats, mes]
  );
  const total = linhas.reduce((n, r) => n + (r?.total || 0), 0);
  const resolvidos = linhas.filter((r) => r?.status === "Resolvido").reduce((n, r) => n + (r?.total || 0), 0);
  const ativos = linhas.filter((r) => r && !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + (r?.total || 0), 0);

  const contar = (campo: "categoria" | "setor" | "prioridade" | "status") => {
    const mapa = new Map<string, number>();
    for (const r of linhas) {
      if (!r) continue;
      const chave = r[campo] || "Não informado";
      mapa.set(chave, (mapa.get(chave) ?? 0) + (r.total || 0));
    }
    return [...mapa].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const categorias = contar("categoria"),
    setores = contar("setor");

  const dadosSla = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of progress || []) {
      if (!t) continue;
      if (mes !== "todos" && (!t.aberto_em || typeof t.aberto_em !== "string" || !t.aberto_em.startsWith(mes))) continue;
      try {
        const situacao = calcularSla(
          {
            abertoEm: t.aberto_em,
            hora: t.hora,
            prioridade: t.prioridade as Ticket["prioridade"],
            status: t.status as Ticket["status"],
            fechadoEm: t.fechado_em,
            horario: t.horario,
            slaReiniciadoEm: t.sla_reiniciado_em,
            slaPausado: t.sla_pausado,
            slaPausadoEm: t.sla_pausado_em,
            slaPausaMotivo: t.sla_pausa_motivo,
            slaSegundosPausadosAcumulados: t.sla_segundos_pausados_acumulados,
          } as Ticket,
          regras,
          now,
        ).situacao;
        counts.set(situacao, (counts.get(situacao) ?? 0) + 1);
      } catch (err) {
        counts.set("—", (counts.get("—") ?? 0) + 1);
      }
    }
    return ["No prazo", "Estourado", "SLA pausado", "Cancelado", "Aguardando", "—"]
      .filter((name) => counts.has(name))
      .map((name) => ({ name, value: counts.get(name) ?? 0 }));
  }, [progress, mes, regras, now]);

  const todosDados: Item[] =
    visao === "sla"
      ? dadosSla
      : visao === "problemas" && mes === "todos"
      ? RECORRENTES.map((item) => ({ ...item }))
      : visao === "problemas"
      ? categorias
      : visao === "setores"
      ? setores
      : contar(visao === "prioridades" ? "prioridade" : "status");

  const dados: Item[] =
    todosDados.length <= CORES.length
      ? todosDados
      : [
          ...todosDados.slice(0, CORES.length - 1),
          { name: "Outros", value: todosDados.slice(CORES.length - 1).reduce((n, x) => n + x.value, 0) },
        ];

  const { coresGrafico } = useTemaGrafico();

  const cor = (nome: string, i: number) => {
    if (visao === "sla" && CORES_SLA[nome]?.bg) return CORES_SLA[nome].bg;
    return coresGrafico[i % coresGrafico.length] ?? CORES[i % CORES.length] ?? "#FFFFFF";
  };

  const baixarResumo = async () => {
    await wrapAsync(async () => {
      const { exportarXlsx } = await import("@/lib/exportar");
      const totalVal = dados.reduce((sum, item) => sum + item.value, 0);
      const linhasExp = dados.map((r) => {
        const pct = totalVal > 0 ? `${((r.value / totalVal) * 100).toFixed(1)}%` : "0%";
        return {
          Visão: visao,
          Item: r.name,
          Chamados: r.value,
          Porcentagem: pct,
        };
      });
      exportarXlsx(linhasExp, `dashboard-${visao}-${mes}.xlsx`);
    });
  };

  const baixarPdf = async () => {
    await wrapAsync(async () => {
      const { exportarPdf } = await import("@/lib/exportar");
      const totalVal = dados.reduce((sum, item) => sum + item.value, 0);
      const rows = dados.map((r) => {
        const pct = totalVal > 0 ? `${((r.value / totalVal) * 100).toFixed(1)}%` : "0%";
        return {
          "Item / Categoria": r.name,
          "Quantidade": r.value,
          "Participação": pct,
        };
      });
      await exportarPdf(
        rows,
        `dashboard-${visao}-${mes}`,
        `TI SENAI LRV · Indicadores - ${VISOES.find((v) => v.id === visao)?.label || visao}`,
      );
    });
  };

  const indConf = regras.indicadores;
  const dashConf = regras.dashboard;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-g-blue">
            {dashConf?.subtitulo || "Indicadores públicos"}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            {dashConf?.titulo || "Dashboard de chamados"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {dashConf?.descricao || "Métricas de transparência dos atendimentos de TI SENAI LRV."}
          </p>
        </div>

        {/* Ações do cabeçalho alinhadas à direita */}
        <div className="flex flex-col items-end gap-2 shrink-0 self-end sm:self-center">
          {/* Linha superior: Filtro Mês, Acompanhar chamados, Avaliações */}
          <div className="flex items-center justify-end gap-2 shrink-0 flex-nowrap">
            {/* Botão Filtrar (com Popover seletor de mês) */}
            <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--btn-dash-top-border,var(--border)/80)] bg-[var(--btn-dash-top-bg,var(--card))] hover:bg-[var(--btn-dash-top-hover-bg,var(--accent))] hover:text-[var(--btn-dash-top-hover-text,var(--accent-foreground))] text-[var(--btn-dash-top-text,var(--foreground))] shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer",
                    mes !== "todos" && "border-g-blue/60 bg-g-blue/5 text-g-blue font-bold"
                  )}
                  title={
                    mes === "todos"
                      ? "Filtrar por mês"
                      : `Filtro ativo: ${MESES_DISPONIVEIS.find((m) => m.key === mes)?.label || mes}`
                  }
                  aria-label="Filtrar chamados por mês"
                >
                  <Filter className="size-4 text-g-blue shrink-0" />
                  <span className="hidden sm:inline">
                    {mes === "todos"
                      ? "Filtrar"
                      : `Mês: ${MESES_DISPONIVEIS.find((m) => m.key === mes)?.label || mes}`}
                  </span>
                  {mes !== "todos" && (
                    <span className="sm:hidden size-2 rounded-full bg-g-blue shrink-0" aria-hidden="true" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3 space-y-2.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-md"
                align="end"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Filtrar por mês
                  </span>
                  {mes !== "todos" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMes("todos");
                        setFiltroAberto(false);
                      }}
                      className="text-xs text-g-blue hover:underline font-semibold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMes("todos");
                      setFiltroAberto(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between",
                      mes === "todos"
                        ? "bg-g-blue/10 text-g-blue font-bold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>Todos os meses</span>
                    {mes === "todos" && <Check className="size-3.5 text-g-blue" />}
                  </button>
                  {MESES_DISPONIVEIS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setMes(m.key);
                        setFiltroAberto(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between",
                        mes === m.key
                          ? "bg-g-blue/10 text-g-blue font-bold"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span>{m.label}</span>
                      {mes === m.key && <Check className="size-3.5 text-g-blue" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Botão Acompanhar chamados */}
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--btn-dash-top-border,var(--border)/80)] bg-[var(--btn-dash-top-bg,var(--card))] hover:bg-[var(--btn-dash-top-hover-bg,var(--accent))] hover:text-[var(--btn-dash-top-hover-text,var(--accent-foreground))] text-[var(--btn-dash-top-text,var(--foreground))] shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
              title="Acompanhar chamados"
              aria-label="Acompanhar chamados"
            >
              <Link to="/dashboard/acompanhamento">
                <ClipboardList className="size-4 text-g-green shrink-0" />
                <span className="hidden sm:inline">Acompanhar chamados</span>
              </Link>
            </Button>

            {/* Botão Avaliações */}
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--btn-dash-top-border,var(--border)/80)] bg-[var(--btn-dash-top-bg,var(--card))] hover:bg-[var(--btn-dash-top-hover-bg,var(--accent))] hover:text-[var(--btn-dash-top-hover-text,var(--accent-foreground))] text-[var(--btn-dash-top-text,var(--foreground))] shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
              title="Avaliações de satisfação"
              aria-label="Avaliações"
            >
              <Link to="/dashboard/avaliacoes" search={{ mes: mes !== "todos" ? mes : undefined }}>
                <Star className="size-4 text-amber-500 fill-amber-400 shrink-0" />
                <span className="hidden sm:inline">Avaliações</span>
              </Link>
            </Button>
          </div>

          {/* Linha inferior: Botões de exportação alinhados à direita, na mesma linha entre si */}
          <div className="no-print flex items-center justify-end gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              onClick={baixarResumo}
              className="min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--btn-export-border,var(--border)/80)] bg-[var(--btn-export-bg,var(--card))] hover:bg-[var(--btn-export-hover-bg,var(--accent))] hover:text-[var(--btn-export-hover-text,var(--accent-foreground))] text-[var(--btn-export-text,var(--foreground))] shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
              disabled={isLoading}
              title="Exportar planilha"
              aria-label="Exportar planilha"
            >
              <FileSpreadsheet className="size-4 text-g-green shrink-0" />
              <span>Exportar planilha</span>
            </Button>
            <Button
              variant="outline"
              onClick={baixarPdf}
              className="min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--btn-export-border,var(--border)/80)] bg-[var(--btn-export-bg,var(--card))] hover:bg-[var(--btn-export-hover-bg,var(--accent))] hover:text-[var(--btn-export-hover-text,var(--accent-foreground))] text-[var(--btn-export-text,var(--foreground))] shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
              disabled={isLoading}
              title="Exportar PDF"
              aria-label="Exportar PDF"
            >
              <FileText className="size-4 text-g-red shrink-0" />
              <span>Exportar PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Cartões de Indicadores Gerais do Topo */}
      <SectionErrorBoundary title="Indicadores Gerais do Topo">
        {indConf?.mostrarCards !== false && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              {
                label: indConf?.totalLabel || "Total de chamados",
                count: total,
                border: "border-g-blue",
                color: "text-g-blue",
                desc: indConf?.totalDesc || "Quantidade de chamados registrados.",
              },
              {
                label: indConf?.atendimentoLabel || "Em atendimento",
                count: ativos,
                border: "border-g-yellow",
                color: "text-g-yellow",
                desc: indConf?.atendimentoDesc || "Chamados que estão sendo tratados pela equipe de TI.",
              },
              {
                label: indConf?.resolvidosLabel || "Finalizados",
                count: resolvidos,
                border: "border-g-green",
                color: "text-g-green",
                desc: indConf?.resolvidosDesc || "Chamados que já foram concluídos e finalizados.",
              },
              {
                label: indConf?.chamadosDiaLabel || "Chamados do dia",
                count: Math.max(
                  (progress || []).filter((t) => t?.aberto_em === obterDataHojeCuiaba()).length,
                  dailyStats?.chamadosDoDia ?? 0
                ),
                border: "border-sky-500",
                color: "text-sky-600 dark:text-sky-400",
                desc: indConf?.chamadosDiaDesc || "Chamados abertos hoje.",
              },
              {
                label: indConf?.atendidosDiaLabel || "Atendidos no dia",
                count: Math.max(
                  (progress || []).filter(
                    (t) => (t?.status === "Resolvido" || t?.status === "Concluído") && t?.fechado_em === obterDataHojeCuiaba()
                  ).length,
                  dailyStats?.atendidosNoDia ?? 0
                ),
                border: "border-teal-500",
                color: "text-teal-600 dark:text-teal-400",
                desc: indConf?.atendidosDiaDesc || "Chamados concluídos hoje.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border-l-4 ${item.border} bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}
              >
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-2xl sm:text-3xl font-black tracking-tight ${item.color}`}>{item.count}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground/80 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </SectionErrorBoundary>

      {/* Seção Categórica */}
      <div className="border-t-2 border-border/80 pt-6 space-y-4">
        <SectionErrorBoundary title="Análise Categórica">
          <div className="rounded-2xl border-2 border-g-blue/50 bg-card p-4 sm:p-5 shadow-xs transition-all space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Análise Categórica</h2>
                <Badge variant="outline" className="text-[10px] text-g-blue border-g-blue/30 font-bold">
                  Dimensões
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Navegue pelas dimensões dos chamados e acompanhe a distribuição e proporção dos registros.
              </p>
            </div>

            {tipoGrafico !== "historico" && (
              <nav aria-label="Dimensões do dashboard" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 pt-1">
                {VISOES.map((v) => {
                  const classeCorCustomizada: Record<string, string> = {
                    recorrentes: "bg-[var(--btn-cat-recorrentes-bg,var(--g-blue))] text-[var(--btn-cat-recorrentes-text,#ffffff)] hover:bg-[var(--btn-cat-recorrentes-hover,var(--g-blue))]",
                    setores: "bg-[var(--btn-cat-setores-bg,var(--g-red))] text-[var(--btn-cat-setores-text,#ffffff)] hover:bg-[var(--btn-cat-setores-hover,var(--g-red))]",
                    prioridades: "bg-[var(--btn-cat-prioridades-bg,var(--g-yellow))] text-[var(--btn-cat-prioridades-text,#09090b)] hover:bg-[var(--btn-cat-prioridades-hover,var(--g-yellow))]",
                    status: "bg-[var(--btn-cat-status-bg,var(--g-green))] text-[var(--btn-cat-status-text,#ffffff)] hover:bg-[var(--btn-cat-status-hover,var(--g-green))]",
                    sla: "bg-[var(--btn-cat-sla-bg,var(--g-purple))] text-[var(--btn-cat-sla-text,#ffffff)] hover:bg-[var(--btn-cat-sla-hover,var(--g-purple))]",
                  };

                  return (
                    <Button
                      key={v.id}
                      aria-current={visao === v.id ? "page" : undefined}
                      className={cn(
                        "min-h-[44px] h-11 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs lg:text-[13px] xl:text-sm font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center last:col-span-2 sm:last:col-span-1 border border-transparent shadow-md",
                        classeCorCustomizada[v.id] || "bg-g-blue text-white",
                        visao === v.id
                          ? "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background shadow-md opacity-100"
                          : "opacity-90 hover:opacity-100 hover:shadow-xs"
                      )}
                      onClick={() => setVisao(v.id)}
                      title={v.label}
                    >
                      <span className="truncate">{v.label}</span>
                    </Button>
                  );
                })}
              </nav>
            )}
          </div>
        </SectionErrorBoundary>

        {/* Painel com Seletor de Tipo de Gráficos e Visualização */}
        <div className="w-full">
          <SectionErrorBoundary title="Visualização de Gráficos">
            <section
              className="min-w-0 rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {tipoGrafico === "historico"
                      ? (dashConf?.titulosGraficos?.historico || "Série Histórica Contínua")
                      : (dashConf?.titulosGraficos?.[tipoGrafico] || VISOES.find((v) => v.id === visao)?.label)}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {tipoGrafico === "historico"
                      ? (dashConf?.descricoesGraficos?.historico || "Evolução temporal mês a mês dos atendimentos registrados, resolvidos e em andamento.")
                      : (dashConf?.descricoesGraficos?.[tipoGrafico] || "Distribuição e proporção dos registros filtrados.")}
                  </p>
                </div>

                {/* Menu e Abas dos Gráficos com Cartões KPI em Primeiro e Série Histórica após os demais */}
                <div className="no-print flex flex-wrap gap-2" aria-label="Tipo de gráfico">
                  {(() => {
                    const graficosDisponiveis = [
                      { id: "kpi", label: dashConf?.titulosGraficos?.kpi || "Cartões de Indicadores", icon: LayoutGrid, title: "Cartões de Indicadores (Big Numbers)" },
                      { id: "pizza", label: dashConf?.titulosGraficos?.pizza || "Pizza", icon: PieChartIcon, title: "Gráfico de Rosca / Pizza" },
                      { id: "barras", label: dashConf?.titulosGraficos?.barras || "Barras", icon: BarChart3, title: "Gráfico de Barras horizontais" },
                      { id: "historico", label: dashConf?.titulosGraficos?.historico || "Série Histórica", icon: Activity, title: "Série histórica por chamados" },
                    ];
                    const ordem = dashConf?.ordemGraficos && dashConf.ordemGraficos.length > 0
                      ? dashConf.ordemGraficos
                      : ["kpi", "pizza", "barras", "historico"];
                    const visiveis = dashConf?.graficos && dashConf.graficos.length > 0
                      ? dashConf.graficos
                      : ["kpi", "pizza", "barras", "historico"];
                    const filtrados = ordem
                      .map((id) => graficosDisponiveis.find((g) => g.id === id))
                      .filter((g) => Boolean(g && visiveis.includes(g.id)));

                    return (filtrados.length > 0 ? filtrados : graficosDisponiveis).map((g) => {
                      const IconComp = g.icon;
                      const ativo = tipoGrafico === g.id;
                      return (
                        <Button
                          key={g.id}
                          onClick={() => setTipoGrafico(g.id as TipoGrafico)}
                          title={g.title}
                          className={cn(
                            "min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold gap-1.5 shrink-0 transition-colors cursor-pointer",
                            ativo
                              ? "bg-[var(--btn-chart-tab-active-bg,var(--g-blue))] text-[var(--btn-chart-tab-active-text,#ffffff)] hover:bg-[var(--btn-chart-tab-hover-bg,var(--g-blue))] border border-transparent shadow-xs"
                              : "bg-[var(--btn-chart-tab-inactive-bg,var(--card))] text-[var(--btn-chart-tab-inactive-text,var(--foreground))] border border-[var(--btn-chart-tab-inactive-border,var(--border)/80)] hover:bg-[var(--btn-chart-tab-hover-bg,var(--accent))]"
                          )}
                        >
                          <IconComp className="size-4 shrink-0" /> {g.label}
                        </Button>
                      );
                    });
                  })()}
                </div>
              </div>

              <Grafico
                key={`${visao}-${tipoGrafico}-${mes}`}
                dados={dados}
                tipo={tipoGrafico}
                cor={cor}
                mesSelecionado={mes}
              />
            </section>
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function Grafico({
  dados,
  tipo,
  cor,
  mesSelecionado,
}: {
  dados: Item[];
  tipo: TipoGrafico;
  cor: (name: string, i: number) => string;
  mesSelecionado: string;
}) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  // 1. Gráfico de Série Histórica por Chamados
  if (tipo === "historico") {
    return <GraficoSerieHistorica mesSelecionado={mesSelecionado} />;
  }

  if (!dados.length) {
    return (
      <div className="py-24 text-center space-y-2">
        <p className="text-base font-semibold text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>
        <p className="text-xs text-muted-foreground/80">Tente selecionar outro mês ou alterar os filtros acima.</p>
      </div>
    );
  }

  const totalVal = dados.reduce((sum, d) => sum + d.value, 0);

  // 2. Gráfico de Cartões de Indicadores (KPI / Big Numbers)
  if (tipo === "kpi") {
    return <GraficoKpi dados={dados} cor={cor} totalVal={totalVal} />;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const name = item.payload?.name || item.name || "";
    const val = Number(item.payload?.value ?? item.value ?? 0);
    const corItem = item.payload?.fill || item.color || "#1a73e8";
    const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : "0";

    return (
      <div className="rounded-xl border-2 border-border/80 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 pointer-events-none">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="size-3.5 rounded-full shadow-xs" style={{ backgroundColor: corItem }} />
          <span className="font-bold text-sm text-foreground">{name}</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1 border-t border-border/60">
          <span className="text-2xl font-black" style={{ color: corItem }}>
            {val}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">chamados</span>
          <span
            className="ml-auto rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: corItem }}
          >
            {pct}%
          </span>
        </div>
      </div>
    );
  };

  const chart =
    tipo === "pizza" ? (
      /* AJUSTE 2: Gráfico de Pizza Maior - Ocupa todo o espaço com legenda responsiva */
      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={dados}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={isMobile ? "28%" : "35%"}
          outerRadius={isMobile ? "76%" : "84%"}
          paddingAngle={2.5}
          labelLine={false}
          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
            if (percent < 0.05) return null;
            const RADIAN = Math.PI / 180;
            const radius =
              (innerRadius as number) +
              ((outerRadius as number) - (innerRadius as number)) * 0.55;
            const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
            const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);
            return (
              <text
                x={x}
                y={y}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[11px] font-black pointer-events-none drop-shadow-md select-none"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
        >
          {dados.map((d, i) => (
            <Cell key={d.name} fill={cor(d.name, i)} stroke="var(--card)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    ) : (
      <BarChart
        data={dados}
        layout="vertical"
        margin={
          isMobile
            ? { left: 4, right: 70, top: 5, bottom: 5 }
            : { left: 20, right: 100, top: 5, bottom: 5 }
        }
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={isMobile ? 110 : 160}
          tick={{ fill: "var(--foreground)", fontSize: isMobile ? 10 : 11 }}
          tickFormatter={
            isMobile
              ? (name: string) => (name.length > 15 ? `${name.slice(0, 14)}…` : name)
              : undefined
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          name="Chamados"
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
          radius={[0, 5, 5, 0]}
        >
          {dados.map((d, i) => (
            <Cell key={d.name} fill={cor(d.name, i)} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(val: any) => {
              const num = Number(val ?? 0);
              const pct = totalVal > 0 ? ((num / totalVal) * 100).toFixed(1) : "0";
              return isMobile ? `${num} (${pct}%)` : `${num} (${pct}%)`;
            }}
            className="text-[10px] sm:text-[11px] font-bold fill-foreground"
          />
        </Bar>
      </BarChart>
    );

  return (
    <div className="chart-enter flex flex-col xl:flex-row items-center justify-center gap-6 w-full py-2">
      <div className="h-[380px] sm:h-[440px] md:h-[480px] w-full min-h-[360px] xl:flex-1 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>

      {/* Legendas posicionadas ao lado no computador e abaixo no celular sem encolher o gráfico */}
      <aside
        aria-label="Legendas do gráfico"
        className="w-full xl:w-80 max-h-[280px] xl:max-h-[460px] overflow-y-auto rounded-2xl border-2 border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs flex flex-col space-y-2 shrink-0"
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-g-blue">Legenda</span>
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {totalVal} chamados
          </span>
        </div>
        <div className="space-y-1.5 overflow-y-auto pr-1">
          {dados.map((d, i) => {
            const pct = totalVal > 0 ? ((d.value / totalVal) * 100).toFixed(1) : "0";
            return (
              <div
                key={d.name}
                className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 transition-all hover:bg-muted/70 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="size-3 rounded-full shrink-0 shadow-xs ring-1 ring-black/10"
                    style={{ backgroundColor: cor(d.name, i) }}
                  />
                  <span className="font-bold text-foreground truncate" title={d.name}>
                    {d.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-extrabold text-foreground">{d.value}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* AJUSTE 4: Gráfico Principal - Cartões de Indicadores (KPI / Big Numbers) */
function GraficoKpi({
  dados,
  cor,
  totalVal,
}: {
  dados: Item[];
  cor: (name: string, i: number) => string;
  totalVal: number;
}) {
  const media = dados.length > 0 ? (totalVal / dados.length).toFixed(1) : "0";
  const maior = dados[0] ?? { name: "N/A", value: 0 };
  const top3Soma = dados.slice(0, 3).reduce((acc, d) => acc + d.value, 0);
  const top3Pct = totalVal > 0 ? ((top3Soma / totalVal) * 100).toFixed(1) : "0";

  return (
    <div className="w-full space-y-6 py-2 chart-enter">
      {/* Resumo executivo com Big Numbers no topo em destaque */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border-2 border-g-blue/40 bg-g-blue/5 p-4 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-blue">
            Total do Período
          </p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {totalVal}
          </p>
          <p className="text-xs text-muted-foreground">chamados registrados</p>
        </div>

        <div className="rounded-2xl border-2 border-g-green/40 bg-g-green/5 p-4 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-green">
            Média por Categoria
          </p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {media}
          </p>
          <p className="text-xs text-muted-foreground">chamados / dimensão</p>
        </div>

        <div className="rounded-2xl border-2 border-g-yellow/50 bg-g-yellow/5 p-4 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Concentração Top 3
          </p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {top3Pct}%
          </p>
          <p className="text-xs text-muted-foreground">{top3Soma} dos chamados</p>
        </div>

        <div className="rounded-2xl border-2 border-g-purple/40 bg-g-purple/5 p-4 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-purple">
            Maior Demanda (#1)
          </p>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight truncate" title={maior.name}>
            {maior.value}
          </p>
          <p className="text-xs text-muted-foreground truncate" title={maior.name}>
            {maior.name}
          </p>
        </div>
      </div>

      {/* Grid de Cartões de Indicadores alinhados e responsivos no celular e desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dados.map((d, i) => {
          const corItem = cor(d.name, i);
          const pct = totalVal > 0 ? ((d.value / totalVal) * 100).toFixed(1) : "0";

          return (
            <div
              key={d.name}
              className="group relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
              style={{ borderTopColor: corItem, borderTopWidth: 5 }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-extrabold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-black text-white shadow-xs"
                    style={{ backgroundColor: corItem }}
                  >
                    {pct}%
                  </span>
                </div>

                <h4
                  className="font-bold text-sm text-foreground line-clamp-2 min-h-[2.5rem] tracking-tight"
                  title={d.name}
                >
                  {d.name}
                </h4>

                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className="text-4xl sm:text-5xl font-black tracking-tight"
                    style={{ color: corItem }}
                  >
                    {d.value}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    chamados
                  </span>
                </div>
              </div>

              {/* Barra de progresso proporcional */}
              <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: corItem,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Participação</span>
                  <span className="font-semibold text-foreground">
                    {d.value} de {totalVal}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* AJUSTE 3: Componente Gráfico de Série Histórica por Chamados */
interface MesCompleto {
  mes: string;
  labelCurto: string;
  labelLongo: string;
  Total: number;
  Resolvidos: number;
  "Em atendimento": number;
}

const MESES_NOMES: Record<string, { curto: string; longo: string }> = {
  "01": { curto: "Jan", longo: "Janeiro" },
  "02": { curto: "Fev", longo: "Fevereiro" },
  "03": { curto: "Mar", longo: "Março" },
  "04": { curto: "Abr", longo: "Abril" },
  "05": { curto: "Mai", longo: "Maio" },
  "06": { curto: "Jun", longo: "Junho" },
  "07": { curto: "Jul", longo: "Julho" },
  "08": { curto: "Ago", longo: "Agosto" },
  "09": { curto: "Set", longo: "Setembro" },
  "10": { curto: "Out", longo: "Outubro" },
  "11": { curto: "Nov", longo: "Novembro" },
  "12": { curto: "Dez", longo: "Dezembro" },
};

function formatarChaveMes(chave: string): { labelCurto: string; labelLongo: string } {
  const [ano, m] = chave.split("-");
  const info = MESES_NOMES[m ?? "01"] ?? { curto: m ?? "Mês", longo: `Mês ${m}` };
  return {
    labelCurto: `${info.curto}/${ano?.slice(-2) ?? ""}`,
    labelLongo: `${info.longo} de ${ano}`,
  };
}

function GraficoSerieHistorica({ mesSelecionado }: { mesSelecionado?: string }) {
  const { publicStats } = useStore();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  const mesesCompletos = useMemo<MesCompleto[]>(() => {
    const mapa = new Map<string, MesCompleto>();
    for (const r of publicStats) {
      if (!r.mes) continue;
      const chave = r.mes;
      const { labelCurto, labelLongo } = formatarChaveMes(chave);
      const atual = mapa.get(chave) ?? {
        mes: chave,
        labelCurto,
        labelLongo,
        Total: 0,
        Resolvidos: 0,
        "Em atendimento": 0,
      };

      atual.Total += r.total;
      if (r.status === "Resolvido") {
        atual.Resolvidos += r.total;
      } else if (r.status !== "Cancelado") {
        atual["Em atendimento"] += r.total;
      }
      mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [publicStats]);

  const [indiceInicio, setIndiceInicio] = useState(0);
  const [indiceFim, setIndiceFim] = useState(0);
  const [presetAtivo, setPresetAtivo] = useState<"todos" | "3m" | "6m" | "custom">("todos");

  useEffect(() => {
    if (mesesCompletos.length === 0) return;
    if (!mesSelecionado || mesSelecionado === "todos") {
      setIndiceInicio(0);
      setIndiceFim(mesesCompletos.length - 1);
      setPresetAtivo("todos");
    } else {
      const idx = mesesCompletos.findIndex((m) => m.mes === mesSelecionado);
      if (idx !== -1) {
        setIndiceInicio(idx);
        setIndiceFim(idx);
        setPresetAtivo("custom");
      } else {
        setIndiceInicio(0);
        setIndiceFim(mesesCompletos.length - 1);
        setPresetAtivo("todos");
      }
    }
  }, [mesSelecionado, mesesCompletos]);

  const aplicarPreset = (tipo: "todos" | "3m" | "6m") => {
    const totalMeses = mesesCompletos.length;
    if (totalMeses === 0) return;
    setPresetAtivo(tipo);
    if (tipo === "todos") {
      setIndiceInicio(0);
      setIndiceFim(totalMeses - 1);
    } else if (tipo === "3m") {
      setIndiceInicio(Math.max(0, totalMeses - 3));
      setIndiceFim(totalMeses - 1);
    } else if (tipo === "6m") {
      setIndiceInicio(Math.max(0, totalMeses - 6));
      setIndiceFim(totalMeses - 1);
    }
  };

  const alterarInicio = (idx: number) => {
    setPresetAtivo("custom");
    setIndiceInicio(Math.min(idx, indiceFim));
  };

  const alterarFim = (idx: number) => {
    setPresetAtivo("custom");
    setIndiceFim(Math.max(idx, indiceInicio));
  };

  const focarMes = (idx: number) => {
    setPresetAtivo("custom");
    setIndiceInicio(idx);
    setIndiceFim(idx);
  };

  const mesesFiltrados = useMemo(() => {
    if (mesesCompletos.length === 0) return [];
    const ini = Math.max(0, Math.min(indiceInicio, mesesCompletos.length - 1));
    const fim = Math.max(ini, Math.min(indiceFim, mesesCompletos.length - 1));
    return mesesCompletos.slice(ini, fim + 1);
  }, [mesesCompletos, indiceInicio, indiceFim]);

  const [visivel, setVisivel] = useState<Record<string, boolean>>({
    Total: true,
    Resolvidos: true,
    "Em atendimento": true,
  });

  const toggleSerie = (key: string) => {
    setVisivel((prev) => {
      const ativas = Object.values(prev).filter(Boolean).length;
      if (prev[key] && ativas === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const totalPeriodo = mesesFiltrados.reduce((acc, m) => acc + m.Total, 0);
  const resolvidosPeriodo = mesesFiltrados.reduce((acc, m) => acc + m.Resolvidos, 0);
  const taxaResolucao = totalPeriodo > 0 ? ((resolvidosPeriodo / totalPeriodo) * 100).toFixed(1) : "0.0";
  const mediaMensal = mesesFiltrados.length > 0 ? Math.round(totalPeriodo / mesesFiltrados.length) : 0;
  const mesPico = useMemo(() => {
    if (mesesFiltrados.length === 0) return null;
    return [...mesesFiltrados].sort((a, b) => b.Total - a.Total)[0];
  }, [mesesFiltrados]);

  const { serieHistorica: sh } = useTemaGrafico();

  const seriesConfig = [
    { key: "Total", label: "Total de Chamados", cor: sh.linha, desc: "Volume total registrado no mês" },
    { key: "Resolvidos", label: "Finalizados", cor: sh.resolvidos, desc: "Chamados com atendimento finalizado" },
    { key: "Em atendimento", label: "Em Atendimento", cor: sh.emAtendimento, desc: "Chamados em andamento pela equipe" },
  ];

  return (
    <div className="space-y-6 chart-enter">
      {/* Cartões de Métricas do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border-l-4 border-g-blue bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Total no período</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-g-blue tracking-tight">{totalPeriodo}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{mesesFiltrados.length} meses selecionados</p>
        </div>

        <div className="rounded-xl border-l-4 border-g-green bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Finalizados</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-g-green tracking-tight">{resolvidosPeriodo}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{taxaResolucao}% de taxa de finalização</p>
        </div>

        <div className="rounded-xl border-l-4 border-g-yellow bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Média mensal</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-500 tracking-tight">{mediaMensal}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">chamados por mês</p>
        </div>

        <div className="rounded-xl border-l-4 border-purple-500 bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Mês de pico</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
            {mesPico ? mesPico.Total : 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{mesPico ? mesPico.labelLongo : "—"}</p>
        </div>
      </div>

      {/* Controles e Filtros de Período da Série Histórica */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Período:
            </span>
            <Button
              variant="outline"
              className={cn(
                "min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                presetAtivo === "todos"
                  ? "bg-g-blue text-white border-g-blue font-bold shadow-sm hover:brightness-110"
                  : "bg-card border-border/80 hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs"
              )}
              onClick={() => aplicarPreset("todos")}
            >
              Todos ({mesesCompletos.length}M)
            </Button>
            {mesesCompletos.length >= 3 && (
              <Button
                variant="outline"
                className={cn(
                  "min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                  presetAtivo === "3m"
                    ? "bg-g-blue text-white border-g-blue font-bold shadow-sm hover:brightness-110"
                    : "bg-card border-border/80 hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs"
                )}
                onClick={() => aplicarPreset("3m")}
              >
                Últimos 3M
              </Button>
            )}
            {mesesCompletos.length >= 6 && (
              <Button
                variant="outline"
                className={cn(
                  "min-h-[44px] h-11 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                  presetAtivo === "6m"
                    ? "bg-g-blue text-white border-g-blue font-bold shadow-sm hover:brightness-110"
                    : "bg-card border-border/80 hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs"
                )}
                onClick={() => aplicarPreset("6m")}
              >
                Últimos 6M
              </Button>
            )}
            {presetAtivo !== "todos" && (
              <Button
                variant="outline"
                className="min-h-[44px] h-11 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-card hover:bg-accent text-muted-foreground hover:text-foreground shadow-xs gap-1.5 cursor-pointer"
                onClick={() => aplicarPreset("todos")}
                title="Restaurar visualização completa"
              >
                <RotateCcw className="size-3.5" /> Redefinir
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">De:</span>
              <select
                className="min-h-[44px] h-11 sm:h-10 rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue shadow-xs cursor-pointer"
                value={indiceInicio}
                onChange={(e) => alterarInicio(Number(e.target.value))}
                aria-label="Mês inicial"
              >
                {mesesCompletos.map((m, idx) => (
                  <option key={m.mes} value={idx} disabled={idx > indiceFim}>
                    {m.labelCurto}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Até:</span>
              <select
                className="min-h-[44px] h-11 sm:h-10 rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue shadow-xs cursor-pointer"
                value={indiceFim}
                onChange={(e) => alterarFim(Number(e.target.value))}
                aria-label="Mês final"
              >
                {mesesCompletos.map((m, idx) => (
                  <option key={m.mes} value={idx} disabled={idx < indiceInicio}>
                    {m.labelCurto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Linha horizontal interativa de meses */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
            <Calendar className="size-3.5 text-g-blue" /> Meses:
          </span>
          {mesesCompletos.map((m, idx) => {
            const estaNoRange = idx >= indiceInicio && idx <= indiceFim;
            return (
              <button
                key={m.mes}
                type="button"
                onClick={() => focarMes(idx)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  estaNoRange
                    ? "bg-g-blue/15 text-g-blue border border-g-blue font-bold shadow-xs"
                    : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/70 hover:border-g-blue/40"
                }`}
              >
                <span>{m.labelCurto}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    estaNoRange ? "bg-g-blue text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.Total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Ampla do Gráfico + Séries (Visual Oceano) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="relative lg:col-span-3 h-[400px] sm:h-[470px] w-full min-h-[360px] rounded-2xl border-2 border-cyan-800/30 dark:border-cyan-500/25 bg-gradient-to-b from-sky-500/10 via-cyan-900/15 to-blue-950/35 dark:from-sky-950/40 dark:via-slate-950/60 dark:to-cyan-950/70 p-2 sm:p-4 shadow-inner overflow-hidden flex flex-col justify-between">
          {/* Camadas de ondas translúcidas atrás da curva com animação suave GPU */}
          <div className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden opacity-35 dark:opacity-25 select-none" aria-hidden="true">
            <svg
              className={`absolute -bottom-2 -left-12 w-[130%] h-48 sm:h-64 ${prefersReducedMotion ? "" : "ocean-wave-layer-1"}`}
              viewBox="0 0 1200 320"
              preserveAspectRatio="none"
            >
              <path
                fill="url(#wave-grad-1)"
                d="M0,160 C180,100 380,220 540,160 C700,100 900,220 1060,160 C1140,130 1180,180 1200,160 L1200,320 L0,320 Z"
              />
            </svg>
            <svg
              className={`absolute -bottom-4 -left-8 w-[125%] h-40 sm:h-56 ${prefersReducedMotion ? "" : "ocean-wave-layer-2"}`}
              viewBox="0 0 1200 320"
              preserveAspectRatio="none"
            >
              <path
                fill="url(#wave-grad-2)"
                d="M0,200 C200,250 340,140 540,190 C740,240 890,150 1080,200 C1150,220 1180,190 1200,200 L1200,320 L0,320 Z"
              />
            </svg>
            <svg
              className={`absolute -bottom-6 -left-4 w-[120%] h-32 sm:h-48 ${prefersReducedMotion ? "" : "ocean-wave-layer-3"}`}
              viewBox="0 0 1200 320"
              preserveAspectRatio="none"
            >
              <path
                fill="url(#wave-grad-3)"
                d="M0,230 C220,190 410,260 630,220 C830,180 990,250 1200,220 L1200,320 L0,320 Z"
              />
            </svg>
          </div>

          <div className="flex-1 w-full min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mesesFiltrados}
                margin={
                  isMobile
                    ? { left: -18, right: 10, top: 18, bottom: 5 }
                    : { left: 8, right: 28, top: 18, bottom: 5 }
                }
              >
                <defs>
                  {/* Gradiente vertical oceânico calibrado com a paleta ativa */}
                  <linearGradient id="ocean-surface-to-deep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sh.gradienteOceano[0]} stopOpacity={0.78} />
                    <stop offset="45%" stopColor={sh.gradienteOceano[1]} stopOpacity={0.52} />
                    <stop offset="100%" stopColor={sh.gradienteOceano[2]} stopOpacity={0.28} />
                  </linearGradient>

                  <linearGradient id="wave-grad-1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sh.gradienteOceano[0]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sh.gradienteOceano[1]} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="wave-grad-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sh.gradienteOceano[1]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={sh.gradienteOceano[2]} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="wave-grad-3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sh.gradienteOceano[1]} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={sh.gradienteOceano[2]} stopOpacity={0.05} />
                  </linearGradient>

                  <linearGradient id="hist-green" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sh.resolvidos} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={sh.resolvidos} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="hist-yellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sh.emAtendimento} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={sh.emAtendimento} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="labelCurto" tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 700 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                <Tooltip content={<HistoricoCustomTooltip totalPeriodo={totalPeriodo} />} />

                {visivel.Total && (
                  <Area
                    type="monotone"
                    dataKey="Total"
                    fill="url(#ocean-surface-to-deep)"
                    stroke="none"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 700}
                  />
                )}
                {visivel.Resolvidos && (
                  <Area
                    type="monotone"
                    dataKey="Resolvidos"
                    fill="url(#hist-green)"
                    stroke="none"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}
                {visivel["Em atendimento"] && (
                  <Area
                    type="monotone"
                    dataKey="Em atendimento"
                    fill="url(#hist-yellow)"
                    stroke="none"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}

                {visivel.Total && (
                  <Line
                    type="monotone"
                    dataKey="Total"
                    name="Total de Chamados"
                    stroke={sh.linha}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      const val = Number(payload?.Total ?? 0);
                      const pico = mesPico?.Total || 1;
                      const ratio = val / pico;
                      const isRaso = ratio < 0.38;
                      const isMedio = ratio >= 0.38 && ratio < 0.72;
                      const corFundo = isRaso ? sh.gradienteOceano[0] : isMedio ? sh.gradienteOceano[1] : sh.gradienteOceano[2];
                      const corBorda = isRaso ? "#fef08a" : isMedio ? sh.gradienteOceano[0] : sh.linha;
                      return (
                        <circle
                          key={`dot-total-${props.key || cx}`}
                          cx={cx}
                          cy={cy}
                          r={isRaso ? 4.5 : isMedio ? 5.5 : 6.5}
                          fill={corFundo}
                          stroke={corBorda}
                          strokeWidth={2.5}
                          className="transition-all duration-200 drop-shadow-sm"
                        />
                      );
                    }}
                    activeDot={{
                      r: 8.5,
                      stroke: sh.linha,
                      strokeWidth: 3,
                      fill: sh.gradienteOceano[2],
                    }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 700}
                  />
                )}
                {visivel.Resolvidos && (
                  <Line
                    type="monotone"
                    dataKey="Resolvidos"
                    name="Finalizados"
                    stroke={sh.resolvidos}
                    strokeWidth={2.8}
                    dot={{ r: 4, fill: sh.resolvidos, stroke: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 7, stroke: sh.resolvidos, strokeWidth: 2.5, fill: "#ffffff" }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}
                {visivel["Em atendimento"] && (
                  <Line
                    type="monotone"
                    dataKey="Em atendimento"
                    name="Em Atendimento"
                    stroke={sh.emAtendimento}
                    strokeWidth={2.8}
                    dot={{ r: 4, fill: sh.emAtendimento, stroke: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 7, stroke: sh.emAtendimento, strokeWidth: 2.5, fill: "#ffffff" }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda de Profundidade do Oceano com escala de raso a profundo */}
          <div className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-800/20 dark:border-cyan-500/20 bg-card/90 px-3 py-1.5 text-xs backdrop-blur-xs shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <span className="size-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Profundidade (volume de chamados):</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[190px]">
              <span className="text-[10px] font-bold text-muted-foreground shrink-0">Raso</span>
              <div
                className="h-2.5 flex-1 rounded-full shadow-inner border border-border/50"
                style={{
                  background: `linear-gradient(90deg, ${sh.gradienteOceano[0]} 0%, ${sh.gradienteOceano[1]} 50%, ${sh.gradienteOceano[2]} 100%)`,
                }}
                title="Escala de profundidade por volume da paleta"
              />
              <span className="text-[10px] font-bold text-foreground shrink-0">Profundo</span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              Gradiente harmônico calibrado pela paleta ativa
            </span>
          </div>
        </div>

        {/* Painel Lateral com Séries e Controle de Exibição */}
        <aside className="lg:col-span-1 rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-g-blue">Séries</span>
              <span className="text-xs font-mono font-bold text-muted-foreground">{totalPeriodo} chamados</span>
            </div>

            <div className="space-y-2">
              {seriesConfig.map((s) => {
                const ativa = visivel[s.key];
                const soma = mesesFiltrados.reduce((sum, m) => sum + ((m as any)[s.key] || 0), 0);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSerie(s.key)}
                    className={`w-full flex items-center justify-between gap-2.5 rounded-xl p-2.5 transition-all text-xs border text-left cursor-pointer ${
                      ativa
                        ? "border-g-blue/50 bg-g-blue/10 font-bold text-foreground shadow-xs"
                        : "border-border/50 bg-muted/40 opacity-55 hover:opacity-85 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: s.cor }} />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground shrink-0">{soma}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3 text-xs space-y-2 text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-g-blue" /> Dica de análise
            </p>
            <p className="text-[11px] leading-relaxed">
              A superfície e o relevo ondulado representam a evolução no tempo. A profundidade indica a concentração da demanda.
            </p>
          </div>
        </aside>
      </div>

      {/* Tabela de Dados Mensais */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Calendar className="size-4 text-g-blue" /> Tabela de Fechamento Mensal
        </h3>
        <div className="w-full overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50 font-bold text-muted-foreground">
                <th className="p-3">Mês / Ano</th>
                <th className="p-3 text-right">Total Registrado</th>
                <th className="p-3 text-right">Finalizados</th>
                <th className="p-3 text-right">Em Atendimento</th>
                <th className="p-3 text-right">Taxa de Finalização</th>
              </tr>
            </thead>
            <tbody>
              {mesesFiltrados.map((m) => {
                const taxa = m.Total > 0 ? ((m.Resolvidos / m.Total) * 100).toFixed(0) : "0";
                return (
                  <tr key={m.mes} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{m.labelLongo}</td>
                    <td className="p-3 text-right font-mono font-bold text-g-blue">{m.Total}</td>
                    <td className="p-3 text-right font-mono text-g-green font-semibold">{m.Resolvidos}</td>
                    <td className="p-3 text-right font-mono text-amber-500 font-semibold">{m["Em atendimento"]}</td>
                    <td className="p-3 text-right font-mono font-semibold">{taxa}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HistoricoCustomTooltip({ active, payload, label, totalPeriodo }: any) {
  if (!active || !payload || !payload.length) return null;
  const mesData = payload[0]?.payload as MesCompleto | undefined;

  return (
    <div className="rounded-xl border border-cyan-800/30 dark:border-cyan-500/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-56 space-y-2.5">
      <div className="border-b border-border/80 pb-1.5 font-extrabold text-foreground flex items-center justify-between">
        <span>{mesData?.labelLongo ?? label}</span>
        {totalPeriodo > 0 && mesData?.Total ? (
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
            {((mesData.Total / totalPeriodo) * 100).toFixed(1)}% do período
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry: any) => {
          const val = Number(entry.value ?? 0);
          const pct = totalPeriodo > 0 ? ((val / totalPeriodo) * 100).toFixed(1) : "0.0";
          return (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full shadow-2xs" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground font-medium">{entry.name}:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-extrabold text-foreground">{val}</span>
                <span className="text-[11px] text-muted-foreground font-semibold">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}