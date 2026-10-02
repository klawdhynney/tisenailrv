import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import type { PublicStat } from "@/lib/types";

export const Route = createFileRoute("/dashboard/serie-historica")({
  head: () => ({
    meta: [
      { title: "Série histórica por chamados | TI SENAI LRV" },
      {
        name: "description",
        content:
          "Evolução temporal e série histórica dos chamados registrados no SENAI Lucas do Rio Verde.",
      },
      { property: "og:title", content: "Série histórica por chamados" },
      {
        property: "og:description",
        content: "Acompanhe a evolução e histórico mês a mês dos atendimentos de TI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaSerieHistorica,
});

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

function PaginaSerieHistorica() {
  const { publicStats } = useStore();

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
    const total = mesesCompletos.length;
    if (total === 0) return;
    setPresetAtivo(tipo);
    if (tipo === "todos") {
      setIndiceInicio(0);
      setIndiceFim(total - 1);
    } else if (tipo === "3m") {
      setIndiceInicio(Math.max(0, total - 3));
      setIndiceFim(total - 1);
    } else if (tipo === "6m") {
      setIndiceInicio(Math.max(0, total - 6));
      setIndiceFim(total - 1);
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

  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 640);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    checkViewport();
    window.addEventListener("resize", checkViewport);
    motionQuery.addEventListener("change", handleMotionChange);
    return () => {
      window.removeEventListener("resize", checkViewport);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  const totalPeriodo = mesesFiltrados.reduce((acc, m) => acc + m.Total, 0);
  const resolvidosPeriodo = mesesFiltrados.reduce((acc, m) => acc + m.Resolvidos, 0);
  const atendimentoPeriodo = mesesFiltrados.reduce((acc, m) => acc + m["Em atendimento"], 0);
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
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-g-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-g-blue border border-g-blue/20 mb-2">
            <Activity className="size-3.5" /> Análise Temporal Contínua
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Série histórica por chamados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evolução mensal dos chamados registrados, resolvidos e em andamento com filtros de período.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="font-semibold gap-2 shadow-2xs">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Voltar ao dashboard
          </Link>
        </Button>
      </div>

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
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {mesPico ? mesPico.labelLongo : "—"}
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Controles de Período */}
      <section className="rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
          {/* Presets Rápidos */}
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

          {/* Seletores De / Até */}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start pt-2">
          {/* Gráfico Principal em Tamanho Amplo (3 colunas em lg) */}
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
                  <linearGradient id="serie-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="serie-green" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34a853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34a853" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="serie-yellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f9ab00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f9ab00" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="labelCurto"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 700 }}
                />
                <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />

                {visivel.Total && (
                  <Area
                    type="monotone"
                    dataKey="Total"
                    fill="url(#serie-blue)"
                    stroke="none"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}
                {visivel.Resolvidos && (
                  <Area
                    type="monotone"
                    dataKey="Resolvidos"
                    fill="url(#serie-green)"
                    stroke="none"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={prefersReducedMotion ? 0 : 650}
                  />
                )}
                {visivel["Em atendimento"] && (
                  <Area
                    type="monotone"
                    dataKey="Em atendimento"
                    fill="url(#serie-yellow)"
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
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {totalPeriodo} chamados
                </span>
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
                        <span
                          className="size-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: s.cor }}
                        />
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
                Clique nas séries acima para ocultar ou exibir linhas individualmente. Use os botões de período para focar em trimestres ou semestres específicos.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Tabela de Dados Mensais */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="size-4 text-g-blue" /> Tabela de Fechamento Mensal
        </h2>
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

function CustomTooltip({ active, payload, label }: any) {
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
