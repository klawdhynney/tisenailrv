import React, { useState, useEffect } from "react";
import {
  Sparkles,
  RotateCcw,
  Undo2,
  Save,
  Check,
  AlertTriangle,
  ShieldCheck,
  Sun,
  Moon,
  MousePointerClick,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { toast } from "sonner";
import {
  type CoresBotoesPorTemaConfig,
  type CoresBotoesConfig,
  type CorBotaoItem,
  CATEGORIAS_BOTOES,
  CORES_BOTOES_PADRAO,
  CORES_BOTOES_CLARO_PADRAO,
  CORES_BOTOES_ESCURO_PADRAO,
  calcularContraste,
  obterCorTextoContrastante,
  ajustarBrilho,
  aplicarCoresCustomizadasNoDocumento,
} from "@/lib/tema";

interface EditorCoresBotoesProps {
  coresBotoes: CoresBotoesPorTemaConfig;
  isAdmin: boolean;
  onSalvar: (novasCores: CoresBotoesPorTemaConfig) => Promise<boolean> | boolean;
}

export function EditorCoresBotoes({
  coresBotoes,
  isAdmin,
  onSalvar,
}: EditorCoresBotoesProps) {
  const [temaEdicao, setTemaEdicao] = useState<"claro" | "escuro">("claro");
  const [draft, setDraft] = useState<CoresBotoesPorTemaConfig>(() => ({
    claro: { ...CORES_BOTOES_CLARO_PADRAO, ...(coresBotoes?.claro || {}) },
    escuro: { ...CORES_BOTOES_ESCURO_PADRAO, ...(coresBotoes?.escuro || {}) },
  }));
  const [hoverSimulado, setHoverSimulado] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDraft({
      claro: { ...CORES_BOTOES_CLARO_PADRAO, ...(coresBotoes?.claro || {}) },
      escuro: { ...CORES_BOTOES_ESCURO_PADRAO, ...(coresBotoes?.escuro || {}) },
    });
  }, [coresBotoes]);

  // Aplica preview imediatamente no DOM ao alterar o draft
  const aplicarPreview = (novoDraft: CoresBotoesPorTemaConfig) => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      aplicarCoresCustomizadasNoDocumento(document.documentElement, isDark, novoDraft);
    }
  };

  const configAtiva = draft[temaEdicao];
  const configSalvaAtiva = (coresBotoes?.[temaEdicao] || (temaEdicao === "escuro" ? CORES_BOTOES_ESCURO_PADRAO : CORES_BOTOES_CLARO_PADRAO));
  const padraoAtivo = temaEdicao === "escuro" ? CORES_BOTOES_ESCURO_PADRAO : CORES_BOTOES_CLARO_PADRAO;

  const handleAtualizarItem = (
    catId: keyof CoresBotoesConfig,
    campo: keyof CorBotaoItem,
    valor: string
  ) => {
    const atual = configAtiva[catId];
    const itemAtualizado: CorBotaoItem = {
      ...atual,
      [campo]: valor,
    };

    // Auto-ajuste de hover se o fundo mudar e hover for o mesmo
    if (campo === "bg" && (!atual.hover || atual.hover === atual.bg)) {
      itemAtualizado.hover = ajustarBrilho(valor, temaEdicao === "escuro" ? 15 : -12);
    }

    const novoDraft: CoresBotoesPorTemaConfig = {
      ...draft,
      [temaEdicao]: {
        ...configAtiva,
        [catId]: itemAtualizado,
      },
    };

    setDraft(novoDraft);
    aplicarPreview(novoDraft);
  };

  const handleAplicarSugestaoTexto = (catId: keyof CoresBotoesConfig) => {
    const bg = configAtiva[catId]?.bg || "#1a73e8";
    const textoIdeal = obterCorTextoContrastante(bg);
    handleAtualizarItem(catId, "text", textoIdeal);
    toast.success(`Texto contrastante (${textoIdeal}) aplicado automaticamente!`);
  };

  const handleDescartarCategoria = (catId: keyof CoresBotoesConfig) => {
    const salvo = configSalvaAtiva[catId];
    const novoDraft: CoresBotoesPorTemaConfig = {
      ...draft,
      [temaEdicao]: {
        ...configAtiva,
        [catId]: { ...salvo },
      },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    toast.info(`Alterações de "${catId}" descartadas.`);
  };

  const handleRestaurarPadraoCategoria = (catId: keyof CoresBotoesConfig) => {
    const padrao = padraoAtivo[catId];
    const novoDraft: CoresBotoesPorTemaConfig = {
      ...draft,
      [temaEdicao]: {
        ...configAtiva,
        [catId]: { ...padrao },
      },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    toast.info(`Cores padrão restauradas para "${catId}".`);
  };

  const handleSalvarTudo = async () => {
    const ok = await onSalvar(draft);
    if (ok) {
      toast.success("Cores dos botões salvas com sucesso em todo o sistema!");
    } else {
      toast.error("Erro ao salvar cores dos botões.");
    }
  };

  const handleRestaurarTodasCoresPadrao = async () => {
    const novoDraft: CoresBotoesPorTemaConfig = {
      claro: { ...CORES_BOTOES_CLARO_PADRAO },
      escuro: { ...CORES_BOTOES_ESCURO_PADRAO },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    const ok = await onSalvar(novoDraft);
    if (ok) {
      toast.success("Todas as cores de botões foram restauradas para o padrão institucional.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <Card className="border-t-4 border-g-blue shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                <MousePointerClick className="h-5 w-5 text-g-blue" />
                Cores dos Botões do Sistema
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Personalize fundo, texto, hover e borda de todos os botões e abas do site. Pré-visualize ao vivo e confira a conformidade de contraste WCAG AA.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ConfirmAction
                title="Restaurar todas as cores de botões?"
                description="Todas as categorias de botões e abas dos modos claro e escuro voltarão às cores originais do sistema."
                confirmLabel="Restaurar padrão geral"
                variant="outline"
                disabled={!isAdmin}
                onConfirm={handleRestaurarTodasCoresPadrao}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar todas padrão
              </ConfirmAction>

              <Button
                variant="google-green"
                disabled={!isAdmin}
                onClick={handleSalvarTudo}
                className="font-bold text-xs sm:text-sm shadow-xs gap-1.5"
              >
                <Save className="h-4 w-4" /> Salvar Cores dos Botões
              </Button>
            </div>
          </div>

          {/* Seletor de Modo para Edição */}
          <div className="pt-3">
            <Tabs value={temaEdicao} onValueChange={(v) => setTemaEdicao(v as "claro" | "escuro")}>
              <TabsList className="bg-muted p-1 rounded-xl h-auto">
                <TabsTrigger value="claro" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
                  <Sun className="size-4 text-amber-500" /> Modo Claro (Light)
                </TabsTrigger>
                <TabsTrigger value="escuro" className="gap-1.5 text-xs sm:text-sm font-bold py-2">
                  <Moon className="size-4 text-sky-400" /> Modo Escuro (Dark)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de Categorias de Botões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIAS_BOTOES.map((cat) => {
          const item = configAtiva[cat.id] || padraoAtivo[cat.id];
          const itemSalvo = configSalvaAtiva[cat.id] || padraoAtivo[cat.id];
          const alterado = JSON.stringify(item) !== JSON.stringify(itemSalvo);
          const ratio = calcularContraste(item.text, item.bg);
          const wcagOk = ratio >= 4.5;
          const isHovered = Boolean(hoverSimulado[cat.id]);

          return (
            <Card
              key={cat.id}
              className={`border-2 transition-all shadow-xs flex flex-col justify-between ${
                alterado ? "border-g-blue/60 bg-g-blue/[0.02]" : "border-border/80 bg-card"
              }`}
            >
              <CardHeader className="pb-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        {cat.nome}
                      </CardTitle>
                      {alterado && (
                        <Badge variant="outline" className="text-[10px] border-g-blue text-g-blue font-bold">
                          Modificado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg">
                  <Info className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate"><strong>Onde é usado:</strong> {cat.ondeEUsado}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                {/* Controles de Cores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Fundo */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Cor de Fundo</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        disabled={!isAdmin}
                        value={item.bg}
                        onChange={(e) => handleAtualizarItem(cat.id, "bg", e.target.value)}
                        className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                      />
                      <Input
                        disabled={!isAdmin}
                        value={item.bg}
                        maxLength={7}
                        onChange={(e) => handleAtualizarItem(cat.id, "bg", e.target.value)}
                        className="h-8 font-mono text-xs uppercase px-2"
                      />
                    </div>
                  </div>

                  {/* Texto */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Cor do Texto</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        disabled={!isAdmin}
                        value={item.text}
                        onChange={(e) => handleAtualizarItem(cat.id, "text", e.target.value)}
                        className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                      />
                      <Input
                        disabled={!isAdmin}
                        value={item.text}
                        maxLength={7}
                        onChange={(e) => handleAtualizarItem(cat.id, "text", e.target.value)}
                        className="h-8 font-mono text-xs uppercase px-2"
                      />
                    </div>
                  </div>

                  {/* Hover */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Cor no Hover</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        disabled={!isAdmin}
                        value={item.hover}
                        onChange={(e) => handleAtualizarItem(cat.id, "hover", e.target.value)}
                        className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                      />
                      <Input
                        disabled={!isAdmin}
                        value={item.hover}
                        maxLength={7}
                        onChange={(e) => handleAtualizarItem(cat.id, "hover", e.target.value)}
                        className="h-8 font-mono text-xs uppercase px-2"
                      />
                    </div>
                  </div>

                  {/* Borda (se aplicável) */}
                  {cat.temBorda && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Cor da Borda</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          disabled={!isAdmin}
                          value={item.border || "#dadce0"}
                          onChange={(e) => handleAtualizarItem(cat.id, "border", e.target.value)}
                          className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                        />
                        <Input
                          disabled={!isAdmin}
                          value={item.border || "#dadce0"}
                          maxLength={7}
                          onChange={(e) => handleAtualizarItem(cat.id, "border", e.target.value)}
                          className="h-8 font-mono text-xs uppercase px-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Validação de Contraste WCAG AA */}
                <div className="rounded-xl border border-border/80 p-2.5 bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {wcagOk ? (
                      <ShieldCheck className="size-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-500" />
                    )}
                    <span className="font-semibold text-foreground">
                      Contraste: <strong className="font-mono">{ratio}:1</strong>
                    </span>
                    <Badge
                      variant={wcagOk ? "default" : "destructive"}
                      className={`text-[10px] font-bold ${wcagOk ? "bg-emerald-600" : ""}`}
                    >
                      {wcagOk ? "✓ WCAG AA" : "⚠ Contraste baixo"}
                    </Badge>
                  </div>

                  {!wcagOk && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAplicarSugestaoTexto(cat.id)}
                      className="h-7 text-[11px] font-bold text-g-blue hover:text-g-blue"
                    >
                      Sugerir texto contrastante
                    </Button>
                  )}
                </div>

                {/* Pré-visualização Ao Vivo do Botão */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização Ao Vivo (Passe o mouse)
                  </span>
                  <div className="p-4 rounded-xl border border-dashed border-border/80 flex items-center justify-center bg-card">
                    <button
                      type="button"
                      onMouseEnter={() => setHoverSimulado((prev) => ({ ...prev, [cat.id]: true }))}
                      onMouseLeave={() => setHoverSimulado((prev) => ({ ...prev, [cat.id]: false }))}
                      style={{
                        backgroundColor: isHovered ? item.hover : item.bg,
                        color: isHovered && item.hoverText ? item.hoverText : item.text,
                        borderColor: item.border || "transparent",
                      }}
                      className="min-h-[44px] h-11 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border"
                    >
                      <Sparkles className="size-4 shrink-0" />
                      <span>{cat.nome}</span>
                      {isHovered && <span className="text-[10px] opacity-80">(Hover)</span>}
                    </button>
                  </div>
                </div>

                {/* Ações da Categoria */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!isAdmin}
                    onClick={() => handleRestaurarPadraoCategoria(cat.id)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3 mr-1" /> Restaurar padrão
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {alterado && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                        onClick={() => handleDescartarCategoria(cat.id)}
                        className="h-8 text-xs gap-1"
                      >
                        <Undo2 className="size-3" /> Descartar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
