import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FilePlus2, Activity, ClipboardList, CheckCircle2, Star, ExternalLink, Clock, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { AVALIACAO_PADRAO } from "@/lib/types";
import capaPng from "@/assets/capa.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TI SENAI LRV | Início" },
      { name: "description", content: "Central de Chamados de TI do Senai LRV." },
      { property: "og:title", content: "TI SENAI LRV" },
      { property: "og:description", content: "Central de Chamados de TI e indicadores públicos." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/capa.png?v=20261006_v6" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/capa.png?v=20261006_v6" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { publicStats, dailyStats, evaluationStats, regras, isGestor, isAdmin } = useStore();
  const total = publicStats.reduce((n, r) => n + r.total, 0);
  const andamento = publicStats
    .filter((r) => !["Resolvido", "Cancelado"].includes(r.status))
    .reduce((n, r) => n + r.total, 0);
  const resolvidos = publicStats
    .filter((r) => r.status === "Resolvido")
    .reduce((n, r) => n + r.total, 0);

  const chamadosDia = dailyStats?.chamadosDoDia ?? 0;
  const atendidosDia = dailyStats?.atendidosNoDia ?? 0;

  const badgeTexto = regras.paginaInicial?.badgeTexto || "Atendimento de TI · SENAI LRV";
  const tituloPrincipal = regras.paginaInicial?.titulo || "Bem-vindo à Central de Chamados de TI!";
  const subtituloPrincipal = regras.paginaInicial?.subtitulo || "Central oficial de suporte e serviços de Tecnologia da Informação do SENAI Lucas do Rio Verde.";

  const posicaoCapa = regras.paginaInicial?.posicaoCapa || "centro";
  const posicaoCapaClass =
    posicaoCapa === "topo"
      ? "object-top"
      : posicaoCapa === "base"
      ? "object-bottom"
      : "object-center";

  const indTotal = regras.indicadores?.total ?? { titulo: "Total de chamados", desc: "Quantidade de chamados registrados.", ativo: true };
  const indAtend = regras.indicadores?.atendimento ?? { titulo: "Em atendimento", desc: "Chamados que estão sendo tratados pela equipe de TI.", ativo: true };
  const indResolv = regras.indicadores?.resolvidos ?? { titulo: "Resolvidos", desc: "Chamados que já foram concluídos.", ativo: true };
  const indDia = regras.indicadores?.chamadosDia ?? { titulo: "Chamados do dia", desc: "Chamados abertos hoje.", ativo: true };
  const indAtendDia = regras.indicadores?.atendidosDia ?? { titulo: "Atendidos no dia", desc: "Chamados concluídos hoje.", ativo: true };

  return (
    <div className="space-y-9">
      {/* Hero com Título e Indicadores de Desempenho integrados junto à descrição */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="absolute inset-0 -z-20 h-full w-full overflow-hidden">
          <img
            src={capaPng}
            alt="TI SENAI Lucas do Rio Verde"
            width={2048}
            height={768}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover ${posicaoCapaClass} opacity-15 dark:opacity-10`}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-card/85 backdrop-blur-[1px]" />
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-3 sm:px-10 sm:pt-10 max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3.5 py-1 text-xs font-bold uppercase text-primary shadow-xs border border-border/60">
            <Activity className="size-4" /> {badgeTexto}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {tituloPrincipal}
          </h1>
          {subtituloPrincipal && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {subtituloPrincipal}
            </p>
          )}
        </div>

        {/* Indicadores de desempenho ocupando a largura total da página */}
        <div className="w-full px-4 sm:px-6 md:px-8 pb-8 pt-2">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 text-left w-full">
            {indTotal.ativo && (
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-blue bg-card/95 p-4 sm:p-5 shadow-sm backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {indTotal.titulo}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-g-blue">{total}</strong>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue shrink-0 ml-2">
                    <ClipboardList className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                  {indTotal.desc}
                </p>
              </div>
            )}

            {indAtend.ativo && (
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-yellow bg-card/95 p-4 sm:p-5 shadow-sm backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {indAtend.titulo}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-g-yellow">{andamento}</strong>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-g-yellow/10 text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                    <Activity className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                  {indAtend.desc}
                </p>
              </div>
            )}

            {indResolv.ativo && (
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-green bg-card/95 p-4 sm:p-5 shadow-sm backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {indResolv.titulo}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-g-green">{resolvidos}</strong>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-g-green/10 text-g-green shrink-0 ml-2">
                    <CheckCircle2 className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                  {indResolv.desc}
                </p>
              </div>
            )}

            {indDia.ativo !== false && (
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-sky-500 bg-card/95 p-4 sm:p-5 shadow-sm backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {indDia.titulo}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-sky-600 dark:text-sky-400">{chamadosDia}</strong>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 ml-2">
                    <Clock className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                  {indDia.desc}
                </p>
              </div>
            )}

            {indAtendDia.ativo !== false && (
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-teal-500 bg-card/95 p-4 sm:p-5 shadow-sm backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {indAtendDia.titulo}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-teal-600 dark:text-teal-400">{atendidosDia}</strong>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 ml-2">
                    <CheckCheck className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                  {indAtendDia.desc}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
      </section>

      {/* Seção com botões de serviços */}
      <section>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="group flex flex-col justify-between rounded-2xl border-t-4 border-g-green bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-g-green/15 text-g-green">
                <FilePlus2 className="size-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                {regras.paginaInicial?.cardAbrirTitulo || "Abrir Chamado"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {regras.paginaInicial?.cardAbrirDesc || "Registre solicitações de suporte, incidentes e demandas técnicas para triagem e atendimento imediato."}
              </p>
            </div>
            <div className="mt-6 pt-2">
              <Button asChild size="lg" variant="google-green" className="w-full text-base font-bold shadow-md">
                <Link to="/abrir">
                  {regras.paginaInicial?.cardAbrirBotao || "Abrir chamado agora"} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="group flex flex-col justify-between rounded-2xl border-t-4 border-g-blue bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-g-blue/15 text-g-blue">
                <ClipboardList className="size-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                {regras.paginaInicial?.cardAcompTitulo || "Acompanhar Chamados"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {regras.paginaInicial?.cardAcompDesc || "Consulte o status operacional, prazos de SLA e histórico detalhado das solicitações registradas."}
              </p>
            </div>
            <div className="mt-6 pt-2">
              <Button asChild size="lg" variant="google-blue" className="w-full text-base font-bold shadow-md">
                <Link to="/dashboard/acompanhamento">
                  {regras.paginaInicial?.cardAcompBotao || "Acompanhar chamados"} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Resumo de Avaliações dos Usuários (Dados Agregados com Estrito Sigilo) */}
      {(regras.avaliacoes?.exibirResumoInicio ?? AVALIACAO_PADRAO.exibirResumoInicio) && (
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                <Star className="size-4 fill-amber-400 text-amber-500" />
                <span>Opinião e Satisfação</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {regras.avaliacoes?.tituloResumoInicio || AVALIACAO_PADRAO.tituloResumoInicio}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {regras.avaliacoes?.descricaoResumoInicio || AVALIACAO_PADRAO.descricaoResumoInicio}
              </p>
            </div>

            {(isGestor || isAdmin) && (
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto">
                <Link to="/dashboard/avaliacoes">
                  Ver avaliações completas <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {evaluationStats.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center space-y-2">
              <Star className="size-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-bold text-foreground">Ainda não há avaliações.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                As métricas consolidadas aparecerão automaticamente assim que os usuários abrirem chamados e avaliarem a facilidade de atendimento.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Nota Média Geral com Estrelas */}
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-amber-500 bg-card p-5 shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nota Média Geral
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <strong className="text-3xl font-black text-foreground">
                      {evaluationStats.media.toFixed(1)}
                    </strong>
                    <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const fill = evaluationStats.media >= val;
                      const half = !fill && evaluationStats.media >= val - 0.5;
                      return (
                        <Star
                          key={val}
                          className={`size-4 ${
                            fill
                              ? "fill-amber-400 text-amber-500"
                              : half
                              ? "fill-amber-400/50 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
                  Média geral baseada na facilidade de registrar os chamados.
                </p>
              </div>

              {/* Card 2: Total de Avaliações */}
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-blue bg-card p-5 shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total de Avaliações
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <strong className="text-3xl font-black text-g-blue">
                      {evaluationStats.total}
                    </strong>
                    <span className="text-xs text-muted-foreground font-semibold">respostas</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
                  Quantidade total de feedbacks voluntários coletados.
                </p>
              </div>

              {/* Card 3: Percentual de Satisfação (Notas 4 e 5) */}
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-green bg-card p-5 shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Índice de Satisfação
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <strong className="text-3xl font-black text-g-green">
                      {evaluationStats.satisfacao_pct}%
                    </strong>
                    <span className="text-xs text-muted-foreground font-semibold">aprovação</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
                  Percentual de solicitantes que avaliaram com notas 4 ou 5.
                </p>
              </div>

              {/* Card 4: Distribuição de 1 a 5 em Barras Pequenas */}
              <div className="flex flex-col justify-between rounded-2xl border-l-4 border-purple-500 bg-card p-5 shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Distribuição (1 a 5)
                  </span>
                  <div className="space-y-1.5">
                    {([5, 4, 3, 2, 1] as const).map((n) => {
                      const count = evaluationStats.distribuicao[n] || 0;
                      const pct = evaluationStats.total > 0 ? Math.round((count / evaluationStats.total) * 100) : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-[11px]">
                          <span className="w-5 font-semibold text-muted-foreground flex items-center gap-0.5 shrink-0">
                            {n}<Star className="size-2.5 fill-amber-400 text-amber-500 inline" />
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                n >= 4 ? "bg-g-green" : n === 3 ? "bg-amber-400" : "bg-g-red"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-7 text-right font-mono text-muted-foreground text-[10px] shrink-0">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
