import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Calendar, ClipboardList, FileSpreadsheet, FileText, LineChart as LineChartIcon, PieChartIcon, Printer, RotateCcw, Sparkles, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularSla } from "@/lib/sla";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Ticket } from "@/lib/types";
import { useEffect } from "react";
import { MESES_DISPONIVEIS } from "@/lib/types";

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
type TipoGrafico = "pizza" | "barras" | "linhas";
type Item = { name: string; value: number };

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

  return (
    <div className="space-y-7 dashboard-print">
      <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex-1 text-center">
        <p className="text-sm font-extrabold uppercase tracking-wider text-g-blue">Indicadores públicos</p>
        <h1 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">Dashboard de chamados</h1>
        <p className="mt-1 font-medium text-muted-foreground">Acompanhamento atualizado dos chamados registrados.</p>
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

    <section className="no-print rounded-xl border-2 border-g-blue/60 bg-card px-4 py-2.5 shadow-sm">
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
        <Button asChild size="sm" className="ml-auto" variant="google-blue">
          <Link to="/dashboard/acompanhamento">
            <ClipboardList className="size-3.5" /> Acompanhar chamado
          </Link>
        </Button>
      </div>
    </section>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ["Total de chamados", total, "border-g-blue", "text-g-blue"],
          ["Em atendimento", ativos, "border-g-yellow", "text-g-yellow"],
          ["Resolvidos", resolvidos, "border-g-green", "text-g-green"],
        ].map(([label, count, border, color]) => (
          <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card p-5 shadow-sm`}>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-black tracking-tight ${color}`}>{count}</p>
          </div>
        ))}
      </div>

      {/* Gráfico Principal: Série Histórica Dinâmica com UI Tech, Neon Glow e Filtros Acoplados */}
      <GraficoSerieHistoricaTech stats={publicStats} />

      {/* Seção Categórica e Distribuição */}
      <div className="border-t-2 border-border/80 pt-6">
        <div className="mb-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-g-blue">Análise Categórica</p>
          <h2 className="text-xl font-bold text-foreground">Distribuição & Recortes Específicos</h2>
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
        <section className="min-w-0 border-t-2 border-border pt-5 mt-4" aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{VISOES.find((v) => v.id === visao)?.label}</h2>
              <p className="text-sm font-medium text-muted-foreground">{dados.reduce((n, x) => n + x.value, 0)} chamado(s) representados</p>
            </div>
            <div className="no-print flex flex-wrap gap-2" aria-label="Tipo de gráfico">
              <Button size="sm" variant={tipoGrafico === "pizza" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("pizza")}><PieChartIcon className="size-4" /> Pizza</Button>
              <Button size="sm" variant={tipoGrafico === "barras" ? "google-red" : "outline"} onClick={() => setTipoGrafico("barras")}><BarChart3 className="size-4" /> Barras</Button>
              <Button size="sm" variant={tipoGrafico === "linhas" ? "google-yellow" : "outline"} onClick={() => setTipoGrafico("linhas")}><LineChartIcon className="size-4" /> Linhas</Button>
            </div>
          </div>
          <Grafico key={`${visao}-${tipoGrafico}`} dados={dados} tipo={tipoGrafico} cor={cor} />
        </section>
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

