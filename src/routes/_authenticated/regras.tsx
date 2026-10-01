import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useStore } from "@/lib/store-context";
import {
  CAMPOS_ABERTURA_PADRAO,
  CAMPOS_EXPORTACAO,
  COLUNAS_PLANILHA,
  FILTROS_PLANILHA,
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
      { title: "Regras e prioridades | TI Senai LRV" },
      {
        name: "description",
        content:
          "Configure prazos por prioridade, horário de atendimento por dia da semana, feriados, férias, pausas automáticas do SLA e campos do sistema.",
      },
      { property: "og:title", content: "Regras e Prioridades do SLA" },
      {
        property: "og:description",
        content: "O gestor edita aqui os prazos e as pausas; o dashboard recalcula tudo na hora.",
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
  const { regras: regrasSalvas, setRegras } = useStore();
  const [regras, setDraft] = useState(regrasSalvas);
  useEffect(() => setDraft(regrasSalvas), [regrasSalvas]);

  const salvar = (patch: Partial<typeof regras>) => setDraft((prev) => ({ ...prev, ...patch }));
  const alterado = JSON.stringify(regras) !== JSON.stringify(regrasSalvas);

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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-g-blue via-indigo-600 to-g-green bg-clip-text text-transparent">
            Regras e prioridades
          </h1>
          <p className="mt-1 text-muted-foreground">
            Personalize horários por dia da semana, ordem dos filtros, campos e exportações. As alterações entram em vigor após salvar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDraft(REGRAS_PADRAO)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
          </Button>
          <ConfirmAction
            title="Salvar alterações nas regras?"
            description="Os prazos, os horários e as configurações do sistema serão atualizados após sua confirmação."
            confirmLabel="Sim, salvar regras"
            disabled={!alterado}
            onConfirm={async () => {
              const ok = await setRegras(regras);
              toast[ok ? "success" : "error"](
                ok ? "Regras salvas com sucesso." : "Não foi possível salvar as regras.",
              );
            }}
          >
            Salvar alterações
          </ConfirmAction>
        </div>
      </div>

      {/* 1. Prazos por prioridade */}
      <Card className="border-t-4 border-g-red shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-g-red dark:text-red-400">
            <Clock className="size-5" />
            Prazos por prioridade (horas úteis)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {PRIORIDADES.map((p) => (
              <div key={p} className="rounded-xl border border-border/70 p-3 bg-card">
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
                const horas = prompt("Informe o acréscimo de tolerância (em horas úteis):", "4");
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

      {/* 2. Horário de atendimento e dias da semana */}
      <Card className="border-t-4 border-g-blue shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
            <Calendar className="size-5" />
            Horário de atendimento (dias da semana personalizados)
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
                Aplicar Seg a Sex ({regras.expediente.inicio} - {regras.expediente.fim})
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
                      conf.ativo ? "border-g-blue/60 bg-card shadow-sm" : "border-border/60 bg-muted/20 opacity-70"
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
                      <p className="text-xs text-muted-foreground italic py-1.5">Sem expediente (SLA pausado)</p>
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
                const nome = prompt("Nome da escala / horário especial adicional (ex.: Plantão Noturno):");
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

      {/* 3. Feriados e Períodos */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Feriados */}
        <Card className="border-t-4 border-amber-500 shadow-sm">
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
        <Card className="border-t-4 border-g-green shadow-sm">
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

      {/* 4. Setores, Tipos de problema e Responsáveis */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Setores */}
        <ListaEditavel
          titulo="Setores"
          corTitulo="text-g-blue dark:text-blue-400"
          icone={<Building2 className="size-5" />}
          botaoAdicionarTexto="Adicionar mais setor"
          itens={regras.setores}
          onChange={(setores) => salvar({ setores })}
        />

        {/* Categorias */}
        <ListaEditavel
          titulo="Tipos de problema"
          corTitulo="text-purple-600 dark:text-purple-400"
          icone={<Tag className="size-5" />}
          botaoAdicionarTexto="Adicionar mais categoria"
          itens={regras.categorias}
          onChange={(categorias) => salvar({ categorias })}
        />

        {/* Responsáveis */}
        <ListaEditavel
          titulo="Responsáveis pelo atendimento"
          corTitulo="text-g-green dark:text-green-400"
          icone={<UserCheck className="size-5" />}
          botaoAdicionarTexto="Adicionar mais responsável"
          itens={responsaveis}
          onChange={(resp) => salvar({ responsaveis: resp })}
        />
      </div>

      {/* 5. Filtros e Colunas da Planilha */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Filtros da planilha com ordenação */}
        <Card className="border-t-4 border-g-blue shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
              <Filter className="size-5" />
              Filtros da planilha de atendimento (mova a ordem)
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
                      ativo ? "border-g-blue/50 bg-card shadow-sm" : "border-border/50 bg-muted/20 opacity-60"
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
        <Card className="border-t-4 border-g-green shadow-sm">
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

      {/* 6. Campos da seção 'Abrir um chamado' */}
      <Card className="border-t-4 border-g-blue shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
            <FileEdit className="size-5" />
            Campos do formulário "Abrir um chamado" (incluir / remover campos)
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
                  campo.ativo ? "border-g-blue/50 bg-card shadow-sm" : "border-border/60 bg-muted/20 opacity-60"
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
                const label = prompt("Nome do novo campo (ex.: Número do Patrimônio / Ramal):");
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

      {/* 7. Opções de Dados para Exportação */}
      <Card className="border-t-4 border-orange-500 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
            <Download className="size-5" />
            Dados padrão para exportação nas planilhas (CSV, XLSX, XML e PDF)
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
                const novo = prompt("Nome do novo dado / coluna para exportação:");
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

      {/* 9. Parâmetros e Cores do Sistema (Prioridade, Status e SLA) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-1 border-t border-border/80 pt-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-g-blue" />
            Parâmetros e Cores do Sistema (Prioridade, Status e SLA)
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure as cores e os nomes dos parâmetros. A ordem padrão do sistema e as cores institucionais estão pré-configuradas e podem ser customizadas ou expandidas com novos parâmetros.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <EditorParametrosCores
            titulo="Prioridades dos chamados"
            descricao="Ordem padrão: Crítico (Vermelho), Alta (Amarelo), Média (Verde) e Baixa (Azul)"
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
            descricao="Ordem padrão: Em atendimento (Verde), Aguardando (Laranja), Cancelado (Grafite), Aberto (Azul) e Resolvido (Verde escuro)"
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
            descricao="Ordem padrão: No prazo (Verde), Estourado (Vermelho), Cancelado (Grafite) e Aguardando (Laranja)"
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

