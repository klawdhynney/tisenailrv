import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Download, Ticket as TicketIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { mesDoTicket, useStore } from "@/lib/store";
import { calcularSla, formatarData } from "@/lib/sla";
import {
  CORES_PRIORIDADE,
  CORES_STATUS,
  MESES_DISPONIVEIS,
  PRIORIDADES,
  STATUS_LIST,
  type Prioridade,
} from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de Chamados de TI | Central de TI" },
      { name: "description", content: "Painel interativo com SLA, problemas mais recorrentes e setores que mais abrem chamados de TI." },
      { property: "og:title", content: "Dashboard de Chamados de TI" },
      { property: "og:description", content: "Indicadores em tempo real dos chamados de TI por mês, prioridade, status e SLA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853", "#A142F4", "#00ACC1", "#FF7043", "#9E9E9E"];

function normalizarProblema(desc: string, categoria?: string) {
  if (categoria) return categoria;
  const d = desc.toLowerCase();
  const regras: [string, RegExp][] = [
    ["WhatsApp / Comunicação", /whats/],
    ["Internet / Rede", /internet|rede|wi-?fi|cabo|switch|conex/],
    ["Impressora", /impress|toner|scanner|digitaliz/],
    ["E-mail / Office 365", /e-?mail|outlook|office|onedrive|teams/],
    ["Sistema / Software", /sistema|software|instal|program|senior|erp|planilha|excel/],
    ["Computador / Notebook", /computador|notebook|pc|mouse|teclado|monitor|formata/],
    ["Projetor / Multimídia", /projetor|tv|som|multim|datashow/],
    ["Telefonia", /telefone|ramal|celular/],
    ["Acesso / Senha", /senha|acesso|usuário|usuario|login|permiss|domínio|dominio/],
  ];
  for (const [nome, re] of regras) if (re.test(d)) return nome;
  return "Outros";
}

