import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FilePlus2, LogIn, ListFilter, Activity, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import labImage from "@/assets/technology-lab.jpg";
import senaiAsset from "@/assets/senai-lrv.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "TI Senai LRV | Início" },
    { name: "description", content: "Abra chamados de TI e acompanhe os indicadores públicos do Senai LRV." },
    { property: "og:title", content: "TI Senai LRV" },
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
      <div className="absolute inset-0 -z-10 bg-card/80" />
      <div className="grid min-h-[330px] gap-7 px-5 py-6 sm:px-9 lg:grid-cols-[minmax(180px,0.46fr)_minmax(0,1fr)_minmax(220px,0.65fr)] lg:items-center">
        <div className="mx-auto w-full max-w-[270px] rounded-2xl bg-[linear-gradient(135deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)] p-1 shadow-lg sm:max-w-[300px]"><img src={senaiAsset.url} alt="SENAI Lucas do Rio Verde" className="h-44 w-full rounded-xl bg-card object-contain p-4 sm:h-60 lg:h-[300px]" /></div>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs font-bold uppercase text-primary shadow-sm"><Activity className="size-4" /> Atendimento de TI · SENAI LRV</p>
          <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">TI Senai LRV</h1>
          <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-foreground">Sua central para registrar problemas de tecnologia e acompanhar o atendimento da unidade.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Button asChild size="lg" variant="google-green"><Link to="/abrir">Abrir chamado <ArrowRight /></Link></Button><Button asChild size="lg" variant="google-blue"><Link to="/dashboard" hash="acompanhamento">Acompanhar chamados <ClipboardList /></Link></Button></div>
        </div>
        <div className="grid gap-3">
          {[["Chamados registrados", total, "border-g-blue", "text-g-blue"], ["Em atendimento", andamento, "border-g-yellow", "text-g-yellow"], ["Resolvidos", resolvidos, "border-g-green", "text-g-green"]].map(([label, count, border, color]) => <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card/90 px-5 py-4 shadow-sm`}><strong className={`block text-3xl ${color}`}>{count}</strong><span className="text-sm text-muted-foreground">{label}</span></div>)}
        </div>
      </div>
      <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
    </section>
    <section className="border-t border-border pt-7"><h2 className="mb-5 text-xl font-bold">Acesso rápido</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Acesso to="/abrir" icon={FilePlus2} titulo="Abrir chamado" descricao="Informe seu nome, local e problema." cor="border-g-green" texto="text-g-green" />
      <Acesso to="/dashboard" icon={BarChart3} titulo="Dashboard" descricao="Veja os indicadores atualizados." cor="border-g-blue" texto="text-g-blue" />
      <Acesso to="/dashboard" icon={ListFilter} titulo="Chamados recorrentes" descricao="Confira os cinco problemas mais frequentes." cor="border-g-red" texto="text-g-red" />
      <Acesso to="/dashboard" icon={Activity} titulo="Status dos chamados" descricao="Acompanhe abertos, pausados e resolvidos." cor="border-g-yellow" texto="text-g-yellow" />
      <Acesso to={isGestor ? "/atendimento" : "/auth"} icon={LogIn} titulo={isGestor ? "Área do gestor" : "Acesso do gestor"} descricao="Atenda e gerencie a planilha completa." cor="border-g-blue" texto="text-g-blue" />
    </div></section>
  </div>;
}

function Acesso({ to, icon: Icon, titulo, descricao, cor, texto }: { to: "/abrir" | "/dashboard" | "/auth" | "/atendimento"; icon: typeof FilePlus2; titulo: string; descricao: string; cor: string; texto: string }) {
  return <Link to={to} className={`group rounded-xl border-t-4 ${cor} bg-card p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}><Icon className={`size-7 ${texto}`} /><h3 className="mt-4 font-semibold">{titulo}</h3><p className="mt-2 min-h-12 text-sm text-muted-foreground">{descricao}</p><ArrowRight className={`mt-3 size-5 ${texto} transition-transform group-hover:translate-x-1`} /></Link>;
}
