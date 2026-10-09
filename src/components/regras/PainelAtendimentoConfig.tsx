import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Headset,
  Pause,
  Plane,
  Plus,
  RotateCcw,
  Sliders,
  Table,
  Tag,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ATENDIMENTO_PADRAO,
  COLUNAS_ATENDIMENTO_PADRAO,
  MESES_DISPONIVEIS,
  MOTIVOS_PAUSA_SLA_PADRAO,
  PARAMETROS_PRIORIDADE_PADRAO,
  PARAMETROS_SLA_PADRAO,
  PARAMETROS_STATUS_PADRAO,
  PRIORIDADES,
  type AtendimentoConfig,
  type ColunaLargura,
  type ColunaPlanilhaConfig,
  type ParametroCor,
  type Periodo,
  type Regras,
} from "@/lib/types";

interface PainelAtendimentoConfigProps {
  regras: Regras;
  onChange: (patch: Partial<Regras>) => void;
  onSalvar: () => Promise<boolean>;
  onDescartar: () => void;
  onRestaurarPadrao: () => void;
  alterado: boolean;
}

const DIAS_SEMANA = [
  { num: 0, nome: "Domingo" },
  { num: 1, nome: "Segunda-feira" },
  { num: 2, nome: "Terça-feira" },
  { num: 3, nome: "Quarta-feira" },
  { num: 4, nome: "Quinta-feira" },
  { num: 5, nome: "Sexta-feira" },
  { num: 6, nome: "Sábado" },
];

