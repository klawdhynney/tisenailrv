import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ChartArea, ClipboardList, Download, Eye, PieChartIcon, Printer, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlaChip } from "@/components/Chips";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import type { Ticket } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { MESES_DISPONIVEIS, PRIORIDADES, STATUS_LIST, CORES_PRIORIDADE, CORES_STATUS, type Prioridade, type Status } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard público | TI Senai LRV" },
    { name: "description", content: "Gráficos interativos e indicadores públicos dos chamados de TI Senai LRV." },
    { property: "og:title", content: "Dashboard de chamados | TI Senai LRV" },
    { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

const CORES = ["var(--g-blue)", "var(--g-red)", "var(--g-yellow)", "var(--g-green)", "var(--chart-4)", "var(--chart-5)"];
const VISOES = [
  { id: "problemas", label: "Chamados recorrentes", color: "blue" },
  { id: "setores", label: "Chamados por setores", color: "red" },
  { id: "prioridades", label: "Prioridades dos chamados", color: "yellow" },
  { id: "status", label: "Status dos chamados", color: "green" },
  { id: "sla", label: "SLA dos chamados", color: "blue" },
] as const;
const RECORRENTES = [
  { name: "WhatsApp / Comunicação", value: 14 },
  { name: "Contas, logins e usuários", value: 12 },
  { name: "Suporte a software e processos", value: 11 },
  { name: "Internet, rede e VPN", value: 10 },
  { name: "Impressoras e toner", value: 7 },
] as const;
type Visao = (typeof VISOES)[number]["id"];
type TipoGrafico = "pizza" | "barras" | "area";
type Item = { name: string; value: number };

function Dashboard() {
  const { publicStats, isGestor, regras } = useStore();
  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);
  const [progressPage, setProgressPage] = useState(1);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);
  const [progressSize, setProgressSize] = useState(10);
  const [showProgress, setShowProgress] = useState(false);
  useEffect(() => {
    if (window.location.hash === "#acompanhamento") setShowProgress(true);
  }, []);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const all: typeof progress = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) { console.error("Falha ao carregar andamento público", error.message); return; }
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (mounted) setProgress(all);
    };
    void load();
    const channel = supabase.channel("public-progress-refresh").on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => void load()).subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, []);
  const [mes, setMes] = useState("todos");
  const [prioridade, setPrioridade] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [visao, setVisao] = useState<Visao>("problemas");
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("pizza");
  const [foco, setFoco] = useState<{ tipo: "setor" | "categoria"; nome: string } | null>(null);
  const linhas = useMemo(() => publicStats.filter((r) => (mes === "todos" || r.mes === mes) && (prioridade === "Todas" || r.prioridade === prioridade) && (status === "Todos" || r.status === status) && (!foco || r[foco.tipo] === foco.nome)), [publicStats, mes, prioridade, status, foco]);
  const total = linhas.reduce((n, r) => n + r.total, 0);
  const resolvidos = linhas.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);
  const ativos = linhas.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
  const pausados = linhas.filter((r) => r.status === "Pausado").reduce((n, r) => n + r.total, 0);
  const contar = (campo: "categoria" | "setor" | "prioridade" | "status") => {
    const mapa = new Map<string, number>();
    for (const r of linhas) mapa.set(r[campo], (mapa.get(r[campo]) ?? 0) + r.total);
    return [...mapa].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const categorias = contar("categoria"), setores = contar("setor");
  const dadosSla = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of progress) {
      if (mes !== "todos" && !t.aberto_em.startsWith(mes)) continue;
      if (prioridade !== "Todas" && t.prioridade !== prioridade) continue;
      if (status !== "Todos" && t.status !== status) continue;
      if (foco && !linhas.some(r => r.mes === t.aberto_em.slice(0, 7) && r.prioridade === t.prioridade && r.status === t.status)) continue;
      const situacao = calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now).situacao;
      counts.set(situacao, (counts.get(situacao) ?? 0) + 1);
    }
    return ["No prazo", "Estourado", "Pausado", "Cancelado", "—"].filter(name => counts.has(name)).map(name => ({ name, value: counts.get(name) ?? 0 }));
  }, [progress, mes, prioridade, status, foco, linhas, regras, now]);
  const dados: Item[] = visao === "sla" ? dadosSla : visao === "problemas" && mes === "todos" && prioridade === "Todas" && status === "Todos" && !foco
    ? RECORRENTES.map((item) => ({ ...item }))
    : visao === "problemas" ? categorias : visao === "setores" ? setores : contar(visao === "prioridades" ? "prioridade" : "status");
  const cor = (nome: string, i: number) => visao === "sla" ? ({ "No prazo": "var(--g-green)", Estourado: "var(--g-red)", Pausado: "var(--g-yellow)", Cancelado: "var(--muted-foreground)" }[nome] ?? "var(--g-blue)") : visao === "prioridades" ? CORES_PRIORIDADE[nome as Prioridade]?.bg ?? CORES[i % CORES.length] ?? "var(--g-blue)" : visao === "status" ? CORES_STATUS[nome as Status]?.bg ?? CORES[i % CORES.length] ?? "var(--g-blue)" : CORES[i % CORES.length] ?? "var(--g-blue)";
  const clicar = (nome: string) => visao === "problemas" && !RECORRENTES.some((item) => item.name === nome) ? setFoco({ tipo: "categoria", nome }) : visao === "setores" ? setFoco({ tipo: "setor", nome }) : undefined;
  const baixarResumo = () => {
    const conteudo = [["Visão", "Item", "Chamados"], ...dados.map((r) => [visao, r.name, String(r.value)])].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `dashboard-${mes}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-7 dashboard-print">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase text-primary">Indicadores públicos</p><h1 className="mt-1 text-3xl font-bold">Dashboard de chamados</h1><p className="mt-1 text-muted-foreground">Acompanhamento atualizado dos chamados registrados.</p></div>
      <div className="no-print flex flex-wrap gap-2">{isGestor && <Button asChild variant="outline"><Link to="/chamados"><Table2 /> Planilha completa</Link></Button>}<Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir / PDF</Button><Button variant="outline" onClick={baixarResumo}><Download /> Baixar dados</Button></div></header>

    <section className="no-print border-y-2 border-g-blue bg-card px-4 py-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-g-blue">Filtrar por:</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-bold">Mês<select aria-label="Mês" className="h-11 min-w-44 rounded-xl border-2 border-g-blue bg-background px-3 text-sm font-normal" value={mes} onChange={(e) => setMes(e.target.value)}>{MESES_DISPONIVEIS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}<option value="todos">Todos os meses</option></select></label>
          <label className="grid gap-1 text-xs font-bold">Prioridade<select aria-label="Prioridade" className="h-11 min-w-40 rounded-xl border-2 border-g-red bg-background px-3 text-sm font-normal" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}><option>Todas</option>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold">Status<select aria-label="Status" className="h-11 min-w-40 rounded-xl border-2 border-g-green bg-background px-3 text-sm font-normal" value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map((s) => <option key={s}>{s}</option>)}</select></label>
          {foco && <Button className="self-end" variant="google-yellow" onClick={() => setFoco(null)}>Limpar: {foco.nome} ×</Button>}
        </div>
        <Button className="self-end ml-auto" variant="google-blue" aria-expanded={showProgress} aria-controls="acompanhamento" onClick={() => { setShowProgress(v => !v); if (!showProgress) window.setTimeout(() => document.getElementById("acompanhamento")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}><ClipboardList /> Acompanhar chamado</Button>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Total de chamados", total, "border-g-blue"], ["Em atendimento", ativos, "border-g-yellow"], ["Pausados", pausados, "border-g-red"], ["Resolvidos", resolvidos, "border-g-green"]].map(([label, count, border]) => <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card p-5 shadow-sm`}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{count}</p></div>)}</div>

     <nav aria-label="Gráficos do dashboard" className="no-print grid grid-cols-2 gap-2 md:grid-cols-5">{VISOES.map((v) => <Button key={v.id} variant={`google-${v.color}` as "google-blue" | "google-red" | "google-yellow" | "google-green"} aria-current={visao === v.id ? "page" : undefined} className={`h-auto min-h-12 whitespace-normal py-2 text-center ${visao === v.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-85"}`} onClick={() => { setVisao(v.id); setFoco(null); }}>{v.label}</Button>)}</nav>
    <section className="min-w-0 border-t-2 border-border pt-5" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{VISOES.find((v) => v.id === visao)?.label}</h2><p className="text-sm text-muted-foreground">{dados.reduce((n, x) => n + x.value, 0)} chamado(s) representados</p></div><div className="no-print flex gap-2" aria-label="Tipo de gráfico"><Button size="sm" variant={tipoGrafico === "pizza" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("pizza")}><PieChartIcon /> Pizza</Button><Button size="sm" variant={tipoGrafico === "barras" ? "google-red" : "outline"} onClick={() => setTipoGrafico("barras")}><BarChart3 /> Barras</Button><Button size="sm" variant={tipoGrafico === "area" ? "google-green" : "outline"} onClick={() => setTipoGrafico("area")}><ChartArea /> Área</Button></div></div>
      <Grafico dados={dados} tipo={tipoGrafico} cor={cor} aoClicar={clicar} />
      {visao === "problemas" && <p className="mt-3 text-xs text-muted-foreground">Ranking consolidado a partir das 72 descrições preenchidas na planilha enviada.</p>}
    </section>
    {showProgress && <section id="acompanhamento" className="scroll-mt-28 space-y-4 border-t-2 border-border pt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Acompanhamento dos chamados</h2><p className="text-sm text-muted-foreground">Consulte o número, o andamento e o prazo. Dados pessoais aparecem somente na sua conta.</p></div><div className="flex flex-wrap items-end gap-3"><Button variant="google-blue" onClick={() => { setProgressPage(1); setProgressSize(100); }}>Todos os Chamados</Button><label className="grid gap-1 text-sm font-medium">Por página<select aria-label="Chamados públicos por página" className="h-10 rounded-xl border border-input bg-background px-3" value={progressSize} onChange={e => { setProgressSize(Number(e.target.value)); setProgressPage(1); }}>{[10,30,50,100].map(n => <option key={n}>{n}</option>)}</select></label></div></div>
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm"><thead><tr className="border-b-2 border-g-blue bg-muted">{["Ver chamado", "Nº", "Abertura", "Categoria", "Prioridade", "Status", "Fechamento", "Prazo", "SLA"].map(x => <th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{progress.slice((progressPage-1)*progressSize, progressPage*progressSize).map(t => <tr key={t.id} className="border-b border-border even:bg-muted/40"><td className="px-3 py-3"><Button asChild size="sm" variant="outline"><Link to="/meus-chamados"><Eye /> Ver chamado</Link></Button></td><td className="px-3 py-3 font-bold">#{t.id}</td><td className="px-3 py-3">{formatarData(t.aberto_em)}</td><td className="px-3 py-3">{t.categoria}</td><td className="px-3 py-3">{t.prioridade}</td><td className="px-3 py-3">{t.status}</td><td className="px-3 py-3">{formatarData(t.fechado_em)}</td><td className="whitespace-nowrap px-3 py-3">{formatarDataHora(calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now).prazo)}</td><td className="px-3 py-3"><SlaChip valor={calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now).situacao} /></td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{progress.length} chamado(s) · página {progressPage} de {Math.max(1, Math.ceil(progress.length/progressSize))}</span><div className="flex gap-2"><Button variant="outline" disabled={progressPage <= 1} onClick={() => setProgressPage(x => x-1)}>Anterior</Button><Button variant="outline" disabled={progressPage >= Math.ceil(progress.length/progressSize)} onClick={() => setProgressPage(x => x+1)}>Próxima</Button></div></div>
    </section>}
  </div>;
}

