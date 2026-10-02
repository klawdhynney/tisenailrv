import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Calendar, ChevronDown, ChevronUp, ClipboardList, FileSpreadsheet, FileText, LineChart as LineChartIcon, PieChartIcon, Printer, RotateCcw, Sparkles, Table2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularSla } from "@/lib/sla";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Ticket } from "@/lib/types";
import { useEffect } from "react";
import { MESES_DISPONIVEIS } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [
    { title: "Dashboard público | TI Senai LRV" },
    { name: "description", content: "Gráficos interativos e indicadores públicos dos chamados de TI Senai LRV." },
    { property: "og:title", content: "Dashboard de chamados | TI Senai LRV" },
    { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
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
type TipoGrafico = "pizza" | "barras" | "linhas" | "abc";
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
  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const all: typeof progress = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) { console.error("Falha ao carregar SLA público", error.message); return; }
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (mounted) setProgress(all);
    };
    void load();
    const channel = supabase.channel("public-sla-refresh").on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => void load()).subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, []);
  const [mes, setMes] = useState(mesAtualPadrao);
  const [visao, setVisao] = useState<Visao>("problemas");
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("pizza");
  const linhas = useMemo(() => publicStats.filter((r) => mes === "todos" || r.mes === mes), [publicStats, mes]);
  const total = linhas.reduce((n, r) => n + r.total, 0);
  const resolvidos = linhas.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);
  const ativos = linhas.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
  const contar = (campo: "categoria" | "setor" | "prioridade" | "status") => {
    const mapa = new Map<string, number>();
    for (const r of linhas) mapa.set(r[campo], (mapa.get(r[campo]) ?? 0) + r.total);
    return [...mapa].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const categorias = contar("categoria"), setores = contar("setor");
  const dadosSla = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of progress) {
      if (mes !== "todos" && !t.aberto_em.startsWith(mes)) continue;
      const situacao = calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now).situacao;
      counts.set(situacao, (counts.get(situacao) ?? 0) + 1);
    }
    return ["No prazo", "Estourado", "Cancelado", "—"].filter(name => counts.has(name)).map(name => ({ name, value: counts.get(name) ?? 0 }));
  }, [progress, mes, regras, now]);
  const todosDados: Item[] = visao === "sla" ? dadosSla : visao === "problemas" && mes === "todos"
    ? RECORRENTES.map((item) => ({ ...item }))
    : visao === "problemas" ? categorias : visao === "setores" ? setores : contar(visao === "prioridades" ? "prioridade" : "status");
  const dados: Item[] = todosDados.length <= CORES.length ? todosDados : [...todosDados.slice(0, CORES.length - 1), { name: "Outros", value: todosDados.slice(CORES.length - 1).reduce((n, x) => n + x.value, 0) }];
  const cor = (_nome: string, i: number) => CORES[i] ?? "#FFFFFF";
  const baixarResumo = async () => {
    const { exportarXlsx } = await import("@/lib/exportar");
    const totalVal = dados.reduce((sum, item) => sum + item.value, 0);
    const linhas = dados.map((r) => {
      const pct = totalVal > 0 ? `${((r.value / totalVal) * 100).toFixed(1)}%` : "0%";
      return {
        "Visão": visao,
        "Item": r.name,
        "Chamados": r.value,
        "Porcentagem": pct,
      };
    });
    await exportarXlsx(linhas, `dashboard-${visao}-${mes}`);
  };

  const baixarDashboardCompleto = async () => {
    const { exportarDashboardCompletoPdf } = await import("@/lib/exportar");
    const labelMes = mes === "todos" ? "Todos os meses" : (MESES_DISPONIVEIS.find(m => m.key === mes)?.label ?? mes);
    await exportarDashboardCompletoPdf({
      mesLabel: labelMes,
      total,
      andamento: ativos,
      resolvidos,
      recorrentes: RECORRENTES.map(r => ({ ...r })),
      setores,
      prioridades: contar("prioridade"),
      status: contar("status"),
      sla: dadosSla,
    }, `Dashboard_Completo_${mes}`);
  };

  const [serieAberta, setSerieAberta] = useState(true);

  return (
    <div className="space-y-7 dashboard-print">
      <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex-1 text-center">
        <p className="text-sm font-extrabold uppercase tracking-wider text-g-blue">Indicadores públicos</p>
        <h1 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">Dashboard de chamados</h1>
      </div>
      {isGestor && (
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/chamados"><Table2 className="size-4" /> Planilha completa</Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={baixarResumo}>
            <FileSpreadsheet className="size-4" /> Baixar Excel
          </Button>
          <Button variant="outline" onClick={baixarDashboardCompleto}>
            <FileText className="size-4" /> Dashboard completo (PDF)
          </Button>
        </div>
      )}
    </header>

    {/* Resumo de Indicadores no Topo */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total de chamados", count: total, border: "border-g-blue", color: "text-g-blue", desc: "Quantidade de chamados registrados." },
          { label: "Em atendimento", count: ativos, border: "border-g-yellow", color: "text-g-yellow", desc: "Chamados que estão sendo tratados pela equipe de TI." },
          { label: "Resolvidos", count: resolvidos, border: "border-g-green", color: "text-g-green", desc: "Chamados que já foram concluídos." },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border-l-4 ${item.border} bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${item.color}`}>{item.count}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground/80 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

    {/* Filtros de dados posicionados logo próximos aos gráficos correspondentes */}
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
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
              <option value="todos">Todos os meses</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={serieAberta ? "google-blue" : "outline"}
            onClick={() => {
              setSerieAberta(true);
              setTimeout(() => {
                document.getElementById("secao-serie-historica")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 60);
            }}
            className="font-bold shadow-xs transition-all hover:scale-[1.02]"
          >
            <Activity className="size-4 mr-1.5" />
            Série histórica por chamados
          </Button>

          <Button asChild size="sm" variant="google-green" className="font-semibold shadow-xs">
            <Link to="/dashboard/acompanhamento">
              <ClipboardList className="size-3.5 mr-1" /> Acompanhar chamados
            </Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Seção Categórica e Distribuição com Série Histórica integrada */}
    <div className="border-t-2 border-border/80 pt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Análise Categórica</h2>
          <p className="text-xs text-muted-foreground">Navegue pelas dimensões dos chamados e acompanhe a série temporal integrada.</p>
        </div>
      </div>

      <nav aria-label="Gráficos do dashboard" className="no-print grid grid-cols-2 gap-2 md:grid-cols-5">
        {VISOES.map((v) => (
          <Button
            key={v.id}
            variant={`google-${v.color}` as "google-blue" | "google-red" | "google-yellow" | "google-green" | "google-purple"}
            aria-current={visao === v.id ? "page" : undefined}
            className={`h-auto min-h-12 whitespace-normal py-2 text-center text-sm font-bold tracking-tight ${visao === v.id ? "ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" : "opacity-85 hover:opacity-100"}`}
            onClick={() => setVisao(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </nav>

      {/* Grade com os gráficos da Análise Categórica: Visão Categórica à esquerda e Série Histórica à direita (por último no celular) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Painel da Visão Categórica / Curva ABC */}
        <section className="min-w-0 rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">{VISOES.find((v) => v.id === visao)?.label}</h3>
              <p className="text-xs text-muted-foreground">Distribuição e proporção dos registros filtrados.</p>
            </div>
            <div className="no-print flex flex-wrap gap-1.5" aria-label="Tipo de gráfico">
              <Button size="sm" variant={tipoGrafico === "pizza" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("pizza")}><PieChartIcon className="size-3.5 mr-1" /> Pizza</Button>
              <Button size="sm" variant={tipoGrafico === "barras" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("barras")}><BarChart3 className="size-3.5 mr-1" /> Barras</Button>
              <Button size="sm" variant={tipoGrafico === "linhas" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("linhas")}><LineChartIcon className="size-3.5 mr-1" /> Linhas</Button>
              <Button size="sm" variant={tipoGrafico === "abc" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("abc")} title="Curva ABC / Análise de Pareto"><TrendingUp className="size-3.5 mr-1" /> Curva ABC</Button>
            </div>
          </div>
          <Grafico key={`${visao}-${tipoGrafico}`} dados={dados} tipo={tipoGrafico} cor={cor} />
        </section>

        {/* Gráfico da Série Histórica (posicionado no lado direito da grade, ou por último no mobile) */}
        <div className="min-w-0">
          <GraficoSerieHistoricaTech stats={publicStats} aberto={serieAberta} setAberto={setSerieAberta} />
        </div>
      </div>
    </div>
    </div>
  );
}

function formatarMesCurto(chave: string, labelCompleto?: string): string {
  if (labelCompleto) {
    const parte = labelCompleto.split("/")[0]?.trim() ?? "";
    const ano = labelCompleto.split("/")[1]?.slice(-2) ?? "";
    const mapa: Record<string, string> = {
      Janeiro: "Jan", Fevereiro: "Fev", Março: "Mar", Abril: "Abr",
      Maio: "Mai", Junho: "Jun", Julho: "Jul", Agosto: "Ago",
      Setembro: "Set", Outubro: "Out", Novembro: "Nov", Dezembro: "Dez",
    };
    return `${mapa[parte] ?? parte.slice(0, 3)}/${ano}`;
  }
  const [ano, m] = chave.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = parseInt(m ?? "1", 10) - 1;
  return `${nomes[idx] ?? m}/${ano?.slice(-2) ?? ""}`;
}

type SeriePonto = {
  mes: string;
  label: string;
  labelCurto: string;
  ano: number;
  Total: number;
  Resolvidos: number;
  "Em atendimento": number;
  taxaResolucao: number;
};

function GraficoSerieHistoricaTech({
  stats,
  aberto,
  setAberto,
}: {
  stats: Database["public"]["Tables"]["ticket_public_stats"]["Row"][];
  aberto: boolean;
  setAberto: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const mesesCompletos = useMemo(() => {
    const mapa = new Map<string, SeriePonto>();
    for (const m of MESES_DISPONIVEIS) {
      mapa.set(m.key, {
        mes: m.key,
        label: m.label.replace("/2026", "").trim(),
        labelCurto: formatarMesCurto(m.key, m.label),
        ano: m.ano,
        Total: 0,
        Resolvidos: 0,
        "Em atendimento": 0,
        taxaResolucao: 0,
      });
    }
    for (const r of stats) {
      if (!mapa.has(r.mes)) {
        const partes = r.mes.split("-");
        const ano = parseInt(partes[0] ?? "2026", 10);
        mapa.set(r.mes, {
          mes: r.mes,
          label: r.mes,
          labelCurto: formatarMesCurto(r.mes),
          ano,
          Total: 0,
          Resolvidos: 0,
          "Em atendimento": 0,
          taxaResolucao: 0,
        });
      }
      const cur = mapa.get(r.mes)!;
      cur.Total += r.total;
      if (r.status === "Resolvido") cur.Resolvidos += r.total;
      else if (!["Resolvido", "Cancelado"].includes(r.status)) cur["Em atendimento"] += r.total;
    }
    const ordenados = [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
    for (const p of ordenados) {
      p.taxaResolucao = p.Total > 0 ? Math.round((p.Resolvidos / p.Total) * 100) : 0;
    }
    return ordenados.length > 0
      ? ordenados
      : [{ mes: "2026-09", label: "Setembro", labelCurto: "Set/26", ano: 2026, Total: 0, Resolvidos: 0, "Em atendimento": 0, taxaResolucao: 0 }];
  }, [stats]);

  const [presetAtivo, setPresetAtivo] = useState<"todos" | "3m" | "6m" | "custom">("todos");
  const [indiceInicio, setIndiceInicio] = useState(0);
  const [indiceFim, setIndiceFim] = useState(() => Math.max(0, mesesCompletos.length - 1));
  const [visivel, setVisivel] = useState<{ Total: boolean; Resolvidos: boolean; "Em atendimento": boolean }>({
    Total: true,
    Resolvidos: true,
    "Em atendimento": true,
  });

  useEffect(() => {
    if (presetAtivo === "todos") {
      setIndiceInicio(0);
      setIndiceFim(Math.max(0, mesesCompletos.length - 1));
    }
  }, [mesesCompletos.length, presetAtivo]);

  const aplicarPreset = (preset: "todos" | "3m" | "6m") => {
    setPresetAtivo(preset);
    const total = mesesCompletos.length;
    if (preset === "todos") {
      setIndiceInicio(0);
      setIndiceFim(Math.max(0, total - 1));
    } else if (preset === "3m") {
      setIndiceInicio(Math.max(0, total - 3));
      setIndiceFim(Math.max(0, total - 1));
    } else if (preset === "6m") {
      setIndiceInicio(Math.max(0, total - 6));
      setIndiceFim(Math.max(0, total - 1));
    }
  };

  const focarMes = (idx: number) => {
    if (indiceInicio === idx && indiceFim === idx) {
      aplicarPreset("todos");
    } else {
      setPresetAtivo("custom");
      setIndiceInicio(idx);
      setIndiceFim(idx);
    }
  };

  const alterarInicio = (novoInicio: number) => {
    setPresetAtivo("custom");
    const clamped = Math.min(novoInicio, indiceFim);
    setIndiceInicio(clamped);
  };

  const alterarFim = (novoFim: number) => {
    setPresetAtivo("custom");
    const clamped = Math.max(novoFim, indiceInicio);
    setIndiceFim(clamped);
  };

  const toggleSerie = (chave: keyof typeof visivel) => {
    const ativas = Object.values(visivel).filter(Boolean).length;
    if (visivel[chave] && ativas <= 1) return;
    setVisivel((prev) => ({ ...prev, [chave]: !prev[chave] }));
  };

  const mesesFiltrados = useMemo(() => {
    const slice = mesesCompletos.slice(indiceInicio, indiceFim + 1);
    return slice.length > 0 ? slice : mesesCompletos;
  }, [mesesCompletos, indiceInicio, indiceFim]);

  const totalPeriodo = useMemo(() => mesesFiltrados.reduce((s, m) => s + m.Total, 0), [mesesFiltrados]);
  const resolvidosPeriodo = useMemo(() => mesesFiltrados.reduce((s, m) => s + m.Resolvidos, 0), [mesesFiltrados]);
  const taxaResolucaoGeral = totalPeriodo > 0 ? Math.round((resolvidosPeriodo / totalPeriodo) * 100) : 0;
  const mediaMensal = mesesFiltrados.length > 0 ? Math.round(totalPeriodo / mesesFiltrados.length) : 0;

  const seriesConfig = [
    { key: "Total" as const, cor: "#1a73e8", label: "Total de Chamados" },
    { key: "Resolvidos" as const, cor: "#34a853", label: "Resolvidos" },
    { key: "Em atendimento" as const, cor: "#f9ab00", label: "Em Atendimento" },
  ];

  const TechTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const ponto = payload[0]?.payload as SeriePonto | undefined;
    const taxa = ponto?.taxaResolucao ?? 0;

    return (
      <div className="rounded-xl border-2 border-g-blue/40 bg-card/95 p-3.5 shadow-xl backdrop-blur-md text-foreground min-w-52 animate-in fade-in zoom-in-95 pointer-events-none">
        <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2">
          <div className="flex items-center gap-1.5 text-g-blue font-extrabold text-sm">
            <Calendar className="size-4 text-g-blue" />
            <span>{label}</span>
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
                {p.name}:
              </span>
              <span className="font-mono font-bold text-foreground text-sm">{p.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Taxa de Resolução:</span>
          <span className={`font-mono font-extrabold ${taxa >= 70 ? "text-g-green" : taxa >= 40 ? "text-g-yellow" : "text-g-red"}`}>
            {taxa}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <section id="secao-serie-historica" className="rounded-xl border-2 border-g-blue/60 bg-card shadow-sm transition-all overflow-hidden scroll-mt-24">
      {/* Cabeçalho do Accordion (Abrir / Recolher) */}
      <div
        role="button"
        tabIndex={0}
        className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer select-none transition-colors hover:bg-muted/30"
        onClick={() => setAberto(!aberto)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto(!aberto);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-g-blue/10 text-g-blue">
            <Activity className="size-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Série Histórica de Chamados
          </h2>
        </div>

        <Button
          size="sm"
          variant="google-blue"
          onClick={(e) => {
            e.stopPropagation();
            setAberto(!aberto);
          }}
        >
          {aberto ? (
            <>
              <ChevronUp className="size-4 mr-1.5" />
              Recolher painel
            </>
          ) : (
            <>
              <ChevronDown className="size-4 mr-1.5" />
              Clicar para abrir
            </>
          )}
        </Button>
      </div>

      {/* Conteúdo Expansível do Gráfico */}
      {aberto && (
        <div className="border-t-2 border-g-blue/20 p-5 space-y-4 animate-in fade-in duration-200">
          {/* Controles de Período e Faixa */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">Período:</span>
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
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => aplicarPreset("todos")}
                  title="Restaurar visualização completa"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Redefinir
                </Button>
              )}
            </div>

            {/* Controles de De / Até */}
            <div className="flex items-center gap-2 text-xs">
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

          {/* Linha do tempo de meses */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${estaNoRange ? "bg-g-blue text-white" : "bg-muted text-muted-foreground"}`}>
                      {m.Total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfico e Métricas */}
          <div className="chart-enter flex flex-col xl:flex-row items-stretch justify-center gap-6 w-full pt-1">
            <div className="h-[320px] sm:h-[360px] w-full min-h-[320px] sm:min-h-[360px] xl:flex-1 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 300 : 360}>
                <ComposedChart
                  data={mesesFiltrados}
                  margin={
                    isMobile
                      ? { left: -15, right: 10, top: 15, bottom: 10 }
                      : { left: 10, right: 30, top: 15, bottom: 10 }
                  }
                >
                  <defs>
                    <linearGradient id="g-area-blue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="g-area-green" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34a853" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34a853" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="g-area-yellow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f9ab00" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f9ab00" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="labelCurto" tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                  <Tooltip content={<TechTooltip />} />

                  {visivel.Total && (
                    <Area
                      type="monotone"
                      dataKey="Total"
                      fill="url(#g-area-blue)"
                      stroke="none"
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={prefersReducedMotion ? 0 : 650}
                    />
                  )}
                  {visivel.Resolvidos && (
                    <Area
                      type="monotone"
                      dataKey="Resolvidos"
                      fill="url(#g-area-green)"
                      stroke="none"
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={prefersReducedMotion ? 0 : 650}
                    />
                  )}
                  {visivel["Em atendimento"] && (
                    <Area
                      type="monotone"
                      dataKey="Em atendimento"
                      fill="url(#g-area-yellow)"
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

            {/* Painel lateral de séries e telemetria */}
            <aside
              aria-label="Métricas da Série Histórica"
              className="w-full xl:w-80 rounded-xl border-2 border-border/80 bg-card p-4 shadow-sm flex flex-col justify-between space-y-4 shrink-0"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-g-blue">
                    Séries
                  </span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    {totalPeriodo} chamados
                  </span>
                </div>

                <div className="space-y-2">
                  {seriesConfig.map((s) => {
                    const ativa = visivel[s.key];
                    const soma = mesesFiltrados.reduce((sum, m) => sum + (m[s.key] || 0), 0);
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
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: s.cor }}
                          />
                          <span className="truncate">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-foreground">{soma}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ativa ? "bg-g-blue text-white" : "bg-muted text-muted-foreground"}`}>
                            {ativa ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Taxa de Resolução</span>
                  <span className="font-mono font-black text-g-green">{taxaResolucaoGeral}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-g-green transition-all duration-500"
                    style={{ width: `${taxaResolucaoGeral}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span>Média mensal:</span>
                  <span className="font-mono font-bold text-foreground">{mediaMensal} chamados/mês</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

function Grafico({ dados, tipo, cor }: { dados: Item[]; tipo: TipoGrafico; cor: (name: string, i: number) => string }) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  if (!dados.length) {
    return (
      <div className="py-24 text-center space-y-2">
        <p className="text-base font-semibold text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>
        <p className="text-xs text-muted-foreground/80">Tente selecionar outro mês ou alterar os filtros acima.</p>
      </div>
    );
  }
  const totalVal = dados.reduce((sum, d) => sum + d.value, 0);

  // Cálculo da Curva ABC (Pareto)
  const dadosAbc = useMemo(() => {
    if (!dados.length) return [];
    const ordenados = [...dados].sort((a, b) => b.value - a.value);
    const total = ordenados.reduce((sum, d) => sum + d.value, 0);
    let acumulado = 0;

    return ordenados.map((item, idx) => {
      acumulado += item.value;
      const pctAcumulado = total > 0 ? Number(((acumulado / total) * 100).toFixed(1)) : 0;
      const pctIndividual = total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0;

      // Classificação Pareto:
      // Classe A: até 80% do volume acumulado (ou item inicial de maior volume)
      // Classe B: entre 80% e 95% do volume acumulado
      // Classe C: acima de 95% (cauda longa)
      let classe: "A" | "B" | "C" = "C";
      let corClasse = "#ea4335"; // Vermelho Google (C)

      if (idx === 0 || pctAcumulado - pctIndividual < 80) {
        classe = "A";
        corClasse = "#34a853"; // Verde Google (A)
      } else if (pctAcumulado - pctIndividual < 95) {
        classe = "B";
        corClasse = "#f9ab00"; // Amarelo Google (B)
      }

      return {
        ...item,
        acumulado,
        pctAcumulado,
        pctIndividual,
        classe,
        corClasse,
      };
    });
  }, [dados]);

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
          <span className="text-2xl font-black" style={{ color: corItem }}>{val}</span>
          <span className="text-xs font-semibold text-muted-foreground">chamados</span>
          <span className="ml-auto rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-xs" style={{ backgroundColor: corItem }}>
            {pct}%
          </span>
        </div>
      </div>
    );
  };

  const AbcCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="rounded-xl border-2 border-border/80 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 pointer-events-none min-w-56 text-foreground">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/60">
          <span className="font-bold text-sm truncate max-w-44" title={item.name}>{item.name}</span>
          <span
            className="rounded px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs"
            style={{ backgroundColor: item.corClasse }}
          >
            Classe {item.classe}
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Quantidade:</span>
            <span className="font-mono font-bold text-sm">{item.value} chamados</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Proporção individual:</span>
            <span className="font-mono font-bold">{item.pctIndividual}%</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-muted-foreground font-semibold">% Acumulado:</span>
            <span className="font-mono font-black text-g-blue">{item.pctAcumulado}%</span>
          </div>
        </div>
      </div>
    );
  };

  const chart =
    tipo === "pizza" ? (
      <PieChart>
        <Pie
          data={dados}
          dataKey="value"
          nameKey="name"
          innerRadius={isMobile ? "32%" : "38%"}
          outerRadius={isMobile ? "72%" : "78%"}
          paddingAngle={3}
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
        >
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} stroke="var(--card)" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    ) : tipo === "barras" ? (
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
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} />)}
        </Bar>
      </BarChart>
    ) : tipo === "abc" ? (
      <ComposedChart
        data={dadosAbc}
        margin={
          isMobile
            ? { left: -15, right: 10, top: 15, bottom: 25 }
            : { left: 10, right: 20, top: 15, bottom: 20 }
        }
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--foreground)", fontSize: isMobile ? 9 : 11 }}
          interval={0}
          tickFormatter={
            isMobile
              ? (name: string) => (name.length > 8 ? `${name.slice(0, 7)}…` : name)
              : (name: string) => (name.length > 15 ? `${name.slice(0, 14)}…` : name)
          }
        />
        <YAxis
          yAxisId="qtd"
          allowDecimals={false}
          tick={{ fill: "var(--foreground)", fontSize: 11 }}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          domain={[0, 100]}
          unit="%"
          tick={{ fill: "var(--foreground)", fontSize: 11 }}
        />
        <Tooltip content={<AbcCustomTooltip />} />
        <Bar
          yAxisId="qtd"
          dataKey="value"
          name="Quantidade"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
        >
          {dadosAbc.map((entry, index) => (
            <Cell key={`cell-abc-${index}`} fill={entry.corClasse} />
          ))}
        </Bar>
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="pctAcumulado"
          name="% Acumulado"
          stroke="#1a73e8"
          strokeWidth={3}
          dot={{ r: 4.5, fill: "#1a73e8", stroke: "#ffffff", strokeWidth: 2 }}
          activeDot={{ r: 7.5, stroke: "#1a73e8", strokeWidth: 2.5, fill: "#ffffff" }}
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
        />
      </ComposedChart>
    ) : (
      <LineChart
        data={dados}
        margin={
          isMobile
            ? { left: 0, right: 12, top: 20, bottom: 10 }
            : { left: 10, right: 20, top: 20, bottom: 10 }
        }
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--foreground)", fontSize: isMobile ? 9 : 11 }}
          interval={0}
          tickFormatter={
            isMobile
              ? (name: string) => (name.length > 9 ? `${name.slice(0, 8)}…` : name)
              : undefined
          }
        />
        <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          name="Chamados"
          stroke="#1a73e8"
          strokeWidth={3}
          dot={{ r: 5, fill: "#1a73e8", strokeWidth: 2, stroke: "#ffffff" }}
          activeDot={{ r: 8, stroke: "#1a73e8", strokeWidth: 2, fill: "#ffffff" }}
          isAnimationActive={!prefersReducedMotion}
          animationDuration={prefersReducedMotion ? 0 : 650}
        />
      </LineChart>
    );

  return (
    <div className="chart-enter flex flex-col xl:flex-row items-center justify-center gap-6 w-full py-2">
      <div className="h-[340px] sm:h-[390px] w-full min-h-[340px] sm:min-h-[390px] xl:flex-1 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 320 : 390}>{chart}</ResponsiveContainer>
      </div>

      {/* Legendas posicionadas no lado direito de todos os gráficos */}
      {tipo === "abc" ? (
        <aside
          aria-label="Legendas da Curva ABC (Pareto)"
          className="w-full xl:w-80 max-h-[360px] xl:max-h-[400px] overflow-y-auto rounded-2xl border-2 border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs flex flex-col space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-g-blue">Classificação ABC (Pareto)</span>
            <span className="text-xs font-mono font-bold text-muted-foreground">{totalVal} total</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-xl border border-g-green/30 bg-g-green/10 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-bold text-g-green">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-g-green" /> Classe A (Até 80%)
                </span>
                <span>{dadosAbc.filter(d => d.classe === "A").reduce((s, x) => s + x.value, 0)} ({dadosAbc.filter(d => d.classe === "A").length})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Maior impacto e concentração de atendimentos.</p>
            </div>

            <div className="rounded-xl border border-g-yellow/40 bg-g-yellow/10 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-g-yellow" /> Classe B (80% a 95%)
                </span>
                <span>{dadosAbc.filter(d => d.classe === "B").reduce((s, x) => s + x.value, 0)} ({dadosAbc.filter(d => d.classe === "B").length})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Volume intermediário de demandas.</p>
            </div>

            <div className="rounded-xl border border-g-red/30 bg-g-red/10 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-bold text-g-red">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-g-red" /> Classe C (Acima de 95%)
                </span>
                <span>{dadosAbc.filter(d => d.classe === "C").reduce((s, x) => s + x.value, 0)} ({dadosAbc.filter(d => d.classe === "C").length})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Cauda longa: problemas pontuais ou menos frequentes.</p>
            </div>
          </div>

          <div className="border-t border-border/70 pt-2 space-y-1.5 overflow-y-auto pr-1">
            {dadosAbc.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white shrink-0" style={{ backgroundColor: d.corClasse }}>
                    {d.classe}
                  </span>
                  <span className="font-semibold text-foreground truncate" title={d.name}>{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-foreground">{d.value}</span>
                  <span className="text-muted-foreground">({d.pctAcumulado}%)</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      ) : (
        <aside
          aria-label="Legendas do gráfico"
          className="w-full xl:w-72 max-h-[260px] xl:max-h-[390px] overflow-y-auto rounded-2xl border-2 border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs flex flex-col space-y-2 shrink-0"
        >
          <div className="flex items-center justify-end border-b border-border/70 pb-2 px-1">
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {dados.reduce((s, x) => s + x.value, 0)} chamados
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
      )}
    </div>
  );
}