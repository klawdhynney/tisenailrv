import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, BarChart3, FilePlus2, LogIn, Activity, ClipboardList, Settings2, Cloud } from "lucide-react";
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

  const categoriasRecorrentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of publicStats) {
      if (r.categoria) {
        mapa.set(r.categoria, (mapa.get(r.categoria) ?? 0) + r.total);
      }
    }
    const lista = [...mapa.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (!lista.length) {
      return [
        { name: "WhatsApp / Comunicação", value: 14 },
        { name: "Internet, rede e VPN", value: 12 },
        { name: "Contas, logins e usuários", value: 11 },
        { name: "Suporte a software e processos", value: 10 },
        { name: "Impressoras e toner", value: 8 },
        { name: "Computador / Notebook", value: 7 },
        { name: "E-mail e Office 365", value: 6 },
        { name: "Projetor / Multimídia", value: 5 },
        { name: "Telefonia", value: 4 },
        { name: "Acesso / Senha", value: 3 },
      ];
    }
    return lista;
  }, [publicStats]);

  return <div className="space-y-9">
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img src={labImage} alt="Ambiente de tecnologia e atendimento de TI" width={1536} height={768} className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-25 dark:opacity-15" />
      <div className="absolute inset-0 -z-10 bg-card/80" />
      <div className="grid min-h-[260px] gap-7 px-5 py-6 sm:px-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.55fr)] lg:items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs font-bold uppercase text-primary shadow-sm"><Activity className="size-4" /> Atendimento de TI · SENAI LRV</p>
          <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">Central de Chamados de TI</h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-foreground">Bem-vindo à Central de Chamados de TI! Para agilizar seu atendimento, seja claro e objetivo ao descrever o problema e informe o local exato onde ele está acontecendo. Essas informações ajudam a identificar a situação e agilizar o atendimento.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" variant="google-green"><Link to="/abrir">Abrir chamado <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="google-blue"><Link to="/dashboard/acompanhamento">Acompanhar chamado <ClipboardList /></Link></Button>
          </div>
        </div>
        <div className="grid gap-3 text-center sm:text-left">
          {[["Chamados registrados", total, "border-g-blue", "text-g-blue"], ["Em atendimento", andamento, "border-g-yellow", "text-g-yellow"], ["Resolvidos", resolvidos, "border-g-green", "text-g-green"]].map(([label, count, border, color]) => <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card/90 px-5 py-4 shadow-sm`}><strong className={`block text-3xl ${color}`}>{count}</strong><span className="text-sm text-muted-foreground">{label}</span></div>)}
        </div>
      </div>
      <div className="h-2 bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
    </section>

    {/* Seção com botões grandes para o usuário comum na versão PC */}
    <section>
      <div className="mb-4 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Serviços Rápidos de TI</h2>
        <p className="text-sm text-muted-foreground">Selecione uma das opções abaixo para solicitar atendimento ou acompanhar seus chamados.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="group flex flex-col justify-between rounded-2xl border-t-4 border-g-yellow bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-g-yellow/15 text-amber-700 dark:text-amber-400">
              <BarChart3 className="size-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">Indicadores e Métricas</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Consulte os dados públicos com gráficos por setor, tipos de problemas recorrentes e cumprimento de prazos.
            </p>
          </div>
          <div className="mt-6 pt-2">
            <Button asChild size="lg" variant="outline" className="w-full text-base font-bold border-2 border-g-yellow/80 hover:bg-g-yellow/10">
              <Link to="/dashboard">
                Ver dashboard completo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
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

    {/* Nuvem com os chamados recorrentes no fim da página inicial */}
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-g-blue/10 text-g-blue">
              <Cloud className="size-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Chamados Recorrentes</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Principais problemas e solicitações atendidas pela TI SENAI LRV
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard">Ver estatísticas <ArrowRight className="size-4" /></Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-4">
        {categoriasRecorrentes.map((item, index) => {
          const maxVal = Math.max(...categoriasRecorrentes.map(c => c.value), 1);
          const weight = item.value / maxVal;
          const corBadge = index % 5 === 0 ? "border-g-blue bg-g-blue/10 text-g-blue"
            : index % 5 === 1 ? "border-g-green bg-g-green/10 text-g-green"
            : index % 5 === 2 ? "border-g-yellow bg-g-yellow/10 text-amber-700 dark:text-amber-400"
            : index % 5 === 3 ? "border-g-purple bg-purple-500/10 text-purple-600 dark:text-purple-400"
            : "border-g-red bg-g-red/10 text-g-red";

          return (
            <Link
              key={item.name}
              to="/abrir"
              title={`Clique para abrir chamado sobre ${item.name}`}
              className={`inline-flex items-center gap-2.5 rounded-2xl border-2 px-4 py-2 font-bold transition-all hover:scale-105 hover:shadow-md cursor-pointer ${corBadge}`}
              style={{
                fontSize: weight > 0.7 ? "1.1rem" : weight > 0.4 ? "0.95rem" : "0.85rem",
              }}
            >
              <span>{item.name}</span>
              <span className="flex size-5.5 items-center justify-center rounded-full bg-background/90 text-xs font-black shadow-xs">
                {item.value}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  </div>;
}

function Acesso({ to, icon: Icon, titulo, descricao, cor, texto }: { to: "/abrir" | "/dashboard" | "/auth" | "/atendimento" | "/regras"; icon: typeof FilePlus2; titulo: string; descricao: string; cor: string; texto: string }) {
  return <Link to={to} className={`group rounded-xl border-t-4 ${cor} bg-card p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}><Icon className={`size-7 ${texto}`} /><h3 className="mt-4 font-semibold">{titulo}</h3><p className="mt-2 min-h-12 text-sm text-muted-foreground">{descricao}</p><ArrowRight className={`mt-3 size-5 ${texto} transition-transform group-hover:translate-x-1`} /></Link>;
}
