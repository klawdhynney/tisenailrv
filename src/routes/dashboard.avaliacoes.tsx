import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Star,
  ArrowLeft,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { MESES_DISPONIVEIS, AVALIACAO_PADRAO } from "@/lib/types";
import { DashboardSatisfacao } from "@/components/DashboardSatisfacao";

export const Route = createFileRoute("/dashboard/avaliacoes")({
  ssr: false,
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
  nota_facilidade?: number | null;
  atendente?: string | null;
  comentario: string | null;
  created_at: string;
}

function PaginaAvaliacoes() {
  const { authPronto, regras } = useStore();
  const configAvaliacao = { ...AVALIACAO_PADRAO, ...(regras.avaliacao ?? {}) };
  const [periodo, setPeriodo] = useState<string>("todos");
  const [comentarios, setComentarios] = useState<AvaliacaoRow[]>([]);
  const [carregandoComentarios, setCarregandoComentarios] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarComentarios() {
      setCarregandoComentarios(true);
      try {
        const { data, error } = await (supabase.from("avaliacoes_chamados") as any)
          .select("id, ticket_id, user_id, nota, nota_facilidade, atendente, comentario, created_at")
          .not("comentario", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data && ativo) {
          setComentarios(data as AvaliacaoRow[]);
        }
      } catch (err) {
        console.warn("Erro ao buscar comentários:", err);
      } finally {
        if (ativo) setCarregandoComentarios(false);
      }
    }

    void carregarComentarios();

    const channel = supabase
      .channel("dash-avaliacoes-comments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "avaliacoes_chamados" }, () => {
        void carregarComentarios();
      })
      .subscribe();

    return () => {
      ativo = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const comentariosFiltrados = useMemo(() => {
    if (!periodo || periodo === "todos") {
      return comentarios.filter((c) => c.comentario && c.comentario.trim().length > 0);
    }
    if (periodo === "7d" || periodo === "30d" || periodo === "90d") {
      const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
      const corte = new Date();
      corte.setDate(corte.getDate() - dias);
      return comentarios.filter((c) => {
        const d = new Date(c.created_at || "");
        return !isNaN(d.getTime()) && d >= corte && c.comentario && c.comentario.trim().length > 0;
      });
    }
    return comentarios.filter((c) => {
      const dataStr = c.created_at || "";
      return dataStr.startsWith(periodo) && c.comentario && c.comentario.trim().length > 0;
    });
  }, [comentarios, periodo]);

  if (!authPronto) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Verificando credenciais...</div>;
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
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400 dark:border-amber-700 font-semibold">
              Satisfação & Experiência
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Star className="size-6 text-amber-500 fill-amber-400" />
            {configAvaliacao.tituloDashboard || "Avaliações e Satisfação dos Usuários"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {configAvaliacao.subtituloDashboard || "Métricas unificadas de satisfação do atendimento, facilidade para abertura de chamados e percepção dos solicitantes."}
          </p>
        </div>

        {/* Filtros de período e navegação rápida */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Mês (mesmo do Dashboard) */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-xl border border-border/60">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Mês:</span>
              <select
                aria-label="Filtrar por Mês"
                className="min-h-[36px] h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue cursor-pointer"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              >
                <option value="todos">Todos os meses</option>
                {MESES_DISPONIVEIS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                  periodo === item.id
                    ? "bg-g-blue text-white border-g-blue shadow-sm font-bold"
                    : "bg-card border-border/80 text-foreground hover:bg-accent shadow-xs"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>

          <Button
            asChild
            variant="outline"
            className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-card hover:bg-accent text-foreground shadow-xs gap-1.5"
          >
            <Link to="/dashboard/acompanhamento">
              <ClipboardList className="size-4 text-g-green shrink-0" />
              <span>Acompanhamento</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Seção Unificada de Gráficos de Satisfação e Facilidade de Abertura */}
      <DashboardSatisfacao mesSelecionado={periodo} semBordaSuperior={true} />

      {/* Lista de Comentários Qualitativos (Anônimos: apenas nota, chamado e data) */}
      <Card className="rounded-2xl border-border/80 shadow-xs mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" /> Comentários Recentes dos Solicitantes
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Feedbacks qualitativos enviados voluntariamente após a conclusão ou abertura dos atendimentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregandoComentarios ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Carregando comentários...</div>
          ) : comentariosFiltrados.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhum comentário em texto registrado no período selecionado.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comentariosFiltrados.slice(0, 15).map((c) => (
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
    </div>
  );
}
