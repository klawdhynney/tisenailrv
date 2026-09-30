import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ChartArea, CircleDot, ClipboardList, Download, PieChartIcon, Printer, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularSla } from "@/lib/sla";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Ticket } from "@/lib/types";
import { useEffect } from "react";
import { MESES_DISPONIVEIS } from "@/lib/types";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [
    { title: "Dashboard público | TI Senai LRV" },
    { name: "description", content: "Gráficos interativos e indicadores públicos dos chamados de TI Senai LRV." },
    { property: "og:title", content: "Dashboard de chamados | TI Senai LRV" },
    { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

const CORES = [
  "#1a73e8", // Google Blue
  "#ea4335", // Google Red
  "#f9ab00", // Google Yellow
  "#34a853", // Google Green
  "#a142f4", // Google Purple
  "#24c1e0", // Google Cyan
  "#fa7b17", // Google Orange
  "#f439a0", // Google Pink
];
const VISOES = [
  { id: "problemas", label: "Chamados recorrentes", color: "blue" },
  { id: "setores", label: "Chamados por setores", color: "red" },
  { id: "prioridades", label: "Prioridades dos chamados", color: "yellow" },
  { id: "status", label: "Status dos chamados", color: "green" },
  { id: "sla", label: "SLA dos chamados", color: "purple" },
] as const;
const RECORRENTES = [
  { name: "WhatsApp / Comunicação", value: 14 },
  { name: "Contas, logins e usuários", value: 12 },
  { name: "Suporte a software e processos", value: 11 },
  { name: "Internet, rede e VPN", value: 10 },
  { name: "Impressoras e toner", value: 7 },
] as const;
type Visao = (typeof VISOES)[number]["id"];
type TipoGrafico = "pizza" | "barras" | "area" | "bolhas";
type Item = { name: string; value: number };

const mesAtualPadrao = () => {
  const d = new Date();
  const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return MESES_DISPONIVEIS.some((m) => m.key === chave) ? chave : MESES_DISPONIVEIS[0]?.key ?? "todos";
};

function Dashboard() {
  const { publicStats, isGestor, regras } = useStore();
  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const all: typeof progress = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) { console.error("Falha ao carregar SLA público", error.message); return; }
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (mounted) setProgress(all);
    };
    void load();
    const channel = supabase.channel("public-sla-refresh").on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => void load()).subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, []);
  const [mes, setMes] = useState(mesAtualPadrao);
  const [visao, setVisao] = useState<Visao>("problemas");
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("pizza");
  const linhas = useMemo(() => publicStats.filter((r) => mes === "todos" || r.mes === mes), [publicStats, mes]);
  const total = linhas.reduce((n, r) => n + r.total, 0);
  const resolvidos = linhas.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);
  const ativos = linhas.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
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
      const situacao = calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now).situacao;
      counts.set(situacao, (counts.get(situacao) ?? 0) + 1);
    }
    return ["No prazo", "Estourado", "Cancelado", "—"].filter(name => counts.has(name)).map(name => ({ name, value: counts.get(name) ?? 0 }));
  }, [progress, mes, regras, now]);
  const todosDados: Item[] = visao === "sla" ? dadosSla : visao === "problemas" && mes === "todos"
    ? RECORRENTES.map((item) => ({ ...item }))
    : visao === "problemas" ? categorias : visao === "setores" ? setores : contar(visao === "prioridades" ? "prioridade" : "status");
  const dados: Item[] = todosDados.length <= CORES.length ? todosDados : [...todosDados.slice(0, CORES.length - 1), { name: "Outros", value: todosDados.slice(CORES.length - 1).reduce((n, x) => n + x.value, 0) }];
  const cor = (_nome: string, i: number) => CORES[i] ?? "#FFFFFF";
  const baixarResumo = () => {
    const conteudo = [["Visão", "Item", "Chamados"], ...dados.map((r) => [visao, r.name, String(r.value)])].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `dashboard-${mes}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-7 dashboard-print">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex-1 text-center">
        <p className="text-sm font-extrabold uppercase tracking-wider text-g-blue">Indicadores públicos</p>
        <h1 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">Dashboard de chamados</h1>
        <p className="mt-1 font-medium text-muted-foreground">Acompanhamento atualizado dos chamados registrados.</p>
      </div>
      {isGestor && (
        <div className="no-print flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/chamados"><Table2 /> Planilha completa</Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir / PDF
          </Button>
          <Button variant="outline" onClick={baixarResumo}>
            <Download /> Baixar dados
          </Button>
        </div>
      )}
    </header>

    <section className="no-print rounded-xl border-2 border-g-blue/60 bg-card px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-g-blue">Filtrar:</span>
          <label className="flex items-center gap-2 text-xs font-bold text-foreground">
            <span>Mês</span>
            <select
              aria-label="Mês"
              className="h-8.5 min-w-40 rounded-lg border-2 border-g-blue bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            >
              {MESES_DISPONIVEIS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
              <option value="todos">Todos os meses</option>
            </select>
          </label>
        </div>
        <Button asChild size="sm" className="ml-auto" variant="google-blue">
          <Link to="/dashboard/acompanhamento">
            <ClipboardList className="size-3.5" /> Acompanhar chamado
          </Link>
        </Button>
      </div>
    </section>

     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ["Total de chamados", total, "border-g-blue", "text-g-blue"],
          ["Em atendimento", ativos, "border-g-yellow", "text-g-yellow"],
          ["Resolvidos", resolvidos, "border-g-green", "text-g-green"],
        ].map(([label, count, border, color]) => (
          <div key={String(label)} className={`rounded-xl border-l-4 ${border} bg-card p-5 shadow-sm`}>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-black tracking-tight ${color}`}>{count}</p>
          </div>
        ))}
      </div>

     <nav aria-label="Gráficos do dashboard" className="no-print grid grid-cols-2 gap-2 md:grid-cols-5">
      {VISOES.map((v) => (
        <Button
          key={v.id}
          variant={`google-${v.color}` as "google-blue" | "google-red" | "google-yellow" | "google-green" | "google-purple"}
          aria-current={visao === v.id ? "page" : undefined}
          className={`h-auto min-h-12 whitespace-normal py-2 text-center text-sm font-bold tracking-tight ${visao === v.id ? "ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" : "opacity-85 hover:opacity-100"}`}
          onClick={() => setVisao(v.id)}
        >
          {v.label}
        </Button>
      ))}
    </nav>
    <section className="min-w-0 border-t-2 border-border pt-5" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{VISOES.find((v) => v.id === visao)?.label}</h2>
          <p className="text-sm font-medium text-muted-foreground">{dados.reduce((n, x) => n + x.value, 0)} chamado(s) representados</p>
        </div>
        <div className="no-print flex flex-wrap gap-2" aria-label="Tipo de gráfico">
          <Button size="sm" variant={tipoGrafico === "pizza" ? "google-blue" : "outline"} onClick={() => setTipoGrafico("pizza")}><PieChartIcon className="size-4" /> Pizza</Button>
          <Button size="sm" variant={tipoGrafico === "barras" ? "google-red" : "outline"} onClick={() => setTipoGrafico("barras")}><BarChart3 className="size-4" /> Barras</Button>
          <Button size="sm" variant={tipoGrafico === "area" ? "google-green" : "outline"} onClick={() => setTipoGrafico("area")}><ChartArea className="size-4" /> Área</Button>
          <Button size="sm" variant={tipoGrafico === "bolhas" ? "google-purple" : "outline"} onClick={() => setTipoGrafico("bolhas")}><CircleDot className="size-4" /> Bolhas</Button>
        </div>
      </div>
       <Grafico key={`${visao}-${tipoGrafico}`} dados={dados} tipo={tipoGrafico} cor={cor} />
    </section>
  </div>;
}

