import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FilePlus2, Activity, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import labImage from "@/assets/technology-lab.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TI SENAI LRV | Início" },
      { name: "description", content: "Central de Chamados de TI do Senai LRV." },
      { property: "og:title", content: "TI SENAI LRV" },
      { property: "og:description", content: "Central de Chamados de TI e indicadores públicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { publicStats } = useStore();
  const total = publicStats.reduce((n, r) => n + r.total, 0);
  const andamento = publicStats
    .filter((r) => !["Resolvido", "Cancelado"].includes(r.status))
    .reduce((n, r) => n + r.total, 0);
  const resolvidos = publicStats
    .filter((r) => r.status === "Resolvido")
    .reduce((n, r) => n + r.total, 0);

  return (
    <div className="space-y-9">
      {/* Hero com Título e Indicadores de Desempenho integrados junto à descrição */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <img
          src={labImage}
          alt="Ambiente de tecnologia e atendimento de TI"
          width={1536}
          height={768}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-25 dark:opacity-15"
        />
        <div className="absolute inset-0 -z-10 bg-card/85 backdrop-blur-[1px]" />
        <div className="flex flex-col items-center text-center px-6 py-8 sm:px-10 sm:py-10 max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3.5 py-1 text-xs font-bold uppercase text-primary shadow-xs border border-border/60">
            <Activity className="size-4" /> Atendimento de TI · SENAI LRV
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            Bem-vindo à Central de Chamados de TI!
          </h1>

          {/* Indicadores de desempenho posicionados junto à descrição */}
          <div className="mt-8 w-full grid gap-4 sm:grid-cols-3 text-left">
            <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-blue bg-card/95 p-5 shadow-sm backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total de chamados
                  </span>
                  <strong className="mt-1 block text-3xl font-black text-g-blue">{total}</strong>
                </div>
                <div className="flex size-12 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue shrink-0 ml-2">
                  <ClipboardList className="size-6" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                Quantidade de chamados registrados.
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-yellow bg-card/95 p-5 shadow-sm backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Em atendimento
                  </span>
                  <strong className="mt-1 block text-3xl font-black text-g-yellow">{andamento}</strong>
                </div>
                <div className="flex size-12 items-center justify-center rounded-xl bg-g-yellow/10 text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                  <Activity className="size-6" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                Chamados que estão sendo tratados pela equipe de TI.
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-l-4 border-g-green bg-card/95 p-5 shadow-sm backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Resolvidos
                  </span>
                  <strong className="mt-1 block text-3xl font-black text-g-green">{resolvidos}</strong>
                </div>
                <div className="flex size-12 items-center justify-center rounded-xl bg-g-green/10 text-g-green shrink-0 ml-2">
                  <CheckCircle2 className="size-6" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80 leading-snug">
                Chamados que já foram concluídos.
              </p>
            </div>
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
              <h2 className="mt-4 text-xl font-bold text-foreground">Abrir Chamado</h2>
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
              <h2 className="mt-4 text-xl font-bold text-foreground">Acompanhar Chamados</h2>
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
      </section>
    </div>
  );
}
