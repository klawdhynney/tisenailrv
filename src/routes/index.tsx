import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FilePlus2, Settings2, Table2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mesDoTicket, useStore } from "@/lib/store";
import { calcularSla } from "@/lib/sla";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central de Chamados de TI | Atendimento e SLA" },
      { name: "description", content: "Abra chamados de TI, acompanhe as planilhas mensais, o dashboard interativo e as regras de SLA em um só lugar." },
      { property: "og:title", content: "Central de Chamados de TI" },
      { property: "og:description", content: "Chamados, dashboard interativo e regras de SLA da equipe de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const cards = [
  { to: "/abrir", titulo: "Abrir chamado", texto: "Formulário rápido com setor e local obrigatórios.", icon: FilePlus2, cor: "#EA4335" },
  { to: "/chamados", titulo: "Planilha de chamados", texto: "Abas mensais de setembro a dezembro de 2026.", icon: Table2, cor: "#FBBC05" },
  { to: "/dashboard", titulo: "Dashboard", texto: "Gráficos interativos, SLA e ranking de setores.", icon: BarChart3, cor: "#34A853" },
  { to: "/regras", titulo: "Regras e prioridades", texto: "Prazos, feriados, férias e horário de atendimento.", icon: Settings2, cor: "#4285F4" },
];

function Index() {
  const { tickets, regras } = useStore();
  const mesAtual = tickets.filter((t) => mesDoTicket(t) === "2026-09");
  const abertos = tickets.filter((t) => !["Resolvido", "Cancelado"].includes(t.status)).length;
  const estourados = tickets.filter((t) => calcularSla(t, regras).situacao === "Estourado").length;

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--g-green)]" /> Atendimento de segunda a sexta,{" "}
              {regras.expediente.inicio}–{regras.expediente.fim}
            </span>
            <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
              Central de{" "}
              <span className="text-[var(--g-blue)]">C</span>
              <span className="text-[var(--g-red)]">h</span>
              <span className="text-[var(--g-yellow)]">a</span>
              <span className="text-[var(--g-blue)]">m</span>
              <span className="text-[var(--g-green)]">a</span>
              <span className="text-[var(--g-red)]">dos</span> de TI
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Registre seu problema em menos de um minuto e acompanhe tudo em um painel que se atualiza sozinho:
              prioridades coloridas, SLA com pausas automáticas e gráficos por setor.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/abrir">
                  Abrir chamado <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Ver dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Resumo cor="#4285F4" valor={tickets.length} rotulo="chamados registrados" />
            <Resumo cor="#FBBC05" valor={abertos} rotulo="em atendimento" />
            <Resumo cor="#EA4335" valor={estourados} rotulo="com SLA estourado" />
          </div>
        </div>
        <div className="h-2 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="group">
            <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${c.cor}1A` }}>
                  <c.icon className="h-6 w-6" style={{ color: c.cor }} />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{c.titulo}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.texto}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium" style={{ color: c.cor }}>
                  Acessar <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xl font-semibold">Como o prazo (SLA) é calculado</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Só conta horário útil:</strong> de segunda a sexta, das{" "}
            {regras.expediente.inicio} às {regras.expediente.fim}.
          </p>
          <p><strong className="text-foreground">Pausa automática</strong> em sábados, domingos e feriados.</p>
          <p><strong className="text-foreground">Pausa também</strong> em férias coletivas, férias, viagens a serviço e atestados.</p>
          <p><strong className="text-foreground">Prazos:</strong> Crítica {regras.prazos["Crítica"]}h · Alta {regras.prazos.Alta}h · Média {regras.prazos["Média"]}h · Baixa {regras.prazos.Baixa}h.</p>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Setembro/2026 já está carregado com {mesAtual.length} chamados vindos da sua planilha.
        </p>
      </section>
    </div>
  );
}

function Resumo({ cor, valor, rotulo }: { cor: string; valor: number; rotulo: string }) {
  return (
    <div className="rounded-2xl border border-border p-4" style={{ borderLeftWidth: 6, borderLeftColor: cor }}>
      <p className="text-3xl font-bold" style={{ color: cor }}>{valor}</p>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
    </div>
  );
}
