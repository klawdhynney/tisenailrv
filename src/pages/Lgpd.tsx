import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  FileText,
  AlertTriangle,
  Target,
  Share2,
  Lock,
  Scale,
  RefreshCw,
  Clock,
  FilePlus2,
  CheckCircle2,
  Building2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store-context";
import { LGPD_PADRAO } from "@/lib/types";

export function LgpdPage() {
  const { regras } = useStore();
  const config = { ...LGPD_PADRAO, ...(regras.lgpd ?? {}) };

  // Helper para renderizar texto com quebras de linha e marcadores
  const renderizarTextoComMarcadores = (texto: string) => {
    const linhas = texto.split("\n");
    return (
      <div className="space-y-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
        {linhas.map((linha, idx) => {
          const l = linha.trim();
          if (!l) return <div key={idx} className="h-1.5" />;
          if (l.startsWith("•") || l.startsWith("-")) {
            const conteudo = l.replace(/^[•-]\s*/, "");
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-foreground/90">{conteudo}</span>
              </div>
            );
          }
          return (
            <p key={idx} className="text-foreground/90">
              {l}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-2 py-2 sm:px-4">
      {/* Botão de retorno ao topo */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-2 font-medium">
          <Link to="/">
            <ArrowLeft className="size-4" /> Voltar para o início
          </Link>
        </Button>
      </div>

      {/* Hero com Título e Subtítulo */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        <div className="px-6 py-8 sm:px-10 sm:py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-g-blue/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-g-blue border border-g-blue/20">
            <ShieldCheck className="size-4" /> Lei Geral de Proteção de Dados (LGPD)
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {config.titulo}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {config.subtitulo}
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/60">
            <Clock className="size-3.5 text-g-blue" />
            <span>{config.ultimaAtualizacao}</span>
          </div>
        </div>
      </section>

      {/* Seções com conteúdo detalhado */}
      <div className="space-y-6">
        {/* Painel de Identificação Legal e DPO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Card className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-g-blue/15 text-g-blue">
                <Building2 className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Controlador</p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{config.controlador || "SENAI Lucas do Rio Verde - MT"}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-g-green/15 text-g-green">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Encarregado (DPO)</p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{config.encarregado || "Encarregado de Proteção de Dados (DPO) SENAI-MT"}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-g-yellow/15 text-amber-600 dark:text-amber-400">
                <Mail className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail do DPO</p>
                <a
                  href={`mailto:${config.emailEncarregado || "dpo@sfiemt.ind.br"}`}
                  className="text-xs sm:text-sm font-bold text-g-blue hover:underline mt-0.5 block break-all"
                >
                  {config.emailEncarregado || "dpo@sfiemt.ind.br"}
                </a>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Scale className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Base Legal Principal</p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{config.baseLegal || "Execução de contrato e legítimo interesse institucional (Art. 7º, V e IX da LGPD)"}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs sm:col-span-2">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-g-red/15 text-g-red">
                <Clock className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prazo de Guarda</p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{config.prazoGuarda || "5 anos após encerramento do chamado para auditoria de SLA e conformidade"}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 1. Quem é o responsável pelos dados */}
        <Card className="rounded-2xl border-l-4 border-g-blue shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-g-blue/15 text-g-blue">
                <UserCheck className="size-5" />
              </span>
              Quem é o responsável pelos dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.responsavel)}
          </CardContent>
        </Card>

        {/* 2. Quais dados coletamos */}
        <Card className="rounded-2xl border-l-4 border-g-green shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-g-green/15 text-g-green">
                <FileText className="size-5" />
              </span>
              Quais dados coletamos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderizarTextoComMarcadores(config.dadosColetados)}
          </CardContent>
        </Card>

        {/* 3. Para que usamos seus dados */}
        <Card className="rounded-2xl border-l-4 border-g-yellow shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-g-yellow/15 text-amber-600 dark:text-amber-400">
                <Target className="size-5" />
              </span>
              Para que usamos seus dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.finalidade)}
          </CardContent>
        </Card>

        {/* 4. Compartilhamento */}
        <Card className="rounded-2xl border-l-4 border-purple-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Share2 className="size-5" />
              </span>
              Compartilhamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.compartilhamento)}
          </CardContent>
        </Card>

        {/* 5. Segurança e tempo de guarda */}
        <Card className="rounded-2xl border-l-4 border-g-red shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-g-red/15 text-g-red">
                <Lock className="size-5" />
              </span>
              Segurança e tempo de guarda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.seguranca)}
          </CardContent>
        </Card>

        {/* 6. Seus direitos */}
        <Card className="rounded-2xl border-l-4 border-g-blue shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-g-blue/15 text-g-blue">
                <Scale className="size-5" />
              </span>
              Seus direitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.direitos)}
          </CardContent>
        </Card>

        {/* 7. Mudanças nesta página */}
        <Card className="rounded-2xl border-l-4 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <RefreshCw className="size-5" />
              </span>
              Mudanças nesta página
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderizarTextoComMarcadores(config.mudancas)}
          </CardContent>
        </Card>
      </div>

      {/* Ações inferiores */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border">
        <Button asChild variant="outline" size="lg" className="font-semibold">
          <Link to="/">
            <ArrowLeft className="mr-2 size-4" /> Voltar para o início
          </Link>
        </Button>
        <Button asChild variant="google-green" size="lg" className="font-bold shadow-md">
          <Link to="/abrir">
            <FilePlus2 className="mr-2 size-4" /> Abrir chamado
          </Link>
        </Button>
      </div>
    </div>
  );
}