function GraficoSerieHistoricaTech({ stats }: { stats: Database["public"]["Tables"]["ticket_public_stats"]["Row"][] }) {
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
    if (visivel[chave] && ativas <= 1) return; // Mantém ao menos 1 ativa
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
    { key: "Total" as const, cor: "#00e5ff", gradiente: "url(#cyber-area-cyan)", label: "Total de Chamados" },
    { key: "Resolvidos" as const, cor: "#10b981", gradiente: "url(#cyber-area-emerald)", label: "Resolvidos" },
    { key: "Em atendimento" as const, cor: "#f59e0b", gradiente: "url(#cyber-area-amber)", label: "Em Atendimento" },
  ];

  const TechTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const ponto = payload[0]?.payload as SeriePonto | undefined;
    const taxa = ponto?.taxaResolucao ?? 0;

    return (
      <div className="rounded-2xl border-2 border-cyan-500/50 bg-slate-950/95 p-4 shadow-[0_0_25px_rgba(0,229,255,0.3)] backdrop-blur-xl text-slate-100 min-w-56 animate-in fade-in zoom-in-95 pointer-events-none">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-sm">
            <Calendar className="size-4 text-cyan-400" />
            <span>{label}</span>
          </div>
          <span className="rounded-md bg-cyan-950/80 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/40">
            HUD Telemetria
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <span className="size-2.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: p.stroke || p.color, color: p.stroke || p.color }} />
                {p.name}:
              </span>
              <span className="font-mono font-black text-white text-sm">{p.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Eficácia de Resolução:</span>
          <span className={`font-mono font-extrabold ${taxa >= 70 ? "text-emerald-400" : taxa >= 40 ? "text-amber-400" : "text-rose-400"}`}>
            {taxa}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${taxa}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="relative rounded-2xl border-2 border-cyan-500/30 bg-card/90 p-5 shadow-xl backdrop-blur-md overflow-hidden transition-all">
      {/* Luzes neon sutis de fundo */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Barra de controle e cabeçalho acoplados ao gráfico */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500 ring-2 ring-cyan-500/30 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Série Histórica de Chamados</h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="size-3" /> Telemetria HUD
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Evolução temporal, fluxo de resolução e tendências com navegação dinâmica.
              </p>
            </div>
          </div>

          {/* Botões de seleção de período (Presets acoplados) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">Período:</span>
            <Button
              size="sm"
              variant={presetAtivo === "todos" ? "google-blue" : "outline"}
              className={presetAtivo === "todos" ? "shadow-[0_0_12px_rgba(26,115,232,0.4)]" : ""}
              onClick={() => aplicarPreset("todos")}
            >
              Todos ({mesesCompletos.length}M)
            </Button>
            {mesesCompletos.length >= 3 && (
              <Button
                size="sm"
                variant={presetAtivo === "3m" ? "google-blue" : "outline"}
                className={presetAtivo === "3m" ? "shadow-[0_0_12px_rgba(26,115,232,0.4)]" : ""}
                onClick={() => aplicarPreset("3m")}
              >
                Últimos 3M
              </Button>
            )}
            {mesesCompletos.length >= 6 && (
              <Button
                size="sm"
                variant={presetAtivo === "6m" ? "google-blue" : "outline"}
                className={presetAtivo === "6m" ? "shadow-[0_0_12px_rgba(26,115,232,0.4)]" : ""}
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
        </div>

        {/* Linha do Tempo Dinâmica & Controles de Início/Fim Acoplados */}
        <div className="rounded-xl border border-cyan-500/25 bg-muted/30 p-3 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Chips de navegação mês a mês */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
                <Calendar className="size-3.5 text-cyan-500" /> Linha do Tempo:
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
                        ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(0,229,255,0.25)] font-bold"
                        : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/70 hover:border-cyan-500/40"
                    }`}
                    title={`Clique para focar ou alternar ${m.label}`}
                  >
                    <span>{m.labelCurto}</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${estaNoRange ? "bg-cyan-600 dark:bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {m.Total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Controles de faixa (De / Até) */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold">De:</span>
                <select
                  className="h-8 rounded-lg border border-cyan-500/40 bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  className="h-8 rounded-lg border border-cyan-500/40 bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
        </div>
      </div>

      {/* Layout Principal do Gráfico Tech com Legendas e Telemetria no lado Direito */}
      <div className="chart-enter flex flex-col xl:flex-row items-stretch justify-center gap-6 w-full pt-1">
        <div className="h-[360px] w-full flex-1 min-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mesesFiltrados} margin={{ left: 10, right: 30, top: 15, bottom: 10 }}>
              <defs>
                {/* Filtro Neon Glow Cyan */}
                <filter id="neon-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur1" />
                  <feGaussianBlur stdDeviation="6" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Filtro Neon Glow Emerald */}
                <filter id="neon-glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur1" />
                  <feGaussianBlur stdDeviation="6" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Filtro Neon Glow Amber */}
                <filter id="neon-glow-amber" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur1" />
                  <feGaussianBlur stdDeviation="6" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Gradientes holográficos para preenchimento volumétrico */}
                <linearGradient id="cyber-area-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cyber-area-emerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cyber-area-amber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="labelCurto" tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 700 }} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
              <Tooltip content={<TechTooltip />} />

              {/* Áreas volumétricas sutis sob as linhas */}
              {visivel.Total && (
                <Area type="monotone" dataKey="Total" fill="url(#cyber-area-cyan)" stroke="none" isAnimationActive />
              )}
              {visivel.Resolvidos && (
                <Area type="monotone" dataKey="Resolvidos" fill="url(#cyber-area-emerald)" stroke="none" isAnimationActive />
              )}
              {visivel["Em atendimento"] && (
                <Area type="monotone" dataKey="Em atendimento" fill="url(#cyber-area-amber)" stroke="none" isAnimationActive />
              )}

              {/* Linhas principais com efeito neon glow e alta interatividade */}
              {visivel.Total && (
                <Line
                  type="monotone"
                  dataKey="Total"
                  name="Total de Chamados"
                  stroke="#00e5ff"
                  strokeWidth={3.5}
                  filter="url(#neon-glow-cyan)"
                  dot={{ r: 5, fill: "#00e5ff", stroke: "#0b1329", strokeWidth: 2 }}
                  activeDot={{ r: 8, stroke: "#00e5ff", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive
                  animationDuration={650}
                />
              )}
              {visivel.Resolvidos && (
                <Line
                  type="monotone"
                  dataKey="Resolvidos"
                  name="Resolvidos"
                  stroke="#10b981"
                  strokeWidth={3}
                  filter="url(#neon-glow-emerald)"
                  dot={{ r: 4.5, fill: "#10b981", stroke: "#0b1329", strokeWidth: 2 }}
                  activeDot={{ r: 7.5, stroke: "#10b981", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive
                  animationDuration={650}
                />
              )}
              {visivel["Em atendimento"] && (
                <Line
                  type="monotone"
                  dataKey="Em atendimento"
                  name="Em Atendimento"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  filter="url(#neon-glow-amber)"
                  dot={{ r: 4.5, fill: "#f59e0b", stroke: "#0b1329", strokeWidth: 2 }}
                  activeDot={{ r: 7.5, stroke: "#f59e0b", strokeWidth: 3, fill: "#ffffff" }}
                  isAnimationActive
                  animationDuration={650}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legendas posicionadas no lado direito (com toggles interativos e telemetria) */}
        <aside
          aria-label="Legendas e Telemetria da Série Histórica"
          className="w-full xl:w-80 rounded-2xl border-2 border-cyan-500/30 bg-card/95 p-4 shadow-sm backdrop-blur-md flex flex-col justify-between space-y-4 shrink-0"
        >
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Séries & Filtros
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-muted-foreground">
                {totalPeriodo} chamados
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mb-2">Clique para ativar ou ocultar métricas:</p>

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
                        ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_10px_rgba(0,229,255,0.1)] font-bold text-foreground"
                        : "border-border/50 bg-muted/40 opacity-55 hover:opacity-85 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-3 rounded-full shrink-0 shadow-sm"
                        style={{
                          backgroundColor: s.cor,
                          boxShadow: ativa ? `0 0 8px ${s.cor}` : "none",
                        }}
                      />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-foreground">{soma}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ativa ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300" : "bg-muted text-muted-foreground"}`}>
                        {ativa ? "ON" : "OFF"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetria do Período */}
          <div className="rounded-xl border border-cyan-500/20 bg-muted/40 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Taxa de Resolução</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{taxaResolucaoGeral}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-500 transition-all duration-500"
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
    </section>
  );
}

