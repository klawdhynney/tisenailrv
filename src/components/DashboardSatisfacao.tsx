import { useMemo } from "react";
import {
  Star,
  ThumbsUp,
  Smile,
  CheckCircle2,
  Sparkles,
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";

const CORES_NOTAS: Record<number, string> = {
  1: "#ea4335", // Vermelho
  2: "#fa7b17", // Laranja
  3: "#f9ab00", // Amarelo
  4: "#34a853", // Verde
  5: "#0d652d", // Verde escuro
};

const ROTULOS_SATISFACAO = [
  "1 - Muito insatisfeito",
  "2 - Insatisfeito",
  "3 - Regular",
  "4 - Satisfeito",
  "5 - Muito satisfeito",
];

const ROTULOS_FACILIDADE = [
  "1 - Muito difícil",
  "2 - Difícil",
  "3 - Regular",
  "4 - Fácil",
  "5 - Muito fácil",
];

interface DashboardSatisfacaoProps {
  mesSelecionado?: string; // ex.: "2026-10", "7d", "30d", "90d" ou "todos"
  semBordaSuperior?: boolean;
}

export function DashboardSatisfacao({
  mesSelecionado = "todos",
  semBordaSuperior = false,
}: DashboardSatisfacaoProps) {
  const { tickets, avaliacoesList, evaluationLoading, evaluationError, recarregarEvaluationStats } = useStore();
  const avaliacoes = avaliacoesList;
  const carregando = evaluationLoading;

  // Mapeamento auxiliar de chamados para obter categoria e responsável se faltar
  const mapaChamados = useMemo(() => {
    const map = new Map<number, { categoria?: string; responsavel?: string; setor?: string; abertoEm?: string }>();
    if (tickets && Array.isArray(tickets)) {
      for (const t of tickets) {
        if (t.id) {
          map.set(t.id, {
            categoria: t.categoria || undefined,
            responsavel: t.responsavel || undefined,
            setor: t.setor || undefined,
            abertoEm: t.abertoEm || undefined,
          });
        }
      }
    }
    return map;
  }, [tickets]);

  // Avaliações enriquecidas com categoria e atendente
  const avaliacoesEnriquecidas = useMemo(() => {
    return avaliacoes.map((a) => {
      const ticketInfo = mapaChamados.get(a.ticket_id);
      return {
        ...a,
        categoria: a.categoria || ticketInfo?.categoria || "Geral / Outros",
        atendente: a.atendente || ticketInfo?.responsavel || "Equipe de TI",
        setor: a.setor || ticketInfo?.setor || "Geral",
      };
    });
  }, [avaliacoes, mapaChamados]);

  // Filtragem conforme o período ou mês selecionado
  const avaliacoesFiltradas = useMemo(() => {
    if (!mesSelecionado || mesSelecionado === "todos") {
      return avaliacoesEnriquecidas;
    }
    if (mesSelecionado === "7d" || mesSelecionado === "30d" || mesSelecionado === "90d") {
      const dias = mesSelecionado === "7d" ? 7 : mesSelecionado === "30d" ? 30 : 90;
      const corte = new Date();
      corte.setDate(corte.getDate() - dias);
      return avaliacoesEnriquecidas.filter((a) => {
        const d = new Date(a.created_at || "");
        return !isNaN(d.getTime()) && d >= corte;
      });
    }
    return avaliacoesEnriquecidas.filter((a) => {
      const dataStr = a.created_at || "";
      return dataStr.startsWith(mesSelecionado);
    });
  }, [avaliacoesEnriquecidas, mesSelecionado]);

  // 1. MÉTRICAS: Satisfação Geral (Atendimento)
  const totalAvaliacoes = avaliacoesFiltradas.length;

  const notaMediaSatisfacao = useMemo(() => {
    if (totalAvaliacoes === 0) return 0;
    const soma = avaliacoesFiltradas.reduce((acc, a) => acc + (a.nota || 0), 0);
    return Number((soma / totalAvaliacoes).toFixed(2));
  }, [avaliacoesFiltradas, totalAvaliacoes]);

  const satisfacaoAprovacaoPct = useMemo(() => {
    if (totalAvaliacoes === 0) return 0;
    const positivas = avaliacoesFiltradas.filter((a) => a.nota >= 4).length;
    return Math.round((positivas / totalAvaliacoes) * 100);
  }, [avaliacoesFiltradas, totalAvaliacoes]);

  // 2. MÉTRICAS: Facilidade de Abrir Chamados
  const avaliacoesComFacilidade = useMemo(() => {
    return avaliacoesFiltradas.filter(
      (a) => a.nota_facilidade !== null && a.nota_facilidade !== undefined && a.nota_facilidade >= 1,
    );
  }, [avaliacoesFiltradas]);

  const totalFacilidade = avaliacoesComFacilidade.length;

  const notaMediaFacilidade = useMemo(() => {
    if (totalFacilidade === 0) return 0;
    const soma = avaliacoesComFacilidade.reduce((acc, a) => acc + (a.nota_facilidade || 0), 0);
    return Number((soma / totalFacilidade).toFixed(2));
  }, [avaliacoesComFacilidade, totalFacilidade]);

  const facilidadeAprovacaoPct = useMemo(() => {
    if (totalFacilidade === 0) return 0;
    const faceis = avaliacoesComFacilidade.filter((a) => (a.nota_facilidade || 0) >= 4).length;
    return Math.round((faceis / totalFacilidade) * 100);
  }, [avaliacoesComFacilidade, totalFacilidade]);

  // 3. DISTRIBUIÇÃO: Notas de Satisfação do Atendimento (1 a 5)
  const dadosDistribuicaoSatisfacao = useMemo(() => {
    const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const a of avaliacoesFiltradas) {
      if (a.nota >= 1 && a.nota <= 5) {
        contagem[a.nota] = (contagem[a.nota] || 0) + 1;
      }
    }
    return [1, 2, 3, 4, 5].map((nota) => ({
      nota: `${nota} ★`,
      notaNum: nota,
      name: ROTULOS_SATISFACAO[nota - 1] || `Nota ${nota}`,
      quantidade: contagem[nota],
      porcentagem: totalAvaliacoes > 0 ? Math.round((contagem[nota] / totalAvaliacoes) * 100) : 0,
      cor: CORES_NOTAS[nota] || "#1a73e8",
    }));
  }, [avaliacoesFiltradas, totalAvaliacoes]);

  // 4. DISTRIBUIÇÃO: Notas de Facilidade de Abertura (1 a 5)
  const dadosDistribuicaoFacilidade = useMemo(() => {
    const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const a of avaliacoesComFacilidade) {
      const nf = a.nota_facilidade || 0;
      if (nf >= 1 && nf <= 5) {
        contagem[nf] = (contagem[nf] || 0) + 1;
      }
    }
    return [1, 2, 3, 4, 5].map((nota) => ({
      nota: `${nota} ★`,
      notaNum: nota,
      name: ROTULOS_FACILIDADE[nota - 1] || `Opção ${nota}`,
      quantidade: contagem[nota],
      porcentagem: totalFacilidade > 0 ? Math.round((contagem[nota] / totalFacilidade) * 100) : 0,
      cor: CORES_NOTAS[nota] || "#1a73e8",
    }));
  }, [avaliacoesComFacilidade, totalFacilidade]);

  return (
    <section className={`space-y-6 ${semBordaSuperior ? "" : "pt-4 border-t-2 border-border/80"}`}>
      {/* Cabeçalho da Seção de Satisfação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="size-6 text-amber-500" />
              Satisfação dos Usuários & Experiência
            </h2>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
              Dados Reais
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Métricas e indicadores de satisfação do atendimento da TI e facilidade no processo de abertura de chamados.
          </p>
        </div>

        {mesSelecionado && mesSelecionado !== "todos" && (
          <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
            Filtro ativo: {mesSelecionado}
          </Badge>
        )}
      </div>

      {carregando && totalAvaliacoes === 0 ? (
        <div className="rounded-2xl border-2 border-border/80 bg-card p-10 text-center space-y-3 animate-pulse">
          <Activity className="size-8 text-primary mx-auto animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando métricas reais de satisfação...</p>
        </div>
      ) : evaluationError && totalAvaliacoes === 0 ? (
        <Card className="rounded-2xl border-2 border-red-500/30 bg-red-500/5 dark:bg-red-950/20 p-8 text-center space-y-3">
          <AlertCircle className="size-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Erro ao carregar métricas de avaliação</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Não foi possível carregar os dados de avaliação do servidor. Verifique sua conexão e tente novamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.info("Tentando recarregar métricas de satisfação a pedido do usuário...");
              recarregarEvaluationStats();
            }}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className="size-3.5" /> Tentar novamente
          </Button>
        </Card>
      ) : totalAvaliacoes === 0 ? (
        <Card className="rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-8 text-center space-y-3">
          <Smile className="size-12 text-muted-foreground/60 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhuma avaliação no período selecionado</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Assim que os usuários avaliarem a facilidade de abertura ou o suporte nos chamados concluídos, os indicadores e notas médias aparecerão aqui automaticamente.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* CARDS BIG NUMBERS (KPIs / INDICADORES PRINCIPAIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Média de Satisfação do Atendimento */}
            <Card className="rounded-2xl border-l-4 border-l-amber-500 border-border/80 bg-card shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Satisfação com o Atendimento
                </CardTitle>
                <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Star className="size-4.5 fill-current" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-500 tracking-tight">
                    {notaMediaSatisfacao.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ 5.0</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalAvaliacoes} avaliações</span>
                  <span className="font-bold text-g-green">{satisfacaoAprovacaoPct}% aprovação</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Média de Facilidade para Abrir Chamados */}
            <Card className="rounded-2xl border-l-4 border-l-g-blue border-border/80 bg-card shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Facilidade de Abertura
                </CardTitle>
                <div className="size-8 rounded-full bg-g-blue/10 flex items-center justify-center text-g-blue">
                  <ThumbsUp className="size-4.5 fill-current" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-g-blue tracking-tight">
                    {totalFacilidade > 0 ? notaMediaFacilidade.toFixed(1) : "—"}
                  </span>
                  {totalFacilidade > 0 && <span className="text-xs font-bold text-muted-foreground">/ 5.0</span>}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalFacilidade} respostas</span>
                  {totalFacilidade > 0 ? (
                    <span className="font-bold text-g-blue">{facilidadeAprovacaoPct}% fácil/muito fácil</span>
                  ) : (
                    <span className="text-[11px] italic">Aguardando dados</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Taxa de Aprovação Positiva */}
            <Card className="rounded-2xl border-l-4 border-l-g-green border-border/80 bg-card shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Avaliações Positivas (4 e 5 ★)
                </CardTitle>
                <div className="size-8 rounded-full bg-g-green/10 flex items-center justify-center text-g-green">
                  <CheckCircle2 className="size-4.5" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-g-green tracking-tight">
                    {satisfacaoAprovacaoPct}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {avaliacoesFiltradas.filter((a) => a.nota >= 4).length} de {totalAvaliacoes} com notas excelentes
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Total de Feedbacks Registrados */}
            <Card className="rounded-2xl border-l-4 border-l-purple-500 border-border/80 bg-card shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Volume de Respostas
                </CardTitle>
                <div className="size-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Smile className="size-4.5" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-600 tracking-tight">
                    {totalAvaliacoes}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">chamados avaliados</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Opiniões computadas com sincronização em tempo real
                </p>
              </CardContent>
            </Card>
          </div>

          {/* INDICADORES RESUMO: DISTRIBUIÇÃO NUMÉRICA DE NOTAS (SEM GRÁFICOS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Indicador: Distribuição das Notas de Atendimento */}
            <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">Distribuição: Satisfação com Atendimento</h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-400/50">
                  Média: {notaMediaSatisfacao.toFixed(1)} ★
                </Badge>
              </div>

              <div className="mt-3 space-y-2">
                {dadosDistribuicaoSatisfacao
                  .slice()
                  .reverse()
                  .map((d) => (
                    <div key={d.nota} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-foreground flex items-center gap-1 shrink-0">
                        {d.nota}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${d.porcentagem}%`,
                            backgroundColor: d.cor,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right font-bold text-foreground shrink-0">
                        {d.quantidade}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">({d.porcentagem}%)</span>
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Indicador: Distribuição das Notas de Facilidade */}
            <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="size-4 text-g-blue fill-g-blue/30" />
                  <h3 className="text-sm font-bold text-foreground">Distribuição: Facilidade de Abertura</h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-bold text-g-blue border-g-blue/40">
                  {totalFacilidade > 0 ? `Média: ${notaMediaFacilidade.toFixed(1)} ★` : "Sem dados"}
                </Badge>
              </div>

              <div className="mt-3 space-y-2">
                {dadosDistribuicaoFacilidade
                  .slice()
                  .reverse()
                  .map((d) => (
                    <div key={d.nota} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-foreground flex items-center gap-1 shrink-0">
                        {d.nota}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${d.porcentagem}%`,
                            backgroundColor: d.cor,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right font-bold text-foreground shrink-0">
                        {d.quantidade}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">({d.porcentagem}%)</span>
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
