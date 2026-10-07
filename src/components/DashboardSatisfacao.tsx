import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Star,
  ThumbsUp,
  Smile,
  TrendingUp,
  FolderKanban,
  UserCheck,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Activity,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AvaliacaoItemDashboard } from "@/lib/types";

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
  const { tickets, regras } = useStore();
  const isMobile = useIsMobile();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItemDashboard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipoGraficoDistribuicao, setTipoGraficoDistribuicao] = useState<"barras" | "pizza">("barras");
  const [visaoDimensao, setVisaoDimensao] = useState<"atendente" | "categoria">("categoria");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      let listaRemota: AvaliacaoItemDashboard[] = [];
      let tabelaDisponivel = false;

      try {
        // 1. Tenta carregar via RPC segura otimizada para dashboard
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_evaluations_for_dashboard");

        if (!rpcErr && Array.isArray(rpcData)) {
          listaRemota = rpcData.map((r: any) => ({
            id: r.id,
            ticket_id: r.ticket_id,
            nota: Number(r.nota),
            nota_facilidade: r.nota_facilidade !== null && r.nota_facilidade !== undefined ? Number(r.nota_facilidade) : null,
            atendente: r.atendente || null,
            categoria: r.categoria || null,
            setor: r.setor || null,
            created_at: r.created_at,
          }));
          tabelaDisponivel = true;
        } else {
          // Fallback: consulta direta na tabela avaliacoes_chamados
          const { data: directData, error: directErr } = await (supabase.from("avaliacoes_chamados") as any)
            .select("id, ticket_id, nota, nota_facilidade, atendente, comentario, created_at")
            .order("created_at", { ascending: false });

          if (!directErr && directData) {
            listaRemota = directData.map((r: any) => ({
              id: r.id,
              ticket_id: r.ticket_id,
              nota: Number(r.nota),
              nota_facilidade: r.nota_facilidade !== null && r.nota_facilidade !== undefined ? Number(r.nota_facilidade) : null,
              atendente: r.atendente || null,
              comentario: r.comentario || null,
              created_at: r.created_at,
            }));
            tabelaDisponivel = true;
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar avaliações para o dashboard:", err);
      }

      // 2. Lê do cache local para sincronizar e mesclar
      let listaLocal: AvaliacaoItemDashboard[] = [];
      try {
        const salvasLocais = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
        if (Array.isArray(salvasLocais)) {
          listaLocal = salvasLocais.map((s: any, idx: number) => ({
            id: s.id || 900000 + idx,
            ticket_id: Number(s.ticket_id),
            nota: Number(s.nota),
            nota_facilidade: s.nota_facilidade ? Number(s.nota_facilidade) : null,
            atendente: s.atendente || null,
            comentario: s.comentario || null,
            created_at: s.created_at || s.data || new Date().toISOString(),
          }));
        }
      } catch {
        // ignore
      }

      // 3. Sincroniza avaliações pendentes do localStorage com o banco
      if (tabelaDisponivel && listaLocal.length > 0) {
        const ticketsNoBanco = new Set(listaRemota.map((r) => r.ticket_id));
        const pendentes = listaLocal.filter((l) => !ticketsNoBanco.has(l.ticket_id));

        if (pendentes.length > 0) {
          for (const item of pendentes) {
            try {
              await (supabase.rpc as any)("submit_ticket_evaluation", {
                p_ticket_id: item.ticket_id,
                p_nota: item.nota,
                p_comentario: item.comentario || null,
                p_nota_facilidade: item.nota_facilidade || null,
                p_atendente: item.atendente || null,
              });
            } catch (errSync) {
              console.warn("Falha na sincronização de avaliação pendente:", errSync);
            }
          }
        }

        try {
          localStorage.removeItem("tisenai_avaliacoes_locais");
        } catch {
          // ignore
        }
      }

      // 4. Mescla sem duplicidade
      const mapaTickets = new Map<number, AvaliacaoItemDashboard>();
      for (const r of listaRemota) {
        mapaTickets.set(r.ticket_id, r);
      }
      for (const l of listaLocal) {
        if (!mapaTickets.has(l.ticket_id)) {
          mapaTickets.set(l.ticket_id, l);
        }
      }

      if (ativo) {
        setAvaliacoes(Array.from(mapaTickets.values()));
        setCarregando(false);
      }
    }

    void carregar();

    const channel = supabase
      .channel("dashboard-satisfacao-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "avaliacoes_chamados" }, () => {
        void carregar();
      })
      .subscribe();

    return () => {
      ativo = false;
      void supabase.removeChannel(channel);
    };
  }, []);

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
      name: ROTULOS_FACILIDADE[nota - 1] || `Opção ${nota}`,
      quantidade: contagem[nota],
      porcentagem: totalFacilidade > 0 ? Math.round((contagem[nota] / totalFacilidade) * 100) : 0,
      cor: CORES_NOTAS[nota] || "#1a73e8",
    }));
  }, [avaliacoesComFacilidade, totalFacilidade]);

  // 5. EVOLUÇÃO TEMPORAL: Médias de Satisfação e Facilidade ao longo do tempo
  const dadosEvolucaoTemporal = useMemo(() => {
    if (avaliacoesFiltradas.length === 0) return [];

    const agrupado: Record<
      string,
      {
        somaSat: number;
        qtdSat: number;
        somaFac: number;
        qtdFac: number;
        timestamp: number;
      }
    > = {};

    const ordenadas = [...avaliacoesFiltradas].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // Se o filtro for "todos", agrupa por mês (MM/AAAA); se for um mês específico, agrupa por dia (DD/MM)
    const formatoMes = mesSelecionado === "todos";

    for (const a of ordenadas) {
      const d = new Date(a.created_at);
      if (isNaN(d.getTime())) continue;

      const chave = formatoMes
        ? d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

      if (!agrupado[chave]) {
        agrupado[chave] = { somaSat: 0, qtdSat: 0, somaFac: 0, qtdFac: 0, timestamp: d.getTime() };
      }

      agrupado[chave].somaSat += a.nota;
      agrupado[chave].qtdSat += 1;

      if (a.nota_facilidade) {
        agrupado[chave].somaFac += a.nota_facilidade;
        agrupado[chave].qtdFac += 1;
      }
    }

    return Object.entries(agrupado).map(([data, item]) => ({
      data,
      mediaSatisfacao: Number((item.somaSat / item.qtdSat).toFixed(2)),
      mediaFacilidade: item.qtdFac > 0 ? Number((item.somaFac / item.qtdFac).toFixed(2)) : null,
      totalRespostas: item.qtdSat,
    }));
  }, [avaliacoesFiltradas, mesSelecionado]);

  // 6. SATISFAÇÃO POR ATENDENTE E POR CATEGORIA
  const dadosPorAtendente = useMemo(() => {
    const mapa: Record<string, { soma: number; count: number }> = {};
    for (const a of avaliacoesFiltradas) {
      const atend = a.atendente || "Equipe de TI";
      if (!mapa[atend]) mapa[atend] = { soma: 0, count: 0 };
      mapa[atend].soma += a.nota;
      mapa[atend].count += 1;
    }
    return Object.entries(mapa)
      .map(([nome, item]) => ({
        nome,
        media: Number((item.soma / item.count).toFixed(2)),
        total: item.count,
      }))
      .sort((a, b) => b.media - a.media);
  }, [avaliacoesFiltradas]);

  const dadosPorCategoria = useMemo(() => {
    const mapa: Record<string, { soma: number; count: number }> = {};
    for (const a of avaliacoesFiltradas) {
      const cat = a.categoria || "Geral / Outros";
      if (!mapa[cat]) mapa[cat] = { soma: 0, count: 0 };
      mapa[cat].soma += a.nota;
      mapa[cat].count += 1;
    }
    return Object.entries(mapa)
      .map(([nome, item]) => ({
        nome,
        media: Number((item.soma / item.count).toFixed(2)),
        total: item.count,
      }))
      .sort((a, b) => b.media - a.media);
  }, [avaliacoesFiltradas]);

  // Custom Tooltip Reutilizável com Design System Google
  const CustomTooltipGrafico = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-xl border-2 border-border/80 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md transition-all text-xs space-y-1">
        <p className="font-bold text-foreground">{label || payload[0]?.payload?.name || payload[0]?.name}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              {p.name}:
            </span>
            <span className="font-bold text-foreground">
              {p.value} {typeof p.value === "number" && p.value <= 5 && p.value > 0 && !Number.isInteger(p.value) ? "★" : ""}
            </span>
          </div>
        ))}
      </div>
    );
  };

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
            Métricas de satisfação do atendimento da TI e facilidade no processo de abertura de chamados.
          </p>
        </div>

        {mesSelecionado && mesSelecionado !== "todos" && (
          <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
            Filtro ativo: {mesSelecionado}
          </Badge>
        )}
      </div>

      {carregando ? (
        <div className="rounded-2xl border-2 border-border/80 bg-card p-10 text-center space-y-3 animate-pulse">
          <Activity className="size-8 text-primary mx-auto animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando métricas reais de satisfação...</p>
        </div>
      ) : totalAvaliacoes === 0 ? (
        <Card className="rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-8 text-center space-y-3">
          <Smile className="size-12 text-muted-foreground/60 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhuma avaliação no período selecionado</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Assim que os usuários avaliarem a facilidade de abertura ou o suporte nos chamados concluídos, os gráficos e notas médias aparecerão aqui automaticamente.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* CARDS BIG NUMBERS (KPIs) */}
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

          {/* LINHA 1 DE GRÁFICOS: DISTRIBUIÇÃO DAS DUAS PERGUNTAS (SEPARADAS PARA NÃO MISTURAR) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Distribuição das Notas de Satisfação do Atendimento */}
            <Card className="rounded-2xl border-2 border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="size-4 text-amber-500 fill-current" />
                    Distribuição da Satisfação com o Atendimento
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Notas de 1 (Muito insatisfeito) a 5 (Muito satisfeito)
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={tipoGraficoDistribuicao === "barras" ? "google-blue" : "outline"}
                    className="h-7 px-2.5 text-xs font-bold"
                    onClick={() => setTipoGraficoDistribuicao("barras")}
                  >
                    <BarChart3 className="size-3.5 mr-1" /> Barras
                  </Button>
                  <Button
                    size="sm"
                    variant={tipoGraficoDistribuicao === "pizza" ? "google-blue" : "outline"}
                    className="h-7 px-2.5 text-xs font-bold"
                    onClick={() => setTipoGraficoDistribuicao("pizza")}
                  >
                    <PieIcon className="size-3.5 mr-1" /> Pizza
                  </Button>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGraficoDistribuicao === "barras" ? (
                    <BarChart
                      data={dadosDistribuicaoSatisfacao}
                      layout="vertical"
                      margin={{ top: 10, right: 25, left: 25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="nota"
                        width={40}
                        tick={{ fontSize: 11, fontWeight: "bold" }}
                      />
                      <Tooltip content={<CustomTooltipGrafico />} />
                      <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                        {dadosDistribuicaoSatisfacao.map((entry, index) => (
                          <Cell key={`cell-sat-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Tooltip content={<CustomTooltipGrafico />} />
                      <Pie
                        data={dadosDistribuicaoSatisfacao.filter((d) => d.quantidade > 0)}
                        dataKey="quantidade"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {dadosDistribuicaoSatisfacao.map((entry, index) => (
                          <Cell key={`cell-pie-sat-${index}`} fill={entry.cor} />
                        ))}
                      </Pie>
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legenda Resumida */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-border/40 text-center">
                {dadosDistribuicaoSatisfacao.map((d) => (
                  <div key={d.nota} className="p-1 rounded-lg bg-muted/40">
                    <span className="block text-[11px] font-bold" style={{ color: d.cor }}>
                      {d.nota}
                    </span>
                    <span className="block text-xs font-black text-foreground">{d.quantidade}</span>
                    <span className="block text-[10px] text-muted-foreground">{d.porcentagem}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Gráfico 2: Distribuição das Notas de Facilidade de Abertura */}
            <Card className="rounded-2xl border-2 border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ThumbsUp className="size-4 text-g-blue fill-current" />
                    Distribuição da Facilidade para Abrir Chamados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Escala de 1 (Muito difícil) a 5 (Muito fácil)
                  </p>
                </div>
                <Badge variant="outline" className="text-xs text-g-blue border-g-blue/40">
                  {totalFacilidade} respostas
                </Badge>
              </div>

              <div className="h-64 w-full">
                {totalFacilidade === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <HelpCircle className="size-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      Ainda não há avaliações registradas para facilidade de abertura neste recorte.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {tipoGraficoDistribuicao === "barras" ? (
                      <BarChart
                        data={dadosDistribuicaoFacilidade}
                        layout="vertical"
                        margin={{ top: 10, right: 25, left: 25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="nota"
                          width={40}
                          tick={{ fontSize: 11, fontWeight: "bold" }}
                        />
                        <Tooltip content={<CustomTooltipGrafico />} />
                        <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                          {dadosDistribuicaoFacilidade.map((entry, index) => (
                            <Cell key={`cell-fac-${index}`} fill={entry.cor} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Tooltip content={<CustomTooltipGrafico />} />
                        <Pie
                          data={dadosDistribuicaoFacilidade.filter((d) => d.quantidade > 0)}
                          dataKey="quantidade"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {dadosDistribuicaoFacilidade.map((entry, index) => (
                            <Cell key={`cell-pie-fac-${index}`} fill={entry.cor} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legenda Resumida */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-border/40 text-center">
                {dadosDistribuicaoFacilidade.map((d) => (
                  <div key={d.nota} className="p-1 rounded-lg bg-muted/40">
                    <span className="block text-[11px] font-bold" style={{ color: d.cor }}>
                      {d.nota}
                    </span>
                    <span className="block text-xs font-black text-foreground">{d.quantidade}</span>
                    <span className="block text-[10px] text-muted-foreground">{d.porcentagem}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* LINHA 2 DE GRÁFICOS: EVOLUÇÃO TEMPORAL E DIMENSÕES (ATENDENTE / CATEGORIA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 3: Evolução Temporal das Duas Médias Lado a Lado */}
            <Card className="rounded-2xl border-2 border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="size-4 text-g-green" />
                    Evolução Temporal das Médias
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Acompanhamento das médias de Satisfação e Facilidade ao longo do tempo
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <span className="size-2.5 rounded-full bg-amber-500" /> Atendimento
                  </span>
                  <span className="flex items-center gap-1.5 text-g-blue">
                    <span className="size-2.5 rounded-full bg-g-blue" /> Facilidade
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                {dadosEvolucaoTemporal.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Dados temporais insuficientes para exibir a curva de tendência.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dadosEvolucaoTemporal}
                      margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltipGrafico />} />
                      <Line
                        type="monotone"
                        dataKey="mediaSatisfacao"
                        name="Satisfação Atendimento"
                        stroke="#f9ab00"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#f9ab00" }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mediaFacilidade"
                        name="Facilidade Abertura"
                        stroke="#1a73e8"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#1a73e8" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Gráfico 4: Satisfação por Atendente ou por Categoria */}
            <Card className="rounded-2xl border-2 border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="size-4 text-purple-600" />
                    Satisfação por {visaoDimensao === "atendente" ? "Atendente / Técnico" : "Categoria de Chamado"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Média de estrelas atribuídas pelos solicitantes
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={visaoDimensao === "categoria" ? "google-blue" : "outline"}
                    className="h-7 px-2.5 text-xs font-bold"
                    onClick={() => setVisaoDimensao("categoria")}
                  >
                    <FolderKanban className="size-3.5 mr-1" /> Categoria
                  </Button>
                  <Button
                    size="sm"
                    variant={visaoDimensao === "atendente" ? "google-blue" : "outline"}
                    className="h-7 px-2.5 text-xs font-bold"
                    onClick={() => setVisaoDimensao("atendente")}
                  >
                    <UserCheck className="size-3.5 mr-1" /> Atendente
                  </Button>
                </div>
              </div>

              <div className="h-64 w-full">
                {(() => {
                  const listaDimensao = visaoDimensao === "atendente" ? dadosPorAtendente : dadosPorCategoria;
                  if (listaDimensao.length === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Sem dados disponíveis para a dimensão selecionada.
                      </div>
                    );
                  }
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={listaDimensao.slice(0, 7)}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: isMobile ? 10 : 35, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="nome"
                          width={isMobile ? 85 : 120}
                          tick={{ fontSize: 10, fontWeight: "medium" }}
                        />
                        <Tooltip content={<CustomTooltipGrafico />} />
                        <Bar
                          dataKey="media"
                          name="Nota Média (★)"
                          fill="#a142f4"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
