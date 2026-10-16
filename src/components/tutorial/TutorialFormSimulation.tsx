import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Lock,
  Sparkles,
  Wand2,
  SendHorizontal,
  Star,
  MapPin,
  Laptop,
  HelpCircle,
  Clock,
  ShieldCheck,
  MousePointer,
} from "lucide-react";
import { type TutorialStep, TUTORIAL_SIMULATED_URL } from "@/content/tutorial-abrir-chamado";

interface TutorialFormSimulationProps {
  step: TutorialStep;
  isPlaying: boolean;
  onAdvanceStep?: () => void;
}

export function TutorialFormSimulation({
  step,
  isPlaying,
  onAdvanceStep,
}: TutorialFormSimulationProps) {
  // Efeito de digitação suave para a simulação
  const [typedName, setTypedName] = useState("");
  const [typedDesc, setTypedDesc] = useState("");

  const targetName = step.simulacao.solicitante || "";
  const targetDesc = step.simulacao.descricao || "";

  useEffect(() => {
    if (!targetName) {
      setTypedName("");
      return;
    }
    // Se for passo 2, anima digitação; senão mostra completo
    if (step.id === 2) {
      let i = 0;
      setTypedName("");
      const timer = setInterval(() => {
        i++;
        setTypedName(targetName.slice(0, i));
        if (i >= targetName.length) clearInterval(timer);
      }, 45);
      return () => clearInterval(timer);
    } else {
      setTypedName(targetName);
    }
  }, [step.id, targetName]);

  useEffect(() => {
    if (!targetDesc) {
      setTypedDesc("");
      return;
    }
    // Se for passo 5 ou 6, anima digitação rápida
    if (step.id === 5) {
      let i = 0;
      setTypedDesc("");
      const timer = setInterval(() => {
        i++;
        setTypedDesc(targetDesc.slice(0, i));
        if (i >= targetDesc.length) clearInterval(timer);
      }, 28);
      return () => clearInterval(timer);
    } else {
      setTypedDesc(targetDesc);
    }
  }, [step.id, targetDesc]);

  const isFoco = (elem: TutorialStep["elementoFoco"]) => step.elementoFoco === elem;

  return (
    <div className="relative w-full h-full bg-slate-900/5 dark:bg-slate-950/40 select-none overflow-hidden flex flex-col justify-between font-sans">
      {/* Barra superior de simulação estilo navegador/sistema */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-muted/40 text-[11px] text-muted-foreground backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400/80 inline-block" />
          <span className="size-2 rounded-full bg-amber-400/80 inline-block" />
          <span className="size-2 rounded-full bg-emerald-400/80 inline-block" />
          <span className="ml-2 font-mono text-[10px] text-muted-foreground/90">
            {TUTORIAL_SIMULATED_URL}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-[10px] border border-purple-500/20">
            <span className="size-1.5 rounded-full bg-purple-500 animate-ping inline-block" />
            Modo Demonstração
          </span>
          <span className="text-[10px] hidden sm:inline text-muted-foreground">
            Dados fictícios de exemplo
          </span>
        </div>
      </div>

      {/* Conteúdo central da simulação */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex items-center justify-center">
        {/* Se o passo for 8 ou 9 e sucesso for true, exibe a tela de confirmação simulada */}
        {step.simulacao.sucesso ? (
          <div
            className={`w-full max-w-lg rounded-2xl border bg-card p-5 sm:p-6 shadow-md transition-all duration-300 animate-in zoom-in-95 ${
              isFoco("enviar_confirmacao") || isFoco("acompanhar_avaliar")
                ? "border-emerald-500/60 ring-2 ring-emerald-500/30"
                : "border-border"
            }`}
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">
                    Chamado #{step.simulacao.numeroChamado} enviado!
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Aberto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registrado no sistema e encaminhado para a equipe técnica da TI SENAI LRV.
                </p>
              </div>
            </div>

            <div className="my-4 space-y-2 text-xs bg-muted/40 p-3.5 rounded-xl border border-border/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitante:</span>
                <span className="font-medium text-foreground">Maria Silva (Exemplo)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setor:</span>
                <span className="font-medium text-foreground">Secretaria</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Problema:</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  Internet / Rede
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local:</span>
                <span className="font-medium text-foreground">Bloco A, Sala 1, Mesa 03</span>
              </div>
            </div>

            {/* Avaliação de satisfação destacada no passo 9 */}
            <div
              className={`rounded-xl p-3 border transition-all ${
                isFoco("acompanhar_avaliar")
                  ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30"
                  : "bg-muted/20 border-border/60"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Star className="size-3.5 text-amber-500 fill-amber-500" />
                  Avaliação do Atendimento
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Após status <strong>Finalizado</strong>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Quando seu atendimento for concluído, você receberá a opção de avaliar com 1 a 5 estrelas.
              </p>
              <div className="flex gap-1 justify-center py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    tabIndex={-1}
                    className="p-1 rounded-md text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star className="size-4 fill-amber-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Botões simulados da confirmação */}
            <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <div className="flex-1 text-center py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                Ver em Meus Chamados
              </div>
              <div className="flex-1 text-center py-1.5 px-3 rounded-lg border border-border text-xs text-muted-foreground">
                Abrir novo chamado
              </div>
            </div>
          </div>
        ) : (
          /* Formulário simulado */
          <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-3.5 transition-all duration-200">
            {/* Cabeçalho do formulário */}
            <div
              className={`transition-all rounded-xl p-2 ${
                isFoco("inicio")
                  ? "ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
                  TI
                </span>
                <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                  Abrir chamado de TI
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Preencha os dados abaixo com o local e a descrição do problema.
              </p>
            </div>

            {/* Linha 1: Solicitante e E-mail */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl p-2 transition-all ${
                isFoco("solicitante_email")
                  ? "ring-2 ring-purple-500/80 bg-purple-500/5 shadow-xs"
                  : ""
              }`}
            >
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>Nome completo *</span>
                  {isFoco("solicitante_email") && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal animate-pulse">
                      ✍️ Digitando...
                    </span>
                  )}
                </label>
                <div className="h-8 rounded-lg border border-input bg-background/80 px-2.5 flex items-center text-xs text-foreground font-medium">
                  {typedName || <span className="text-muted-foreground/50">Ex.: Seu nome</span>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>E-mail institucional *</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Lock className="size-2.5 text-emerald-600" /> Protegido
                  </span>
                </label>
                <div className="h-8 rounded-lg border border-border bg-muted/50 px-2.5 flex items-center text-xs text-muted-foreground font-mono truncate">
                  {step.simulacao.email || "usuario@senaimt.edu.br"}
                </div>
              </div>
            </div>

            {/* Linha 2: Setor e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                className={`rounded-xl p-2 transition-all ${
                  isFoco("setor")
                    ? "ring-2 ring-purple-500/80 bg-purple-500/5 shadow-xs"
                    : ""
                }`}
              >
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Setor solicitante *
                </label>
                <div className="h-8 rounded-lg border border-input bg-background/80 px-2.5 flex items-center justify-between text-xs text-foreground font-medium">
                  <span>{step.simulacao.setor || "Selecione seu setor..."}</span>
                  <span className="text-[10px] text-muted-foreground">▼</span>
                </div>
              </div>

              <div
                className={`rounded-xl p-2 transition-all ${
                  isFoco("categoria")
                    ? "ring-2 ring-purple-500/80 bg-purple-500/5 shadow-xs"
                    : ""
                }`}
              >
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Tipo de problema *
                </label>
                <div className="h-8 rounded-lg border border-input bg-background/80 px-2.5 flex items-center justify-between text-xs text-foreground font-medium">
                  <span>{step.simulacao.categoria || "Selecione o tipo..."}</span>
                  <span className="text-[10px] text-muted-foreground">▼</span>
                </div>
              </div>
            </div>

            {/* Linha 3: Local e Descrição */}
            <div
              className={`rounded-xl p-2 transition-all space-y-2 ${
                isFoco("local_descricao")
                  ? "ring-2 ring-purple-500/80 bg-purple-500/5 shadow-xs"
                  : ""
              }`}
            >
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-red-500" />
                  <span>Local exato (bloco e sala) *</span>
                </label>
                <div className="h-8 rounded-lg border border-input bg-background/80 px-2.5 flex items-center text-xs text-foreground font-medium">
                  {step.simulacao.local || (
                    <span className="text-muted-foreground/50">Ex.: Bloco A, Sala 1, Mesa 03</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-foreground">
                    Descreva o problema *
                  </label>
                  {isFoco("local_descricao") && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal animate-pulse">
                      ✍️ Descrevendo...
                    </span>
                  )}
                </div>
                <div className="min-h-[52px] rounded-lg border border-input bg-background/80 p-2 text-xs text-foreground leading-relaxed line-clamp-3">
                  {typedDesc || (
                    <span className="text-muted-foreground/50">
                      Ex.: Computador sem internet na sala 1
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Linha 4: Botões de IA */}
            <div
              className={`rounded-xl p-2 transition-all flex flex-wrap items-center justify-between gap-2 ${
                isFoco("botoes_ia")
                  ? "ring-2 ring-purple-500/80 bg-purple-500/10 shadow-xs"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400 text-[11px] font-semibold border border-purple-500/20 shadow-2xs">
                  <Sparkles className="size-3" />
                  Sugerir texto
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400 text-[11px] font-semibold border border-purple-500/20 shadow-2xs">
                  <Wand2 className="size-3" />
                  Aprimorar texto
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Revise antes do envio
              </span>
            </div>

            {/* Linha 5: Lembrar dados e Botão de Envio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/50">
              <div
                className={`rounded-lg px-2 py-1 transition-all flex items-center gap-2 ${
                  isFoco("lembrar_dados")
                    ? "ring-2 ring-purple-500 bg-purple-500/10"
                    : ""
                }`}
              >
                <div
                  className={`size-3.5 rounded border flex items-center justify-center ${
                    step.simulacao.lembrar
                      ? "bg-purple-600 border-purple-600 text-white"
                      : "border-border bg-background"
                  }`}
                >
                  {step.simulacao.lembrar && <span className="text-[9px] font-bold">✓</span>}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Lembrar meus dados neste aparelho (opcional)
                </span>
              </div>

              <div
                className={`transition-all rounded-lg ${
                  isFoco("enviar_confirmacao")
                    ? "ring-2 ring-purple-500 scale-105"
                    : ""
                }`}
              >
                <div className="h-8 px-4 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                  <SendHorizontal className="size-3" />
                  Enviar chamado
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Destaque flutuante (Tooltip orientativo) */}
      <div className="shrink-0 px-3 py-2 bg-background/90 border-t border-border/60 flex items-center justify-between text-xs backdrop-blur-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px] shrink-0">
            Etapa {step.id}/9
          </span>
          <span className="font-semibold text-foreground truncate">
            {step.titulo}
          </span>
        </div>

        {onAdvanceStep && step.id < 9 && (
          <button
            type="button"
            onClick={onAdvanceStep}
            className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline shrink-0 ml-2"
          >
            Entendi, próximo passo →
          </button>
        )}
      </div>
    </div>
  );
}
