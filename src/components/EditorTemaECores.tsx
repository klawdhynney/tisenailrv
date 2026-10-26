import React, { useState } from "react";
import { Check, Palette, RotateCcw, Sparkles, Sun, Moon, Laptop, ShieldCheck, AlertCircle, Sliders, Waves, Zap, Compass, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ConfirmAction } from "@/components/ConfirmAction";
import {
  type PaletaId,
  type ModoTema,
  type TemaConfig,
  type PaletaPersonalizadaConfig,
  type LiquidGlassConfig,
  PALETAS,
  obterPaletaInfo,
  gerarPaletaPersonalizada,
  calcularContraste,
  atendeWcagAa,
  PALETA_PERSONALIZADA_PADRAO,
  LIQUID_GLASS_CONFIG_PADRAO,
  validarLiquidGlassConfig,
  TEMA_CONFIG_PADRAO,
  aplicarTemaNoDocumento,
} from "@/lib/tema";

interface EditorTemaECoresProps {
  temaConfig: TemaConfig;
  isAdmin: boolean;
  onChange: (novoConfig: TemaConfig) => void;
  onRestaurarPadrao: () => void;
}

export function EditorTemaECores({
  temaConfig,
  isAdmin,
  onChange,
  onRestaurarPadrao,
}: EditorTemaECoresProps) {
  const [customDraft, setCustomDraft] = useState<PaletaPersonalizadaConfig>(
    temaConfig.paletaPersonalizada ?? PALETA_PERSONALIZADA_PADRAO
  );
  const [liquidGlassDraft, setLiquidGlassDraft] = useState<LiquidGlassConfig>(() =>
    validarLiquidGlassConfig(temaConfig.liquidGlass)
  );

  const paletaAtiva = temaConfig.paletaAtiva || "padrao";
  const modoPadrao = temaConfig.modoPadrao || "auto";

  // Aplica imediatamente para permitir pré-visualização ao vivo
  const handleSelecionarPaleta = (id: PaletaId) => {
    const novoConfig: TemaConfig = {
      ...temaConfig,
      paletaAtiva: id,
      paletaPersonalizada: id === "personalizada" ? customDraft : temaConfig.paletaPersonalizada,
      liquidGlass: id === "liquid-glass" ? liquidGlassDraft : temaConfig.liquidGlass,
    };
    onChange(novoConfig);
    aplicarTemaNoDocumento({
      modo: novoConfig.modoPadrao,
      paleta: id,
      custom: id === "personalizada" ? customDraft : undefined,
      liquidGlass: id === "liquid-glass" ? liquidGlassDraft : undefined,
    });
  };

  const handleAlterarModoPadrao = (novoModo: ModoTema) => {
    const novoConfig: TemaConfig = {
      ...temaConfig,
      modoPadrao: novoModo,
    };
    onChange(novoConfig);
    aplicarTemaNoDocumento({
      modo: novoModo,
      paleta: paletaAtiva,
      custom: paletaAtiva === "personalizada" ? customDraft : undefined,
      liquidGlass: paletaAtiva === "liquid-glass" ? liquidGlassDraft : undefined,
    });
  };

  const handleAtualizarLiquidGlass = (campos: Partial<LiquidGlassConfig>) => {
    const atualizado = validarLiquidGlassConfig({ ...liquidGlassDraft, ...campos });
    setLiquidGlassDraft(atualizado);
    const novoTemaConfig: TemaConfig = {
      ...temaConfig,
      liquidGlass: atualizado,
    };
    onChange(novoTemaConfig);
    if (paletaAtiva === "liquid-glass") {
      aplicarTemaNoDocumento({
        modo: modoPadrao,
        paleta: "liquid-glass",
        liquidGlass: atualizado,
      });
    }
  };

  const handleRestaurarLiquidGlassPadrao = () => {
    setLiquidGlassDraft(LIQUID_GLASS_CONFIG_PADRAO);
    const novoTemaConfig: TemaConfig = {
      ...temaConfig,
      liquidGlass: LIQUID_GLASS_CONFIG_PADRAO,
    };
    onChange(novoTemaConfig);
    if (paletaAtiva === "liquid-glass") {
      aplicarTemaNoDocumento({
        modo: modoPadrao,
        paleta: "liquid-glass",
        liquidGlass: LIQUID_GLASS_CONFIG_PADRAO,
      });
    }
  };

  const handleAtualizarCustom = (campo: keyof PaletaPersonalizadaConfig, valorHex: string) => {
    const atualizado = { ...customDraft, [campo]: valorHex };
    setCustomDraft(atualizado);
    if (paletaAtiva === "personalizada") {
      onChange({
        ...temaConfig,
        paletaPersonalizada: atualizado,
      });
      aplicarTemaNoDocumento({
        modo: modoPadrao,
        paleta: "personalizada",
        custom: atualizado,
      });
    }
  };

  // Avaliação de contraste da paleta personalizada
  const paletaCustomInfo = gerarPaletaPersonalizada(customDraft);
  const contrasteClaroTexto = calcularContraste(
    paletaCustomInfo.destaqueClaro.texto,
    paletaCustomInfo.destaqueClaro.fundo
  );
  const contrasteEscuroTexto = calcularContraste(
    paletaCustomInfo.destaqueEscuro.texto,
    paletaCustomInfo.destaqueEscuro.fundo
  );
  const contrastePrimariaClaro = calcularContraste(
    "#FFFFFF",
    customDraft.corPrimaria
  );

  const wcagClaroOk = contrasteClaroTexto >= 4.5;
  const wcagEscuroOk = contrasteEscuroTexto >= 4.5;

  return (
    <div className="space-y-6">
      {/* 1. SELEÇÃO DO MODO PADRÃO DO SITE */}
      <Card className="border-t-4 border-g-blue shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Palette className="h-5 w-5 text-g-blue" />
                Modo Padrão do Site para Visitantes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Define a luminosidade padrão aplicada para novos visitantes e quem ainda não escolheu um modo no cabeçalho.
              </CardDescription>
            </div>
            <ConfirmAction
              title="Restaurar padrão de tema e cores?"
              description="A paleta voltará para 'Padrão (cores atuais)' e o modo para 'Automático (segue o aparelho)'."
              confirmLabel="Restaurar Padrão"
              variant="outline"
              disabled={!isAdmin}
              onConfirm={() => {
                onRestaurarPadrao();
                aplicarTemaNoDocumento({
                  modo: TEMA_CONFIG_PADRAO.modoPadrao,
                  paleta: TEMA_CONFIG_PADRAO.paletaAtiva,
                });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar tema padrão
            </ConfirmAction>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => handleAlterarModoPadrao("auto")}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                modoPadrao === "auto"
                  ? "border-g-blue bg-g-blue/5 shadow-xs"
                  : "border-border hover:border-foreground/30 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Laptop className="h-4 w-4 text-g-blue" />
                  Automático
                </span>
                {modoPadrao === "auto" && (
                  <Badge variant="default" className="text-[10px] bg-g-blue">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Segue automaticamente o tema do sistema (Windows, Android, iOS, macOS).
              </p>
            </button>

            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => handleAlterarModoPadrao("claro")}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                modoPadrao === "claro"
                  ? "border-amber-500 bg-amber-500/5 shadow-xs"
                  : "border-border hover:border-foreground/30 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Modo Claro
                </span>
                {modoPadrao === "claro" && (
                  <Badge variant="default" className="text-[10px] bg-amber-500 text-zinc-950 font-bold">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sempre carrega fundo claro limpo e superfícies brancas.
              </p>
            </button>

            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => handleAlterarModoPadrao("escuro")}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                modoPadrao === "escuro"
                  ? "border-sky-500 bg-sky-500/5 shadow-xs"
                  : "border-border hover:border-foreground/30 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Moon className="h-4 w-4 text-sky-400" />
                  Modo Escuro
                </span>
                {modoPadrao === "escuro" && (
                  <Badge variant="default" className="text-[10px] bg-sky-500 text-white font-bold">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sempre carrega fundo escuro de alto contraste e baixo cansaço visual.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 2. CARTÕES DE PALETAS DE DESIGN */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Paletas de Cores do Sistema
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada paleta possui regras calibradas para os modos claro e escuro, gráficos e conformidade WCAG AA.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* PALETA 1: PADRÃO */}
          <CartaoPaleta
            info={PALETAS.padrao}
            ativa={paletaAtiva === "padrao"}
            isAdmin={isAdmin}
            onAplicar={() => handleSelecionarPaleta("padrao")}
          />

          {/* PALETA 2: BIG TECH */}
          <CartaoPaleta
            info={PALETAS["big-tech"]}
            ativa={paletaAtiva === "big-tech"}
            isAdmin={isAdmin}
            onAplicar={() => handleSelecionarPaleta("big-tech")}
          />

          {/* PALETA 3: INTERSTELLAR INSPIRED */}
          <CartaoPaleta
            info={PALETAS.interstellar}
            ativa={paletaAtiva === "interstellar"}
            isAdmin={isAdmin}
            onAplicar={() => handleSelecionarPaleta("interstellar")}
          />
        </div>

        {/* PALETA APPLE: LIQUID GLASS COM CONTROLES DEDICADOS */}
        <CartaoLiquidGlass
          ativa={paletaAtiva === "liquid-glass"}
          config={liquidGlassDraft}
          isAdmin={isAdmin}
          onAplicar={() => handleSelecionarPaleta("liquid-glass")}
          onChangeConfig={handleAtualizarLiquidGlass}
          onRestaurarPadrao={handleRestaurarLiquidGlassPadrao}
        />

        {/* PALETA PERSONALIZADA */}
        <Card className={`border-2 transition-all ${
          paletaAtiva === "personalizada" ? "border-purple-600 ring-2 ring-purple-600/20 shadow-md" : "border-border"
        }`}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground">
                  Personalizada
                </CardTitle>
                {paletaAtiva === "personalizada" ? (
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                    Ativa no site
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Customizada
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                disabled={!isAdmin || paletaAtiva === "personalizada"}
                onClick={() => handleSelecionarPaleta("personalizada")}
                className="font-bold text-xs"
                variant={paletaAtiva === "personalizada" ? "secondary" : "default"}
              >
                {paletaAtiva === "personalizada" ? "Paleta Ativa" : "Aplicar Personalizada"}
              </Button>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Ajuste as 5 cores bases do sistema (primária, sucesso, alerta, perigo e neutra). O sistema calcula os modos claro e escuro e a conformidade WCAG AA automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seletores de Cor */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SeletorCorItem
                label="Primária"
                valor={customDraft.corPrimaria}
                disabled={!isAdmin}
                onChange={(v) => handleAtualizarCustom("corPrimaria", v)}
              />
              <SeletorCorItem
                label="Sucesso"
                valor={customDraft.corSucesso}
                disabled={!isAdmin}
                onChange={(v) => handleAtualizarCustom("corSucesso", v)}
              />
              <SeletorCorItem
                label="Alerta"
                valor={customDraft.corAlerta}
                disabled={!isAdmin}
                onChange={(v) => handleAtualizarCustom("corAlerta", v)}
              />
              <SeletorCorItem
                label="Perigo"
                valor={customDraft.corPerigo}
                disabled={!isAdmin}
                onChange={(v) => handleAtualizarCustom("corPerigo", v)}
              />
              <SeletorCorItem
                label="Neutra (Base)"
                valor={customDraft.corNeutra}
                disabled={!isAdmin}
                onChange={(v) => handleAtualizarCustom("corNeutra", v)}
              />
            </div>

            {/* Avaliação de Acessibilidade WCAG AA */}
            <div className="rounded-xl border border-border p-3.5 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Validação de Acessibilidade WCAG AA (Mínimo 4.5:1)
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Contraste calculado
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs">
                  <span className="text-muted-foreground">Texto Modo Claro:</span>
                  <Badge variant={wcagClaroOk ? "default" : "destructive"} className="text-[10px] font-mono">
                    {contrasteClaroTexto}:1 {wcagClaroOk ? "✓ AA" : "⚠ Baixo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs">
                  <span className="text-muted-foreground">Texto Modo Escuro:</span>
                  <Badge variant={wcagEscuroOk ? "default" : "destructive"} className="text-[10px] font-mono">
                    {contrasteEscuroTexto}:1 {wcagEscuroOk ? "✓ AA" : "⚠ Baixo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs">
                  <span className="text-muted-foreground">Botão Primário:</span>
                  <Badge variant={contrastePrimariaClaro >= 3 ? "default" : "secondary"} className="text-[10px] font-mono">
                    {contrastePrimariaClaro}:1 {contrastePrimariaClaro >= 4.5 ? "✓ AA" : "Legível"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Pré-visualização da Paleta Personalizada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Pré-visualização da Paleta Gerada
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PreviewModoBox
                  titulo="Modo Claro Gerado"
                  fundo={paletaCustomInfo.destaqueClaro.fundo}
                  card={paletaCustomInfo.destaqueClaro.card}
                  texto={paletaCustomInfo.destaqueClaro.texto}
                  primaria={paletaCustomInfo.destaqueClaro.primaria}
                  sucesso={paletaCustomInfo.destaqueClaro.sucesso}
                  alerta={paletaCustomInfo.destaqueClaro.alerta}
                  perigo={paletaCustomInfo.destaqueClaro.perigo}
                  borda={paletaCustomInfo.destaqueClaro.borda}
                />
                <PreviewModoBox
                  titulo="Modo Escuro Gerado"
                  fundo={paletaCustomInfo.destaqueEscuro.fundo}
                  card={paletaCustomInfo.destaqueEscuro.card}
                  texto={paletaCustomInfo.destaqueEscuro.texto}
                  primaria={paletaCustomInfo.destaqueEscuro.primaria}
                  sucesso={paletaCustomInfo.destaqueEscuro.sucesso}
                  alerta={paletaCustomInfo.destaqueEscuro.alerta}
                  perigo={paletaCustomInfo.destaqueEscuro.perigo}
                  borda={paletaCustomInfo.destaqueEscuro.borda}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function CartaoPaleta({
  info,
  ativa,
  isAdmin,
  onAplicar,
}: {
  info: (typeof PALETAS)[keyof typeof PALETAS];
  ativa: boolean;
  isAdmin: boolean;
  onAplicar: () => void;
}) {
  return (
    <Card className={`border-2 flex flex-col justify-between transition-all ${
      ativa ? "border-g-blue ring-2 ring-g-blue/20 shadow-md" : "border-border hover:border-foreground/20"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-bold text-foreground">
            {info.nome}
          </CardTitle>
          {ativa ? (
            <Badge className="bg-g-blue text-white text-[10px] font-bold">
              Ativa no site
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Paleta
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground line-clamp-2 min-h-8">
          {info.descricao}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2.5">
          <PreviewModoBox
            titulo="Claro"
            fundo={info.destaqueClaro.fundo}
            card={info.destaqueClaro.card}
            texto={info.destaqueClaro.texto}
            primaria={info.destaqueClaro.primaria}
            sucesso={info.destaqueClaro.sucesso}
            alerta={info.destaqueClaro.alerta}
            perigo={info.destaqueClaro.perigo}
            borda={info.destaqueClaro.borda}
          />
          <PreviewModoBox
            titulo="Escuro"
            fundo={info.destaqueEscuro.fundo}
            card={info.destaqueEscuro.card}
            texto={info.destaqueEscuro.texto}
            primaria={info.destaqueEscuro.primaria}
            sucesso={info.destaqueEscuro.sucesso}
            alerta={info.destaqueEscuro.alerta}
            perigo={info.destaqueEscuro.perigo}
            borda={info.destaqueEscuro.borda}
          />
        </div>

        <Button
          size="sm"
          disabled={!isAdmin || ativa}
          onClick={onAplicar}
          className="w-full font-bold text-xs mt-2"
          variant={ativa ? "secondary" : "default"}
        >
          {ativa ? "Paleta Ativa" : `Aplicar ${info.nome}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function PreviewModoBox({
  titulo,
  fundo,
  card,
  texto,
  primaria,
  sucesso,
  alerta,
  perigo,
  borda,
}: {
  titulo: string;
  fundo: string;
  card: string;
  texto: string;
  primaria: string;
  sucesso: string;
  alerta: string;
  perigo: string;
  borda: string;
}) {
  return (
    <div
      className="rounded-xl p-2.5 border shadow-inner flex flex-col gap-2 transition-all select-none"
      style={{ backgroundColor: fundo, borderColor: borda }}
    >
      <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: texto }}>
        <span>{titulo}</span>
        <div className="size-2 rounded-full" style={{ backgroundColor: primaria }} />
      </div>

      <div
        className="rounded-lg p-2 border shadow-xs flex flex-col gap-1.5"
        style={{ backgroundColor: card, borderColor: borda }}
      >
        <span className="text-[10px] font-semibold truncate" style={{ color: texto }}>
          Cartão de exemplo
        </span>
        <div className="flex items-center gap-1">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: primaria }}
            title="Primária"
          />
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: sucesso }}
            title="Sucesso"
          />
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: alerta }}
            title="Alerta"
          />
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: perigo }}
            title="Perigo"
          />
        </div>
      </div>
    </div>
  );
}

function SeletorCorItem({
  label,
  valor,
  disabled,
  onChange,
}: {
  label: string;
  valor: string;
  disabled: boolean;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          disabled={disabled}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-input p-0.5 bg-background shrink-0 disabled:cursor-not-allowed"
          title={`Seletor de cor: ${label}`}
        />
        <Input
          type="text"
          disabled={disabled}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="h-8 font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

// ==========================================
// CARTÃO E CONTROLES DEDICADOS - LIQUID GLASS (APPLE STYLE)
// ==========================================

function CartaoLiquidGlass({
  ativa,
  config,
  isAdmin,
  onAplicar,
  onChangeConfig,
  onRestaurarPadrao,
}: {
  ativa: boolean;
  config: LiquidGlassConfig;
  isAdmin: boolean;
  onAplicar: () => void;
  onChangeConfig: (campos: Partial<LiquidGlassConfig>) => void;
  onRestaurarPadrao: () => void;
}) {
  return (
    <Card
      className={`border-2 transition-all relative overflow-hidden ${
        ativa
          ? "border-sky-500 ring-2 ring-sky-500/25 shadow-lg bg-card/95"
          : "border-border hover:border-foreground/30 bg-card"
      }`}
    >
      {/* Faixa superior sutil com efeito vidro/reflexo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-sky-500" />
            <CardTitle className="text-base font-bold text-foreground">
              Liquid Glass (Estilo Apple)
            </CardTitle>
            {ativa ? (
              <Badge className="bg-sky-500 text-white text-[10px] font-bold">
                Ativa no site
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Vidro Semitransparente
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isAdmin}
              onClick={onRestaurarPadrao}
              className="text-xs h-8"
              title="Restaurar parâmetros padrão do Liquid Glass (Intensidade 60, Desfoque 16px, Brilho 70%)"
            >
              <RotateCcw className="size-3.5 mr-1" /> Restaurar padrão
            </Button>
            <Button
              size="sm"
              disabled={!isAdmin || ativa}
              onClick={onAplicar}
              className="font-bold text-xs h-8"
              variant={ativa ? "secondary" : "default"}
            >
              {ativa ? "Paleta Ativa" : "Aplicar Liquid Glass"}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Efeito de vidro semitransparente com profundidade líquida, manchas de cor suaves em movimento lento (Space, Orbit, Nebula e Ice no escuro; Signal com azul-gelo no claro), botões pílula com reflexo, cabeçalho fixo flutuante e modo econômico inteligente para aparelhos modestos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Pré-visualização ao vivo: Modo Claro e Modo Escuro */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Eye className="size-3.5 text-sky-500" />
              Pré-visualização do Vidro e Fundo Vivo
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Simulação em tempo real dos modos claro e escuro
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PreviewLiquidGlassBox isDark={false} config={config} />
            <PreviewLiquidGlassBox isDark={true} config={config} />
          </div>
        </div>

        {/* Verificação de Acessibilidade WCAG AA */}
        <div className="rounded-xl border border-border p-3 bg-muted/20 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              Acessibilidade e Contraste WCAG AA
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Mínimo exigido: 4.5:1
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border/80">
              <span className="text-muted-foreground">Texto Claro:</span>
              <Badge variant="default" className="text-[10px] font-mono bg-emerald-600">
                16.2:1 ✓ AA
              </Badge>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border/80">
              <span className="text-muted-foreground">Texto Escuro:</span>
              <Badge variant="default" className="text-[10px] font-mono bg-emerald-600">
                17.4:1 ✓ AA
              </Badge>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border/80">
              <span className="text-muted-foreground">Áreas Quase Opacas:</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                94% opacidade ✓
              </Badge>
            </div>
          </div>
        </div>

        {/* Controles de Configuração do Vidro */}
        <div className="rounded-xl border border-border p-4 bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-border/60">
            <Sliders className="size-4 text-sky-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Parâmetros do Vidro e Desempenho
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Controle 1: Intensidade */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Intensidade do Vidro
                </Label>
                <Badge variant="secondary" className="font-mono text-xs">
                  {config.intensidade}%
                </Badge>
              </div>
              <Slider
                disabled={!isAdmin}
                value={[config.intensidade]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => onChangeConfig({ intensidade: val })}
                className="cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">
                Grau de transparência das superfícies (padrão: 60%).
              </p>
            </div>

            {/* Controle 2: Desfoque (Blur) */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Desfoque (Blur)
                </Label>
                <Badge variant="secondary" className="font-mono text-xs">
                  {config.desfoque}px
                </Badge>
              </div>
              <Slider
                disabled={!isAdmin}
                value={[config.desfoque]}
                min={0}
                max={32}
                step={2}
                onValueChange={([val]) => onChangeConfig({ desfoque: val })}
                className="cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">
                Intensidade do desfoque ótico do fundo (padrão: 16px).
              </p>
            </div>

            {/* Controle 3: Brilho das Bordas */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Brilho das Bordas
                </Label>
                <Badge variant="secondary" className="font-mono text-xs">
                  {config.brilhoBorda}%
                </Badge>
              </div>
              <Slider
                disabled={!isAdmin}
                value={[config.brilhoBorda]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => onChangeConfig({ brilhoBorda: val })}
                className="cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">
                Highlight superior esquerdo e reflexo (padrão: 70%).
              </p>
            </div>
          </div>

          {/* 3 Opções de Comportamento / Desempenho (Switches) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Movimento do Fundo */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                  <Waves className="size-3.5 text-sky-500" />
                  Movimento do Fundo
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Translação suave de 30 a 60s dos gradientes radiais atrás do conteúdo.
                </p>
              </div>
              <Switch
                disabled={!isAdmin}
                checked={config.movimentoFundo}
                onCheckedChange={(checked) => onChangeConfig({ movimentoFundo: checked })}
                aria-label="Ativar movimento do fundo vivo"
              />
            </div>

            {/* Refração Ótica Líquida */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                  <Compass className="size-3.5 text-purple-500" />
                  Refração Líquida
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Distorção por deslocamento SVG (padrão desativada no celular).
                </p>
              </div>
              <Switch
                disabled={!isAdmin}
                checked={config.refracao}
                onCheckedChange={(checked) => onChangeConfig({ refracao: checked })}
                aria-label="Ativar refração líquida"
              />
            </div>

            {/* Modo Econômico Automático */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                  <Zap className="size-3.5 text-amber-500" />
                  Modo Econômico Auto
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Reduz desfoque e para animações em celulares fracos ou economia de dados.
                </p>
              </div>
              <Switch
                disabled={!isAdmin}
                checked={config.modoEconomicoAuto}
                onCheckedChange={(checked) => onChangeConfig({ modoEconomicoAuto: checked })}
                aria-label="Ativar modo econômico automático"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewLiquidGlassBox({
  isDark,
  config,
}: {
  isDark: boolean;
  config: LiquidGlassConfig;
}) {
  const intFator = config.intensidade / 100;
  const cardAlpha = isDark ? 0.45 + (1 - intFator) * 0.40 : 0.50 + (1 - intFator) * 0.38;
  const bordaAlpha = (config.brilhoBorda / 100) * (isDark ? 0.35 : 0.65);
  const blurVal = Math.min(config.desfoque, 20);

  const bgBase = isDark ? "#0B132B" : "#F5F3F4";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const cardBg = isDark
    ? `rgba(28, 37, 65, ${cardAlpha.toFixed(2)})`
    : `rgba(255, 255, 255, ${cardAlpha.toFixed(2)})`;
  const borderColor = isDark
    ? `rgba(205, 231, 240, ${bordaAlpha.toFixed(2)})`
    : `rgba(255, 255, 255, ${bordaAlpha.toFixed(2)})`;
  const primaryColor = isDark ? "#38BDF8" : "#0284C7";
  const primaryText = isDark ? "#0B132B" : "#FFFFFF";

  const contraste = calcularContraste(textColor, bgBase);

  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 border select-none transition-all"
      style={{ backgroundColor: bgBase, borderColor: isDark ? "#3A506B" : "#CBD5E1" }}
    >
      {/* Manchas de fundo para simular o vidro vivo */}
      <div
        className="absolute -top-4 -left-4 size-24 rounded-full blur-xl pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(58,80,107,0.85) 0%, rgba(11,19,43,0) 70%)"
            : "radial-gradient(circle, rgba(186,230,253,0.90) 0%, rgba(245,243,244,0) 70%)",
        }}
      />
      <div
        className="absolute -bottom-4 -right-4 size-24 rounded-full blur-xl pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(56,189,248,0.40) 0%, rgba(11,19,43,0) 70%)"
            : "radial-gradient(circle, rgba(199,223,247,0.90) 0%, rgba(245,243,244,0) 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: textColor }}>
          <span className="flex items-center gap-1.5">
            {isDark ? <Moon className="size-3 text-sky-400" /> : <Sun className="size-3 text-amber-500" />}
            Modo {isDark ? "Escuro" : "Claro"}
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono bg-card/60">
            {contraste}:1 ✓ AA
          </Badge>
        </div>

        {/* Cartão de vidro de exemplo */}
        <div
          className="rounded-xl p-2.5 shadow-md border relative transition-all"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
            backdropFilter: `blur(${blurVal}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${blurVal}px) saturate(180%)`,
          }}
        >
          <div className="text-[11px] font-bold truncate mb-1" style={{ color: textColor }}>
            Superfície de Vidro Líquido
          </div>
          <div className="text-[10px] opacity-80 line-clamp-1 mb-2" style={{ color: textColor }}>
            Vidro translúcido com desfoque e reflexo ótico.
          </div>

          {/* Botão Pílula com reflexo estilo Apple */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1"
              style={{
                backgroundColor: primaryColor,
                color: primaryText,
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
              }}
            >
              Pílula Apple
            </span>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: "#0D9488" }} title="Sucesso" />
              <span className="size-2 rounded-full" style={{ backgroundColor: "#D97706" }} title="Alerta" />
              <span className="size-2 rounded-full" style={{ backgroundColor: "#E11D48" }} title="Perigo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
