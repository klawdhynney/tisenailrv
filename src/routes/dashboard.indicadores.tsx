import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  LayoutGrid,
  ShieldAlert,
  Star,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store-context";
import { useLoading } from "@/lib/loading-context";
import { calcularSla } from "@/lib/sla";
import { cn } from "@/lib/utils";
import {
  CORES_SLA,
  MESES_DISPONIVEIS,
  type Ticket,
  type Visao,
} from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/dashboard/indicadores")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mes: typeof search.mes === "string" ? search.mes : undefined,
    visao: typeof search.visao === "string" ? search.visao : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Indicadores Principais (KPIs) | Dashboard | TI SENAI LRV" },
      { name: "description", content: "Cartões de indicadores e métricas consolidadas de chamados." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaIndicadores,
});

interface Item {
  name: string;
  value: number;
}

const CORES = [
  "#1a73e8",
  "#34a853",
  "#fbbc04",
  "#ea4335",
  "#a142f4",
  "#24c1e0",
  "#fa7b17",
  "#f439a0",
  "#009688",
  "#673ab7",
  "#e91e63",
  "#3f51b5",
  "#00bcd4",
  "#8bc34a",
  "#cddc39",
  "#ff9800",
  "#795548",
  "#607d8b",
];

const VISOES_INDICADORES: { id: Visao; label: string }[] = [
  { id: "problemas", label: "Chamados por Categoria" },
  { id: "setores", label: "Chamados por Setores" },
  { id: "prioridades", label: "Prioridades dos Chamados" },
  { id: "status", label: "Status dos Chamados" },
  { id: "sla", label: "SLA / Prazos dos Chamados" },
];

function mesAtualPadrao() {
  const d = new Date();
  const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return MESES_DISPONIVEIS.some((m) => m.key === chave) ? chave : MESES_DISPONIVEIS[0]?.key ?? "todos";
}

