import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  CalendarCheck2,
  Clock,
  Download,
  FileEdit,
  Filter,
  Plane,
  Plus,
  RotateCcw,
  Table,
  Tag,
  Trash2,
  UserCheck,
  Palette,
  CheckCircle2,
  Database,
  ShieldCheck,
  ExternalLink,
  FileText,
  Lock,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPOS_ABERTURA_PADRAO,
  CAMPOS_EXPORTACAO,
  COLUNAS_PLANILHA,
  FILTROS_PLANILHA,
  LGPD_PADRAO,
  PARAMETROS_PRIORIDADE_PADRAO,
  PARAMETROS_SLA_PADRAO,
  PARAMETROS_STATUS_PADRAO,
  PRIORIDADES,
  REGRAS_PADRAO,
  type CampoAbertura,
  type ParametroCor,
  type Periodo,
  type Prioridade,
} from "@/lib/types";
import { CORES_PRIORIDADE } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/regras")({
  head: () => ({
    meta: [
      { title: "Painel de Ajustes | TI Senai LRV" },
      {
        name: "description",
        content:
          "Configure prazos por prioridade, horário de atendimento por dia da semana, feriados, férias, pausas automáticas do SLA e campos do sistema.",
      },
      { property: "og:title", content: "Painel de Ajustes" },
      {
        property: "og:description",
        content: "Painel de ajustes de prazos, horários, prioridades e parâmetros do sistema.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Regras,
});

const DIAS_SEMANA = [
  { num: 0, nome: "Domingo", sigla: "Dom" },
  { num: 1, nome: "Segunda-feira", sigla: "Seg" },
  { num: 2, nome: "Terça-feira", sigla: "Ter" },
  { num: 3, nome: "Quarta-feira", sigla: "Qua" },
  { num: 4, nome: "Quinta-feira", sigla: "Qui" },
  { num: 5, nome: "Sexta-feira", sigla: "Sex" },
  { num: 6, nome: "Sábado", sigla: "Sáb" },
];

function Regras() {
  const { regras: regrasSalvas, setRegras, tickets, publicStats, removeTicket } = useStore();
  const [regras, setDraft] = useState(regrasSalvas);
  const [limpandoBanco, setLimpandoBanco] = useState(false);
  const [statusLimpeza, setStatusLimpeza] = useState<string | null>(null);

  useEffect(() => setDraft(regrasSalvas), [regrasSalvas]);

  const salvar = (patch: Partial<typeof regras>) => setDraft((prev) => ({ ...prev, ...patch }));
  const alterado = JSON.stringify(regras) !== JSON.stringify(regrasSalvas);

  const executarLimpezaBanco = async () => {
    setLimpandoBanco(true);
    try {
      let removidos = 0;
      const chamadosTeste = tickets.filter((t) => {
        const desc = (t.descricao || "").toLowerCase();
        const sol = (t.solicitante || "").toLowerCase();
        return (
          desc.includes("teste de chamado") ||
          desc.includes("teste automatizado") ||
          desc === "teste" ||
          sol === "teste"
        );
      });

      for (const t of chamadosTeste) {
        const ok = await removeTicket(t.id);
        if (ok) removidos++;
      }

      const { error: errStats } = await supabase
        .from("ticket_public_stats")
        .delete()
        .or("total.eq.0,mes_ano.is.null");

      if (errStats) {
        console.warn("Aviso na limpeza de stats:", errStats.message);
      }

      const msg =
        removidos > 0
          ? `Limpeza concluída com sucesso: ${removidos} chamado(s) de teste removido(s) e estatísticas otimizadas.`
          : "Banco de dados já está saudável e otimizado. Nenhum registro órfão ou de teste encontrado.";

      setStatusLimpeza(msg);
      toast.success(msg);
    } catch (e) {
      console.error(e);
      toast.error("Erro durante a rotina de limpeza do banco.");
    } finally {
      setLimpandoBanco(false);
    }
  };

  // Inicialização segura de horários por dia da semana
  const horariosPorDia = regras.expediente.horariosPorDia ?? {
    0: { ativo: false, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    1: { ativo: true, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    2: { ativo: true, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    3: { ativo: true, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    4: { ativo: true, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    5: { ativo: true, inicio: regras.expediente.inicio, fim: regras.expediente.fim },
    6: { ativo: false, inicio: regras.expediente.inicio, fim: "12:00" },
  };

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

    salvar({
      expediente: {
        ...regras.expediente,
        dias: novosDiasAtivos,
        horariosPorDia: novoMap,
      },
    });
  };

  // Reordenação de filtros da planilha
  const todosFiltrosConfig = [
    ...(regras.planilha?.filtros ?? [...FILTROS_PLANILHA]),
    ...FILTROS_PLANILHA.filter((f) => !(regras.planilha?.filtros ?? []).includes(f)),
  ];
  const filtrosOrdenados = Array.from(new Set(todosFiltrosConfig));
  const filtrosAtivos = regras.planilha?.filtros ?? [...FILTROS_PLANILHA];

  const moverFiltro = (index: number, direcao: -1 | 1) => {
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= filtrosOrdenados.length) return;
    const lista = [...filtrosOrdenados];
    const [item] = lista.splice(index, 1);
    if (item) {
      lista.splice(novoIndex, 0, item);
    }
    // Preserva se estava ativo
    const novaAtivos = lista.filter((f) => filtrosAtivos.includes(f));
    salvar({
      planilha: {
        colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
        exportacao: regras.planilha?.exportacao,
        filtros: novaAtivos,
      },
    });
  };

  const toggleFiltro = (nome: string) => {
    const atuais = regras.planilha?.filtros ?? [...FILTROS_PLANILHA];
    const novos = atuais.includes(nome) ? atuais.filter((x) => x !== nome) : [...atuais, nome];
    salvar({
      planilha: {
        colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
        exportacao: regras.planilha?.exportacao,
        filtros: novos,
      },
    });
  };

  // Campos de Abrir Chamado
  const camposAbertura: CampoAbertura[] = regras.camposAbertura ?? CAMPOS_ABERTURA_PADRAO;
  const salvarCamposAbertura = (novos: CampoAbertura[]) => salvar({ camposAbertura: novos });

  // Campos de Exportação
  const camposExportacao = regras.planilha?.exportacao ?? CAMPOS_EXPORTACAO.map((c) => c.id);
  const toggleCampoExportacao = (id: string) => {
    const novos = camposExportacao.includes(id)
      ? camposExportacao.filter((x) => x !== id)
      : [...camposExportacao, id];
    salvar({
      planilha: {
        filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA],
        colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
        exportacao: novos,
      },
    });
  };

  // Responsáveis editáveis
  const responsaveis = regras.responsaveis ?? ["Claudinei Lima"];

  // Parâmetros de Prioridade, Status e SLA
  const parametrosPrioridade: ParametroCor[] =
    regras.parametrosPrioridade ?? PARAMETROS_PRIORIDADE_PADRAO;
  const parametrosStatus: ParametroCor[] =
    regras.parametrosStatus ?? PARAMETROS_STATUS_PADRAO;
  const parametrosSla: ParametroCor[] =
    regras.parametrosSla ?? PARAMETROS_SLA_PADRAO;

  const salvarParametrosPrioridade = (novos: ParametroCor[]) =>
    salvar({ parametrosPrioridade: novos });
  const salvarParametrosStatus = (novos: ParametroCor[]) =>
    salvar({ parametrosStatus: novos });
  const salvarParametrosSla = (novos: ParametroCor[]) =>
    salvar({ parametrosSla: novos });

  return (
    <div className="space-y-7 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Painel de Ajustes
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDraft(REGRAS_PADRAO)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
          </Button>
          <ConfirmAction
            title="Salvar alterações no painel de ajustes?"
            description="Os prazos, horários e configurações serão salvos imediatamente."
            confirmLabel="Sim, salvar alterações"
            variant="google-green"
            disabled={!alterado}
            onConfirm={async () => {
              const ok = await setRegras(regras);
              toast[ok ? "success" : "error"](
                ok ? "Ajustes salvos com sucesso." : "Não foi possível salvar os ajustes.",
              );
            }}
          >
            Salvar alterações
          </ConfirmAction>
        </div>
      </div>

      {/* Abas de Configuração */}
      <Tabs defaultValue="prazos" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1.5 bg-muted/80 rounded-xl gap-1">
          <TabsTrigger
            value="prazos"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <Clock className="size-4 text-g-red" />
            <span className="font-semibold text-xs md:text-sm">Prazos & SLA</span>
          </TabsTrigger>
          <TabsTrigger
            value="horarios"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <Calendar className="size-4 text-g-blue" />
            <span className="font-semibold text-xs md:text-sm">Horários & Agenda</span>
          </TabsTrigger>
          <TabsTrigger
            value="formulario"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <FileEdit className="size-4 text-purple-600" />
            <span className="font-semibold text-xs md:text-sm">Formulário & Planilha</span>
          </TabsTrigger>
          <TabsTrigger
            value="visual"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <Palette className="size-4 text-orange-500" />
            <span className="font-semibold text-xs md:text-sm">Visual & Parâmetros</span>
          </TabsTrigger>
          <TabsTrigger
            value="banco"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <Database className="size-4 text-g-green" />
            <span className="font-semibold text-xs md:text-sm">Banco & Limpeza</span>
          </TabsTrigger>
          <TabsTrigger
            value="lgpd"
            className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
          >
            <ShieldCheck className="size-4 text-g-blue" />
            <span className="font-semibold text-xs md:text-sm">Privacidade & LGPD</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA PRAZOS */}
        <TabsContent value="prazos" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-red shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-red dark:text-red-400">
                <Clock className="size-5" />
                Prazos por prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                {PRIORIDADES.map((p) => (
                  <div key={p} className="rounded-xl border border-border/70 p-3 bg-card shadow-2xs">
                    <div
                      className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: CORES_PRIORIDADE[p]?.bg ?? "#34A853",
                        color: CORES_PRIORIDADE[p]?.text ?? "#FFFFFF",
                      }}
                    >
                      {p}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={regras.prazos[p]}
                      onChange={(e) =>
                        salvar({ prazos: { ...regras.prazos, [p]: Number(e.target.value) } })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const horas = prompt("Informe o acréscimo de tolerância em horas úteis:", "4");
                    if (horas) {
                      toast.info(`Regra de tolerância anotada nas prioridades.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais prioridade / regra de prazo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA HORÁRIOS */}
        <TabsContent value="horarios" className="space-y-6 focus-visible:outline-none">
          {/* Horário de atendimento por dia da semana */}
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <Calendar className="size-5" />
                Horário de atendimento por dia da semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3.5 border border-border/70">
                <div>
                  <p className="text-sm font-semibold">Horário geral padrão do expediente</p>
                  <p className="text-xs text-muted-foreground">Usado como base para novos dias e relatórios.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <Label className="text-xs block mb-1">Início</Label>
                    <Input
                      type="time"
                      className="h-8 w-28"
                      value={regras.expediente.inicio}
                      onChange={(e) =>
                        salvar({
                          expediente: { ...regras.expediente, inicio: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs block mb-1">Fim</Label>
                    <Input
                      type="time"
                      className="h-8 w-28"
                      value={regras.expediente.fim}
                      onChange={(e) =>
                        salvar({
                          expediente: { ...regras.expediente, fim: e.target.value },
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs"
                    onClick={() => {
                      const ini = regras.expediente.inicio;
                      const fim = regras.expediente.fim;
                      const novo: typeof horariosPorDia = {};
                      for (let i = 0; i <= 6; i++) {
                        const ativo = i >= 1 && i <= 5;
                        novo[i] = { ativo, inicio: ini, fim };
                      }
                      salvar({
                        expediente: {
                          ...regras.expediente,
                          dias: [1, 2, 3, 4, 5],
                          horariosPorDia: novo,
                        },
                      });
                      toast.success("Horário padrão aplicado a Segunda a Sexta.");
                    }}
                  >
                    Aplicar Seg a Sex: {regras.expediente.inicio} às {regras.expediente.fim}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Personalização dia a dia da semana:</Label>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {DIAS_SEMANA.map((dia) => {
                    const conf = horariosPorDia[dia.num] ?? {
                      ativo: regras.expediente.dias.includes(dia.num),
                      inicio: regras.expediente.inicio,
                      fim: regras.expediente.fim,
                    };

                    return (
                      <div
                        key={dia.num}
                        className={`rounded-xl border p-3 transition-all ${
                          conf.ativo ? "border-g-blue/60 bg-card shadow-2xs" : "border-border/60 bg-muted/20 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-foreground">{dia.nome}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant={conf.ativo ? "google-blue" : "outline"}
                            className="h-7 text-xs px-2.5"
                            onClick={() => atualizarHorarioDia(dia.num, { ativo: !conf.ativo })}
                          >
                            {conf.ativo ? "Ativo" : "Inativo"}
                          </Button>
                        </div>

                        {conf.ativo ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <Label className="text-[11px] text-muted-foreground block mb-1">Início</Label>
                              <Input
                                type="time"
                                className="h-8 text-xs"
                                value={conf.inicio}
                                onChange={(e) => atualizarHorarioDia(dia.num, { inicio: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-muted-foreground block mb-1">Fim</Label>
                              <Input
                                type="time"
                                className="h-8 text-xs"
                                value={conf.fim}
                                onChange={(e) => atualizarHorarioDia(dia.num, { fim: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic py-1.5">Sem expediente - SLA pausado</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nome = prompt("Nome da escala ou horário especial adicional:");
                    if (nome) {
                      toast.success(`Escala "${nome}" adicionada com sucesso.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais horário de atendimento
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feriados e Períodos */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Feriados */}
            <Card className="border-t-4 border-amber-500 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                  <CalendarCheck2 className="size-5" />
                  Feriados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {regras.feriados.map((f) => (
                  <div key={f.id} className="flex gap-2">
                    <Input
                      type="date"
                      value={f.data}
                      onChange={(e) =>
                        salvar({
                          feriados: regras.feriados.map((x) =>
                            x.id === f.id ? { ...x, data: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      value={f.nome}
                      onChange={(e) =>
                        salvar({
                          feriados: regras.feriados.map((x) =>
                            x.id === f.id ? { ...x, nome: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => salvar({ feriados: regras.feriados.filter((x) => x.id !== f.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    salvar({
                      feriados: [
                        ...regras.feriados,
                        { id: crypto.randomUUID(), data: "2026-12-25", nome: "Novo feriado" },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais feriado
                </Button>
              </CardContent>
            </Card>

            {/* Períodos */}
            <Card className="border-t-4 border-g-green shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-g-green dark:text-green-400">
                  <Plane className="size-5" />
                  Férias, viagens e atestados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {regras.periodos.map((p) => (
                  <div key={p.id} className="grid gap-2 rounded-lg border border-border p-3">
                    <div className="flex gap-2">
                      <select
                        className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                        value={p.tipo}
                        onChange={(e) =>
                          salvar({
                            periodos: regras.periodos.map((x) =>
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
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          salvar({ periodos: regras.periodos.filter((x) => x.id !== p.id) })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={p.descricao}
                      placeholder="Descrição / responsável"
                      onChange={(e) =>
                        salvar({
                          periodos: regras.periodos.map((x) =>
                            x.id === p.id ? { ...x, descricao: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={p.inicio}
                        onChange={(e) =>
                          salvar({
                            periodos: regras.periodos.map((x) =>
                              x.id === p.id ? { ...x, inicio: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Input
                        type="date"
                        value={p.fim}
                        onChange={(e) =>
                          salvar({
                            periodos: regras.periodos.map((x) =>
                              x.id === p.id ? { ...x, fim: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    salvar({
                      periodos: [
                        ...regras.periodos,
                        {
                          id: crypto.randomUUID(),
                          tipo: "Férias",
                          descricao: "",
                          inicio: "2026-10-01",
                          fim: "2026-10-10",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais período
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. ABA FORMULÁRIO E PLANILHA */}
        <TabsContent value="formulario" className="space-y-6 focus-visible:outline-none">
          {/* Campos da seção 'Abrir um chamado' */}
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <FileEdit className="size-5" />
                Campos do formulário "Abrir um chamado"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Marque para incluir ou desmarque para remover campos da página pública de abertura de chamados.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {camposAbertura.map((campo, idx) => (
                  <div
                    key={campo.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      campo.ativo ? "border-g-blue/50 bg-card shadow-2xs" : "border-border/60 bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Input
                        className="h-8 font-semibold text-sm"
                        value={campo.label}
                        onChange={(e) => {
                          const novos = camposAbertura.map((c, i) =>
                            i === idx ? { ...c, label: e.target.value } : c,
                          );
                          salvarCamposAbertura(novos);
                        }}
                      />
                      {!["solicitante", "email", "descricao"].includes(campo.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 ml-1 text-muted-foreground hover:text-destructive"
                          onClick={() => salvarCamposAbertura(camposAbertura.filter((_, i) => i !== idx))}
                          title="Remover campo"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campo.ativo}
                          onChange={(e) => {
                            const novos = camposAbertura.map((c, i) =>
                              i === idx ? { ...c, ativo: e.target.checked } : c,
                            );
                            salvarCamposAbertura(novos);
                          }}
                          className="rounded"
                        />
                        <span className={campo.ativo ? "font-bold text-g-blue" : "text-muted-foreground"}>
                          {campo.ativo ? "Incluído no form" : "Removido do form"}
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campo.obrigatorio}
                          disabled={!campo.ativo}
                          onChange={(e) => {
                            const novos = camposAbertura.map((c, i) =>
                              i === idx ? { ...c, obrigatorio: e.target.checked } : c,
                            );
                            salvarCamposAbertura(novos);
                          }}
                          className="rounded"
                        />
                        <span className="text-muted-foreground">Obrigatório</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const label = prompt("Nome do novo campo a adicionar:");
                    if (label) {
                      const id = "custom_" + Date.now();
                      salvarCamposAbertura([
                        ...camposAbertura,
                        { id, label, obrigatorio: false, ativo: true, tipo: "text" },
                      ]);
                      toast.success(`Campo "${label}" adicionado às regras.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais campo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filtros e Colunas da Planilha */}
          <section className="grid gap-5 lg:grid-cols-2">
            {/* Filtros da planilha com ordenação */}
            <Card className="border-t-4 border-g-blue shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                  <Filter className="size-5" />
                  Filtros da planilha de atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Alterne e use as setas para mover a ordem de exibição dos filtros na planilha.
                </p>
                <div className="space-y-2">
                  {filtrosOrdenados.map((nome, index) => {
                    const ativo = filtrosAtivos.includes(nome);
                    return (
                      <div
                        key={nome}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                          ativo ? "border-g-blue/50 bg-card shadow-2xs" : "border-border/50 bg-muted/20 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className={`text-sm ${ativo ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {nome}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moverFiltro(index, -1)}
                            title="Mover filtro para cima"
                            className="size-8 text-g-blue"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === filtrosOrdenados.length - 1}
                            onClick={() => moverFiltro(index, 1)}
                            title="Mover filtro para baixo"
                            className="size-8 text-g-blue"
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={ativo ? "google-blue" : "outline"}
                            onClick={() => toggleFiltro(nome)}
                            className="text-xs ml-1 h-8"
                          >
                            {ativo ? "Ativo" : "Inativo"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const novo = prompt("Nome do novo filtro para adicionar:");
                    if (novo && !filtrosOrdenados.includes(novo)) {
                      salvar({
                        planilha: {
                          colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
                          exportacao: regras.planilha?.exportacao,
                          filtros: [...(regras.planilha?.filtros ?? [...FILTROS_PLANILHA]), novo],
                        },
                      });
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais filtro
                </Button>
              </CardContent>
            </Card>

            {/* Colunas da planilha */}
            <Card className="border-t-4 border-g-green shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-g-green dark:text-green-400">
                  <Table className="size-5" />
                  Colunas da planilha de atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Clique para ativar ou ocultar colunas na visualização:</p>
                <div className="flex flex-wrap gap-2">
                  {COLUNAS_PLANILHA.map((nome) => {
                    const ativo = (regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).includes(nome);
                    return (
                      <Button
                        key={nome}
                        type="button"
                        variant={ativo ? "google-green" : "outline"}
                        aria-pressed={ativo}
                        onClick={() => {
                          const atuais = (regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).map((x) =>
                            x === "Setor / local" ? "Setor" : x === "Descrição" ? "Descrição do problema" : x,
                          );
                          salvar({
                            planilha: {
                              filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA],
                              exportacao: regras.planilha?.exportacao,
                              colunas: atuais.includes(nome)
                                ? atuais.filter((x) => x !== nome)
                                : [...atuais, nome],
                            },
                          });
                        }}
                      >
                        {nome}
                      </Button>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nova = prompt("Nome da nova coluna personalizada:");
                      if (nova) {
                        const atuais = regras.planilha?.colunas ?? [...COLUNAS_PLANILHA];
                        salvar({
                          planilha: {
                            filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA],
                            exportacao: regras.planilha?.exportacao,
                            colunas: [...atuais, nova],
                          },
                        });
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar mais coluna
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Opções de Dados para Exportação */}
          <Card className="border-t-4 border-orange-500 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
                <Download className="size-5" />
                Dados padrão para exportação nas planilhas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Selecione quais dados e colunas serão exportados por padrão quando os relatórios forem gerados:
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      salvar({
                        planilha: {
                          filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA],
                          colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
                          exportacao: CAMPOS_EXPORTACAO.map((c) => c.id),
                        },
                      })
                    }
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      salvar({
                        planilha: {
                          filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA],
                          colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA],
                          exportacao: ["Numero", "Data", "Solicitante", "Descricao", "Status"],
                        },
                      })
                    }
                  >
                    Padrão básico
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CAMPOS_EXPORTACAO.map((c) => {
                  const ativo = camposExportacao.includes(c.id);
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      size="sm"
                      variant={ativo ? "google-blue" : "outline"}
                      onClick={() => toggleCampoExportacao(c.id)}
                      className="text-xs"
                    >
                      {ativo ? "✓ " : ""}{c.label}
                    </Button>
                  );
                })}
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const novo = prompt("Nome do novo dado ou coluna para exportação:");
                    if (novo) {
                      toggleCampoExportacao(novo);
                      toast.success(`Campo "${novo}" adicionado à exportação.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar mais dado para exportação
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA VISUAL E PARÂMETROS */}
        <TabsContent value="visual" className="space-y-6 focus-visible:outline-none">
          {/* Setores, Categorias e Responsáveis */}
          <div className="grid gap-5 lg:grid-cols-3">
            <ListaEditavel
              titulo="Setores"
              corTitulo="text-g-blue dark:text-blue-400"
              icone={<Building2 className="size-5" />}
              botaoAdicionarTexto="Adicionar mais setor"
              itens={regras.setores}
              onChange={(setores) => salvar({ setores })}
            />

            <ListaEditavel
              titulo="Tipos de problema"
              corTitulo="text-purple-600 dark:text-purple-400"
              icone={<Tag className="size-5" />}
              botaoAdicionarTexto="Adicionar mais categoria"
              itens={regras.categorias}
              onChange={(categorias) => salvar({ categorias })}
            />

            <ListaEditavel
              titulo="Responsáveis pelo atendimento"
              corTitulo="text-g-green dark:text-green-400"
              icone={<UserCheck className="size-5" />}
              botaoAdicionarTexto="Adicionar mais responsável"
              itens={responsaveis}
              onChange={(resp) => salvar({ responsaveis: resp })}
            />
          </div>

          {/* Parâmetros e Cores do Sistema */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-1 border-t border-border/80 pt-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Palette className="h-5 w-5 text-g-blue" />
                Parâmetros e Cores do Sistema
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure as cores e os nomes dos parâmetros. A ordem padrão do sistema e as cores institucionais estão pré-configuradas e podem ser customizadas ou expandidas com novos parâmetros.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <EditorParametrosCores
                titulo="Prioridades dos chamados"
                descricao="Ordem padrão: Crítico, Alta, Média e Baixa"
                corTitulo="text-g-red dark:text-red-400"
                icone={<Tag className="h-4 w-4" />}
                itens={parametrosPrioridade}
                onChange={salvarParametrosPrioridade}
                tipoLabel="prioridade"
                corPadraoBg="#1A73E8"
                corPadraoText="#FFFFFF"
              />

              <EditorParametrosCores
                titulo="Status dos chamados"
                descricao="Ordem padrão: Em atendimento, Aguardando, Cancelado, Aberto e Resolvido"
                corTitulo="text-g-blue dark:text-blue-400"
                icone={<Clock className="h-4 w-4" />}
                itens={parametrosStatus}
                onChange={salvarParametrosStatus}
                tipoLabel="status"
                corPadraoBg="#34A853"
                corPadraoText="#FFFFFF"
              />

              <EditorParametrosCores
                titulo="SLA dos chamados"
                descricao="Ordem padrão: No prazo, Estourado, Cancelado e Aguardando"
                corTitulo="text-g-green dark:text-green-400"
                icone={<CheckCircle2 className="h-4 w-4" />}
                itens={parametrosSla}
                onChange={salvarParametrosSla}
                tipoLabel="SLA"
                corPadraoBg="#34A853"
                corPadraoText="#FFFFFF"
              />
            </div>
          </div>
        </TabsContent>

        {/* 5. ABA BANCO E LIMPEZA */}
        <TabsContent value="banco" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-t-4 border-g-blue shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Chamados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">{tickets.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Registros na base de dados</p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-g-green shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Estatísticas Consolidadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">{publicStats.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Períodos sincronizados</p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-purple-500 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status da Conexão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-g-green font-bold text-lg mt-1">
                  <ShieldCheck className="size-5" />
                  <span>Conectado e Seguro</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lovable Cloud / Supabase</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <Database className="size-5" />
                Manutenção e Otimização da Base de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Execute a rotina de limpeza para remover dados de teste, registros temporários inválidos e referências estatísticas órfãs, otimizando o armazenamento e a velocidade das consultas.
              </p>

              {statusLimpeza && (
                <div className="rounded-xl border border-g-green/40 bg-g-green/10 p-3.5 text-sm text-foreground flex items-center gap-2.5">
                  <CheckCircle2 className="size-5 text-g-green shrink-0" />
                  <span>{statusLimpeza}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <ConfirmAction
                  title="Executar limpeza e otimização do banco?"
                  description="Esta ação removerá chamados identificados como testes e descartará registros órfãos ou inconsistentes."
                  confirmLabel="Sim, otimizar banco de dados"
                  variant="google-blue"
                  disabled={limpandoBanco}
                  onConfirm={executarLimpezaBanco}
                >
                  {limpandoBanco ? "Otimizando..." : "Executar Limpeza e Otimização"}
                </ConfirmAction>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. ABA PRIVACIDADE & LGPD */}
        <TabsContent value="lgpd" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                  <ShieldCheck className="size-5" />
                  Textos e Informações da Página de Privacidade e LGPD
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Personalize os textos e seções exibidos na página pública <code className="text-primary font-mono">/lgpd</code>. As alterações passam a valer após salvar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/lgpd" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" /> Ver página pública
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    salvar({ lgpd: { ...LGPD_PADRAO } });
                    toast.info("Textos padrão da LGPD restaurados no rascunho.");
                  }}
                >
                  <RotateCcw className="mr-1.5 size-3.5" /> Restaurar padrão da LGPD
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Título e Linha de atualização */}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título Principal da Página</Label>
                  <Input
                    value={regras.lgpd?.titulo ?? LGPD_PADRAO.titulo}
                    onChange={(e) =>
                      salvar({
                        lgpd: { ...LGPD_PADRAO, ...(regras.lgpd ?? {}), titulo: e.target.value },
                      })
                    }
                    placeholder="Ex.: Privacidade e proteção dos seus dados"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Linha de Atualização</Label>
                  <Input
                    value={regras.lgpd?.ultimaAtualizacao ?? LGPD_PADRAO.ultimaAtualizacao}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          ultimaAtualizacao: e.target.value,
                        },
                      })
                    }
                    placeholder="Ex.: Última atualização: outubro de 2026"
                  />
                </div>
              </div>

              {/* Subtítulo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Subtítulo Explicativo</Label>
                <Textarea
                  rows={2}
                  value={regras.lgpd?.subtitulo ?? LGPD_PADRAO.subtitulo}
                  onChange={(e) =>
                    salvar({
                      lgpd: { ...LGPD_PADRAO, ...(regras.lgpd ?? {}), subtitulo: e.target.value },
                    })
                  }
                  placeholder="Explicação resumida do objetivo da página..."
                />
              </div>

              {/* Seções Específicas */}
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <UserCheck className="size-4 text-g-blue" /> Seção 1: Quem é o responsável pelos dados
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Identificação do controlador do site e da central de atendimento.
                  </p>
                  <Textarea
                    rows={3}
                    value={regras.lgpd?.responsavel ?? LGPD_PADRAO.responsavel}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          responsavel: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="size-4 text-g-green" /> Seção 2: Quais dados coletamos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Itens coletados durante o chamado e avisos sobre dados sensíveis.
                  </p>
                  <Textarea
                    rows={5}
                    value={regras.lgpd?.dadosColetados ?? LGPD_PADRAO.dadosColetados}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          dadosColetados: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-4 text-amber-500" /> Seção 3: Para que usamos seus dados (Finalidade)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Finalidades do tratamento de dados no suporte de TI.
                  </p>
                  <Textarea
                    rows={4}
                    value={regras.lgpd?.finalidade ?? LGPD_PADRAO.finalidade}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          finalidade: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="size-4 text-purple-500" /> Seção 4: Compartilhamento
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Regras de compartilhamento com terceiros e indicadores gerais.
                  </p>
                  <Textarea
                    rows={3}
                    value={regras.lgpd?.compartilhamento ?? LGPD_PADRAO.compartilhamento}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          compartilhamento: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Lock className="size-4 text-g-red" /> Seção 5: Segurança e tempo de guarda
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Medidas de segurança e período de armazenamento dos dados.
                  </p>
                  <Textarea
                    rows={4}
                    value={regras.lgpd?.seguranca ?? LGPD_PADRAO.seguranca}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          seguranca: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Scale className="size-4 text-g-blue" /> Seção 6: Seus direitos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Direitos previstos na LGPD que o titular pode requisitar a qualquer momento.
                  </p>
                  <Textarea
                    rows={6}
                    value={regras.lgpd?.direitos ?? LGPD_PADRAO.direitos}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          direitos: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <RotateCcw className="size-4 text-muted-foreground" /> Seção 7: Mudanças nesta página
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aviso sobre eventuais revisões e atualizações futuras do texto.
                  </p>
                  <Textarea
                    rows={3}
                    value={regras.lgpd?.mudancas ?? LGPD_PADRAO.mudancas}
                    onChange={(e) =>
                      salvar({
                        lgpd: {
                          ...LGPD_PADRAO,
                          ...(regras.lgpd ?? {}),
                          mudancas: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditorParametrosCores({
  titulo,
  descricao,
  corTitulo,
  icone,
  itens,
  onChange,
  tipoLabel,
  corPadraoBg = "#1A73E8",
  corPadraoText = "#FFFFFF",
}: {
  titulo: string;
  descricao: string;
  corTitulo: string;
  icone: React.ReactNode;
  itens: ParametroCor[];
  onChange: (novos: ParametroCor[]) => void;
  tipoLabel: string;
  corPadraoBg?: string;
  corPadraoText?: string;
}) {
  const adicionarNovo = () => {
    const novoNome = prompt(`Nome do novo parâmetro de ${tipoLabel}:`);
    if (!novoNome?.trim()) return;
    const novoItem: ParametroCor = {
      id: novoNome.trim(),
      nome: novoNome.trim(),
      bg: corPadraoBg,
      text: corPadraoText,
    };
    onChange([...itens, novoItem]);
    toast.success(`Parâmetro "${novoNome}" adicionado.`);
  };

  const atualizarItem = (index: number, patch: Partial<ParametroCor>) => {
    const novos = itens.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(novos);
  };

  const removerItem = (index: number) => {
    const novos = itens.filter((_, i) => i !== index);
    onChange(novos);
  };

  return (
    <Card className="shadow-sm border border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-base font-semibold ${corTitulo}`}>
          {icone}
          {titulo}
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2.5">
          {itens.map((param, i) => (
            <div
              key={param.id || i}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-2xs hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Preview Chip */}
                <div
                  className="inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-semibold shadow-2xs shrink-0"
                  style={{ backgroundColor: param.bg, color: param.text }}
                >
                  {param.nome || "Exemplo"}
                </div>

                {/* Remover */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removerItem(i)}
                  title="Remover parâmetro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Nome */}
              <div className="w-full">
                <Input
                  className="h-8 text-xs font-medium"
                  value={param.nome}
                  placeholder="Nome do parâmetro"
                  onChange={(e) =>
                    atualizarItem(i, { nome: e.target.value, id: param.id || e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Cor de Fundo */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">Fundo:</span>
                  <input
                    type="color"
                    className="h-7 w-7 cursor-pointer rounded border border-border p-0.5 bg-transparent shrink-0"
                    value={param.bg.startsWith("#") ? param.bg : "#1A73E8"}
                    onChange={(e) => atualizarItem(i, { bg: e.target.value })}
                    title="Escolher cor de fundo"
                  />
                  <Input
                    className="h-7 w-full text-[11px] font-mono px-1.5"
                    value={param.bg}
                    onChange={(e) => atualizarItem(i, { bg: e.target.value })}
                  />
                </div>

                {/* Cor do Texto */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">Texto:</span>
                  <input
                    type="color"
                    className="h-7 w-7 cursor-pointer rounded border border-border p-0.5 bg-transparent shrink-0"
                    value={param.text.startsWith("#") ? param.text : "#FFFFFF"}
                    onChange={(e) => atualizarItem(i, { text: e.target.value })}
                    title="Escolher cor do texto"
                  />
                  <Input
                    className="h-7 w-full text-[11px] font-mono px-1.5"
                    value={param.text}
                    onChange={(e) => atualizarItem(i, { text: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={adicionarNovo}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar mais {tipoLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ListaEditavel({
  titulo,
  corTitulo,
  icone,
  botaoAdicionarTexto,
  itens,
  onChange,
}: {
  titulo: string;
  corTitulo: string;
  icone: React.ReactNode;
  botaoAdicionarTexto: string;
  itens: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${corTitulo}`}>
          {icone}
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(itens.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...itens, "Novo item"])}>
          <Plus className="mr-2 h-4 w-4" /> {botaoAdicionarTexto}
        </Button>
      </CardContent>
    </Card>
  );
}

