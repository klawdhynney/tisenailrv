import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  PieChartIcon,
  Printer,
  RotateCcw,
  Star,
  Table2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularSla } from "@/lib/sla";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CORES_SLA, MESES_DISPONIVEIS, type Ticket, type TipoGrafico } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLoading } from "@/lib/loading-context";

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tipo: typeof search.tipo === "string" ? search.tipo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard público | TI Senai LRV" },
      { name: "description", content: "Gráficos interativos e indicadores públicos dos chamados de TI Senai LRV." },
      { property: "og:title", content: "Dashboard de chamados | TI Senai LRV" },
      { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
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

const mesAtualPadrao = () => {
  const d = new Date();
  const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return MESES_DISPONIVEIS.some((m) => m.key === chave) ? chave : MESES_DISPONIVEIS[0]?.key ?? "todos";
};

function Dashboard() {
  const { publicStats, isGestor, regras } = useStore();
  const { wrapAsync, isLoading } = useLoading();
  const search = Route.useSearch();
  const tipoQuery = search?.tipo;

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

  const [mes, setMes] = useState(mesAtualPadrao);
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

  const linhas = useMemo(() => publicStats.filter((r) => mes === "todos" || r.mes === mes), [publicStats, mes]);
  const total = linhas.reduce((n, r) => n + r.total, 0);
  const resolvidos = linhas.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);
  const ativos = linhas.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);

  const contar = (campo: "categoria" | "setor" | "prioridade" | "status") => {
    const mapa = new Map<string, number>();
    for (const r of linhas) mapa.set(r[campo], (mapa.get(r[campo]) ?? 0) + r.total);
    return [...mapa].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const categorias = contar("categoria"),
    setores = contar("setor");

  const dadosSla = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of progress) {
      if (mes !== "todos" && !t.aberto_em.startsWith(mes)) continue;
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

  const cor = (nome: string, i: number) => {
    if (visao === "sla" && CORES_SLA[nome]?.bg) return CORES_SLA[nome].bg;
    return CORES[i] ?? "#FFFFFF";
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

  const imprimir = () => window.print();

  const indConf = regras.indicadores;
  const dashConf = regras.dashboard;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-g-blue">
            {dashConf?.subtitulo || "Indicadores públicos"}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {dashConf?.titulo || "Dashboard de chamados"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de transparência dos atendimentos de TI SENAI LRV.
          </p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={baixarResumo}
            className="font-semibold shadow-2xs"
            disabled={isLoading}
          >
            <FileSpreadsheet className="size-4 mr-1 text-g-green" /> Exportar planilha
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={baixarPdf}
            className="font-semibold shadow-2xs"
            disabled={isLoading}
          >
            <FileText className="size-4 mr-1 text-g-red" /> Exportar PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={imprimir}
            className="font-semibold shadow-2xs"
            disabled={isLoading}
          >
            <Printer className="size-4 mr-1 text-g-blue" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Cartões de Indicadores Gerais do Topo */}
      {indConf?.mostrarCards !== false && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              label: indConf?.resolvidosLabel || "Resolvidos",
              count: resolvidos,
              border: "border-g-green",
              color: "text-g-green",
              desc: indConf?.resolvidosDesc || "Chamados que já foram concluídos.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border-l-4 ${item.border} bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}
            >
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                <p className={`mt-1 text-3xl font-black tracking-tight ${item.color}`}>{item.count}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/80 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de Filtros */}
      <section className="no-print rounded-xl border-2 border-g-blue/60 bg-card px-4 py-3 shadow-sm transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-g-blue">Filtrar:</span>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span>Mês</span>
              <select
                aria-label="Mês"
                className="h-8.5 min-w-40 rounded-lg border-2 border-g-blue bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              >
                {MESES_DISPONIVEIS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
                <option value="todos">Todos os meses</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Button asChild size="sm" variant="google-green" className="font-semibold shadow-xs">
              <Link to="/dashboard/acompanhamento">
                <ClipboardList className="size-3.5 mr-1" /> Acompanhar chamados
              </Link>
            </Button>

            {isGestor && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="font-bold shadow-xs text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
              >
                <Link to="/dashboard/avaliacoes">
                  <Star className="size-3.5 mr-1 fill-amber-400 text-amber-500" /> Avaliações
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Seção Categórica e Distribuição em largura total */}
      <div className="border-t-2 border-border/80 pt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Análise Categórica</h2>
            <p className="text-xs text-muted-foreground">
              Navegue pelas dimensões dos chamados e acompanhe a distribuição e proporção dos registros.
            </p>
          </div>
        </div>

        {tipoGrafico !== "historico" && (
          <nav aria-label="Dimensões do dashboard" className="no-print grid grid-cols-2 gap-2 md:grid-cols-5">
            {VISOES.map((v) => (
              <Button
                key={v.id}
                variant={
                  `google-${v.color}` as
                    | "google-blue"
                    | "google-red"
                    | "google-yellow"
                    | "google-green"
                    | "google-purple"
                }
                aria-current={visao === v.id ? "page" : undefined}
                className={`h-auto min-h-12 whitespace-normal py-2 text-center text-sm font-bold tracking-tight ${
                  visao === v.id
                    ? "ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg scale-[1.02]"
                    : "opacity-85 hover:opacity-100"
                }`}
                onClick={() => setVisao(v.id)}
              >
                {v.label}
              </Button>
            ))}
          </nav>
        )}

        {/* Painel com Seletor de Tipo de Gráficos e Visualização */}
        <div className="w-full">
          <section
            className="min-w-0 rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {tipoGrafico === "historico"
                    ? "Série Histórica Contínua"
                    : VISOES.find((v) => v.id === visao)?.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tipoGrafico === "historico"
                    ? "Evolução temporal mês a mês dos atendimentos registrados, resolvidos e em andamento."
                    : "Distribuição e proporção dos registros filtrados."}
                </p>
              </div>

              {/* Menu e Abas dos Gráficos com Cartões KPI em Primeiro e Série Histórica após os demais */}
              <div className="no-print flex flex-wrap gap-1.5" aria-label="Tipo de gráfico">
                <Button
                  size="sm"
                  variant={tipoGrafico === "kpi" ? "google-blue" : "outline"}
                  onClick={() => setTipoGrafico("kpi")}
                  title="Cartões de Indicadores (Big Numbers)"
                  className="font-bold"
                >
                  <LayoutGrid className="size-3.5 mr-1" /> Cartões de Indicadores
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === "pizza" ? "google-blue" : "outline"}
                  onClick={() => setTipoGrafico("pizza")}
                  title="Gráfico de Rosca / Pizza"
                >
                  <PieChartIcon className="size-3.5 mr-1" /> Pizza
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === "barras" ? "google-blue" : "outline"}
                  onClick={() => setTipoGrafico("barras")}
                  title="Gráfico de Barras horizontais"
                >
                  <BarChart3 className="size-3.5 mr-1" /> Barras
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === "historico" ? "google-blue" : "outline"}
                  onClick={() => setTipoGrafico("historico")}
                  title="Série histórica por chamados"
                >
                  <Activity className="size-3.5 mr-1" /> Série Histórica
                </Button>
              </div>
            </div>

            <Grafico
              key={`${visao}-${tipoGrafico}-${mes}`}
              dados={dados}
              tipo={tipoGrafico}
              cor={cor}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Grafico({
  dados,
  tipo,
  cor,
}: {
  dados: Item[];
  tipo: TipoGrafico;
  cor: (name: string, i: number) => string;
}) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  // 1. Gráfico de Série Histórica por Chamados
  if (tipo === "historico") {
    return <GraficoSerieHistorica />;
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
            ? { left: 4, right: 16, top: 5, bottom: 5 }
            : { left: 20, right: 30 }
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
          radius={[0, 4, 4, 0]}
        >
          {dados.map((d, i) => (
            <Cell key={d.name} fill={cor(d.name, i)} />
          ))}
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

function GraficoSerieHistorica() {
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
    if (mesesCompletos.length > 0) {
      setIndiceInicio(0);
      setIndiceFim(mesesCompletos.length - 1);
      setPresetAtivo("todos");
    }
  }, [mesesCompletos.length]);

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

  const seriesConfig = [
    { key: "Total", label: "Total de Chamados", cor: "#1a73e8", desc: "Volume total registrado no mês" },
    { key: "Resolvidos", label: "Resolvidos", cor: "#34a853", desc: "Chamados com atendimento concluído" },
    { key: "Em atendimento", label: "Em Atendimento", cor: "#f9ab00", desc: "Chamados em andamento pela equipe" },
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
          <p className="text-xs font-semibold text-muted-foreground">Resolvidos</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-g-green tracking-tight">{resolvidosPeriodo}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{taxaResolucao}% de taxa de resolução</p>
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
              size="sm"
              variant={presetAtivo === "todos" ? "google-blue" : "outline"}
              onClick={() => aplicarPreset("todos")}
            >
              Todos ({mesesCompletos.length}M)
            </Button>
            {mesesCompletos.length >= 3 && (
              <Button
                size="sm"
                variant={presetAtivo === "3m" ? "google-blue" : "outline"}
                onClick={() => aplicarPreset("3m")}
              >
                Últimos 3M
              </Button>
            )}
            {mesesCompletos.length >= 6 && (
              <Button
                size="sm"
                variant={presetAtivo === "6m" ? "google-blue" : "outline"}
                onClick={() => aplicarPreset("6m")}
              >
                Últimos 6M
              </Button>
            )}
            {presetAtivo !== "todos" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => aplicarPreset("todos")}
                title="Restaurar visualização completa"
              >
                <RotateCcw className="size-3.5 mr-1" /> Redefinir
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">De:</span>
              <select
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
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
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
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

      {/* Área Ampla do Gráfico + Séries */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 h-[380px] sm:h-[440px] w-full min-h-[360px] rounded-xl border border-border/80 bg-background/50 p-2 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mesesFiltrados}
              margin={
                isMobile
                  ? { left: -15, right: 10, top: 15, bottom: 10 }
                  : { left: 10, right: 30, top: 15, bottom: 10 }
              }
            >
              <defs>
                <linearGradient id="hist-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="hist-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34a853" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34a853" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="hist-yellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f9ab00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f9ab00" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="labelCurto" tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 700 }} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
              <Tooltip content={<HistoricoCustomTooltip />} />

              {visivel.Total && (
                <Area
                  type="monotone"
                  dataKey="Total"
                  fill="url(#hist-blue)"
                  stroke="none"
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={prefersReducedMotion ? 0 : 650}
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
                  stroke="#1a73e8"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#1a73e8", stroke: "#ffffff", strokeWidth: 2 }}
                  activeDot={{ r: 8, stroke: "#1a73e8", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={prefersReducedMotion ? 0 : 650}
                />
              )}
              {visivel.Resolvidos && (
                <Line
                  type="monotone"
                  dataKey="Resolvidos"
                  name="Resolvidos"
                  stroke="#34a853"
                  strokeWidth={3}
                  dot={{ r: 4.5, fill: "#34a853", stroke: "#ffffff", strokeWidth: 2 }}
                  activeDot={{ r: 7.5, stroke: "#34a853", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={prefersReducedMotion ? 0 : 650}
                />
              )}
              {visivel["Em atendimento"] && (
                <Line
                  type="monotone"
                  dataKey="Em atendimento"
                  name="Em Atendimento"
                  stroke="#f9ab00"
                  strokeWidth={3}
                  dot={{ r: 4.5, fill: "#f9ab00", stroke: "#ffffff", strokeWidth: 2 }}
                  activeDot={{ r: 7.5, stroke: "#f9ab00", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={prefersReducedMotion ? 0 : 650}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
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
              Clique nas séries acima para ocultar ou exibir linhas individualmente. Use os botões de período para focar
              em trimestres ou semestres específicos.
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
                <th className="p-3 text-right">Resolvidos</th>
                <th className="p-3 text-right">Em Atendimento</th>
                <th className="p-3 text-right">Taxa de Resolução</th>
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

function HistoricoCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const mesData = payload[0]?.payload as MesCompleto | undefined;

  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm text-xs min-w-44 space-y-2">
      <div className="border-b border-border/80 pb-1.5 font-bold text-foreground">
        {mesData?.labelLongo ?? label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}