function Grafico({ dados, tipo, cor, aoClicar }: { dados: Item[]; tipo: TipoGrafico; cor: (name: string, i: number) => string; aoClicar: (name: string) => void }) {
  if (!dados.length) return <p className="py-24 text-center text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>;
  const chart = tipo === "pizza" ? <PieChart><Pie data={dados} dataKey="value" nameKey="name" innerRadius="30%" outerRadius="72%" paddingAngle={2} isAnimationActive={false} onClick={(d: { name?: string }) => d.name && aoClicar(d.name)}>{dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} />)}</Pie><Tooltip formatter={(value) => [`${value} chamados`, "Total"]} /></PieChart>
    : tipo === "barras" ? <BarChart data={dados} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={150} tick={{ fill: "var(--foreground)", fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Chamados" isAnimationActive={false} radius={[0, 4, 4, 0]} onClick={(d: { name?: string }) => d.name && aoClicar(d.name)}>{dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} />)}</Bar></BarChart>
    : <AreaChart data={dados} margin={{ left: 0, right: 20, top: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fill: "var(--foreground)", fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="value" name="Chamados" stroke="var(--g-blue)" fill="var(--g-blue)" fillOpacity={0.24} strokeWidth={3} isAnimationActive={false} /></AreaChart>;
  return <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(230px,1fr)]"><div className="h-[390px] min-w-0"><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div><div className="max-h-[370px] overflow-y-auto">{dados.map((d, i) => <Button key={d.name} type="button" variant="ghost" className="flex h-auto w-full items-center justify-start gap-3 rounded-xl border-b border-border py-3 text-left text-sm" onClick={() => aoClicar(d.name)}><span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: cor(d.name, i) }} /><span className="min-w-0 flex-1 whitespace-normal font-medium">{d.name}</span><strong>{d.value}</strong></Button>)}</div></div>;
}