export function PainelAtendimentoConfig({
  regras,
  onChange,
  onSalvar,
  onDescartar,
  onRestaurarPadrao,
  alterado,
}: PainelAtendimentoConfigProps) {
  const [subAba, setSubAba] = useState("colunas");
  const [salvando, setSalvando] = useState(false);

  const configAtend: AtendimentoConfig = {
    ...ATENDIMENTO_PADRAO,
    ...(regras.atendimento ?? {}),
  };

  const colunas: ColunaPlanilhaConfig[] =
    Array.isArray(configAtend.colunas) && configAtend.colunas.length > 0
      ? configAtend.colunas
      : [...COLUNAS_ATENDIMENTO_PADRAO];

  const salvarAtendimento = (patch: Partial<AtendimentoConfig>) => {
    onChange({
      atendimento: {
        ...configAtend,
        ...patch,
      },
    });
  };

  const atualizarColuna = (id: string, patch: Partial<ColunaPlanilhaConfig>) => {
    const novas = colunas.map((c) => (c.id === id ? { ...c, ...patch } : c));
    salvarAtendimento({ colunas: novas });
  };

  const moverColuna = (index: number, direcao: -1 | 1) => {
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= colunas.length) return;
    const copia = [...colunas];
    const [removido] = copia.splice(index, 1);
    if (!removido) return;
    copia.splice(novoIndex, 0, removido);
    salvarAtendimento({ colunas: copia });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const ok = await onSalvar();
      if (ok) {
        toast.success("Configurações de atendimento salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar as configurações de atendimento.");
      }
    } catch {
      toast.error("Erro inesperado ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  const horariosPorDia = regras.expediente?.horariosPorDia ?? {};
  const atualizarHorarioDia = (
    diaNum: number,
    dados: Partial<{ ativo: boolean; inicio: string; fim: string }>,
  ) => {
    const atual = horariosPorDia[diaNum] ?? {
      ativo: regras.expediente.dias.includes(diaNum),
      inicio: regras.expediente.inicio,
      fim: regras.expediente.fim,
    };
    const novoDia = { ...atual, ...dados };
    const novoMap = { ...horariosPorDia, [diaNum]: novoDia };
    const novosDiasAtivos = Object.entries(novoMap)
      .filter(([_, v]) => v.ativo)
      .map(([k]) => Number(k))
      .sort();

    onChange({
      expediente: {
        ...regras.expediente,
        dias: novosDiasAtivos,
        horariosPorDia: novoMap,
      },
    });
  };

  const parametrosStatus: ParametroCor[] =
    regras.parametrosStatus ?? PARAMETROS_STATUS_PADRAO;
  const parametrosPrioridade: ParametroCor[] =
    regras.parametrosPrioridade ?? PARAMETROS_PRIORIDADE_PADRAO;
  const parametrosSla: ParametroCor[] =
    regras.parametrosSla ?? PARAMETROS_SLA_PADRAO;

  return (
    <div className="space-y-6">
      {/* Barra de Ações & Status do Rascunho */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Headset className="size-5 text-g-blue" />
            Configuração Central de Atendimento & Planilha
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalize a ordem das colunas, limites de texto, botões de status, prazos de SLA e exportações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRestaurarPadrao}
            className="text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Restaurar padrão
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!alterado || salvando}
            onClick={onDescartar}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Descartar alterações
          </Button>

          <Button
            type="button"
            variant="google-green"
            size="sm"
            disabled={!alterado || salvando}
            onClick={handleSalvar}
            className="text-xs font-bold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="size-3.5" />
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {/* Pré-visualização ao Vivo da Planilha */}
      <Card className="rounded-2xl border-2 border-g-blue/30 shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/40 pb-3 border-b border-border/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-g-blue" />
              <CardTitle className="text-sm font-bold text-foreground">
                Pré-visualização ao Vivo da Planilha de Atendimento
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold border-g-blue/40 text-g-blue">
              Tempo Real
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Exibição imediata com os chamados de exemplo aplicando sua ordem de colunas, larguras e quebras de linha configuradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-bold">
                  {colunas
                    .filter((c) => c.ativa)
                    .map((c) => (
                      <th
                        key={c.id}
                        className="whitespace-nowrap px-3 py-2.5 text-[11px] uppercase tracking-wider border-r border-white/10 last:border-r-0 text-left font-bold"
                      >
                        {c.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    id: 131,
                    aberto: "08/10/2026 20:56",
                    prioridade: "Média",
                    solicitante: "Richard Silva",
                    setor: "Área Técnica",
                    local: "Sala de comandos automação",
                    descricao: "Solicito, por gentileza, um notebook para aula prática de automação industrial.",
                    status: "Aberto",
                    sla: "10/10 18:00 · No prazo",
                    procedimento: "Separado equipamento no laboratório.",
                    fechado: "—",
                    resp: "Claudinei Lima",
                  },
                  {
                    id: 130,
                    aberto: "08/10/2026 19:49",
                    prioridade: "Alta",
                    solicitante: "Luiz Vieira",
                    setor: "Professores",
                    local: "Sala de comandos automação",
                    descricao: "Computadores sem internet na sala de comandos.",
                    status: "Em atendimento",
                    sla: "09/10 12:00 · Perto de vencer",
                    procedimento: "Verificando cabeamento do switch.",
                    fechado: "—",
                    resp: "Claudinei Lima",
                  },
                  {
                    id: 128,
                    aberto: "07/10/2026 21:11",
                    prioridade: "Média",
                    solicitante: "Kerolayne Santos",
                    setor: "Secretaria",
                    local: "Recepção",
                    descricao: "A impressora da recepção da Secretaria está sem toner preto.",
                    status: "Finalizado",
                    sla: "08/10 17:00 · No prazo",
                    procedimento: "Toner substituído e teste de impressão concluído com sucesso.",
                    fechado: "08/10/2026 10:30",
                    resp: "Claudinei Lima",
                  },
                ].map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/40 even:bg-muted/20">
                    {colunas
                      .filter((c) => c.ativa)
                      .map((c) => {
                        let content: React.ReactNode = null;
                        if (c.id === "atender") {
                          content = (
                            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-g-green text-white">
                              <Headset className="size-3.5" />
                            </span>
                          );
                        } else if (c.id === "numero") {
                          content = <strong className="font-mono text-g-blue">#{row.id}</strong>;
                        } else if (c.id === "abertoEm") {
                          content = row.aberto;
                        } else if (c.id === "prioridade") {
                          content = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              {row.prioridade}
                            </span>
                          );
                        } else if (c.id === "solicitante") {
                          content = <span className="font-bold">{row.solicitante}</span>;
                        } else if (c.id === "setor") {
                          content = <span className="font-semibold">{row.setor}</span>;
                        } else if (c.id === "descricao") {
                          content = (
                            <span
                              className="text-muted-foreground block max-w-xs overflow-hidden"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: c.linhas || 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {row.descricao}
                            </span>
                          );
                        } else if (c.id === "status") {
                          content = (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.status === "Finalizado"
                                  ? "bg-green-800 text-white"
                                  : row.status === "Em atendimento"
                                  ? "bg-green-600 text-white"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              {row.status}
                            </span>
                          );
                        } else if (c.id === "slaPrazo") {
                          content = <span className="font-medium">{row.sla}</span>;
                        } else if (c.id === "procedimento") {
                          content = (
                            <span
                              className="text-muted-foreground block max-w-xs overflow-hidden"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: c.linhas || 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {row.procedimento}
                            </span>
                          );
                        } else if (c.id === "fechadoEm") {
                          content = row.fechado;
                        } else if (c.id === "responsavel") {
                          content = row.resp;
                        } else if (c.id === "local") {
                          content = row.local;
                        } else {
                          content = "—";
                        }

                        return (
                          <td key={c.id} className="border-b border-border/70 px-3 py-2 text-foreground">
                            {content}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Abas de Personalização */}
      <Tabs value={subAba} onValueChange={setSubAba} className="w-full space-y-5">
        <TabsList className="bg-muted/80 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="colunas" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
            <Table className="size-4 text-g-blue" /> Colunas da Planilha & Exportação
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
            <Filter className="size-4 text-g-green" /> Status, Prioridades & Botões da Fila
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
            <Clock className="size-4 text-g-red" /> SLA, Prazos & Expediente
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
            <Building2 className="size-4 text-sky-600" /> Setores, Locais & Feriados
          </TabsTrigger>
          <TabsTrigger value="geral" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
            <Sliders className="size-4 text-purple-600" /> Preferências Gerais da Fila
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA COLUNAS DA PLANILHA */}
        <TabsContent value="colunas" className="space-y-4 focus-visible:outline-none">
          <Card className="rounded-2xl border border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Table className="size-4 text-g-blue" />
                Ordem, Visibilidade e Configuração das Colunas
              </CardTitle>
              <CardDescription className="text-xs">
                Arraste ou use as setas para definir a ordem na tela. As colunas <strong>Atender</strong> e{" "}
                <strong>Nº</strong> são obrigatórias e permanecem fixas à esquerda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2.5">
                {colunas.map((col, idx) => {
                  const isMultilineCol = ["setor", "descricao", "procedimento"].includes(col.id);

                  return (
                    <div
                      key={col.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        col.ativa ? "border-g-blue/40 bg-card shadow-2xs" : "border-border/60 bg-muted/20 opacity-70"
                      }`}
                    >
                      {/* Posição e Título */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted font-bold text-xs text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{col.label}</span>
                            {col.obrigatoria && (
                              <Badge variant="outline" className="text-[10px] py-0 border-blue-400 text-blue-600">
                                Obrigatória
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">ID técnico: {col.id}</span>
                        </div>
                      </div>

                      {/* Configurações da Coluna */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Nome do Cabeçalho */}
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px] text-muted-foreground">Rótulo:</Label>
                          <Input
                            className="h-8 w-32 text-xs"
                            value={col.label}
                            onChange={(e) => atualizarColuna(col.id, { label: e.target.value })}
                          />
                        </div>

                        {/* Largura */}
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px] text-muted-foreground">Largura:</Label>
                          <select
                            className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                            value={col.largura || "media"}
                            onChange={(e) =>
                              atualizarColuna(col.id, { largura: e.target.value as ColunaLargura })
                            }
                          >
                            <option value="estreita">Estreita</option>
                            <option value="media">Média</option>
                            <option value="larga">Larga</option>
                            <option value="automatica">Automática</option>
                          </select>
                        </div>

                        {/* Linhas (para campos multilinha) */}
                        {isMultilineCol && (
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[11px] text-muted-foreground">Linhas:</Label>
                            <select
                              className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                              value={col.linhas || 2}
                              onChange={(e) =>
                                atualizarColuna(col.id, { linhas: Number(e.target.value) })
                              }
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                  {n} {n === 1 ? "linha" : "linhas"}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Exportar Excel & PDF */}
                        {col.id !== "atender" && (
                          <div className="flex items-center gap-3 border-l border-border pl-3">
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={col.exportarExcel !== false}
                                onChange={(e) =>
                                  atualizarColuna(col.id, { exportarExcel: e.target.checked })
                                }
                                className="rounded text-g-blue"
                              />
                              <span className="text-muted-foreground">Excel</span>
                            </label>

                            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={col.exportarPdf !== false}
                                onChange={(e) =>
                                  atualizarColuna(col.id, { exportarPdf: e.target.checked })
                                }
                                className="rounded text-g-blue"
                              />
                              <span className="text-muted-foreground">PDF</span>
                            </label>
                          </div>
                        )}

                        {/* Ativar/Desativar */}
                        <div className="flex items-center gap-1.5 border-l border-border pl-3">
                          <Switch
                            disabled={col.obrigatoria}
                            checked={col.ativa}
                            onCheckedChange={(checked) => atualizarColuna(col.id, { ativa: checked })}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {col.ativa ? "Exibir" : "Ocultar"}
                          </span>
                        </div>

                        {/* Setas Reordenar */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => moverColuna(idx, -1)}
                            className="size-7 text-g-blue"
                            title="Mover para cima"
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === colunas.length - 1}
                            onClick={() => moverColuna(idx, 1)}
                            className="size-7 text-g-blue"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA STATUS, PRIORIDADES & BOTÕES */}
        <TabsContent value="status" className="space-y-5 focus-visible:outline-none">
          {/* Botões de Status no Topo da Planilha */}
          <Card className="rounded-2xl border border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Filter className="size-4 text-g-green" />
                Chips de Status na Barra Superior da Planilha
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione quais botões rápidos com contadores devem aparecer acima da tabela de atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2.5">
                {[
                  "Todos",
                  "Aberto",
                  "Em atendimento",
                  "Aguardando",
                  "Finalizados",
                  "Cancelados",
                ].map((st) => {
                  const visiveis = configAtend.botoesStatusVisiveis || [
                    "Todos",
                    "Aberto",
                    "Em atendimento",
                    "Aguardando",
                    "Finalizados",
                    "Cancelados",
                  ];
                  const ativo = visiveis.includes(st);

                  return (
                    <Button
                      key={st}
                      type="button"
                      variant={ativo ? "google-blue" : "outline"}
                      size="sm"
                      onClick={() => {
                        const novos = ativo
                          ? visiveis.filter((x) => x !== st)
                          : [...visiveis, st];
                        salvarAtendimento({ botoesStatusVisiveis: novos });
                      }}
                      className="text-xs font-bold gap-1.5 rounded-full"
                    >
                      {ativo ? <CheckCircle2 className="size-3.5" /> : null}
                      {st}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Nomes e Cores de Status e Prioridades */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Status */}
            <Card className="rounded-2xl border border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Tag className="size-4 text-g-blue" />
                  Nomes e Cores dos Status
                </CardTitle>
                <CardDescription className="text-xs">
                  O valor técnico no banco permanece inalterado para segurança de dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parametrosStatus.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/70 bg-card">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={p.bg}
                        onChange={(e) => {
                          const novos = parametrosStatus.map((x) =>
                            x.id === p.id ? { ...x, bg: e.target.value } : x,
                          );
                          onChange({ parametrosStatus: novos });
                        }}
                        className="size-7 rounded-lg border-0 cursor-pointer"
                        title="Cor de fundo"
                      />
                      <Input
                        value={p.nome}
                        onChange={(e) => {
                          const novos = parametrosStatus.map((x) =>
                            x.id === p.id ? { ...x, nome: e.target.value } : x,
                          );
                          onChange({ parametrosStatus: novos });
                        }}
                        className="h-8 text-xs font-semibold flex-1"
                      />
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs whitespace-nowrap"
                      style={{ backgroundColor: p.bg, color: p.text || "#FFFFFF" }}
                    >
                      {p.nome}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Prioridades */}
            <Card className="rounded-2xl border border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Tag className="size-4 text-g-red" />
                  Nomes e Cores das Prioridades
                </CardTitle>
                <CardDescription className="text-xs">
                  Crítico, Alta, Média e Baixa com cores e badges no sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parametrosPrioridade.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/70 bg-card">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={p.bg}
                        onChange={(e) => {
                          const novos = parametrosPrioridade.map((x) =>
                            x.id === p.id ? { ...x, bg: e.target.value } : x,
                          );
                          onChange({ parametrosPrioridade: novos });
                        }}
                        className="size-7 rounded-lg border-0 cursor-pointer"
                        title="Cor de fundo"
                      />
                      <Input
                        value={p.nome}
                        onChange={(e) => {
                          const novos = parametrosPrioridade.map((x) =>
                            x.id === p.id ? { ...x, nome: e.target.value } : x,
                          );
                          onChange({ parametrosPrioridade: novos });
                        }}
                        className="h-8 text-xs font-semibold flex-1"
                      />
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs whitespace-nowrap"
                      style={{ backgroundColor: p.bg, color: p.text || "#FFFFFF" }}
                    >
                      {p.nome}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. ABA SLA, PRAZOS & EXPEDIENTE */}
        <TabsContent value="sla" className="space-y-5 focus-visible:outline-none">
          {/* Prazos por prioridade */}
          <Card className="rounded-2xl border border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-g-red">
                    <Clock className="size-4" />
                    Prazos de SLA e Alertas por Prioridade
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define o tempo limite de atendimento e o limite para marcar o chamado como "Perto de vencer".
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Unidade:</Label>
                  <select
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold"
                    value={configAtend.unidadePrazoSla || "horas"}
                    onChange={(e) =>
                      salvarAtendimento({
                        unidadePrazoSla: e.target.value as "horas" | "dias",
                      })
                    }
                  >
                    <option value="horas">Horas úteis</option>
                    <option value="dias">Dias úteis</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {PRIORIDADES.map((p) => {
                  const valorAtual = regras.prazos[p] ?? 16;
                  return (
                    <div key={p} className="rounded-xl border border-border/80 p-3 bg-card shadow-2xs">
                      <span className="text-xs font-bold text-foreground block mb-1.5">{p}</span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          className="h-9 text-sm font-bold"
                          value={valorAtual}
                          onChange={(e) =>
                            onChange({
                              prazos: { ...regras.prazos, [p]: Math.max(1, Number(e.target.value)) },
                            })
                          }
                        />
                        <span className="text-xs text-muted-foreground font-semibold">
                          {configAtend.unidadePrazoSla === "dias" ? "dias" : "horas"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Limite Perto de Vencer */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Limite para Alerta "Perto de vencer"
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    O badge muda para amarelo "Perto de vencer" quando restar menos que este tempo antes do vencimento.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    className="h-8 w-20 text-xs font-bold"
                    value={configAtend.limitePertoVencerHoras ?? 2}
                    onChange={(e) =>
                      salvarAtendimento({
                        limitePertoVencerHoras: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                  <span className="text-xs font-semibold text-muted-foreground">horas úteis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expediente Semanal */}
          <Card className="rounded-2xl border border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-g-blue">
                <Calendar className="size-4" />
                Expediente de Trabalho & Horário de Atendimento
              </CardTitle>
              <CardDescription className="text-xs">
                Fora do expediente, o cronômetro do SLA pausa automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
                <div>
                  <p className="text-xs font-bold text-foreground">Horário Padrão Institucional</p>
                  <p className="text-[11px] text-muted-foreground">Aplicado a novos dias e relatórios.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <Label className="text-[10px] block mb-0.5">Início</Label>
                    <Input
                      type="time"
                      className="h-8 w-24 text-xs font-bold"
                      value={regras.expediente.inicio}
                      onChange={(e) =>
                        onChange({
                          expediente: { ...regras.expediente, inicio: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] block mb-0.5">Fim</Label>
                    <Input
                      type="time"
                      className="h-8 w-24 text-xs font-bold"
                      value={regras.expediente.fim}
                      onChange={(e) =>
                        onChange({
                          expediente: { ...regras.expediente, fim: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {DIAS_SEMANA.map((dia) => {
                  const conf = horariosPorDia[dia.num] ?? {
                    ativo: regras.expediente.dias.includes(dia.num),
                    inicio: regras.expediente.inicio,
                    fim: regras.expediente.fim,
                  };

                  return (
                    <div
                      key={dia.num}
                      className={`p-3 rounded-xl border transition-all ${
                        conf.ativo ? "border-g-blue/50 bg-card" : "border-border/60 bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs">{dia.nome}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={conf.ativo ? "google-blue" : "outline"}
                          className="h-6 text-[10px] px-2 font-bold"
                          onClick={() => atualizarHorarioDia(dia.num, { ativo: !conf.ativo })}
                        >
                          {conf.ativo ? "Ativo" : "Pausado"}
                        </Button>
                      </div>
                      {conf.ativo && (
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <Input
                            type="time"
                            className="h-7 text-[11px]"
                            value={conf.inicio}
                            onChange={(e) => atualizarHorarioDia(dia.num, { inicio: e.target.value })}
                          />
                          <Input
                            type="time"
                            className="h-7 text-[11px]"
                            value={conf.fim}
                            onChange={(e) => atualizarHorarioDia(dia.num, { fim: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA EQUIPE, SETORES, LOCAIS & FERIADOS */}
        <TabsContent value="equipe" className="space-y-5 focus-visible:outline-none">
          {/* Feriados e Períodos */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Feriados */}
            <Card className="rounded-2xl border border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600">
                  <CalendarCheck2 className="size-4" />
                  Feriados Institucionais e Municipais
                </CardTitle>
                <CardDescription className="text-xs">
                  Dias em que o relógio de SLA é pausado automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(regras.feriados ?? []).map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input
                      type="date"
                      className="h-8 w-36 text-xs font-semibold"
                      value={f.data}
                      onChange={(e) =>
                        onChange({
                          feriados: (regras.feriados ?? []).map((x) =>
                            x.id === f.id ? { ...x, data: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      className="h-8 text-xs font-medium flex-1"
                      value={f.nome}
                      onChange={(e) =>
                        onChange({
                          feriados: (regras.feriados ?? []).map((x) =>
                            x.id === f.id ? { ...x, nome: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        onChange({
                          feriados: (regras.feriados ?? []).filter((x) => x.id !== f.id),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold gap-1 mt-1"
                  onClick={() =>
                    onChange({
                      feriados: [
                        ...(regras.feriados ?? []),
                        { id: crypto.randomUUID(), data: "2026-12-25", nome: "Novo feriado" },
                      ],
                    })
                  }
                >
                  <Plus className="size-3.5" /> Adicionar feriado
                </Button>
              </CardContent>
            </Card>

            {/* Recessos e Férias */}
            <Card className="rounded-2xl border border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-g-green">
                  <Plane className="size-4" />
                  Recessos, Férias Coletivas & Pausas
                </CardTitle>
                <CardDescription className="text-xs">
                  Períodos contínuos de pausa do expediente e atendimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(regras.periodos ?? []).map((p) => (
                  <div key={p.id} className="grid gap-2 p-2.5 rounded-xl border border-border/70 bg-card text-xs">
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs font-semibold"
                        value={p.tipo}
                        onChange={(e) =>
                          onChange({
                            periodos: (regras.periodos ?? []).map((x) =>
                              x.id === p.id ? { ...x, tipo: e.target.value as Periodo["tipo"] } : x,
                            ),
                          })
                        }
                      >
                        {["Férias coletivas", "Férias", "Viagem a serviço", "Atestado médico", "Outro"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onChange({
                            periodos: (regras.periodos ?? []).filter((x) => x.id !== p.id),
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      value={p.descricao}
                      placeholder="Descrição / responsável"
                      onChange={(e) =>
                        onChange({
                          periodos: (regras.periodos ?? []).map((x) =>
                            x.id === p.id ? { ...x, descricao: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        className="h-8 text-xs font-semibold"
                        value={p.inicio}
                        onChange={(e) =>
                          onChange({
                            periodos: (regras.periodos ?? []).map((x) =>
                              x.id === p.id ? { ...x, inicio: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Input
                        type="date"
                        className="h-8 text-xs font-semibold"
                        value={p.fim}
                        onChange={(e) =>
                          onChange({
                            periodos: (regras.periodos ?? []).map((x) =>
                              x.id === p.id ? { ...x, fim: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold gap-1 mt-1"
                  onClick={() =>
                    onChange({
                      periodos: [
                        ...(regras.periodos ?? []),
                        {
                          id: crypto.randomUUID(),
                          tipo: "Férias",
                          descricao: "Férias programadas",
                          inicio: "2026-10-01",
                          fim: "2026-10-10",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-3.5" /> Adicionar período de pausa
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Listas Editáveis: Locais, Setores, Categorias, Responsáveis e Motivos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-2 border-t border-border">
            <ListaEditavelSimples
              titulo="Locais e Salas"
              icone={<Building2 className="size-4 text-sky-600" />}
              itens={regras.locais ?? ["Bloco A", "Bloco B", "Administrativo", "Laboratório 1", "Laboratório 2", "Oficina Mecânica", "Biblioteca", "Auditório"]}
              onChange={(locais) => onChange({ locais })}
              placeholder="Novo local..."
            />

            <ListaEditavelSimples
              titulo="Setores Solicitantes"
              icone={<Building2 className="size-4 text-g-blue" />}
              itens={regras.setores ?? ["Diretoria", "Secretaria", "Financeiro", "Coordenação Pedagógica", "Professores", "Área Técnica", "Recepção", "TI"]}
              onChange={(setores) => onChange({ setores })}
              placeholder="Novo setor..."
            />

            <ListaEditavelSimples
              titulo="Tipos de Problema"
              icone={<Tag className="size-4 text-purple-600" />}
              itens={regras.categorias ?? ["Rede e Internet", "Hardware", "Software e Sistemas", "Impressoras", "Telefonia", "Acessos e Senhas", "Outros"]}
              onChange={(categorias) => onChange({ categorias })}
              placeholder="Nova categoria..."
            />

            <ListaEditavelSimples
              titulo="Responsáveis da TI"
              icone={<UserCheck className="size-4 text-g-green" />}
              itens={regras.responsaveis ?? ["Claudinei Lima"]}
              onChange={(responsaveis) => onChange({ responsaveis })}
              placeholder="Nome do técnico..."
            />

            <ListaEditavelSimples
              titulo="Motivos Pausa SLA"
              icone={<Pause className="size-4 text-amber-500" />}
              itens={regras.motivosPausaSla ?? MOTIVOS_PAUSA_SLA_PADRAO}
              onChange={(motivosPausaSla) => onChange({ motivosPausaSla })}
              placeholder="Novo motivo..."
            />
          </div>
        </TabsContent>

        {/* 5. ABA PREFERÊNCIAS GERAIS */}
        <TabsContent value="geral" className="space-y-4 focus-visible:outline-none">
          <Card className="rounded-2xl border border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="size-4 text-purple-600" />
                Textos, Filtros Iniciais e Ordenação da Fila
              </CardTitle>
              <CardDescription className="text-xs">
                Configure como a página /atendimento abre por padrão para a equipe técnica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Título da Página</Label>
                  <Input
                    value={configAtend.titulo}
                    onChange={(e) => salvarAtendimento({ titulo: e.target.value })}
                    placeholder="Central de Atendimento ao Usuário"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Placeholder de Busca</Label>
                  <Input
                    value={configAtend.placeholderBusca}
                    onChange={(e) => salvarAtendimento({ placeholderBusca: e.target.value })}
                    placeholder="Buscar por número, solicitante, setor..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subtítulo / Instrução</Label>
                <Input
                  value={configAtend.subtitulo}
                  onChange={(e) => salvarAtendimento({ subtitulo: e.target.value })}
                  placeholder="Gerencie chamados, atualize status..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mês Padrão ao Abrir</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium"
                    value={configAtend.mesInicialPadrao || "todos"}
                    onChange={(e) => salvarAtendimento({ mesInicialPadrao: e.target.value })}
                  >
                    <option value="todos">Todos os meses</option>
                    {MESES_DISPONIVEIS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status Padrão ao Abrir</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium"
                    value={configAtend.statusInicialPadrao || "todos"}
                    onChange={(e) => salvarAtendimento({ statusInicialPadrao: e.target.value })}
                  >
                    <option value="todos">Todos</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Em atendimento">Em atendimento</option>
                    <option value="Aguardando">Aguardando</option>
                    <option value="Finalizados">Finalizados</option>
                    <option value="Cancelados">Cancelados</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ordenação Padrão</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium"
                    value={configAtend.ordenacaoPadrao || "recentes"}
                    onChange={(e) =>
                      salvarAtendimento({
                        ordenacaoPadrao: e.target.value as "recentes" | "antigos" | "prioridade",
                      })
                    }
                  >
                    <option value="recentes">Mais recentes primeiro (# decrescente)</option>
                    <option value="antigos">Mais antigos primeiro (# crescente)</option>
                    <option value="prioridade">Maior prioridade primeiro (Crítica &gt; Baixa)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Chamados por Página Padrão</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium"
                    value={configAtend.itensPorPaginaPadrao || 20}
                    onChange={(e) => salvarAtendimento({ itensPorPaginaPadrao: Number(e.target.value) })}
                  >
                    {[10, 20, 30, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} chamados por página
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Botões de Exportação Visíveis</Label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Switch
                        checked={configAtend.botoesExportacaoVisiveis?.excel !== false}
                        onCheckedChange={(c) =>
                          salvarAtendimento({
                            botoesExportacaoVisiveis: {
                              ...configAtend.botoesExportacaoVisiveis,
                              excel: c,
                              pdf: configAtend.botoesExportacaoVisiveis?.pdf ?? true,
                            },
                          })
                        }
                      />
                      <span>Botão Baixar Excel</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Switch
                        checked={configAtend.botoesExportacaoVisiveis?.pdf !== false}
                        onCheckedChange={(c) =>
                          salvarAtendimento({
                            botoesExportacaoVisiveis: {
                              ...configAtend.botoesExportacaoVisiveis,
                              excel: configAtend.botoesExportacaoVisiveis?.excel ?? true,
                              pdf: c,
                            },
                          })
                        }
                      />
                      <span>Botão Baixar PDF</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListaEditavelSimples({
  titulo,
  icone,
  itens,
  onChange,
  placeholder = "Novo item...",
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: string[];
  onChange: (novos: string[]) => void;
  placeholder?: string;
}) {
  const [novo, setNovo] = useState("");

  const adicionar = () => {
    if (!novo.trim()) return;
    onChange([...itens, novo.trim()]);
    setNovo("");
  };

  return (
    <Card className="rounded-2xl border border-border shadow-xs">
      <CardHeader className="pb-2.5">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
          {icone} {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1.5">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
            placeholder={placeholder}
            className="h-8 text-xs flex-1"
          />
          <Button type="button" size="sm" variant="outline" onClick={adicionar} className="h-8 text-xs px-2 font-bold shrink-0">
            <Plus className="size-3 mr-0.5" /> Adicionar
          </Button>
        </div>
        <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
          {itens.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border border-border/70 bg-muted/20 text-xs">
              <span className="font-medium truncate text-[11px]">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onChange(itens.filter((_, i) => i !== idx))}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
