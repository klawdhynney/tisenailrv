import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Star,
  TrendingUp,
  BarChart3,
  ThumbsUp,
  MessageSquare,
  Percent,
  Calendar,
  ShieldAlert,
  ArrowLeft,
  Activity,
  ClipboardList,
  Filter,
  CheckCircle2,
  Smile,
  Frown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { AVALIACAO_PADRAO } from "@/lib/types";

export const Route = createFileRoute("/dashboard/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Métricas de Avaliação e Satisfação | Dashboard | TI SENAI LRV" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaAvaliacoes,
});

interface AvaliacaoRow {
  id: number;
  ticket_id: number;
  user_id: string | null;
  nota: number;
  comentario: string | null;
  created_at: string;
}

type PeriodoFiltro = "7d" | "30d" | "90d" | "todos";

const CORES_NOTAS: Record<number, string> = {
  1: "#ea4335", // Vermelho
  2: "#fa7b17", // Laranja
  3: "#f9ab00", // Amarelo
  4: "#34a853", // Verde
  5: "#0d652d", // Verde escuro
};

function PaginaAvaliacoes() {
  const { isGestor, isAdmin, authPronto, regras, tickets } = useStore();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30d");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      try {
        const { data, error } = await supabase
          .from("avaliacoes_chamados")
          .select("id, ticket_id, user_id, nota, comentario, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Falha ao buscar avaliações:", error.message);
        } else if (ativo && data) {
          setAvaliacoes(data as AvaliacaoRow[]);
        }
      } catch (e) {
        console.error("Erro ao carregar avaliações:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  // Filtragem de período
  const avaliacoesFiltradas = useMemo(() => {
    if (periodo === "todos") return avaliacoes;
    const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
    const corte = new Date();
    corte.setDate(corte.getDate() - dias);
    return avaliacoes.filter((a) => new Date(a.created_at) >= corte);
  }, [avaliacoes, periodo]);

  // Chamados no mesmo período para calcular taxa de resposta
  const chamadosNoPeriodo = useMemo(() => {
    if (!tickets || tickets.length === 0) return 0;
    if (periodo === "todos") return tickets.length;
    const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
    const corte = new Date();
    corte.setDate(corte.getDate() - dias);
    return tickets.filter((t) => new Date(t.abertoEm) >= corte).length;
  }, [tickets, periodo]);

  // Mapa de categoria por ticketId
  const mapaCategoriasTicket = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of tickets) {
      if (t.id && t.categoria) map.set(t.id, t.categoria);
    }
    return map;
  }, [tickets]);

  // Métricas Consolidadas
  const totalAvaliacoes = avaliacoesFiltradas.length;
  const notaMedia = useMemo(() => {
    if (totalAvaliacoes === 0) return 0;
    const soma = avaliacoesFiltradas.reduce((acc, a) => acc + (a.nota || 0), 0);
    return soma / totalAvaliacoes;
  }, [avaliacoesFiltradas, totalAvaliacoes]);

  const satisfacaoPercent = useMemo(() => {
    if (totalAvaliacoes === 0) return 0;
    const positivas = avaliacoesFiltradas.filter((a) => a.nota >= 4).length;
    return Math.round((positivas / totalAvaliacoes) * 100);
  }, [avaliacoesFiltradas, totalAvaliacoes]);

  const taxaResposta = useMemo(() => {
    if (chamadosNoPeriodo === 0) return 0;
    return Math.min(100, Math.round((totalAvaliacoes / chamadosNoPeriodo) * 100));
  }, [totalAvaliacoes, chamadosNoPeriodo]);

  // Distribuição de notas (1 a 5)
  const dadosDistribuicao = useMemo(() => {
    const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const a of avaliacoesFiltradas) {
      if (a.nota >= 1 && a.nota <= 5) {
        contagem[a.nota] = (contagem[a.nota] || 0) + 1;
      }
    }
    const opcoes = regras.avaliacoes?.opcoes ?? AVALIACAO_PADRAO.opcoes;
    return [1, 2, 3, 4, 5].map((nota) => ({
      nota: `Nota ${nota}`,
      label: opcoes[nota - 1] || `${nota} estrelas`,
      quantidade: contagem[nota],
      cor: CORES_NOTAS[nota] || "#1a73e8",
    }));
  }, [avaliacoesFiltradas, regras.avaliacoes]);

  // Evolução temporal (agrupada por dia)
  const dadosEvolucao = useMemo(() => {
    const grupos: Record<string, { soma: number; count: number }> = {};
    const ordenadas = [...avaliacoesFiltradas].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (const a of ordenadas) {
      const dataStr = new Date(a.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      if (!grupos[dataStr]) grupos[dataStr] = { soma: 0, count: 0 };
      grupos[dataStr].soma += a.nota;
      grupos[dataStr].count += 1;
    }

    return Object.entries(grupos).map(([data, { soma, count }]) => ({
      data,
      media: Number((soma / count).toFixed(2)),
      avaliacoes: count,
    }));
  }, [avaliacoesFiltradas]);

  // Satisfação por categoria
  const dadosPorCategoria = useMemo(() => {
    const grupos: Record<string, { soma: number; count: number }> = {};
    for (const a of avaliacoesFiltradas) {
      const cat = mapaCategoriasTicket.get(a.ticket_id) || "Geral / Outros";
      if (!grupos[cat]) grupos[cat] = { soma: 0, count: 0 };
      grupos[cat].soma += a.nota;
      grupos[cat].count += 1;
    }

    return Object.entries(grupos)
      .map(([categoria, { soma, count }]) => ({
        categoria: categoria.length > 20 ? categoria.slice(0, 18) + "…" : categoria,
        media: Number((soma / count).toFixed(2)),
        total: count,
      }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 6);
  }, [avaliacoesFiltradas, mapaCategoriasTicket]);

  // Comentários mais recentes (apenas anônimos: sem identificação pessoal)
  const comentariosRecentes = useMemo(() => {
    return avaliacoesFiltradas
      .filter((a) => a.comentario && a.comentario.trim().length > 0)
      .slice(0, 15);
  }, [avaliacoesFiltradas]);

  if (!authPronto) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Verificando credenciais...</div>;
  }

  if (!isGestor && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-destructive/40 bg-card p-8 text-center space-y-4 my-12 shadow-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground">
          Os dados analíticos de satisfação e avaliações são restritos à equipe de gestão e administração de TI.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="size-4 mr-2" /> Voltar ao Dashboard Público
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
              <Link to="/dashboard">
                <ArrowLeft className="size-3.5 mr-1" /> Dashboard Geral
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400 dark:border-amber-700">
              Gestão Exclusiva
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Star className="size-6 text-amber-500 fill-amber-400" />
            Avaliações e Satisfação dos Usuários
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Métricas de facilidade de abertura, aprovação e comentários qualitativos coletados nos atendimentos.
          </p>
        </div>

        {/* Filtros de período e navegação rápida */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border/60">
            {(
              [
                { id: "7d", rotulo: "7 dias" },
                { id: "30d", rotulo: "30 dias" },
                { id: "90d", rotulo: "90 dias" },
                { id: "todos", rotulo: "Tudo" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriodo(item.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  periodo === item.id
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>

          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/dashboard/acompanhamento">
              <ClipboardList className="size-3.5 mr-1" /> Acompanhamento
            </Link>
          </Button>
        </div>
      </div>

      {carregando ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Carregando métricas de satisfação...</div>
      ) : totalAvaliacoes === 0 ? (
        <Card className="rounded-2xl border-dashed p-10 text-center space-y-3">
          <Star className="size-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Nenhuma avaliação encontrada no período</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Assim que os usuários abrirem chamados e responderem à pesquisa pós-envio, as métricas e gráficos serão
            processados automaticamente nesta página.
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setPeriodo("todos")}>
              Ver todo o histórico
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Cartões de KPI (Big Numbers) com descrições técnicas curtas */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Total */}
            <Card className="rounded-2xl border-t-4 border-g-blue shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Total de Avaliações</span>
                  <MessageSquare className="size-4 text-g-blue" />
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-foreground pt-1">
                  {totalAvaliacoes}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Volume consolidado de avaliações submetidas voluntariamente pelos usuários.
                </p>
              </CardContent>
            </Card>

            {/* Média */}
            <Card className="rounded-2xl border-t-4 border-amber-500 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Nota Média Geral</span>
                  <Star className="size-4 text-amber-500 fill-amber-400" />
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-foreground pt-1 flex items-baseline gap-1">
                  {notaMedia.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Média aritmética das notas atribuídas pelos solicitantes (escala de 1 a 5).
                </p>
              </CardContent>
            </Card>

            {/* Satisfação */}
            <Card className="rounded-2xl border-t-4 border-g-green shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Índice de Satisfação</span>
                  <ThumbsUp className="size-4 text-g-green" />
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-foreground pt-1">
                  {satisfacaoPercent}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Percentual de solicitantes que avaliaram a experiência com notas 4 ou 5.
                </p>
              </CardContent>
            </Card>

            {/* Taxa de Resposta */}
            <Card className="rounded-2xl border-t-4 border-purple-500 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Taxa de Resposta</span>
                  <Percent className="size-4 text-purple-600" />
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-foreground pt-1">
                  {taxaResposta}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Proporção de tickets com pesquisa preenchida em relação ao total de chamados abertos.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Principais */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de Barras: Distribuição das notas */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="size-5 text-g-blue" /> Distribuição das Notas (1 a 5)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Frequência absoluta de registros para cada faixa de pontuação de 1 a 5 estrelas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosDistribuicao} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="quantidade" name="Avaliações" radius={[6, 6, 0, 0]}>
                        {dadosDistribuicao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Linha: Evolução temporal da média */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="size-5 text-g-green" /> Evolução da Nota Média
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Tendência histórica da pontuação média calculada ao longo do período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {dadosEvolucao.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Dados temporais insuficientes no recorte selecionado.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosEvolucao} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="media"
                          name="Nota Média"
                          stroke="#34a853"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#34a853" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Média por Categoria de Chamado */}
          {dadosPorCategoria.length > 0 && (
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Activity className="size-5 text-purple-600" /> Satisfação por Categoria de Serviço
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Média de avaliação segregada por tipo de demanda e sistema atendido.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {dadosPorCategoria.map((cat, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/70 bg-muted/30 p-3 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-foreground truncate">{cat.categoria}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.total} feedback(s)</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-background px-2 py-1 rounded-lg border border-border/80">
                        <Star className="size-3 text-amber-500 fill-amber-400" />
                        <span className="text-xs font-bold text-foreground">{cat.media.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Comentários Mais Recentes (Anônima - sem exibir nome da pessoa) */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" /> Comentários Recentes dos Solicitantes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Feedback qualitativo anônimo enviado voluntariamente após o registro do chamado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comentariosRecentes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum comentário em texto registrado no período.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {comentariosRecentes.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <Star
                                key={v}
                                className={`size-3.5 ${v <= c.nota ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                            Chamado #{c.ticket_id}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed italic line-clamp-4">
                          "{c.comentario}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Anônimo</span>
                        <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
