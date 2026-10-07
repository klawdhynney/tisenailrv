import React, { useState, useEffect } from "react";
import {
  Palette,
  RotateCcw,
  Undo2,
  Save,
  ShieldCheck,
  AlertTriangle,
  Sun,
  Moon,
  Layout,
  Check,
  Sliders,
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
  type CoresSiteConfig,
  type CoresSiteModoConfig,
  CORES_SITE_PADRAO,
  CORES_SITE_CLARO_PADRAO,
  CORES_SITE_ESCURO_PADRAO,
  calcularContraste,
  obterCorTextoContrastante,
  aplicarCoresCustomizadasNoDocumento,
} from "@/lib/tema";

interface EditorCoresSiteProps {
  coresSite: CoresSiteConfig;
  isAdmin: boolean;
  onSalvar: (novasCores: CoresSiteConfig) => Promise<boolean> | boolean;
}

export function EditorCoresSite({
  coresSite,
  isAdmin,
  onSalvar,
}: EditorCoresSiteProps) {
  const [temaEdicao, setTemaEdicao] = useState<"claro" | "escuro">("claro");
  const [draft, setDraft] = useState<CoresSiteConfig>(() => ({
    claro: { ...CORES_SITE_CLARO_PADRAO, ...(coresSite?.claro || {}) },
    escuro: { ...CORES_SITE_ESCURO_PADRAO, ...(coresSite?.escuro || {}) },
  }));

  useEffect(() => {
    setDraft({
      claro: { ...CORES_SITE_CLARO_PADRAO, ...(coresSite?.claro || {}) },
      escuro: { ...CORES_SITE_ESCURO_PADRAO, ...(coresSite?.escuro || {}) },
    });
  }, [coresSite]);

  const aplicarPreview = (novoDraft: CoresSiteConfig) => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      aplicarCoresCustomizadasNoDocumento(document.documentElement, isDark, undefined, novoDraft);
    }
  };

  const configAtiva = draft[temaEdicao];
  const configSalvaAtiva = (coresSite?.[temaEdicao] || (temaEdicao === "escuro" ? CORES_SITE_ESCURO_PADRAO : CORES_SITE_CLARO_PADRAO));
  const padraoAtivo = temaEdicao === "escuro" ? CORES_SITE_ESCURO_PADRAO : CORES_SITE_CLARO_PADRAO;
  const alterado = JSON.stringify(configAtiva) !== JSON.stringify(configSalvaAtiva);

  const handleAtualizarCampo = (campo: keyof CoresSiteModoConfig, valor: string) => {
    const novoDraft: CoresSiteConfig = {
      ...draft,
      [temaEdicao]: {
        ...configAtiva,
        [campo]: valor,
      },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
  };

  const handleDescartar = () => {
    const novoDraft: CoresSiteConfig = {
      ...draft,
      [temaEdicao]: { ...configSalvaAtiva },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    toast.info(`Alterações do Modo ${temaEdicao === "claro" ? "Claro" : "Escuro"} descartadas.`);
  };

  const handleRestaurarPadraoTema = () => {
    const novoDraft: CoresSiteConfig = {
      ...draft,
      [temaEdicao]: { ...padraoAtivo },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    toast.info(`Cores padrão do Modo ${temaEdicao === "claro" ? "Claro" : "Escuro"} restauradas.`);
  };

  const handleRestaurarTodasGerais = async () => {
    const novoDraft: CoresSiteConfig = {
      claro: { ...CORES_SITE_CLARO_PADRAO },
      escuro: { ...CORES_SITE_ESCURO_PADRAO },
    };
    setDraft(novoDraft);
    aplicarPreview(novoDraft);
    const ok = await onSalvar(novoDraft);
    if (ok) {
      toast.success("Todas as cores do site foram restauradas para o padrão institucional.");
    }
  };

  const handleSalvar = async () => {
    const ok = await onSalvar(draft);
    if (ok) {
      toast.success("Cores do site salvas com sucesso em todo o sistema!");
    } else {
      toast.error("Erro ao salvar cores do site.");
    }
  };

  // Cálculos de acessibilidade WCAG AA
  const ratioTitulo = calcularContraste(configAtiva.textoTitulo, configAtiva.card);
  const ratioComum = calcularContraste(configAtiva.textoComum, configAtiva.card);
  const ratioMuted = calcularContraste(configAtiva.textoMuted, configAtiva.card);

  const okTitulo = ratioTitulo >= 4.5;
  const okComum = ratioComum >= 4.5;
  const okMuted = ratioMuted >= 4.5;

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-purple-600 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                <Layout className="h-5 w-5 text-purple-600" />
                Cores Gerais do Site (Fundo, Cards, Textos e Bordas)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Configure as cores fundamentais de tela: superfícies, cartões, tipografia, bordas e a faixa colorida do cabeçalho institucional.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ConfirmAction
                title="Restaurar todas as cores gerais do site?"
                description="Os fundos, cards, textos e faixa colorida de ambos os temas (claro e escuro) voltarão aos padrões originais."
                confirmLabel="Restaurar padrão"
                variant="outline"
                disabled={!isAdmin}
                onConfirm={handleRestaurarTodasGerais}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar todas padrão
              </ConfirmAction>

              {alterado && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isAdmin}
                  onClick={handleDescartar}
                  className="gap-1 text-xs sm:text-sm font-semibold"
                >
                  <Undo2 className="size-3.5" /> Descartar
                </Button>
              )}

              <Button
                variant="google-green"
                disabled={!isAdmin}
                onClick={handleSalvar}
                className="font-bold text-xs sm:text-sm shadow-xs gap-1.5"
              >
                <Save className="h-4 w-4" /> Salvar Cores do Site
              </Button>
            </div>
          </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Controles (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Seção 1: Superfícies e Estrutura */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Superfícies e Estrutura
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cores do fundo da tela, superfícies dos cartões e bordas de divisão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Fundo da Página</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.fundo}
                      onChange={(e) => handleAtualizarCampo("fundo", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.fundo}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("fundo", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Fundo dos Cards</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.card}
                      onChange={(e) => handleAtualizarCampo("card", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.card}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("card", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Bordas e Linhas</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.borda}
                      onChange={(e) => handleAtualizarCampo("borda", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.borda}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("borda", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 2: Textos e Tipografia */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Tipografia e Textos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Controle das cores de títulos, corpo de texto e informações secundárias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Títulos e Cabeçalhos</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.textoTitulo}
                      onChange={(e) => handleAtualizarCampo("textoTitulo", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.textoTitulo}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("textoTitulo", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Texto Comum (Corpo)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.textoComum}
                      onChange={(e) => handleAtualizarCampo("textoComum", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.textoComum}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("textoComum", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Texto Secundário (Muted)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.textoMuted}
                      onChange={(e) => handleAtualizarCampo("textoMuted", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.textoMuted}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("textoMuted", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>
              </div>

              {/* Indicadores de Acessibilidade */}
              <div className="rounded-xl border border-border/80 p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="size-4 text-emerald-600" /> Acessibilidade WCAG AA (sobre o Card)
                  </span>
                  <span className="text-[11px] text-muted-foreground">Mínimo 4.5:1</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                    <span className="text-muted-foreground">Título:</span>
                    <Badge variant={okTitulo ? "default" : "destructive"} className="text-[10px] font-mono">
                      {ratioTitulo}:1 {okTitulo ? "✓ AA" : "⚠ Baixo"}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                    <span className="text-muted-foreground">Comum:</span>
                    <Badge variant={okComum ? "default" : "destructive"} className="text-[10px] font-mono">
                      {ratioComum}:1 {okComum ? "✓ AA" : "⚠ Baixo"}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                    <span className="text-muted-foreground">Secundário:</span>
                    <Badge variant={okMuted ? "default" : "destructive"} className="text-[10px] font-mono">
                      {ratioMuted}:1 {okMuted ? "✓ AA" : "⚠ Baixo"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Faixa Colorida do Cabeçalho */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Faixa Colorida do Cabeçalho (Header Stripe)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                As 4 cores que compõem o gradiente da linha superior exibida em todo o site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cor 1 (Azul)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader1}
                      onChange={(e) => handleAtualizarCampo("faixaHeader1", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader1}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("faixaHeader1", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cor 2 (Vermelho)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader2}
                      onChange={(e) => handleAtualizarCampo("faixaHeader2", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader2}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("faixaHeader2", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cor 3 (Amarelo)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader3}
                      onChange={(e) => handleAtualizarCampo("faixaHeader3", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader3}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("faixaHeader3", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cor 4 (Verde)</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader4}
                      onChange={(e) => handleAtualizarCampo("faixaHeader4", e.target.value)}
                      className="size-8 rounded-lg cursor-pointer border border-border shrink-0 p-0.5 bg-card"
                    />
                    <Input
                      disabled={!isAdmin}
                      value={configAtiva.faixaHeader4}
                      maxLength={7}
                      onChange={(e) => handleAtualizarCampo("faixaHeader4", e.target.value)}
                      className="h-8 font-mono text-xs uppercase px-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pré-visualização Ao Vivo (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-border/80 shadow-xs sticky top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Pré-visualização da Página
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  Modo {temaEdicao}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Veja como as superfícies, textos e faixas combinam entre si em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Moldura da Página Simulada */}
              <div
                style={{ backgroundColor: configAtiva.fundo }}
                className="rounded-2xl p-4 border shadow-sm transition-all duration-200 overflow-hidden space-y-4"
              >
                {/* Faixa Simulada */}
                <div
                  style={{
                    background: `linear-gradient(90deg, ${configAtiva.faixaHeader1} 0%, ${configAtiva.faixaHeader1} 25%, ${configAtiva.faixaHeader2} 25%, ${configAtiva.faixaHeader2} 50%, ${configAtiva.faixaHeader3} 50%, ${configAtiva.faixaHeader3} 75%, ${configAtiva.faixaHeader4} 75%)`,
                  }}
                  className="h-1.5 w-full rounded-full"
                />

                {/* Card Simulado */}
                <div
                  style={{
                    backgroundColor: configAtiva.card,
                    borderColor: configAtiva.borda,
                  }}
                  className="rounded-xl p-4 border shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{ color: configAtiva.textoTitulo }}
                      className="text-base font-black tracking-tight"
                    >
                      Título do Card Demonstrativo
                    </span>
                    <span
                      style={{
                        backgroundColor: configAtiva.faixaHeader1,
                        color: "#ffffff",
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      Destaque
                    </span>
                  </div>

                  <p
                    style={{ color: configAtiva.textoComum }}
                    className="text-xs leading-relaxed"
                  >
                    Este é um parágrafo demonstrativo com o estilo de texto comum do sistema. A legibilidade foi testada para garantir máxima clareza.
                  </p>

                  <p
                    style={{ color: configAtiva.textoMuted }}
                    className="text-[11px] leading-snug border-t pt-2"
                    style={{
                      borderTopColor: configAtiva.borda,
                      color: configAtiva.textoMuted,
                    }}
                  >
                    Informação secundária / legenda explicativa (texto muted).
                  </p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={handleRestaurarPadraoTema}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3 mr-1" /> Restaurar padrão deste modo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
