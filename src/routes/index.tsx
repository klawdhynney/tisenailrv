import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FilePlus2, Activity, ClipboardList, CheckCircle2, Star, ExternalLink, Clock, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { AVALIACAO_PADRAO } from "@/lib/types";
import capaInicioPng from "@/assets/capa-inicio.png";

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
    links: [
      { rel: "preload", href: capaInicioPng, as: "image", fetchPriority: "high" },
    ],
  }),
  component: Inicio,
});

/* ── Helper: Cartão compacto de indicador (reutilizado em desktop e mobile) ── */
function IndicadorCard({
  titulo,
  valor,
  desc,
  cor,
  corTexto,
  icone: Icone,
  className = "",
}: {
  titulo: string;
  valor: number;
  desc: string;
  cor: string;        // ex: "border-g-blue"
  corTexto: string;   // ex: "text-g-blue"
  icone: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={`hero-ind-card flex flex-col justify-between rounded-xl border-l-[3.5px] ${cor} p-2.5 xl:p-3 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <span className="block text-[10.5px] xl:text-[11.5px] font-bold uppercase tracking-tight text-white/80 leading-[1.15] min-h-[25px]">
            {titulo}
          </span>
          <strong className={`mt-1 block text-xl xl:text-2xl font-black ${corTexto} font-mono leading-none`}>
            {valor}
          </strong>
        </div>
        <div className={`flex size-7 xl:size-8 items-center justify-center rounded-lg ${corTexto} bg-white/10 shrink-0 mt-0.5`}>
          <Icone className="size-3.5 xl:size-4" />
        </div>
      </div>
      <p className="mt-1.5 text-[10.5px] xl:text-[11.5px] text-white/75 leading-tight line-clamp-2">
        {desc}
      </p>
    </div>
  );
}

/* ── Helper: Cartão de indicador para mobile (tema card normal) ── */
function IndicadorCardMobile({
  titulo,
  valor,
  desc,
  cor,
  corTexto,
  corIconeBg,
  icone: Icone,
  className = "",
}: {
  titulo: string;
  valor: number;
  desc: string;
  cor: string;
  corTexto: string;
  corIconeBg: string;
  icone: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border-l-4 ${cor} bg-card dark:bg-card/95 p-3 shadow-md border-y border-r border-border/40 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {titulo}
          </span>
          <strong className={`mt-0.5 block text-xl font-black ${corTexto} font-mono`}>{valor}</strong>
        </div>
        <div className={`flex size-8 items-center justify-center rounded-lg ${corIconeBg} shrink-0 ml-2`}>
          <Icone className="size-4" />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
        {desc}
      </p>
    </div>
  );
}

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

  const tituloPrincipal = regras.paginaInicial?.titulo || "Bem-vindo à Central de Chamados de TI.";
  const subtituloPrincipal = regras.paginaInicial?.subtitulo || "Central oficial de suporte e serviços de Tecnologia da Informação do SENAI Lucas do Rio Verde.";

  const bannerUrlCustom = regras.paginaInicial?.bannerUrl?.trim();
  const bannerSrc =
    bannerUrlCustom &&
    bannerUrlCustom !== "/capa.png" &&
    bannerUrlCustom !== "/capa.webp" &&
    bannerUrlCustom !== "/capa.jpg"
      ? bannerUrlCustom
      : capaInicioPng;

  const indTotal = regras.indicadores?.total ?? { titulo: "Total de chamados", desc: "Quantidade de chamados registrados.", ativo: true };
  const indAtend = regras.indicadores?.atendimento ?? { titulo: "Em atendimento", desc: "Chamados que estão sendo tratados pela equipe de TI.", ativo: true };
  const indResolvRaw = regras.indicadores?.resolvidos ?? { titulo: "Finalizados", desc: "Chamados que já foram concluídos e finalizados.", ativo: true };
  const indResolv = {
    ...indResolvRaw,
    titulo: indResolvRaw.titulo === "Resolvidos" ? "Finalizados" : indResolvRaw.titulo || "Finalizados",
  };
  const indDia = regras.indicadores?.chamadosDia ?? { titulo: "Chamados do dia", desc: "Chamados abertos hoje.", ativo: true };
  const indAtendDia = regras.indicadores?.atendidosDia ?? { titulo: "Atendidos no dia", desc: "Chamados concluídos hoje.", ativo: true };

  /* Monta lista de indicadores ativos */
  const indicadores = [
    indTotal.ativo && { ...indTotal, valor: total, cor: "border-g-blue", corTexto: "text-g-blue", corIconeBg: "bg-g-blue/10 text-g-blue", icone: ClipboardList },
    indAtend.ativo && { ...indAtend, valor: andamento, cor: "border-g-yellow", corTexto: "text-g-yellow", corIconeBg: "bg-g-yellow/10 text-amber-600 dark:text-amber-400", icone: Activity },
    indResolv.ativo && { ...indResolv, valor: resolvidos, cor: "border-g-green", corTexto: "text-g-green", corIconeBg: "bg-g-green/10 text-g-green", icone: CheckCircle2 },
    indDia.ativo !== false && { ...indDia, valor: chamadosDia, cor: "border-sky-500", corTexto: "text-sky-400", corIconeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icone: Clock },
    indAtendDia.ativo !== false && { ...indAtendDia, valor: atendidosDia, cor: "border-teal-500", corTexto: "text-teal-400", corIconeBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400", icone: CheckCheck },
  ].filter(Boolean) as Array<{
    titulo: string; desc: string; valor: number; cor: string; corTexto: string; corIconeBg: string;
    icone: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <div className="space-y-5">
      {/* ═══ HERO: Capa full + texto + indicadores dentro da capa ═══ */}
      <section className="hero-section relative isolate overflow-visible rounded-2xl border border-border/80 bg-[#031446] shadow-md">

        {/* ── Desktop (≥1024px): imagem com proporção nativa, texto no topo e indicadores na base ── */}
        <div className="hero-desktop hidden lg:block relative rounded-2xl overflow-hidden">
          {/* Imagem de Fundo (Capa) — proporção nativa 1024×384 sem corte */}
          <img
            src={bannerSrc}
            alt={regras.paginaInicial?.bannerAlt || "TI SENAI Lucas do Rio Verde"}
            width={1024}
            height={384}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="block w-full h-auto"
            style={{ aspectRatio: "1024 / 384" }}
          />

          {/* Camada Escura: Degradê Azul-Marinho Semitransparente — reforçada
              para manter a marca d'água "TI SENAI / LUCAS DO RIO VERDE" discreta */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(3,20,70,0.82) 0%, rgba(3,20,70,0.68) 35%, rgba(3,20,70,0.60) 60%, rgba(3,20,70,0.75) 100%)",
            }}
          />

          {/* Degradê radial centrado no bloco de texto — legibilidade sobre a marca d'água */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 85% 75% at 50% 38%, rgba(3,20,70,0.45) 0%, transparent 100%)",
            }}
          />

          {/* Hover: escurecer a capa ao passar o mouse (somente pointer:fine + respeitando reduced-motion) */}
          <div className="hero-hover-overlay absolute inset-0 bg-[#031446]/0 transition-colors duration-300 pointer-events-none" />

          {/* Conteúdo: texto no topo, indicadores na base */}
          <div className="absolute inset-0 flex flex-col justify-between px-6 xl:px-8">
            {/* Bloco de texto: topo */}
            <div className="flex flex-col items-center text-center pt-6 xl:pt-8 max-w-[820px] mx-auto">
              <h1
                className="text-[clamp(1.45rem,2.1vw,2.35rem)] font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] tracking-tight whitespace-nowrap"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                {tituloPrincipal}
              </h1>

              {subtituloPrincipal && (
                <p
                  className="mt-[clamp(0.75rem,1.2vw,1.15rem)] text-[clamp(0.92rem,1.18vw,1.12rem)] text-white/95 max-w-[820px] font-normal drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] leading-[1.55]"
                  style={{
                    textWrap: "balance",
                  } as React.CSSProperties}
                >
                  {subtituloPrincipal}
                </p>
              )}
            </div>

            {/* Indicadores: base da capa — 5 cartões compactos translúcidos em linha única */}
            <div
              className="hero-indicators-row grid gap-2.5 pb-4 xl:pb-5"
              style={{
                gridTemplateColumns: `repeat(${indicadores.length}, minmax(0, 1fr))`,
              }}
            >
              {indicadores.map((ind) => (
                <IndicadorCard
                  key={ind.titulo}
                  titulo={ind.titulo}
                  valor={ind.valor}
                  desc={ind.desc}
                  cor={ind.cor}
                  corTexto={ind.corTexto}
                  icone={ind.icone}
                />
              ))}
            </div>
          </div>

          {/* Faixa Colorida na Base do Hero */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        </div>

        {/* ── Tablet e Celular (<1024px): capa inteira no topo + bloco contínuo com texto e indicadores ── */}
        <div className="hero-mobile lg:hidden">
          {/* Imagem inteira sem corte */}
          <img
            src={bannerSrc}
            alt={regras.paginaInicial?.bannerAlt || "TI SENAI Lucas do Rio Verde"}
            width={1024}
            height={384}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="block w-full h-auto rounded-t-2xl"
            style={{ aspectRatio: "1024 / 384" }}
          />

          {/* Bloco texto + indicadores com fundo azul-marinho contínuo em degradê */}
          <div
            className="flex flex-col items-center text-center px-4 sm:px-6 pt-5 sm:pt-6 pb-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(3,20,70,0.96) 0%, rgba(3,20,70,1) 100%)",
            }}
          >
            <h1
              className="text-[clamp(1.2rem,4vw,1.85rem)] font-black leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] tracking-tight"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {tituloPrincipal}
            </h1>

            {subtituloPrincipal && (
              <p
                className="mt-2 text-[clamp(0.85rem,2.5vw,1.05rem)] text-white/90 max-w-[680px] font-normal drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                style={{ textWrap: "balance", lineHeight: 1.55 } as React.CSSProperties}
              >
                {subtituloPrincipal}
              </p>
            )}

            {/* Indicadores tablet/celular: grid responsivo balanceado sem cartão solitário desalinhado */}
            <div className="mt-5 w-full grid gap-2.5 sm:gap-3.5 grid-cols-2 sm:grid-cols-6">
              {indicadores.map((ind, idx) => {
                const ehUltimoImpar = indicadores.length % 2 !== 0 && idx === indicadores.length - 1;
                const mobileSpan = ehUltimoImpar ? "col-span-2 max-w-[340px] justify-self-center w-full" : "col-span-1";
                // Tablet (sm:grid-cols-6): com 5 itens, 3 primeiros col-span-2 (3x2=6), 2 últimos col-span-3 (2x3=6)
                const tabletSpan =
                  indicadores.length === 5
                    ? idx < 3
                      ? "sm:col-span-2"
                      : "sm:col-span-3"
                    : indicadores.length === 4
                    ? "sm:col-span-3"
                    : "sm:col-span-2";

                return (
                  <IndicadorCardMobile
                    key={ind.titulo}
                    titulo={ind.titulo}
                    valor={ind.valor}
                    desc={ind.desc}
                    cor={ind.cor}
                    corTexto={ind.corTexto}
                    corIconeBg={ind.corIconeBg}
                    icone={ind.icone}
                    className={`${mobileSpan} ${tabletSpan}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Faixa Colorida na Base */}
          <div className="h-2 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)] rounded-b-2xl" />
        </div>
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
