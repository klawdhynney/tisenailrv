import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Calendar,
  FileSpreadsheet,
  FileText,
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
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import { useLoading } from "@/lib/loading-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const Route = createFileRoute("/dashboard/serie-historica")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mes: typeof search.mes === "string" ? search.mes : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Série Histórica | Dashboard | TI SENAI LRV" },
      {
        name: "description",
        content: "Evolução temporal e série histórica mês a mês dos atendimentos de TI SENAI LRV.",
      },
      { name: "robots", content: "noindex, nofollow" },
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
  const { wrapAsync, isLoading } = useLoading();
  const isMobile = useIsMobile();
  const search = Route.useSearch();
  const mesQuery = search?.mes;

  const mesesCompletos = useMemo<MesCompleto[]>(() => {
    const mapa = new Map<string, MesCompleto>();
    for (const r of publicStats || []) {
      if (!r?.mes) continue;
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
    setIndiceInicio(0);
    setIndiceFim(mesesCompletos.length - 1);
    setPresetAtivo("todos");
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

  const [visivel, setVisivel] = useState<{
    Total: boolean;
    Resolvidos: boolean;
    "Em atendimento": boolean;
  }>({
    Total: true,
    Resolvidos: true,
    "Em atendimento": true,
  });

  const toggleSerie = (key: keyof typeof visivel) => {
    setVisivel((prev) => {
      const ativas = Object.values(prev).filter(Boolean).length;
      if (prev[key] && ativas === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const mesesFiltrados = useMemo(() => {
    if (mesesCompletos.length === 0) return [];
    const inicio = Math.min(indiceInicio, indiceFim);
    const fim = Math.max(indiceInicio, indiceFim);
    return mesesCompletos.slice(inicio, fim + 1);
  }, [mesesCompletos, indiceInicio, indiceFim]);

  const totalPeriodo = useMemo(
    () => mesesFiltrados.reduce((acc, m) => acc + m.Total, 0),
    [mesesFiltrados]
  );
  const totalResolvidos = useMemo(
    () => mesesFiltrados.reduce((acc, m) => acc + m.Resolvidos, 0),
    [mesesFiltrados]
  );
  const totalEmAtendimento = useMemo(
    () => mesesFiltrados.reduce((acc, m) => acc + m["Em atendimento"], 0),
    [mesesFiltrados]
  );
  const taxaFinalizacao = totalPeriodo > 0 ? ((totalResolvidos / totalPeriodo) * 100).toFixed(1) : "0.0";
  const mediaMensal = mesesFiltrados.length > 0 ? Math.round(totalPeriodo / mesesFiltrados.length) : 0;
  const mesPico = useMemo(() => {
    if (mesesFiltrados.length === 0) return null;
    return [...mesesFiltrados].sort((a, b) => b.Total - a.Total)[0];
  }, [mesesFiltrados]);

  const seriesConfig = [
    { key: "Total" as const, label: "Total de Chamados", cor: "#1a73e8" },
    { key: "Resolvidos" as const, label: "Finalizados", cor: "#34a853" },
    { key: "Em atendimento" as const, label: "Em Atendimento", cor: "#f9ab00" },
  ];

  const exportarExcel = async () => {
    await wrapAsync(async () => {
      const { exportarXlsx } = await import("@/lib/exportar");
      const dadosExport = mesesFiltrados.map((m) => {
        const taxa = m.Total > 0 ? `${((m.Resolvidos / m.Total) * 100).toFixed(1)}%` : "0%";
        return {
          "Mês / Ano": m.labelLongo,
          "Total de Chamados": m.Total,
          "Resolvidos": m.Resolvidos,
          "Em Atendimento": m["Em atendimento"],
          "Taxa de Resolução": taxa,
        };
      });
      await exportarXlsx(dadosExport, "serie-historica-chamados.xlsx");
    });
  };

  const exportarPdf = async () => {
    await wrapAsync(async () => {
      const { exportarPdf } = await import("@/lib/exportar");
      const rows = mesesFiltrados.map((m) => {
        const taxa = m.Total > 0 ? `${((m.Resolvidos / m.Total) * 100).toFixed(1)}%` : "0%";
        return {
          "Mês": m.labelCurto,
          "Total": m.Total,
          "Resolvidos": m.Resolvidos,
          "Em Atendimento": m["Em atendimento"],
          "Taxa Resolução": taxa,
        };
      });
      await exportarPdf(rows, "serie-historica-chamados", "TI SENAI LRV · Série Histórica de Chamados");
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/dashboard" search={{ mes: mesQuery !== "todos" ? mesQuery : undefined }}>
                <ArrowLeft className="size-3.5 mr-1" /> Voltar ao Dashboard
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-400 dark:border-purple-700 font-bold">
              Evolução Temporal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Activity className="size-6 sm:size-7" />
            </span>
            <span>Série Histórica</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acompanhe o comportamento contínuo mês a mês dos atendimentos, finalizações e demandas ativas.
          </p>
        </div>

        {/* Ações de Exportação */}
        <div className="no-print flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={exportarExcel}
            disabled={isLoading || mesesFiltrados.length === 0}
            className="min-h-[40px] h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Exportar dados para Excel"
          >
            <FileSpreadsheet className="size-4 text-g-green shrink-0" />
            <span>Excel</span>
          </Button>
          <Button
            variant="outline"
            onClick={exportarPdf}
            disabled={isLoading || mesesFiltrados.length === 0}
            className="min-h-[40px] h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Exportar dados para PDF"
          >
            <FileText className="size-4 text-g-red shrink-0" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      <SectionErrorBoundary title="Indicadores da Série Histórica">
        {/* Resumo Rápido com Big Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border-2 border-g-blue/40 bg-g-blue/5 p-4 sm:p-5 space-y-1 shadow-xs">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-blue">Total Registrado</p>
            <p className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">{totalPeriodo}</p>
            <p className="text-xs text-muted-foreground">{mesesFiltrados.length} meses no recorte</p>
          </div>
          <div className="rounded-2xl border-2 border-g-green/40 bg-g-green/5 p-4 sm:p-5 space-y-1 shadow-xs">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-green">Total Finalizados</p>
            <p className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">{totalResolvidos}</p>
            <p className="text-xs text-muted-foreground">{taxaFinalizacao}% de resolução</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-4 sm:p-5 space-y-1 shadow-xs">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">Média Mensal</p>
            <p className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">{mediaMensal}</p>
            <p className="text-xs text-muted-foreground">chamados por mês</p>
          </div>
          <div className="rounded-2xl border-2 border-purple-500/40 bg-purple-500/5 p-4 sm:p-5 space-y-1 shadow-xs">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Mês de Pico</p>
            <p className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">{mesPico?.Total ?? 0}</p>
            <p className="text-xs text-muted-foreground">{mesPico?.labelCurto ?? "—"}</p>
          </div>
        </div>
      </SectionErrorBoundary>

      <SectionErrorBoundary title="Gráfico da Série Histórica">
        {/* Controles de Período e Filtros Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border-2 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-foreground">Recorte Temporal:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => aplicarPreset("3m")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                presetAtivo === "3m" && "border-purple-600 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold"
              )}
            >
              Últimos 3 meses
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => aplicarPreset("6m")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                presetAtivo === "6m" && "border-purple-600 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold"
              )}
            >
              Últimos 6 meses
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => aplicarPreset("todos")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                presetAtivo === "todos" && "border-purple-600 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold"
              )}
            >
              Todo o Histórico
            </Button>
          </div>
        </div>

        {/* Gráfico Principal ComposedChart e Painel Lateral */}
        <section className="rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 h-[380px] sm:h-[460px] w-full min-h-[350px]">
              {mesesFiltrados.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-muted-foreground">
                  <Activity className="size-10 text-muted-foreground/40 animate-pulse" />
                  <p className="text-sm font-semibold">Nenhum dado histórico registrado no momento.</p>
                  <p className="text-xs">Os registros consolidados de chamados aparecerão automaticamente aqui.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={mesesFiltrados} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="serie-blue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="serie-green" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34a853" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#34a853" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="serie-yellow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f9ab00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f9ab00" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="labelCurto"
                      tick={{ fill: "var(--foreground)", fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--foreground)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {visivel.Total && (
                      <Area type="monotone" dataKey="Total" fill="url(#serie-blue)" stroke="none" />
                    )}
                    {visivel.Resolvidos && (
                      <Area type="monotone" dataKey="Resolvidos" fill="url(#serie-green)" stroke="none" />
                    )}
                    {visivel["Em atendimento"] && (
                      <Area type="monotone" dataKey="Em atendimento" fill="url(#serie-yellow)" stroke="none" />
                    )}

                    {visivel.Total && (
                      <Line
                        type="monotone"
                        dataKey="Total"
                        name="Total de Chamados"
                        stroke="#1a73e8"
                        strokeWidth={3}
                        dot={{ r: 4.5, fill: "#1a73e8", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 7.5, stroke: "#1a73e8", strokeWidth: 3, fill: "#ffffff" }}
                      />
                    )}
                    {visivel.Resolvidos && (
                      <Line
                        type="monotone"
                        dataKey="Resolvidos"
                        name="Finalizados"
                        stroke="#34a853"
                        strokeWidth={3}
                        dot={{ r: 4.5, fill: "#34a853", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 7.5, stroke: "#34a853", strokeWidth: 3, fill: "#ffffff" }}
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
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Painel Lateral com Controle de Séries */}
            <aside className="lg:col-span-1 rounded-2xl border-2 border-border/80 bg-muted/20 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-g-blue">Séries Interativas</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{totalPeriodo} registros</span>
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
                        className={cn(
                          "w-full flex items-center justify-between gap-2.5 rounded-xl p-2.5 transition-all text-xs border text-left cursor-pointer",
                          ativa
                            ? "border-purple-500/50 bg-purple-500/10 font-bold text-foreground shadow-xs"
                            : "border-border/50 bg-muted/40 opacity-55 hover:opacity-85 text-muted-foreground"
                        )}
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

              <div className="rounded-xl border border-border/70 bg-card p-3 text-xs space-y-1.5 text-muted-foreground">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-purple-600" /> Dica de análise
                </p>
                <p className="text-[11px] leading-relaxed">
                  Clique nas séries para ocultar ou destacar tendências específicas no gráfico.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </SectionErrorBoundary>

      {/* Tabela de Fechamento Mensal */}
      <SectionErrorBoundary title="Tabela Mensal">
        <section className="rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
            <Calendar className="size-4 text-purple-600 dark:text-purple-400" /> Tabela de Fechamento Mensal
          </h2>
          <div className="w-full overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/50 font-bold text-muted-foreground">
                  <th className="p-3">Mês / Ano</th>
                  <th className="p-3 text-right">Total Registrado</th>
                  <th className="p-3 text-right">Finalizados</th>
                  <th className="p-3 text-right">Em Atendimento</th>
                  <th className="p-3 text-right">Taxa de Resolução</th>
                </tr>
              </thead>
              <tbody>
                {mesesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                      Nenhum registro para exibir.
                    </td>
                  </tr>
                ) : (
                  mesesFiltrados.map((m) => {
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </SectionErrorBoundary>
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
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill || "#888" }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