function PaginaIndicadores() {
  const { publicStats, isGestor, isAdmin, regras, session, authPronto } = useStore();
  const { wrapAsync, isLoading } = useLoading();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const mesQuery = search?.mes;
  const visaoQuery = search?.visao as Visao | undefined;

  const [mes, setMes] = useState(() => {
    if (mesQuery && (mesQuery === "todos" || MESES_DISPONIVEIS.some((m) => m.key === mesQuery))) {
      return mesQuery;
    }
    return mesAtualPadrao();
  });

  const [visao, setVisao] = useState<Visao>(() => {
    if (visaoQuery && VISOES_INDICADORES.some((v) => v.id === visaoQuery)) {
      return visaoQuery;
    }
    return "problemas";
  });

  const [filtroAberto, setFiltroAberto] = useState(false);
  const [now] = useState(() => new Date());
  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);

  // Proteção de rota
  useEffect(() => {
    if (!authPronto) return;
    if (!isGestor && !isAdmin) {
      if (!session) {
        navigate({
          to: "/auth",
          search: { redirectTo: "/dashboard/indicadores" },
          replace: true,
        });
      } else {
        navigate({
          to: "/dashboard/acompanhamento",
          replace: true,
        });
      }
    }
  }, [authPronto, isGestor, isAdmin, session, navigate]);

  useEffect(() => {
    if (mesQuery && (mesQuery === "todos" || MESES_DISPONIVEIS.some((m) => m.key === mesQuery))) {
      setMes(mesQuery);
    }
  }, [mesQuery]);

  useEffect(() => {
    if (visaoQuery && VISOES_INDICADORES.some((v) => v.id === visaoQuery)) {
      setVisao(visaoQuery);
    }
  }, [visaoQuery]);

  // Carrega SLA detalhado se necessário
  useEffect(() => {
    let mounted = true;
    if (authPronto && (isGestor || isAdmin)) {
      supabase.rpc("public_ticket_sla_progress").then(({ data, error }) => {
        if (!error && data && mounted) {
          setProgress(data);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [authPronto, isGestor, isAdmin]);

  const linhas = useMemo(
    () => (publicStats || []).filter((r) => r && (mes === "todos" || r.mes === mes)),
    [publicStats, mes]
  );

  const contar = useCallback(
    (campo: "categoria" | "setor" | "prioridade" | "status") => {
      const mapa = new Map<string, number>();
      for (const r of linhas) {
        if (!r) continue;
        const chave = r[campo] || "Não informado";
        mapa.set(chave, (mapa.get(chave) ?? 0) + (r.total || 0));
      }
      return [...mapa].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    },
    [linhas]
  );

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
          now
        ).situacao;
        counts.set(situacao, (counts.get(situacao) ?? 0) + 1);
      } catch {
        counts.set("—", (counts.get("—") ?? 0) + 1);
      }
    }
    return ["No prazo", "Estourado", "SLA pausado", "Cancelado", "Aguardando", "—"]
      .filter((name) => counts.has(name))
      .map((name) => ({ name, value: counts.get(name) ?? 0 }));
  }, [progress, mes, regras, now]);

  const dados: Item[] = useMemo(() => {
    if (visao === "sla") return dadosSla;
    if (visao === "problemas") return contar("categoria");
    if (visao === "setores") return contar("setor");
    if (visao === "prioridades") return contar("prioridade");
    return contar("status");
  }, [visao, dadosSla, contar]);

  const totalVal = useMemo(() => dados.reduce((sum, d) => sum + d.value, 0), [dados]);
  const media = dados.length > 0 ? (totalVal / dados.length).toFixed(1) : "0";
  const maior = dados[0] ?? { name: "N/A", value: 0 };
  const top3Soma = dados.slice(0, 3).reduce((acc, d) => acc + d.value, 0);
  const top3Pct = totalVal > 0 ? ((top3Soma / totalVal) * 100).toFixed(1) : "0";

  const cor = (nome: string, i: number) => {
    if (visao === "sla" && CORES_SLA[nome]?.bg) return CORES_SLA[nome].bg;
    return CORES[i % CORES.length] ?? "#1a73e8";
  };

  const baixarResumo = async () => {
    await wrapAsync(async () => {
      const { exportarXlsx } = await import("@/lib/exportar");
      const linhasExp = dados.map((r) => {
        const pct = totalVal > 0 ? `${((r.value / totalVal) * 100).toFixed(1)}%` : "0%";
        return {
          Dimensão: VISOES_INDICADORES.find((v) => v.id === visao)?.label || visao,
          Item: r.name,
          Chamados: r.value,
          Porcentagem: pct,
        };
      });
      exportarXlsx(linhasExp, `indicadores-${visao}-${mes}.xlsx`);
    });
  };

  const baixarPdf = async () => {
    await wrapAsync(async () => {
      const { exportarPdf } = await import("@/lib/exportar");
      const rows = dados.map((r) => {
        const pct = totalVal > 0 ? `${((r.value / totalVal) * 100).toFixed(1)}%` : "0%";
        return {
          "Item / Categoria": r.name,
          Quantidade: r.value,
          Participação: pct,
        };
      });
      await exportarPdf(
        rows,
        `indicadores-${visao}-${mes}`,
        `TI SENAI LRV · Indicadores Principais - ${VISOES_INDICADORES.find((v) => v.id === visao)?.label || visao}`
      );
    });
  };

  if (!authPronto) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Verificando permissões de acesso...</div>;
  }

  if (!isGestor && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-[var(--g-yellow)] bg-card p-8 text-center space-y-4 my-12 shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-[var(--g-yellow)]" />
        <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground">
          A página de Indicadores Principais é de acesso exclusivo para a equipe de gestão de TI e administradores.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link to="/dashboard/acompanhamento">Acompanhar Chamados</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <Home className="size-3.5 mr-1.5" /> Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/dashboard" search={{ mes: mes !== "todos" ? mes : undefined }}>
                <ArrowLeft className="size-3.5 mr-1" /> Dashboard Geral
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] text-g-blue border-g-blue/30 font-bold">
              Métricas Executivas · KPIs
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-g-blue/10 text-g-blue">
              <LayoutGrid className="size-6 sm:size-7" />
            </span>
            <span>Indicadores Principais de Chamados</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Métricas detalhadas em cartões executivos (Big Numbers), ranking de demandas e participação percentual.
          </p>
        </div>

        {/* Ações e Filtro de Mês */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-h-[40px] h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer",
                  mes !== "todos" && "border-g-blue/60 bg-g-blue/5 text-g-blue font-bold"
                )}
                title={mes === "todos" ? "Filtrar por mês" : `Filtro ativo: ${MESES_DISPONIVEIS.find((m) => m.key === mes)?.label || mes}`}
              >
                <Filter className="size-4 text-g-blue shrink-0" />
                <span>{mes === "todos" ? "Filtrar por mês" : `Mês: ${MESES_DISPONIVEIS.find((m) => m.key === mes)?.label || mes}`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-2.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-md" align="end">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtrar por mês</span>
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
                    mes === "todos" ? "bg-g-blue/10 text-g-blue font-bold" : "hover:bg-muted text-foreground"
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
                      mes === m.key ? "bg-g-blue/10 text-g-blue font-bold" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{m.label}</span>
                    {mes === m.key && <Check className="size-3.5 text-g-blue" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={baixarResumo}
            className="min-h-[40px] h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
            disabled={isLoading}
            title="Exportar planilha"
          >
            <FileSpreadsheet className="size-4 text-g-green shrink-0" />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            onClick={baixarPdf}
            className="min-h-[40px] h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground shadow-xs gap-1.5 shrink-0 transition-colors cursor-pointer"
            disabled={isLoading}
            title="Exportar PDF"
          >
            <FileText className="size-4 text-g-red shrink-0" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Seletor de Dimensão em Abas Modernas */}
      <div className="rounded-2xl border-2 border-g-blue/40 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-g-blue" />
          <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">Dimensão Analisada</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dimensões">
          {VISOES_INDICADORES.map((v) => {
            const ativa = visao === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setVisao(v.id)}
                className={cn(
                  "min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-xs",
                  ativa
                    ? "bg-g-blue text-white border-g-blue shadow-md"
                    : "bg-card text-foreground border-border hover:bg-muted/80"
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo Executivo: 4 Big Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border-2 border-g-blue/40 bg-g-blue/5 p-4 sm:p-5 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-blue">Total do Período</p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{totalVal}</p>
          <p className="text-xs text-muted-foreground">chamados registrados</p>
        </div>

        <div className="rounded-2xl border-2 border-g-green/40 bg-g-green/5 p-4 sm:p-5 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-green">Média por Item</p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{media}</p>
          <p className="text-xs text-muted-foreground">chamados / dimensão</p>
        </div>

        <div className="rounded-2xl border-2 border-g-yellow/50 bg-g-yellow/5 p-4 sm:p-5 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">Concentração Top 3</p>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{top3Pct}%</p>
          <p className="text-xs text-muted-foreground">{top3Soma} dos chamados</p>
        </div>

        <div className="rounded-2xl border-2 border-g-purple/40 bg-g-purple/5 p-4 sm:p-5 space-y-1 shadow-xs transition-all hover:shadow-md">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-g-purple">Maior Demanda (#1)</p>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight truncate" title={maior.name}>
            {maior.value}
          </p>
          <p className="text-xs text-muted-foreground truncate" title={maior.name}>
            {maior.name}
          </p>
        </div>
      </div>

      {/* Grid Completo de Cartões de Indicadores */}
      <div>
        <div className="flex items-center justify-between pb-3 px-1">
          <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
            Detalhamento por {VISOES_INDICADORES.find((v) => v.id === visao)?.label} ({dados.length} itens)
          </h3>
          <span className="text-xs text-muted-foreground font-semibold">Ordenados por volume</span>
        </div>

        {!dados.length ? (
          <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center text-muted-foreground text-sm">
            Nenhum registro encontrado para este recorte de mês e dimensão.
          </div>
        ) : (
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

                    <h4 className="font-bold text-sm text-foreground line-clamp-2 min-h-[2.5rem] tracking-tight" title={d.name}>
                      {d.name}
                    </h4>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: corItem }}>
                        {d.value}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground uppercase">chamados</span>
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
        )}
      </div>
    </div>
  );
}
