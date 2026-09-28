import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "CENTRAL DE CHAMADOS DE TI SENAI LRV | Início" },
    { name: "description", content: "Abra um chamado de TI e acompanhe os indicadores públicos do SENAI LRV." },
    { property: "og:title", content: "CENTRAL DE CHAMADOS DE TI SENAI LRV" },
    { property: "og:description", content: "Abra um chamado de TI e acompanhe os indicadores públicos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Inicio,
});

function Inicio() {
  const { publicStats } = useStore();
  const total = publicStats.reduce((n, r) => n + r.total, 0);
  const andamento = publicStats.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
  return <div className="space-y-12">
    <section className="border-b-4 border-primary py-8 sm:py-12">
      <p className="text-sm font-bold uppercase text-muted-foreground">Atendimento de TI • SENAI LRV</p>
      <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-primary sm:text-5xl">CENTRAL DE CHAMADOS DE TI SENAI LRV</h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">Registre sua solicitação com a conta Microsoft institucional e acompanhe os indicadores de atendimento.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/abrir">Abrir chamado <ArrowRight className="ml-2 size-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/dashboard">Ver dashboard</Link></Button></div>
    </section>
    <div className="grid gap-5 sm:grid-cols-2">
      <Link to="/abrir" className="group border-l-4 border-g-green bg-card p-6 transition-colors hover:bg-muted"><FilePlus2 className="size-7 text-g-green" /><h2 className="mt-4 text-xl font-semibold">Abrir chamado</h2><p className="mt-2 text-muted-foreground">Informe seu setor, local e o que precisa de atendimento.</p><ArrowRight className="mt-5 size-5 text-primary transition-transform group-hover:translate-x-1" /></Link>
      <Link to="/dashboard" className="group border-l-4 border-g-blue bg-card p-6 transition-colors hover:bg-muted"><BarChart3 className="size-7 text-g-blue" /><h2 className="mt-4 text-xl font-semibold">Dashboard público</h2><p className="mt-2 text-muted-foreground">Acompanhe a evolução dos chamados sem expor informações pessoais.</p><ArrowRight className="mt-5 size-5 text-primary transition-transform group-hover:translate-x-1" /></Link>
    </div>
    <div className="flex flex-wrap gap-12 border-t border-border py-7 text-sm"><p><strong className="block text-3xl text-primary">{total}</strong> chamados registrados</p><p><strong className="block text-3xl text-primary">{andamento}</strong> em atendimento</p></div>
  </div>;
}