function Kpi({ titulo, valor, sub, cor, icon: Icon }: { titulo: string; valor: string | number; sub?: string; cor: string; icon: React.ElementType }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />
      <CardContent className="flex items-center gap-4 pt-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${cor}1A` }}>
          <Icon className="h-5 w-5" style={{ color: cor }} />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-bold">{valor}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { tickets, regras } = useStore();
  const [mes, setMes] = useState("2026-09");
  const [fPrioridade, setFPrioridade] = useState<string>("Todas");
  const [fStatus, setFStatus] = useState<string>("Todos");
  const [foco, setFoco] = useState<{ tipo: "problema" | "setor"; valor: string } | null>(null);

  const base = useMemo(
    () =>
      tickets
        .filter((t) => (mes === "todos" ? true : mesDoTicket(t) === mes))
        .filter((t) => (fPrioridade === "Todas" ? true : t.prioridade === fPrioridade))
        .filter((t) => (fStatus === "Todos" ? true : t.status === fStatus))
        .map((t) => ({ t, sla: calcularSla(t, regras), problema: normalizarProblema(t.descricao, t.categoria) })),
    [tickets, regras, mes, fPrioridade, fStatus],
  );

  const dados = useMemo(
    () =>
      foco
        ? base.filter((r) => (foco.tipo === "problema" ? r.problema === foco.valor : r.t.setor === foco.valor))
        : base,
    [base, foco],
  );

  const total = dados.length;
  const resolvidos = dados.filter((r) => r.t.status === "Resolvido").length;
  const abertos = dados.filter((r) => ["Aberto", "Em andamento", "Aguardando", "Pausado"].includes(r.t.status)).length;
  const estourados = dados.filter((r) => r.sla.situacao === "Estourado").length;
  const noPrazoPct = total ? Math.round(((total - estourados) / total) * 100) : 0;

  const contar = (fn: (r: (typeof dados)[number]) => string) => {
    const m = new Map<string, number>();
    dados.forEach((r) => m.set(fn(r), (m.get(fn(r)) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const porProblema = contar((r) => r.problema);
  const porSetor = contar((r) => r.t.setor);
  const porPrioridade = PRIORIDADES.map((p) => ({ name: p, value: dados.filter((r) => r.t.prioridade === p).length }));
  const porStatus = STATUS_LIST.map((s) => ({ name: s, value: dados.filter((r) => r.t.status === s).length })).filter((d) => d.value);
  const porResponsavel = contar((r) => r.t.responsavel || "Sem responsável").slice(0, 8);

  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    dados.forEach((r) => m.set(r.t.abertoEm, (m.get(r.t.abertoEm) ?? 0) + 1));
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ dia: d.slice(8, 10) + "/" + d.slice(5, 7), chamados: v }));
  }, [dados]);

  function exportar() {
    const linhas = [
      ["Indicador", "Valor"],
      ["Mês", mes],
      ["Total de chamados", total],
      ["Resolvidos", resolvidos],
      ["Em aberto", abertos],
      ["SLA estourado", estourados],
      ["% dentro do prazo", `${noPrazoPct}%`],
      [],
      ["Problema", "Chamados"],
      ...porProblema.map((p) => [p.name, p.value]),
      [],
      ["Setor", "Chamados"],
      ...porSetor.map((p) => [p.name, p.value]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c ?? "")}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Dashboard_${mes}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de chamados</h1>
          <p className="mt-1 text-muted-foreground">
            Tudo é calculado automaticamente a partir da planilha mensal e das regras cadastradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>Imprimir / PDF</Button>
          <Button variant="outline" onClick={exportar}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={mes} onChange={(e) => setMes(e.target.value)}>
            {MESES_DISPONIVEIS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
            <option value="todos">Todos os meses</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)}>
            <option>Todas</option>
            {PRIORIDADES.map((p) => (<option key={p}>{p}</option>))}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>Todos</option>
            {STATUS_LIST.map((s) => (<option key={s}>{s}</option>))}
          </select>
          {foco && (
            <button onClick={() => setFoco(null)} className="rounded-full bg-[var(--g-blue)] px-3 py-1.5 text-xs font-semibold text-white">
              {foco.tipo === "problema" ? "Problema" : "Setor"}: {foco.valor} ✕
            </button>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            Clique nas fatias dos gráficos para filtrar o painel inteiro.
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Total de chamados" valor={total} cor="#4285F4" icon={TicketIcon} />
        <Kpi titulo="Resolvidos" valor={resolvidos} sub={`${total ? Math.round((resolvidos / total) * 100) : 0}% do total`} cor="#34A853" icon={CheckCircle2} />
        <Kpi titulo="Em atendimento" valor={abertos} cor="#FBBC05" icon={Clock} />
        <Kpi titulo="SLA estourado" valor={estourados} sub={`${noPrazoPct}% dentro do prazo`} cor="#EA4335" icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Problemas mais recorrentes</CardTitle></CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porProblema}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={2}
                  onClick={(d: { name?: string }) => d?.name && setFoco({ tipo: "problema", valor: d.name })}
                >
                  {porProblema.map((_, i) => (
                    <Cell key={i} fill={GOOGLE[i % GOOGLE.length]} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={56} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Setores que mais abrem chamados</CardTitle></CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porSetor}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  onClick={(d: { name?: string }) => d?.name && setFoco({ tipo: "setor", valor: d.name })}
                >
                  {porSetor.map((_, i) => (
                    <Cell key={i} fill={GOOGLE[(i + 2) % GOOGLE.length]} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={56} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chamados por prioridade</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porPrioridade}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Chamados" radius={[6, 6, 0, 0]}>
                  {porPrioridade.map((d, i) => (
                    <Cell key={i} fill={CORES_PRIORIDADE[d.name as Prioridade].bg} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chamados por status</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {porStatus.map((d, i) => (
                    <Cell key={i} fill={CORES_STATUS[d.name as keyof typeof CORES_STATUS].bg} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chamados abertos por dia</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="chamados" stroke="#4285F4" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chamados por responsável</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porResponsavel} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} />
                <Tooltip />
                <Bar dataKey="value" name="Chamados" fill="#34A853" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Chamados em risco ou atrasados</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["Nº", "Aberto em", "Setor", "Local", "Descrição", "Prioridade", "Status", "SLA"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados
                  .filter((r) => r.sla.situacao === "Estourado" || (r.sla.percentual > 70 && r.t.status !== "Resolvido"))
                  .slice(0, 12)
                  .map(({ t, sla }) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-3 py-2">{t.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatarData(t.abertoEm, t.hora)}</td>
                      <td className="px-3 py-2">{t.setor}</td>
                      <td className="px-3 py-2">{t.local || "—"}</td>
                      <td className="max-w-[280px] px-3 py-2">{t.descricao}</td>
                      <td className="px-3 py-2"><PrioridadeChip valor={t.prioridade} /></td>
                      <td className="px-3 py-2"><StatusChip valor={t.status} /></td>
                      <td className="px-3 py-2"><SlaChip valor={sla.situacao} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Veja a lista completa na <Link to="/chamados" className="font-medium text-[var(--g-blue)] underline">planilha de chamados</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
