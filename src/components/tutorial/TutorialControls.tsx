import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  Maximize2,
  Minimize2,
  Gauge,
} from "lucide-react";
import type { TutorialStep } from "@/content/tutorial-abrir-chamado";

interface TutorialControlsProps {
  steps: TutorialStep[];
  stepIndex: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSelectStep: (index: number) => void;
  onRestart: () => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showSubtitles: boolean;
  onToggleSubtitles: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  progressPct: number;
}

export function TutorialControls({
  steps,
  stepIndex,
  isPlaying,
  onPlayPause,
  onPrevStep,
  onNextStep,
  onSelectStep,
  onRestart,
  playbackRate,
  onChangePlaybackRate,
  isMuted,
  onToggleMute,
  showSubtitles,
  onToggleSubtitles,
  isFullscreen,
  onToggleFullscreen,
  progressPct,
}: TutorialControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const currentStep = steps[stepIndex] ?? steps[0];

  const SPEEDS = [0.75, 1, 1.25, 1.5];

  return (
    <div className="w-full bg-background/95 border-t border-border/80 p-2 sm:p-3 space-y-2 backdrop-blur-md">
      {/* Barra de progresso interativa com marcadores de etapas */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Passo {stepIndex + 1} de {steps.length}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold truncate max-w-[200px] sm:max-w-xs">
              {currentStep.tituloCurto}
            </span>
          </div>
          <span className="font-mono text-[10px]">
            {Math.round(progressPct)}% concluído
          </span>
        </div>

        {/* Linha de progresso e botões clicáveis de passos */}
        <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden cursor-pointer flex items-center">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Indicadores clicáveis para cada passo */}
        <div className="flex items-center justify-between pt-1 gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {steps.map((st, idx) => {
            const isCurrent = idx === stepIndex;
            const isCompleted = idx < stepIndex;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStep(idx)}
                className={`flex-1 min-w-[28px] py-1 px-1 rounded-md text-[10px] font-semibold text-center transition-all truncate ${
                  isCurrent
                    ? "bg-purple-600 text-white shadow-2xs scale-105"
                    : isCompleted
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
                title={`Pular para ${st.titulo}`}
              >
                <span className="hidden sm:inline">{st.tituloCurto}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de botões de controle */}
      <div className="flex items-center justify-between pt-1">
        {/* Esquerda: Play/Pause, Voltar, Avançar, Reiniciar */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onPlayPause}
            className="size-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all shadow-xs active:scale-95"
            title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
            aria-label={isPlaying ? "Pausar tutorial" : "Reproduzir tutorial"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-white ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onPrevStep}
            disabled={stepIndex === 0}
            className="size-8 rounded-lg hover:bg-muted text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Passo anterior (Seta esquerda)"
            aria-label="Passo anterior"
          >
            <SkipBack className="size-4" />
          </button>

          <button
            type="button"
            onClick={onNextStep}
            disabled={stepIndex === steps.length - 1}
            className="size-8 rounded-lg hover:bg-muted text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Próximo passo (Seta direita)"
            aria-label="Próximo passo"
          >
            <SkipForward className="size-4" />
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title="Reiniciar do começo"
            aria-label="Reiniciar tutorial"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>

        {/* Direita: Velocidade, Legendas, Mudo, Tela Cheia */}
        <div className="flex items-center gap-1 sm:gap-1.5 relative">
          {/* Menu de velocidade */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="h-8 px-2 rounded-lg hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1 transition-colors border border-border/40"
              title="Velocidade da narração"
              aria-label={`Velocidade atual: ${playbackRate}x`}
            >
              <Gauge className="size-3 text-muted-foreground" />
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div
                className="absolute bottom-full right-0 mb-1 z-30 w-24 rounded-xl border border-border bg-popover p-1 shadow-lg backdrop-blur-md animate-in fade-in"
                onMouseLeave={() => setShowSpeedMenu(false)}
              >
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      onChangePlaybackRate(sp);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 text-xs rounded-md transition-colors ${
                      playbackRate === sp
                        ? "bg-purple-600 text-white font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {sp}x {sp === 1 ? "(Normal)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mudo / Som */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
              isMuted
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                : "hover:bg-muted text-foreground"
            }`}
            title={isMuted ? "Ativar som (M)" : "Silenciar áudio (M)"}
            aria-label={isMuted ? "Ativar áudio" : "Silenciar áudio"}
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          {/* Legendas Toggle */}
          <button
            type="button"
            onClick={onToggleSubtitles}
            className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
              showSubtitles
                ? "bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title={showSubtitles ? "Ocultar legendas" : "Exibir legendas"}
            aria-label={showSubtitles ? "Legendas ativadas" : "Legendas desativadas"}
          >
            <Subtitles className="size-4" />
          </button>

          {/* Tela cheia */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="size-8 rounded-lg hover:bg-muted text-foreground flex items-center justify-center transition-colors"
            title={isFullscreen ? "Sair da tela cheia (F / Esc)" : "Modo tela cheia (F)"}
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
