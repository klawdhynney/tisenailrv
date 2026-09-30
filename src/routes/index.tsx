import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FilePlus2, LogIn, Activity, ClipboardList, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import labImage from "@/assets/technology-lab.jpg";
import senaiAsset from "@/assets/senai-lrv.png.asset.json";

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
      <div className="absolute inset-0 -z-10 bg-card/80" />
      <div className="grid min-h-[330px] gap-7 px-5 py-6 sm:px-9 lg:grid-cols-[minmax(180px,0.46fr)_minmax(0,1fr)_minmax(220px,0.65fr)] lg:items-center">
         <img src={senaiAsset.url} alt="SENAI Lucas do Rio Verde" className="mx-auto block h-44 w-auto max-w-full rounded-2xl object-contain sm:h-60 lg:h-[300px]" />
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs font-bold uppercase text-primary shadow-sm"><Activity className="size-4" /> Atendimento de TI · SENAI LRV</p>
           <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">TI SENAI LRV</h1>
          <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-foreground">Sua central para registrar problemas de tecnologia e acompanhar o atendimento da unidade.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start"><Button asChild size="lg" variant="google-green"><Link to="/abrir">Abrir chamado <ArrowRight /></Link></Button><Button asChild size="lg" variant="google-blue"><Link to="/dashboard" hash="acompanhamento">Acompanhar chamado <ClipboardList /></Link></Button></div>
        </div>
        <div className="grid gap-3 text-center sm:text-left">
          {[["Chamados registrados", total, "border-g-blue", "text-g-blue"], ["Em atendimento", andamento, "border-g-yellow", "text-g-yellow"], ["Resolvidos", resolvidos, "border-g-green", "text-g-green"]].map(([label, count, border, color]) => <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card/90 px-5 py-4 shadow-sm`}><strong className={`block text-3xl ${color}`}>{count}</strong><span className="text-sm text-muted-foreground">{label}</span></div>)}
        </div>
      </div>
      <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
    </section>
    {isGestor && (
      <section className="border-t border-border pt-7"><h2 className="mb-5 text-xl font-bold">Área do gestor</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Acesso to="/atendimento" icon={LogIn} titulo="Atendimento" descricao="Atenda e gerencie a planilha completa." cor="border-g-green" texto="text-g-green" />
        <Acesso to="/regras" icon={Settings2} titulo="Regras de SLA" descricao="Configure prazos e horários de atendimento." cor="border-g-blue" texto="text-g-blue" />
        <Acesso to="/dashboard" icon={BarChart3} titulo="Dashboard" descricao="Acompanhe métricas e relatórios." cor="border-g-yellow" texto="text-g-yellow" />
      </div></section>
    )}
  </div>;
}

function Acesso({ to, icon: Icon, titulo, descricao, cor, texto }: { to: "/abrir" | "/dashboard" | "/auth" | "/atendimento" | "/regras"; icon: typeof FilePlus2; titulo: string; descricao: string; cor: string; texto: string }) {
  return <Link to={to} className={`group rounded-xl border-t-4 ${cor} bg-card p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}><Icon className={`size-7 ${texto}`} /><h3 className="mt-4 font-semibold">{titulo}</h3><p className="mt-2 min-h-12 text-sm text-muted-foreground">{descricao}</p><ArrowRight className={`mt-3 size-5 ${texto} transition-transform group-hover:translate-x-1`} /></Link>;
}
