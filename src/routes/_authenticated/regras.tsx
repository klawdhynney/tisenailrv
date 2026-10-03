import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileEdit,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Layout,
  Lock,
  MessageCircle,
  Palette,
  Plane,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Table,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ConfirmAction } from "@/components/ConfirmAction";
import { EmaLoader } from "@/components/EmaLoader";
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
  IDENTIDADE_VISUAL_PADRAO,
  PAGINA_INICIAL_PADRAO,
  INDICADORES_PADRAO,
  ABRIR_CHAMADO_PADRAO,
  ACOMPANHAMENTO_PADRAO,
  COLUNAS_ACOMPANHAMENTO_MAP,
  isColunaAcompAtiva,
  DASHBOARD_PADRAO,
  RODAPE_PADRAO,
  CORES_PRIORIDADE,
  ANIMACAO_CARREGAMENTO_PADRAO,
  type CampoAbertura,
  type ParametroCor,
  type Periodo,
  type VelocidadeAnimacao,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/regras")({
  head: () => ({
    meta: [
      { title: "Painel de Ajustes | TI Senai LRV" },
      {
        name: "description",
        content:
          "Gerenciador visual do site: identidade, banner, chamados, acompanhamento, gráficos, indicadores, prazos, LGPD e parâmetros.",
      },
      { property: "og:title", content: "Painel de Ajustes" },
      {
        property: "og:description",
        content: "Painel de ajustes completo e gerenciável do site.",
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

function sanitizeInput(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "");
}

function ImageUploadInput({
  label,
  value,
  onChange,
  aspectRatioHint,
  maxSizeMb = 2,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  aspectRatioHint?: string;
  maxSizeMb?: number;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Selecione PNG, JPEG, WEBP ou SVG.");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${maxSizeMb} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
        toast.success("Imagem carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const inputId = `upload-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex flex-col gap-3">
        {value ? (
          <div className="relative group overflow-hidden rounded-xl border border-border bg-muted/40 p-3 max-w-sm">
            <img
              src={value}
              alt="Pré-visualização"
              className="max-h-36 w-auto rounded-lg object-contain mx-auto"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-7 px-2 text-xs opacity-90 hover:opacity-100"
              onClick={() => onChange("")}
            >
              <Trash2 className="size-3 mr-1" /> Remover
            </Button>
          </div>
        ) : null}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
            dragOver ? "border-g-blue bg-g-blue/10" : "border-border hover:border-g-blue/60 bg-muted/20"
          }`}
          onClick={() => {
            document.getElementById(inputId)?.click();
          }}
        >
          <Upload className="size-5 text-muted-foreground mb-1" />
          <p className="text-xs font-semibold text-foreground">
            Clique para enviar imagem ou arraste até aqui
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            PNG, JPEG, WEBP ou SVG (máx. {maxSizeMb} MB){aspectRatioHint ? ` • ${aspectRatioHint}` : ""}
          </p>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(sanitizeInput(e.target.value))}
            placeholder="Ou digite a URL da imagem (https://...)"
            className="text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}

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

  // 1. Identidade Visual
  const ident = regras.identidadeVisual ?? IDENTIDADE_VISUAL_PADRAO;
  const salvarIdentidade = (patch: Partial<typeof ident>) =>
    salvar({ identidadeVisual: { ...ident, ...patch } });

  // Animação de Carregamento (Ema)
  const animConf = regras.animacaoCarregamento ?? ANIMACAO_CARREGAMENTO_PADRAO;
  const salvarAnim = (patch: Partial<typeof animConf>) =>
    salvar({ animacaoCarregamento: { ...animConf, ...patch } });

  // 2. Página Inicial
  const home = regras.paginaInicial ?? PAGINA_INICIAL_PADRAO;
  const salvarHome = (patch: Partial<typeof home>) =>
    salvar({ paginaInicial: { ...home, ...patch } });

  // 3. Abrir Chamado
  const abrirConf = regras.abrirChamado ?? ABRIR_CHAMADO_PADRAO;
  const salvarAbrir = (patch: Partial<typeof abrirConf>) =>
    salvar({ abrirChamado: { ...abrirConf, ...patch } });
  const camposAbertura: CampoAbertura[] = regras.camposAbertura ?? CAMPOS_ABERTURA_PADRAO;
  const salvarCamposAbertura = (novos: CampoAbertura[]) => salvar({ camposAbertura: novos });

  // 4. Acompanhamento
  const acompConf = regras.acompanhamento ?? ACOMPANHAMENTO_PADRAO;
  const salvarAcomp = (patch: Partial<typeof acompConf>) =>
    salvar({ acompanhamento: { ...acompConf, ...patch } });
  const colunasAcomp = acompConf.colunasVisiveis ?? [
    "verChamado",
    "numero",
    "abertura",
    "status",
    "prioridade",
    "sla",
    "prazo",
  ];
  const toggleColunaAcomp = (col: string) => {
    const ativa = isColunaAcompAtiva(colunasAcomp, col);
    const aliases = [col.toLowerCase(), ...(COLUNAS_ACOMPANHAMENTO_MAP[col] || [])];
    const novas = ativa
      ? colunasAcomp.filter((x) => !aliases.includes(String(x).trim().toLowerCase()))
      : [...colunasAcomp, col];
    salvarAcomp({ colunasVisiveis: novas });
  };

  // Planilha de atendimento interna
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
    if (item) lista.splice(novoIndex, 0, item);
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

  // 5. Dashboard
  const dashConf = regras.dashboard ?? DASHBOARD_PADRAO;
  const salvarDashboard = (patch: Partial<typeof dashConf>) =>
    salvar({ dashboard: { ...dashConf, ...patch } });

  // 6. Indicadores
  const indConf = regras.indicadores ?? INDICADORES_PADRAO;
  const salvarIndicadores = (patch: Partial<typeof indConf>) =>
    salvar({ indicadores: { ...indConf, ...patch } });

  // 7. LGPD
  const lgpdConf = regras.lgpd ?? LGPD_PADRAO;
  const salvarLgpd = (patch: Partial<typeof lgpdConf>) =>
    salvar({ lgpd: { ...lgpdConf, ...patch } });

  // 8. Rodapé
  const rodapeConf = regras.rodape ?? RODAPE_PADRAO;
  const salvarRodape = (patch: Partial<typeof rodapeConf>) =>
    salvar({ rodape: { ...rodapeConf, ...patch } });

  // 9. Horários, SLA e Atendimento
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

  const responsaveis = regras.responsaveis ?? ["Claudinei Lima"];
  const parametrosPrioridade: ParametroCor[] =
    regras.parametrosPrioridade ?? PARAMETROS_PRIORIDADE_PADRAO;
  const parametrosStatus: ParametroCor[] =
    regras.parametrosStatus ?? PARAMETROS_STATUS_PADRAO;
  const parametrosSla: ParametroCor[] =
    regras.parametrosSla ?? PARAMETROS_SLA_PADRAO;

  return (
    <div className="space-y-7 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Painel de Ajustes do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize textos, imagens, tabelas, gráficos, indicadores, prazos de SLA e regras de funcionamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmAction
            title="Restaurar configurações padrão?"
            description="Todas as preferências visuais, textos e prazos voltarão para os valores institucionais originais."
            confirmLabel="Sim, restaurar padrão"
            variant="outline"
            onConfirm={() => {
              setDraft(REGRAS_PADRAO);
              toast.info("Configurações padrão restauradas no rascunho. Clique em salvar para confirmar.");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
          </ConfirmAction>

          <ConfirmAction
            title="Salvar alterações no painel de ajustes?"
            description="As novas configurações passarão a valer imediatamente em todo o site."
            confirmLabel="Sim, salvar alterações"
            variant="google-green"
            disabled={!alterado}
            onConfirm={async () => {
              const ok = await setRegras(regras);
              toast[ok ? "success" : "error"](
                ok ? "Ajustes salvos com sucesso e sincronizados!" : "Não foi possível salvar os ajustes.",
              );
            }}
          >
            Salvar alterações
          </ConfirmAction>
        </div>
      </div>

      {/* Abas Organizadas */}
      <Tabs defaultValue="geral" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 p-1.5 bg-muted/80 rounded-xl h-auto">
          <TabsTrigger value="geral" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Sliders className="size-4 text-g-blue" /> Geral & Logo
          </TabsTrigger>
          <TabsTrigger value="animacao" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Zap className="size-4 text-g-blue" /> Animação Ema
          </TabsTrigger>
          <TabsTrigger value="inicio" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Layout className="size-4 text-g-green" /> Início & Banner
          </TabsTrigger>
          <TabsTrigger value="abrir" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <FileEdit className="size-4 text-purple-600" /> Abrir Chamado
          </TabsTrigger>
          <TabsTrigger value="acompanhamento" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Table className="size-4 text-amber-500" /> Tabela & Acomp.
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <BarChart3 className="size-4 text-g-blue" /> Dashboard & Gráficos
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Layers className="size-4 text-g-yellow" /> Indicadores
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <ShieldCheck className="size-4 text-g-blue" /> Privacidade & LGPD
          </TabsTrigger>
          <TabsTrigger value="rodape" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <MessageCircle className="size-4 text-g-green" /> Rodapé & Contato
          </TabsTrigger>
          <TabsTrigger value="atendimento" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Clock className="size-4 text-g-red" /> Prazos, SLA & Agenda
          </TabsTrigger>
          <TabsTrigger value="banco" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold">
            <Database className="size-4 text-purple-600" /> Banco & Otimização
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA GERAL E IDENTIDADE */}
        <TabsContent value="geral" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <Sliders className="size-5" />
                Identidade Visual e Informações Gerais
              </CardTitle>
              <CardDescription>
                Configure o nome da instituição, logotipo exibido no topo e preferência padrão de tema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nome da Instituição</Label>
                  <Input
                    value={ident.nome}
                    onChange={(e) => salvarIdentidade({ nome: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: SENAI Lucas do Rio Verde"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Sigla / Setor</Label>
                  <Input
                    value={ident.sigla}
                    onChange={(e) => salvarIdentidade({ sigla: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: TI SENAI LRV"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Subtítulo / Descrição</Label>
                  <Input
                    value={ident.subtitulo}
                    onChange={(e) => salvarIdentidade({ subtitulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Central de Atendimento ao Usuário"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-border">
                <ImageUploadInput
                  label="Logotipo da Barra de Navegação (Topo)"
                  value={ident.logoUrl}
                  onChange={(val) => salvarIdentidade({ logoUrl: val })}
                  aspectRatioHint="Proporção horizontal recomendada (ex: 200x50)"
                  maxSizeMb={2}
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Texto Alternativo da Logo (Acessibilidade)</Label>
                    <Input
                      value={ident.logoAlt}
                      onChange={(e) => salvarIdentidade({ logoAlt: sanitizeInput(e.target.value) })}
                      placeholder="Ex.: Logo SENAI"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tema padrão para novos visitantes</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                      value={ident.temaPadrao}
                      onChange={(e) => salvarIdentidade({ temaPadrao: e.target.value as any })}
                    >
                      <option value="claro">Tema Claro institucional (Padrão)</option>
                      <option value="pastel">Tema Pastel suave</option>
                      <option value="escuro">Tema Escuro moderno</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA PÁGINA INICIAL E BANNER */}
        <TabsContent value="inicio" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-green shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-green dark:text-green-400">
                <Layout className="size-5" />
                Página Inicial e Banner Hero
              </CardTitle>
              <CardDescription>
                Ajuste o banner principal da página inicial, títulos, subtítulos e textos informativos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border">
                <div>
                  <p className="text-sm font-semibold">Exibir banner ilustrativo na página inicial</p>
                  <p className="text-xs text-muted-foreground">Mostra a imagem de boas-vindas logo abaixo do cabeçalho.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={home.exibirBanner}
                    onChange={(e) => salvarHome({ exibirBanner: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-g-green"></div>
                </label>
              </div>

              {home.exibirBanner && (
                <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-border">
                  <ImageUploadInput
                    label="Imagem do Banner Hero (Página Inicial)"
                    value={home.bannerUrl}
                    onChange={(val) => salvarHome({ bannerUrl: val })}
                    aspectRatioHint="Panorâmica recomendada (1200x300 ou 16:9)"
                    maxSizeMb={3}
                  />

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Texto do Badge Superior</Label>
                      <Input
                        value={home.badgeTexto}
                        onChange={(e) => salvarHome({ badgeTexto: sanitizeInput(e.target.value) })}
                        placeholder="Ex.: Central de Atendimento de TI"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Texto Alternativo do Banner</Label>
                      <Input
                        value={home.bannerAlt}
                        onChange={(e) => salvarHome({ bannerAlt: sanitizeInput(e.target.value) })}
                        placeholder="Ex.: Banner institucional TI SENAI"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2 pt-3 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título Principal da Página Inicial</Label>
                  <Input
                    value={home.titulo}
                    onChange={(e) => salvarHome({ titulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Suporte de TI rápido e transparente"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Subtítulo / Descrição</Label>
                  <Textarea
                    rows={2}
                    value={home.subtitulo}
                    onChange={(e) => salvarHome({ subtitulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Registre solicitações, acompanhe prazos de atendimento e visualize indicadores em tempo real."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ABA ABRIR CHAMADO */}
        <TabsContent value="abrir" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-purple-600 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <FileEdit className="size-5" />
                Textos e Formulário de Abertura de Chamado
              </CardTitle>
              <CardDescription>
                Personalize os títulos, instruções, rótulos de campos e configure campos personalizados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título do Cabeçalho</Label>
                  <Input
                    value={abrirConf.titulo}
                    onChange={(e) => salvarAbrir({ titulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Abrir chamado de TI"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Texto de Apoio / Instruções</Label>
                  <Input
                    value={abrirConf.textoApoio}
                    onChange={(e) => salvarAbrir({ textoApoio: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Abra o seu chamado, descreva o problema e informe o local exato..."
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Rótulo do Campo "Local / Sala"</Label>
                  <Input
                    value={abrirConf.rotuloLocal}
                    onChange={(e) => salvarAbrir({ rotuloLocal: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Local do problema*"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Placeholder do Campo "Local / Sala"</Label>
                  <Input
                    value={abrirConf.placeholderLocal}
                    onChange={(e) => salvarAbrir({ placeholderLocal: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Bloco A, Sala 3, Mesa 02"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Rótulo do Campo "Descrição"</Label>
                  <Input
                    value={abrirConf.rotuloDescricao}
                    onChange={(e) => salvarAbrir({ rotuloDescricao: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Descreva o problema*"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Placeholder do Campo "Descrição"</Label>
                  <Input
                    value={abrirConf.placeholderDescricao}
                    onChange={(e) => salvarAbrir({ placeholderDescricao: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Computador sem internet na sala 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Texto do Botão de Envio</Label>
                  <Input
                    value={abrirConf.textoBotao}
                    onChange={(e) => salvarAbrir({ textoBotao: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Enviar chamado"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Texto de Consentimento LGPD</Label>
                  <Input
                    value={abrirConf.textoConsentimento}
                    onChange={(e) => salvarAbrir({ textoConsentimento: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Ao enviar, você concorda com o uso dos seus dados conforme nossa"
                  />
                </div>
              </div>

              {/* Gerenciamento de Campos Ativos */}
              <div className="space-y-3 pt-3 border-t border-border">
                <Label className="text-sm font-bold text-foreground">Campos do formulário público:</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {camposAbertura.map((campo, idx) => (
                    <div
                      key={campo.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        campo.ativo ? "border-purple-500/50 bg-card shadow-2xs" : "border-border/60 bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Input
                          className="h-8 font-semibold text-sm"
                          value={campo.label}
                          onChange={(e) => {
                            const novos = camposAbertura.map((c, i) =>
                              i === idx ? { ...c, label: sanitizeInput(e.target.value) } : c,
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
                          <span className={campo.ativo ? "font-bold text-purple-600 dark:text-purple-400" : "text-muted-foreground"}>
                            {campo.ativo ? "Ativo" : "Oculto"}
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const label = prompt("Nome do novo campo adicional a ser incluído no formulário:");
                    if (label?.trim()) {
                      const id = "custom_" + Date.now();
                      salvarCamposAbertura([
                        ...camposAbertura,
                        { id, label: sanitizeInput(label.trim()), obrigatorio: false, ativo: true, tipo: "text" },
                      ]);
                      toast.success(`Campo "${label}" adicionado ao formulário.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar campo personalizado
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA ACOMPANHAMENTO E TABELA */}
        <TabsContent value="acompanhamento" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-amber-500 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                <Table className="size-5" />
                Página de Acompanhamento e Tabela Pública
              </CardTitle>
              <CardDescription>
                Configure títulos, quantidade de chamados por página e visibilidade das colunas da tabela pública.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título da Página de Acompanhamento</Label>
                  <Input
                    value={acompConf.titulo}
                    onChange={(e) => salvarAcomp({ titulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Acompanhamento dos chamados"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Quantidade padrão por página</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                    value={acompConf.itensPorPaginaPadrao}
                    onChange={(e) => salvarAcomp({ itensPorPaginaPadrao: Number(e.target.value) })}
                  >
                    {[10, 30, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} chamados por página</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Descrição / Instruções da Página</Label>
                <Textarea
                  rows={2}
                  value={acompConf.descricao}
                  onChange={(e) => salvarAcomp({ descricao: sanitizeInput(e.target.value) })}
                  placeholder="Ex.: Consulte seus chamados e acompanhe o status, prazo, prioridade e andamento do atendimento."
                />
              </div>

              {/* Colunas Visíveis na Tabela Pública */}
              <div className="space-y-3 pt-3 border-t border-border">
                <Label className="text-sm font-bold text-foreground">Colunas visíveis na tabela pública:</Label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: "verChamado", label: "Botão 'Ver chamado'" },
                    { id: "numero", label: "Número (#ID)" },
                    { id: "abertura", label: "Data de abertura" },
                    { id: "status", label: "Status (Chip)" },
                    { id: "prioridade", label: "Prioridade (Chip)" },
                    { id: "sla", label: "Situação do SLA" },
                    { id: "prazo", label: "Data/Hora do Prazo" },
                  ].map((col) => {
                    const ativa = isColunaAcompAtiva(colunasAcomp, col.id);
                    return (
                      <Button
                        key={col.id}
                        type="button"
                        variant={ativa ? "google-blue" : "outline"}
                        size="sm"
                        onClick={() => toggleColunaAcomp(col.id)}
                        className="text-xs font-semibold"
                      >
                        {ativa ? "✓ " : ""}{col.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Filtros e Colunas da Planilha Interna */}
              <div className="grid gap-5 lg:grid-cols-2 pt-4 border-t border-border">
                {/* Filtros da planilha com reordenação */}
                <Card className="border border-border/70 shadow-2xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-g-blue">
                      <Filter className="size-4" />
                      Filtros da planilha de atendimento (Gestor)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Use as setas para alterar a ordem dos filtros na tela de atendimento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filtrosOrdenados.map((nome, index) => {
                      const ativo = filtrosAtivos.includes(nome);
                      return (
                        <div
                          key={nome}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-2 text-xs transition-all ${
                            ativo ? "border-g-blue/50 bg-card" : "border-border/50 bg-muted/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-muted font-bold text-[10px]">
                              {index + 1}
                            </span>
                            <span className={ativo ? "font-semibold text-foreground" : "text-muted-foreground"}>
                              {nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => moverFiltro(index, -1)}
                              className="size-7 text-g-blue"
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === filtrosOrdenados.length - 1}
                              onClick={() => moverFiltro(index, 1)}
                              className="size-7 text-g-blue"
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={ativo ? "google-blue" : "outline"}
                              onClick={() => toggleFiltro(nome)}
                              className="text-[11px] h-7 px-2"
                            >
                              {ativo ? "Ativo" : "Inativo"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Exportação */}
                <Card className="border border-border/70 shadow-2xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-orange-500">
                      <Download className="size-4" />
                      Campos exportados para Excel
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Selecione quais dados devem estar presentes nos relatórios baixados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {CAMPOS_EXPORTACAO.map((c) => {
                        const ativo = camposExportacao.includes(c.id);
                        return (
                          <Button
                            key={c.id}
                            type="button"
                            size="sm"
                            variant={ativo ? "google-blue" : "outline"}
                            onClick={() => toggleCampoExportacao(c.id)}
                            className="text-xs h-7 px-2"
                          >
                            {ativo ? "✓ " : ""}{c.label}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. ABA DASHBOARD E GRÁFICOS */}
        <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <BarChart3 className="size-5" />
                Configurações do Dashboard e Opções de Gráficos
              </CardTitle>
              <CardDescription>
                Personalize os títulos do dashboard, a visão dimensional inicial e o tipo de gráfico padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título Principal do Dashboard</Label>
                  <Input
                    value={dashConf.titulo}
                    onChange={(e) => salvarDashboard({ titulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Dashboard de chamados"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Subtítulo / Categoria Superior</Label>
                  <Input
                    value={dashConf.subtitulo}
                    onChange={(e) => salvarDashboard({ subtitulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Indicadores públicos"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Dimensão / Visão Padrão ao Carregar</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                    value={dashConf.visaoPadrao}
                    onChange={(e) => salvarDashboard({ visaoPadrao: e.target.value as any })}
                  >
                    <option value="problemas">Tipos de problema (Categorias)</option>
                    <option value="setores">Setores solicitantes</option>
                    <option value="prioridades">Prioridades dos chamados</option>
                    <option value="status">Status do atendimento</option>
                    <option value="sla">Situação do SLA (No prazo / Estourado)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tipo de Gráfico Padrão ao Carregar</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                    value={dashConf.tipoGraficoPadrao}
                    onChange={(e) => salvarDashboard({ tipoGraficoPadrao: e.target.value as any })}
                  >
                    <option value="pizza">Gráfico de Rosca / Pizza</option>
                    <option value="barras">Gráfico de Barras horizontais</option>
                    <option value="kpi">Cartões de KPI (Big Numbers)</option>
                    <option value="gauge">Gráfico de Medidor (Gauge Chart)</option>
                    <option value="combinado">Gráfico Combinado (Linhas e Colunas)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. ABA INDICADORES */}
        <TabsContent value="indicadores" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-yellow shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-yellow dark:text-amber-400">
                <Layers className="size-5" />
                Cartões de Indicadores (Métricas do Topo)
              </CardTitle>
              <CardDescription>
                Configure os 3 cartões de indicadores que aparecem no topo da página inicial e do dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border">
                <div>
                  <p className="text-sm font-semibold">Exibir cartões de indicadores no topo</p>
                  <p className="text-xs text-muted-foreground">Mostra os números resumidos de chamados em tempo real.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indConf.mostrar}
                    onChange={(e) => salvarIndicadores({ mostrar: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-g-green"></div>
                </label>
              </div>

              {indConf.mostrar && (
                <div className="grid gap-5 md:grid-cols-3 pt-2 border-t border-border">
                  {/* Cartão 1: Total */}
                  <div className="rounded-xl border-l-4 border-g-blue border bg-card p-4 space-y-3 shadow-2xs">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-g-blue">Cartão 1 (Azul)</Label>
                      <Input
                        value={indConf.totalLabel}
                        onChange={(e) => salvarIndicadores({ totalLabel: sanitizeInput(e.target.value) })}
                        placeholder="Título: Total de chamados"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                      <Input
                        value={indConf.totalDesc}
                        onChange={(e) => salvarIndicadores({ totalDesc: sanitizeInput(e.target.value) })}
                        placeholder="Ex.: Quantidade de chamados registrados."
                      />
                    </div>
                  </div>

                  {/* Cartão 2: Em Atendimento */}
                  <div className="rounded-xl border-l-4 border-g-yellow border bg-card p-4 space-y-3 shadow-2xs">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-g-yellow">Cartão 2 (Amarelo)</Label>
                      <Input
                        value={indConf.atendimentoLabel}
                        onChange={(e) => salvarIndicadores({ atendimentoLabel: sanitizeInput(e.target.value) })}
                        placeholder="Título: Em atendimento"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                      <Input
                        value={indConf.atendimentoDesc}
                        onChange={(e) => salvarIndicadores({ atendimentoDesc: sanitizeInput(e.target.value) })}
                        placeholder="Ex.: Chamados que estão sendo tratados pela equipe de TI."
                      />
                    </div>
                  </div>

                  {/* Cartão 3: Resolvidos */}
                  <div className="rounded-xl border-l-4 border-g-green border bg-card p-4 space-y-3 shadow-2xs">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-g-green">Cartão 3 (Verde)</Label>
                      <Input
                        value={indConf.resolvidosLabel}
                        onChange={(e) => salvarIndicadores({ resolvidosLabel: sanitizeInput(e.target.value) })}
                        placeholder="Título: Resolvidos"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                      <Input
                        value={indConf.resolvidosDesc}
                        onChange={(e) => salvarIndicadores({ resolvidosDesc: sanitizeInput(e.target.value) })}
                        placeholder="Ex.: Chamados que já foram concluídos."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ABA PRIVACIDADE & LGPD */}
        <TabsContent value="lgpd" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                  <ShieldCheck className="size-5" />
                  Textos e Seções da Página de Privacidade e LGPD
                </CardTitle>
                <CardDescription>
                  Personalize os textos exibidos na página pública <code className="text-primary font-mono">/lgpd</code>.
                </CardDescription>
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
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título Principal da Página</Label>
                  <Input
                    value={lgpdConf.titulo}
                    onChange={(e) => salvarLgpd({ titulo: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Privacidade e proteção dos seus dados"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Linha de Atualização</Label>
                  <Input
                    value={lgpdConf.ultimaAtualizacao}
                    onChange={(e) => salvarLgpd({ ultimaAtualizacao: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: Última atualização: outubro de 2026"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Subtítulo Explicativo</Label>
                <Textarea
                  rows={2}
                  value={lgpdConf.subtitulo}
                  onChange={(e) => salvarLgpd({ subtitulo: sanitizeInput(e.target.value) })}
                  placeholder="Explicação resumida do objetivo da página..."
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <UserCheck className="size-4 text-g-blue" /> Seção 1: Quem é o responsável pelos dados
                  </Label>
                  <Textarea
                    rows={3}
                    value={lgpdConf.responsavel}
                    onChange={(e) => salvarLgpd({ responsavel: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="size-4 text-g-green" /> Seção 2: Quais dados coletamos
                  </Label>
                  <Textarea
                    rows={4}
                    value={lgpdConf.dadosColetados}
                    onChange={(e) => salvarLgpd({ dadosColetados: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-4 text-amber-500" /> Seção 3: Finalidade
                  </Label>
                  <Textarea
                    rows={4}
                    value={lgpdConf.finalidade}
                    onChange={(e) => salvarLgpd({ finalidade: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="size-4 text-purple-500" /> Seção 4: Compartilhamento
                  </Label>
                  <Textarea
                    rows={3}
                    value={lgpdConf.compartilhamento}
                    onChange={(e) => salvarLgpd({ compartilhamento: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Lock className="size-4 text-g-red" /> Seção 5: Segurança e tempo de guarda
                  </Label>
                  <Textarea
                    rows={4}
                    value={lgpdConf.seguranca}
                    onChange={(e) => salvarLgpd({ seguranca: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Scale className="size-4 text-g-blue" /> Seção 6: Seus direitos
                  </Label>
                  <Textarea
                    rows={5}
                    value={lgpdConf.direitos}
                    onChange={(e) => salvarLgpd({ direitos: sanitizeInput(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <RotateCcw className="size-4 text-muted-foreground" /> Seção 7: Mudanças nesta página
                  </Label>
                  <Textarea
                    rows={3}
                    value={lgpdConf.mudancas}
                    onChange={(e) => salvarLgpd({ mudancas: sanitizeInput(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. ABA RODAPÉ E CONTATO */}
        <TabsContent value="rodape" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-green shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-green dark:text-green-400">
                <MessageCircle className="size-5" />
                Rodapé e Canais de Contato
              </CardTitle>
              <CardDescription>
                Personalize os direitos reservados, links do rodapé e o número do WhatsApp de suporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Texto de Direitos Reservados</Label>
                <Input
                  value={rodapeConf.textoDireitos}
                  onChange={(e) => salvarRodape({ textoDireitos: sanitizeInput(e.target.value) })}
                  placeholder="Ex.: SENAI Lucas do Rio Verde - MT · Sistema de Atendimento de TI"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border">
                  <div>
                    <p className="text-sm font-semibold">Exibir link "Privacidade e LGPD" no rodapé</p>
                    <p className="text-xs text-muted-foreground">Leva diretamente à página com as diretrizes de dados.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rodapeConf.exibirLinkLgpd}
                      onChange={(e) => salvarRodape({ exibirLinkLgpd: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-g-green"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border">
                  <div>
                    <p className="text-sm font-semibold">Exibir botão de contato via WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Permite envio direto da mensagem do chamado.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rodapeConf.exibirWhatsapp}
                      onChange={(e) => salvarRodape({ exibirWhatsapp: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-g-green"></div>
                  </label>
                </div>
              </div>

              {rodapeConf.exibirWhatsapp && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold">Número do WhatsApp institucional (com DDD, somente números ou formatado)</Label>
                  <Input
                    value={rodapeConf.whatsappSuporte}
                    onChange={(e) => salvarRodape({ whatsappSuporte: sanitizeInput(e.target.value) })}
                    placeholder="Ex.: 66 99644-4461"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. ABA PRAZOS, SLA & ATENDIMENTO */}
        <TabsContent value="atendimento" className="space-y-6 focus-visible:outline-none">
          {/* Prazos por prioridade */}
          <Card className="border-t-4 border-g-red shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-red dark:text-red-400">
                <Clock className="size-5" />
                Prazos de SLA por Prioridade (em horas úteis)
              </CardTitle>
              <CardDescription>
                A contagem de horas úteis do chamado respeita exatamente a escala e horários definidos abaixo.
              </CardDescription>
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
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={regras.prazos[p]}
                        onChange={(e) =>
                          salvar({ prazos: { ...regras.prazos, [p]: Number(e.target.value) } })
                        }
                      />
                      <span className="text-xs text-muted-foreground font-medium">horas</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expediente por dia da semana */}
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <Calendar className="size-5" />
                Expediente e Horário de Atendimento por Dia da Semana
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
                    Aplicar Seg a Sex ({regras.expediente.inicio} às {regras.expediente.fim})
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Personalização dia a dia:</Label>
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
            </CardContent>
          </Card>

          {/* Feriados e Períodos */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Feriados */}
            <Card className="border-t-4 border-amber-500 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                  <CalendarCheck2 className="size-5" />
                  Feriados Institucionais e Municipais
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
                            x.id === f.id ? { ...x, nome: sanitizeInput(e.target.value) } : x,
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
                  size="sm"
                  onClick={() =>
                    salvar({
                      feriados: [
                        ...regras.feriados,
                        { id: crypto.randomUUID(), data: "2026-12-25", nome: "Novo feriado" },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar feriado
                </Button>
              </CardContent>
            </Card>

            {/* Férias e Atestados */}
            <Card className="border-t-4 border-g-green shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-g-green dark:text-green-400">
                  <Plane className="size-5" />
                  Férias Coletivas, Viagens e Recessos
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
                            x.id === p.id ? { ...x, descricao: sanitizeInput(e.target.value) } : x,
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
                  size="sm"
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
                  <Plus className="mr-2 h-4 w-4" /> Adicionar período de pausa
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Setores, Categorias e Responsáveis */}
          <div className="grid gap-5 lg:grid-cols-3 pt-2 border-t border-border">
            <ListaEditavel
              titulo="Setores Solicitantes"
              corTitulo="text-g-blue dark:text-blue-400"
              icone={<Building2 className="size-5" />}
              botaoAdicionarTexto="Adicionar setor"
              itens={regras.setores}
              onChange={(setores) => salvar({ setores })}
            />

            <ListaEditavel
              titulo="Tipos de Problema (Categorias)"
              corTitulo="text-purple-600 dark:text-purple-400"
              icone={<Tag className="size-5" />}
              botaoAdicionarTexto="Adicionar categoria"
              itens={regras.categorias}
              onChange={(categorias) => salvar({ categorias })}
            />

            <ListaEditavel
              titulo="Responsáveis pelo Atendimento"
              corTitulo="text-g-green dark:text-green-400"
              icone={<UserCheck className="size-5" />}
              botaoAdicionarTexto="Adicionar responsável"
              itens={responsaveis}
              onChange={(resp) => salvar({ responsaveis: resp })}
            />
          </div>

          {/* Parâmetros e Cores Institucionais */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Palette className="h-5 w-5 text-g-blue" />
                Parâmetros e Cores Institucionais
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personalize as cores de destaque e rótulos dos chips visuais em todo o sistema.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <EditorParametrosCores
                titulo="Prioridades"
                descricao="Crítico, Alta, Média e Baixa"
                corTitulo="text-g-red dark:text-red-400"
                icone={<Tag className="h-4 w-4" />}
                itens={parametrosPrioridade}
                onChange={(novos) => salvar({ parametrosPrioridade: novos })}
                tipoLabel="prioridade"
                corPadraoBg="#1A73E8"
                corPadraoText="#FFFFFF"
              />

              <EditorParametrosCores
                titulo="Status de Atendimento"
                descricao="Em atendimento, Aguardando, Aberto, Resolvido"
                corTitulo="text-g-blue dark:text-blue-400"
                icone={<Clock className="h-4 w-4" />}
                itens={parametrosStatus}
                onChange={(novos) => salvar({ parametrosStatus: novos })}
                tipoLabel="status"
                corPadraoBg="#34A853"
                corPadraoText="#FFFFFF"
              />

              <EditorParametrosCores
                titulo="SLA dos Chamados"
                descricao="No prazo, Estourado, Cancelado"
                corTitulo="text-g-green dark:text-green-400"
                icone={<CheckCircle2 className="h-4 w-4" />}
                itens={parametrosSla}
                onChange={(novos) => salvar({ parametrosSla: novos })}
                tipoLabel="SLA"
                corPadraoBg="#34A853"
                corPadraoText="#FFFFFF"
              />
            </div>
          </div>
        </TabsContent>

        {/* 10. ABA BANCO E OTIMIZAÇÃO */}
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
                  description="Esta ação removerá chamados identificados como testes e descartará registros órfãos ou inconsistentes sem afetar chamados reais."
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

        {/* ABA ANIMAÇÃO DE CARREGAMENTO */}
        <TabsContent value="animacao" className="space-y-6 focus-visible:outline-none">
          <Card className="border-t-4 border-g-blue shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-g-blue dark:text-blue-400">
                <Zap className="size-5" />
                Animação de Carregamento (Ema Correndo)
              </CardTitle>
              <CardDescription>
                Configure a exibição da mascote ema correndo durante o carregamento de páginas, envio de chamados e ações do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interruptor ligar/desligar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
                <div className="space-y-0.5">
                  <Label htmlFor="anim-ativo" className="text-sm font-bold text-foreground cursor-pointer">
                    Ativar animação da Ema
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ligada, exibe a ema correndo com efeitos de pista e poeira. Se desligada, um indicador simples de carregamento substitui a ema (nunca tela vazia).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${animConf.ativo ? "text-g-green" : "text-muted-foreground"}`}>
                    {animConf.ativo ? "Ligada" : "Desligada"}
                  </span>
                  <Switch
                    id="anim-ativo"
                    checked={animConf.ativo}
                    onCheckedChange={(checked) => salvarAnim({ ativo: checked })}
                  />
                </div>
              </div>

              {/* Escolha de velocidade */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">Velocidade da Corrida</Label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {(
                    [
                      { id: "lenta" as const, label: "Lenta", desc: "Passos cadenciados" },
                      { id: "normal" as const, label: "Normal", desc: "Velocidade padrão" },
                      { id: "rapida" as const, label: "Rápida", desc: "Corrida veloz" },
                    ]
                  ).map((v) => {
                    const isSelected = animConf.velocidade === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => salvarAnim({ velocidade: v.id })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "border-g-blue bg-g-blue/10 text-g-blue font-bold shadow-xs ring-2 ring-g-blue/20"
                            : "border-border bg-card hover:border-g-blue/50 text-muted-foreground"
                        }`}
                      >
                        <span className="text-sm">{v.label}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{v.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Texto de carregamento */}
              <div className="space-y-2 max-w-md">
                <Label htmlFor="anim-texto" className="text-xs font-semibold text-foreground">
                  Texto de Carregamento
                </Label>
                <Input
                  id="anim-texto"
                  value={animConf.texto}
                  onChange={(e) => salvarAnim({ texto: sanitizeInput(e.target.value) })}
                  placeholder="Ex.: Carregando..."
                  maxLength={50}
                />
                <p className="text-[11px] text-muted-foreground">
                  Texto acessível exibido abaixo da ema durante a animação (com suporte a leitores de tela).
                </p>
              </div>

              {/* Pré-visualização ao vivo */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-foreground">Pré-visualização em Tempo Real</Label>
                <div className="rounded-2xl border-2 border-dashed border-border p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[180px]">
                  <EmaLoader
                    texto={animConf.texto || "Carregando..."}
                    velocidade={animConf.velocidade}
                    ativo={animConf.ativo}
                  />
                </div>
              </div>

              {/* Botões de Ação da Seção */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    salvarAnim(ANIMACAO_CARREGAMENTO_PADRAO);
                    toast.info("Configurações da animação restauradas para o padrão no rascunho.");
                  }}
                >
                  <RotateCcw className="mr-1.5 size-3.5" /> Restaurar padrão
                </Button>

                <Button
                  type="button"
                  variant="google-green"
                  size="sm"
                  className="font-bold gap-1.5 shadow-xs"
                  onClick={async () => {
                    const ok = await setRegras({ ...regras, animacaoCarregamento: animConf });
                    if (ok) {
                      toast.success("Preferências da animação salvas com sucesso!");
                    } else {
                      toast.error("Não foi possível salvar as preferências da animação.");
                    }
                  }}
                >
                  <CheckCircle2 className="size-4" /> Salvar preferências da animação
                </Button>
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
    const nomeLimpo = sanitizeInput(novoNome.trim());
    const novoItem: ParametroCor = {
      id: nomeLimpo,
      nome: nomeLimpo,
      bg: corPadraoBg,
      text: corPadraoText,
    };
    onChange([...itens, novoItem]);
    toast.success(`Parâmetro "${nomeLimpo}" adicionado.`);
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
                <div
                  className="inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-semibold shadow-2xs shrink-0"
                  style={{ backgroundColor: param.bg, color: param.text }}
                >
                  {param.nome || "Exemplo"}
                </div>

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

              <div className="w-full">
                <Input
                  className="h-8 text-xs font-medium"
                  value={param.nome}
                  placeholder="Nome do parâmetro"
                  onChange={(e) =>
                    atualizarItem(i, {
                      nome: sanitizeInput(e.target.value),
                      id: param.id || sanitizeInput(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
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
              onChange={(e) =>
                onChange(itens.map((x, j) => (j === i ? sanitizeInput(e.target.value) : x)))
              }
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const novo = prompt(`Informe o nome do novo item para ${titulo}:`);
            if (novo?.trim()) {
              onChange([...itens, sanitizeInput(novo.trim())]);
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> {botaoAdicionarTexto}
        </Button>
      </CardContent>
    </Card>
  );
}