function Grafico({ dados, tipo, cor }: { dados: Item[]; tipo: TipoGrafico; cor: (name: string, i: number) => string }) {
  if (!dados.length) return <p className="py-24 text-center text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>;
  const totalVal = dados.reduce((sum, d) => sum + d.value, 0);

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

  const chart =
    tipo === "pizza" ? (
      <PieChart>
        <Pie
          data={dados}
          dataKey="value"
          nameKey="name"
          innerRadius="38%"
          outerRadius="78%"
          paddingAngle={3}
          isAnimationActive
          animationDuration={650}
        >
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} stroke="var(--card)" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    ) : tipo === "barras" ? (
      <BarChart data={dados} layout="vertical" margin={{ left: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis dataKey="name" type="category" width={160} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          name="Chamados"
          isAnimationActive
          animationDuration={650}
          radius={[0, 4, 4, 0]}
        >
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} />)}
        </Bar>
      </BarChart>
    ) : (
      <LineChart data={dados} margin={{ left: 10, right: 20, top: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
        <XAxis dataKey="name" tick={{ fill: "var(--foreground)", fontSize: 11 }} interval={0} />
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
          isAnimationActive
          animationDuration={650}
        />
      </LineChart>
    );

  return (
    <div className="chart-enter flex flex-col xl:flex-row items-center justify-center gap-6 w-full py-2">
      <div className="h-[390px] w-full flex-1 min-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>

      {/* Legendas posicionadas no lado direito de todos os gráficos */}
      <aside
        aria-label="Legendas do gráfico"
        className="w-full xl:w-72 max-h-[390px] overflow-y-auto rounded-2xl border-2 border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs flex flex-col space-y-2 shrink-0"
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-g-blue">
            Legendas (Direita)
          </span>
          <span className="text-[11px] font-bold text-muted-foreground">
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
    </div>
  );
}