import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FilePlus2, LogIn, Activity, ClipboardList, Settings2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import labImage from "@/assets/technology-lab.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
     { title: "TI SENAI LRV | Início" },
    { name: "description", content: "Abra chamados de TI e acompanhe os indicadores públicos do Senai LRV." },
     { property: "og:title", content: "TI SENAI LRV" },
    { property: "og:description", content: "Abra chamados e acompanhe os indicadores públicos de atendimento." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Inicio,
});

function Inicio() {
  const { publicStats, isGestor } = useStore();
  const total = publicStats.reduce((n, r) => n + r.total, 0);
  const andamento = publicStats.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
  const resolvidos = publicStats.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);

  return <div className="space-y-9">
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img src={labImage} alt="Ambiente de tecnologia e atendimento de TI" width={1536} height={768} className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-25 dark:opacity-15" />
      <div className="absolute inset-0 -z-10 bg-card/85 backdrop-blur-[1px]" />
      <div className="flex flex-col items-center text-center px-6 py-8 sm:px-10 sm:py-10 max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3.5 py-1 text-xs font-bold uppercase text-primary shadow-xs border border-border/60">
          <Activity className="size-4" /> Atendimento de TI · SENAI LRV
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          Central de Chamados de TI
        </h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-foreground/90 max-w-2xl">
          Bem-vindo à Central de Chamados de TI! Registre aqui o seu chamado de TI.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="google-green" className="shadow-md">
            <Link to="/abrir">Abrir chamado <ArrowRight className="size-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="google-blue" className="shadow-md">
            <Link to="/dashboard/acompanhamento">Acompanhar chamado <ClipboardList className="size-4" /></Link>
          </Button>
        </div>
      </div>
      <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
    </section>

    {/* Seção com botões grandes de serviços e indicadores */}
    <section>
      <div className="mb-4 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Serviços Rápidos de TI</h2>
        <p className="text-sm text-muted-foreground">Selecione uma das opções abaixo para solicitar atendimento ou acompanhar seus chamados.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="group flex flex-col justify-between rounded-2xl border-t-4 border-g-green bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-g-green/15 text-g-green">
              <FilePlus2 className="size-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">Abrir Chamado</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Precisa de suporte? Registre seu problema com setor e descrição detalhada para nossa equipe técnica solucionar.
            </p>
          </div>
          <div className="mt-6 pt-2">
            <Button asChild size="lg" variant="google-green" className="w-full text-base font-bold shadow-md">
              <Link to="/abrir">
                Abrir chamado agora <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="group flex flex-col justify-between rounded-2xl border-t-4 border-g-blue bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-g-blue/15 text-g-blue">
              <ClipboardList className="size-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">Acompanhar Chamados</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Verifique o status, responsável e tempo de atendimento (SLA) em tempo real dos chamados abertos.
            </p>
          </div>
          <div className="mt-6 pt-2">
            <Button asChild size="lg" variant="google-blue" className="w-full text-base font-bold shadow-md">
              <Link to="/dashboard/acompanhamento">
                Acompanhar chamados <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Indicadores: Total de chamados, em atendimento e resolvidos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border-l-4 border-g-blue bg-card p-5 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total de chamados</span>
            <strong className="mt-1 block text-3xl font-black text-g-blue">{total}</strong>
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
            <ClipboardList className="size-6" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border-l-4 border-g-yellow bg-card p-5 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chamados em atendimento</span>
            <strong className="mt-1 block text-3xl font-black text-g-yellow">{andamento}</strong>
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl bg-g-yellow/10 text-amber-700 dark:text-amber-400">
            <Activity className="size-6" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border-l-4 border-g-green bg-card p-5 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chamados resolvidos</span>
            <strong className="mt-1 block text-3xl font-black text-g-green">{resolvidos}</strong>
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl bg-g-green/10 text-g-green">
            <CheckCircle2 className="size-6" />
          </div>
        </div>
      </div>
    </section>

    {isGestor && (
      <section className="border-t border-border pt-7">
        <h2 className="mb-5 text-xl font-bold">Área do gestor</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Acesso to="/atendimento" icon={LogIn} titulo="Atendimento" descricao="Atenda e gerencie a planilha completa." cor="border-g-green" texto="text-g-green" />
          <Acesso to="/regras" icon={Settings2} titulo="Regras de SLA" descricao="Configure prazos e horários de atendimento." cor="border-g-blue" texto="text-g-blue" />
          <Acesso to="/dashboard" icon={BarChart3} titulo="Dashboard" descricao="Acompanhe métricas e relatórios." cor="border-g-yellow" texto="text-g-yellow" />
        </div>
      </section>
    )}
  </div>;
}

function Acesso({ to, icon: Icon, titulo, descricao, cor, texto }: { to: "/abrir" | "/dashboard" | "/auth" | "/atendimento" | "/regras"; icon: typeof FilePlus2; titulo: string; descricao: string; cor: string; texto: string }) {
  return <Link to={to} className={`group rounded-xl border-t-4 ${cor} bg-card p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}><Icon className={`size-7 ${texto}`} /><h3 className="mt-4 font-semibold">{titulo}</h3><p className="mt-2 min-h-12 text-sm text-muted-foreground">{descricao}</p><ArrowRight className={`mt-3 size-5 ${texto} transition-transform group-hover:translate-x-1`} /></Link>;
}
