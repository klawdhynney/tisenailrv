import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  Clock,
  ShieldCheck,
  Subtitles,
  X,
} from "lucide-react";
import {
  TUTORIAL_PASSOS,
  TOTAL_DURACAO_SEGUNDOS,
  AUDIO_BASE_PATH,
  AUDIO_TUTORIAL_VERSAO,
  type TutorialStep,
} from "@/content/tutorial-abrir-chamado";
import { aplicarPronuncia } from "@/content/tutorial-pronuncia";
import { TutorialFormSimulation } from "./TutorialFormSimulation";
import { TutorialControls } from "./TutorialControls";
import { TutorialTranscript } from "./TutorialTranscript";

interface TutorialPlayerProps {
  autoStart?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

export function TutorialPlayer({
  autoStart = false,
  isModal = false,
  onClose,
}: TutorialPlayerProps) {
  // Identificador de instância único para evitar concorrência de áudio
  const playerId = useRef("tut_" + Math.random().toString(36).slice(2, 8)).current;

  const [stepIndex, setStepIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(autoStart);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1); // 1x é agora o novo padrão rápido nativo
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [usingFallbackSpeech, setUsingFallbackSpeech] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invalida preferência de velocidade antiga salva em versões anteriores
  useEffect(() => {
    try {
      localStorage.removeItem("tutorial_speed");
    } catch {}
  }, []);

  // Se autoStart for solicitado na montagem
  useEffect(() => {
    if (autoStart) {
      setHasStarted(true);
      setIsPlaying(true);
      setIsCompleted(false);
    }
  }, [autoStart]);

  const currentStep: TutorialStep = TUTORIAL_PASSOS[stepIndex] ?? TUTORIAL_PASSOS[0];

  // Cálculo de progresso percentual baseado nos tempos acumulados dos passos acelerados
  const elapsedSeconds = TUTORIAL_PASSOS.slice(0, stepIndex).reduce((acc, s) => acc + s.duracaoSegundos, 0);
  const progressPct = Math.min(100, Math.max(0, ((elapsedSeconds + (isPlaying ? 1 : 0)) / TOTAL_DURACAO_SEGUNDOS) * 100));

  // Função para avançar passo
  const handleNextStep = useCallback(() => {
    if (stepIndex < TUTORIAL_PASSOS.length - 1) {
      setStepIndex((prev) => prev + 1);
      setIsCompleted(false);
    } else {
      setIsPlaying(false);
      setIsCompleted(true);
    }
  }, [stepIndex]);

  // Função para voltar passo
  const handlePrevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      setIsCompleted(false);
    }
  }, [stepIndex]);

  // Função para pular direto para um passo
  const handleSelectStep = useCallback((index: number) => {
    if (index >= 0 && index < TUTORIAL_PASSOS.length) {
      setStepIndex(index);
      setIsCompleted(false);
    }
  }, []);

  // Reiniciar do passo 1
  const handleRestart = useCallback(() => {
    setStepIndex(0);
    setIsCompleted(false);
    setIsPlaying(true);
  }, []);

  // Iniciar reprodução (clique na capa)
  const handleStartPlay = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setIsCompleted(false);
  };

  // Alternar play/pause
  const handlePlayPause = () => {
    if (!hasStarted) {
      handleStartPlay();
      return;
    }
    if (isCompleted) {
      handleRestart();
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  // Parar narração por fallback SpeechSynthesis se ativa
  const stopSpeechSynthesis = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Controle de concorrência: apenas um tutorial toca áudio por vez
  useEffect(() => {
    const handlePauseOthers = (e: Event) => {
      const custom = e as CustomEvent<{ senderId: string }>;
      if (custom.detail?.senderId !== playerId) {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
        stopSpeechSynthesis();
      }
    };

    window.addEventListener("tutorial:pause-others", handlePauseOthers);
    return () => {
      window.removeEventListener("tutorial:pause-others", handlePauseOthers);
    };
  }, [playerId, stopSpeechSynthesis]);

  // Notificar outros players para pausar quando este começar a tocar
  useEffect(() => {
    if (isPlaying) {
      window.dispatchEvent(
        new CustomEvent("tutorial:pause-others", { detail: { senderId: playerId } })
      );
    }
  }, [isPlaying, playerId]);

  // Executar áudio acelerado ou fallback quando stepIndex ou isPlaying mudar
  useEffect(() => {
    if (!hasStarted) return;

    // Se estiver pausado
    if (!isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSpeechSynthesis();
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    // Se a demonstração foi concluída, não toca som
    if (isCompleted) {
      return;
    }

    // Caminho com versionamento v2 para evitar cache de áudios antigos
    const audioSrc = `${AUDIO_BASE_PATH}/step-${currentStep.id}.mp3?v=${AUDIO_TUTORIAL_VERSAO}`;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = audioSrc;
    audio.playbackRate = playbackRate;
    audio.muted = isMuted;

    // Quando o áudio do passo termina, avança automaticamente
    audio.onended = () => {
      handleNextStep();
    };

    // Caso ocorra erro de carregamento do MP3, ativa o fallback inteligente Web Speech API
    audio.onerror = () => {
      console.warn(
        `[Tutorial] Áudio v2 step-${currentStep.id}.mp3 não disponível. Ativando fallback SpeechSynthesis pt-BR.`
      );
      setUsingFallbackSpeech(true);
      playSpeechSynthesisFallback();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setUsingFallbackSpeech(false);
        })
        .catch((err) => {
          console.warn("[Tutorial] Reprodução de áudio bloqueada ou com falha. Tentando síntese do navegador:", err);
          setUsingFallbackSpeech(true);
          playSpeechSynthesisFallback();
        });
    }

    // Função interna para Web Speech API com taxa equivalente rápida
    function playSpeechSynthesisFallback() {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        const durationMs = (currentStep.duracaoSegundos * 1000) / playbackRate;
        stepTimerRef.current = setTimeout(handleNextStep, durationMs);
        return;
      }

      window.speechSynthesis.cancel();
      // Aplica a pronúncia fonética também no fallback do navegador
      const textoParaFalar = currentStep.fala || aplicarPronuncia(currentStep.textoLeitura);
      const utterance = new SpeechSynthesisUtterance(textoParaFalar);
      utterance.lang = "pt-BR";
      // Ritmo mais ágil equivalente ao novo padrão acelerado
      utterance.rate = playbackRate * 1.35;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find((v) => v.lang === "pt-BR" || v.lang.startsWith("pt"));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onend = () => {
        handleNextStep();
      };

      utterance.onerror = () => {
        const durationMs = (currentStep.duracaoSegundos * 1000) / playbackRate;
        stepTimerRef.current = setTimeout(handleNextStep, durationMs);
      };

      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
      }
      stopSpeechSynthesis();
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [hasStarted, isPlaying, stepIndex, currentStep, playbackRate, isMuted, isCompleted, handleNextStep, stopSpeechSynthesis]);

  // Atualizar playbackRate no áudio se mudar enquanto toca
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Atualizar mudo no áudio se mudar
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Limpeza de áudio ao trocar de aba ou desmontar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
        stopSpeechSynthesis();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      stopSpeechSynthesis();
    };
  }, [stopSpeechSynthesis]);

  // Teclado para acessibilidade (Espaço, setas, M, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextStep();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, handleNextStep, handlePrevStep]);

  // Controle de Tela Cheia
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Ação para voltar ao formulário real e focar primeiro campo
  const handleScrollToRealForm = () => {
    if (onClose) {
      onClose();
    }
    setTimeout(() => {
      const solicitanteInput =
        document.getElementById("solicitante") || document.querySelector("input[name='solicitante']");
      if (solicitanteInput) {
        solicitanteInput.scrollIntoView({ behavior: "smooth", block: "center" });
        (solicitanteInput as HTMLElement).focus();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 150);
  };

  return (
    <section
      aria-label="Demonstração interativa de como abrir um chamado"
      className={`w-full ${isModal ? "space-y-3" : "space-y-4 my-8"}`}
    >
      {/* Cabeçalho da Seção (apenas se não estiver dentro de modal) */}
      {!isModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Veja como abrir um chamado
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Tutorial interativo ágil em áudio pt-BR e demonstração animada em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Clock className="size-3.5 text-purple-500" />
            <span>Duração: ~50 segundos</span>
          </div>
        </div>
      )}

      {/* Player Principal com proporção 16:9 preservada para evitar Layout Shift */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-md flex flex-col ${
          isFullscreen ? "h-screen w-screen rounded-none border-none z-50 bg-background" : ""
        }`}
      >
        {/* Quadro 16:9 */}
        <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          {!hasStarted ? (
            /* CAPA DE APRESENTAÇÃO */
            <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-8 bg-gradient-to-br from-purple-950/80 via-slate-900 to-indigo-950/80 text-white select-none">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-semibold backdrop-blur-xs">
                  <Sparkles className="size-3.5 text-purple-300" />
                  Demonstração Rápida com Áudio pt-BR
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  9 passos · 50s
                </span>
              </div>

              <div className="my-auto text-center max-w-lg mx-auto space-y-2.5">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-xs">
                  Como abrir um chamado passo a passo
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow-xs">
                  Aprenda em menos de 1 minuto: identificação protegida, setor, descrição com apoio de IA e acompanhamento.
                </p>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleStartPlay}
                    className="group inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label="Assistir demonstração"
                  >
                    <Play className="size-5 fill-white group-hover:scale-110 transition-transform" />
                    <span>Assistir demonstração</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/10 gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="size-3.5 text-emerald-400" />
                    Pronúncia nativa "tê í"
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-blue-400" />
                    Dados de teste protegidos
                  </span>
                </div>
                <span className="text-slate-400 hidden sm:inline">
                  Clique no botão para iniciar
                </span>
              </div>
            </div>
          ) : isCompleted ? (
            /* TELA FINAL DE CONCLUSÃO */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card text-foreground space-y-4 animate-in fade-in zoom-in-95">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="size-8" />
              </div>

              <div className="max-w-md space-y-1">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Pronto! Você já sabe como abrir seu chamado
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Agora é com você. Preencha o formulário com seus dados reais para suporte imediato da equipe técnica da Central de TI.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  Assistir novamente
                </button>

                <button
                  type="button"
                  onClick={handleScrollToRealForm}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Preencher meu chamado</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* SIMULAÇÃO EM TEMPO REAL */
            <div className="relative w-full h-full">
              <TutorialFormSimulation
                step={currentStep}
                isPlaying={isPlaying}
                onAdvanceStep={handleNextStep}
              />

              {/* Faixa de Legenda Sincronizada (Acessibilidade) */}
              {showSubtitles && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute bottom-12 left-4 right-4 z-20 flex justify-center pointer-events-none"
                >
                  <div className="px-4 py-1.5 rounded-xl bg-black/85 text-white text-xs sm:text-sm font-medium text-center shadow-lg backdrop-blur-xs max-w-xl border border-white/10 leading-snug animate-in fade-in duration-150">
                    {currentStep.legenda}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de Controles do Player */}
        <TutorialControls
          steps={TUTORIAL_PASSOS}
          stepIndex={stepIndex}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
          onSelectStep={handleSelectStep}
          onRestart={handleRestart}
          playbackRate={playbackRate}
          onChangePlaybackRate={setPlaybackRate}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          showSubtitles={showSubtitles}
          onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          progressPct={progressPct}
        />
      </div>

      {/* Bloco recolhível: Ler o passo a passo em texto (apenas na versão completa de rodapé) */}
      {!isModal && (
        <TutorialTranscript
          steps={TUTORIAL_PASSOS}
          currentStepIndex={stepIndex}
          onSelectStep={handleSelectStep}
        />
      )}
    </section>
  );
}
export default TutorialPlayer;