function GraficoBolhas({ dados, cor }: { dados: Item[]; cor: (name: string, i: number) => string }) {
  const maxVal = Math.max(...dados.map((d) => d.value), 1);
  const totalVal = dados.reduce((sum, d) => sum + d.value, 0);

  // Layout orgânico e harmonioso de centros
  const centers = [
    { x: 210, y: 165 },
    { x: 125, y: 110 },
    { x: 295, y: 110 },
    { x: 125, y: 220 },
    { x: 295, y: 220 },
    { x: 210, y: 65 },
    { x: 210, y: 270 },
    { x: 50, y: 165 },
    { x: 370, y: 165 },
  ];

  return (
    <div className="relative flex h-full w-full items-center justify-center p-2">
      <svg viewBox="0 0 420 330" className="h-full w-full max-h-[370px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          {dados.map((d, i) => (
            <radialGradient key={`grad-${i}`} id={`bubble-grad-${i}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
              <stop offset="65%" stopColor={cor(d.name, i)} stopOpacity={0.92} />
              <stop offset="100%" stopColor={cor(d.name, i)} stopOpacity={1} />
            </radialGradient>
          ))}
          <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodOpacity="0.28" />
          </filter>
        </defs>
        {dados.map((d, i) => {
          const pos = centers[i] ?? { x: 210 + ((i % 3) - 1) * 90, y: 165 + Math.floor(i / 3 - 1) * 80 };
          const scale = Math.sqrt(d.value / maxVal);
          const r = Math.max(26, Math.min(54, Math.round(26 + scale * 26)));
          const percent = totalVal > 0 ? Math.round((d.value / totalVal) * 100) : 0;
          return (
            <g key={d.name} className="cursor-pointer transition-all duration-300 hover:opacity-95 group" filter="url(#bubble-shadow)">
              <title>{`${d.name}: ${d.value} chamado(s) (${percent}%)`}</title>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={`url(#bubble-grad-${i})`}
                stroke={cor(d.name, i)}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:scale-105"
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              />
              <text
                x={pos.x}
                y={r >= 38 ? pos.y - 6 : pos.y + 4}
                textAnchor="middle"
                fill="#ffffff"
                className="font-extrabold select-none pointer-events-none drop-shadow-md"
                style={{ fontSize: r >= 42 ? "16px" : r >= 32 ? "13px" : "11px" }}
              >
                {d.value}
              </text>
              {r >= 38 && (
                <text
                  x={pos.x}
                  y={pos.y + 11}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-semibold select-none pointer-events-none opacity-90 drop-shadow-sm"
                  style={{ fontSize: r >= 46 ? "9px" : "8px" }}
                >
                  {d.name.length > 14 ? d.name.slice(0, 12) + "…" : d.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Grafico({ dados, tipo, cor }: { dados: Item[]; tipo: TipoGrafico; cor: (name: string, i: number) => string }) {
  if (!dados.length) return <p className="py-24 text-center text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>;
  const chart =
    tipo === "pizza" ? (
      <PieChart>
        <Pie data={dados} dataKey="value" nameKey="name" innerRadius="38%" outerRadius="76%" paddingAngle={3} isAnimationActive animationDuration={650}>
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} stroke="var(--card)" strokeWidth={2} />)}
        </Pie>
        <Tooltip formatter={(value) => [`${value} chamados`, "Total"]} />
      </PieChart>
    ) : tipo === "barras" ? (
      <BarChart data={dados} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis dataKey="name" type="category" width={150} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" name="Chamados" isAnimationActive animationDuration={650} radius={[0, 4, 4, 0]}>
          {dados.map((d, i) => <Cell key={d.name} fill={cor(d.name, i)} />)}
        </Bar>
      </BarChart>
    ) : tipo === "area" ? (
      <AreaChart data={dados} margin={{ left: 0, right: 20, top: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: "var(--foreground)", fontSize: 11 }} interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey="value" name="Chamados" stroke="var(--g-blue)" fill="var(--g-blue)" fillOpacity={0.24} strokeWidth={3} isAnimationActive animationDuration={650} />
      </AreaChart>
    ) : (
      <GraficoBolhas dados={dados} cor={cor} />
    );

  return (
    <div className="chart-enter grid items-center gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(230px,1fr)]">
      <div className="h-[390px] min-w-0">{tipo === "bolhas" ? chart : <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>}</div>
      <div className="max-h-[370px] overflow-y-auto">
        {dados.map((d, i) => (
          <div key={d.name} className="flex items-center gap-3 border-b border-border py-3 text-sm">
            <span className="size-3 shrink-0 rounded-sm border border-foreground/40" style={{ backgroundColor: cor(d.name, i) }} />
            <span className="min-w-0 flex-1 font-medium">{d.name}</span>
            <strong>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}