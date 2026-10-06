import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, ArrowRight, ShieldCheck, Cpu, BarChart3, Laptop } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { SOBRE_PADRAO } from "@/lib/types";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o Sistema de Suporte | TI SENAI LRV" },
      {
        name: "description",
        content:
          "Conheça o Sistema de Suporte de TI do SENAI LRV: abertura simplificada de chamados, gestão com inteligência, IA moderna e conformidade com a LGPD.",
      },
      { property: "og:title", content: "Sobre o Sistema de Suporte | TI SENAI LRV" },
      {
        property: "og:description",
        content:
          "Plataforma moderna de atendimento e gestão de chamados de tecnologia com alta eficiência e segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaSobre,
});

function PaginaSobre() {
  const { regras } = useStore();
  const config = { ...SOBRE_PADRAO, ...(regras.sobre ?? {}) };

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 px-1 sm:px-4 py-2 sm:py-4">
      {/* Hero Institucional */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        <div className="px-5 py-8 sm:px-10 sm:py-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-g-blue/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-g-blue border border-g-blue/20">
            <Info className="size-4" /> Informações Institucionais
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Central de Suporte e Atendimento de TI
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Conheça o propósito, a arquitetura e os pilares de tecnologia que impulsionam o suporte no SENAI Lucas do Rio Verde.
          </p>
        </div>
      </section>

      {/* Grid de Seções */}
      <div className="space-y-5 sm:space-y-6">
        {/* Seção 1: Sobre o Sistema */}
        <Card className="rounded-2xl border-l-4 border-g-blue bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>{config.secao1Titulo}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground text-justify sm:text-left whitespace-pre-wrap">
              {config.secao1Texto}
            </p>
          </CardContent>
        </Card>

        {/* Seção 2: Inteligência e Gestão */}
        <Card className="rounded-2xl border-l-4 border-g-yellow bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>{config.secao2Titulo}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground text-justify sm:text-left whitespace-pre-wrap">
              {config.secao2Texto}
            </p>
            <div className="pt-1">
              <Button asChild variant="outline" size="sm" className="font-semibold text-xs gap-1.5 h-9">
                <Link to="/dashboard">
                  <BarChart3 className="size-3.5 text-g-blue" />
                  <span>Acessar o Dashboard</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Tecnologia Moderna com IA */}
        <Card className="rounded-2xl border-l-4 border-purple-500 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>{config.secao3Titulo}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground text-justify sm:text-left whitespace-pre-wrap">
              {config.secao3Texto}
            </p>
          </CardContent>
        </Card>

        {/* Seção 4: Privacidade e LGPD */}
        <Card className="rounded-2xl border-l-4 border-g-green bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center flex-wrap gap-2">
              <Link
                to="/lgpd"
                className="hover:underline underline-offset-4 text-foreground hover:text-g-green transition-colors inline-flex items-center gap-1.5"
                title="Acessar Política de Privacidade e LGPD completa"
              >
                <span>{config.secao4Titulo}</span>
                <ArrowRight className="size-4 text-g-green inline shrink-0" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground text-justify sm:text-left whitespace-pre-wrap">
              {config.secao4Texto}
            </p>
            <div className="pt-1">
              <Button asChild variant="outline" size="sm" className="font-semibold text-xs gap-1.5 h-9">
                <Link to="/lgpd">
                  <ShieldCheck className="size-3.5 text-g-green" />
                  <span>Ler a Política de Privacidade e LGPD completa</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
