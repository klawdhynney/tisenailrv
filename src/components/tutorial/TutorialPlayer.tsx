import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Subtitles,
  ExternalLink,
} from "lucide-react";
import { TUTORIAL_PASSOS, TOTAL_DURACAO_SEGUNDOS, type TutorialStep } from "@/content/tutorial-abrir-chamado";
import { TutorialFormSimulation } from "./TutorialFormSimulation";
import { TutorialControls } from "./TutorialControls";
import { TutorialTranscript } from "./TutorialTranscript";

export function TutorialPlayer() {
  const [stepIndex, setStepIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [usingFallbackSpeech, setUsingFallbackSpeech] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep: TutorialStep = TUTORIAL_PASSOS[stepIndex] ?? TUTORIAL_PASSOS[0];

  // Cálculo de progresso percentual baseado nos tempos acumulados dos passos
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

  // Executar áudio ou fallback quando stepIndex ou isPlaying mudar
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

    // Caminho do áudio gravado em public/
    const audioSrc = `/audio/tutorial/step-${currentStep.id}.mp3`;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = audioSrc;
    audio.playbackRate = playbackRate;
    audio.muted = isMuted;

    let isAudioPlaying = false;

    // Quando o áudio do passo termina, avança automaticamente
    audio.onended = () => {
      handleNextStep();
    };

    // Caso ocorra erro de carregamento do MP3, ativa o fallback inteligente Web Speech API
    audio.onerror = () => {
      console.warn(`[Tutorial] Áudio pré-gerado step-${currentStep.id}.mp3 não disponível. Usando fallback SpeechSynthesis.`);
      setUsingFallbackSpeech(true);
      playSpeechSynthesisFallback();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isAudioPlaying = true;
          setUsingFallbackSpeech(false);
        })
        .catch((err) => {
          console.warn("[Tutorial] Reprodução de áudio bloqueada ou com falha. Tentando síntese do navegador:", err);
          setUsingFallbackSpeech(true);
          playSpeechSynthesisFallback();
        });
    }

    // Função interna para Web Speech API
    function playSpeechSynthesisFallback() {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        // Fallback do fallback: usa timer de duração do passo
        const durationMs = (currentStep.duracaoSegundos * 1000) / playbackRate;
        stepTimerRef.current = setTimeout(handleNextStep, durationMs);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentStep.narracao);
      utterance.lang = "pt-BR";
      utterance.rate = playbackRate;

      // Tenta selecionar uma voz pt-BR do aparelho
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

  // Limpeza de áudio ao trocar de aba ou sair da rota
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

  // Teclado para acessibilidade (Espaço, setas, M, F, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o usuário estiver digitando em campos de input reais fora do player
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
    const solicitanteInput = document.getElementById("solicitante") || document.querySelector("input[name='solicitante']");
    if (solicitanteInput) {
      solicitanteInput.scrollIntoView({ behavior: "smooth", block: "center" });
      (solicitanteInput as HTMLElement).focus();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section
      aria-label="Demonstração interativa de como abrir um chamado"
      className="w-full space-y-4 my-8"
    >
      {/* Cabeçalho da Seção */}
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
            Tutorial passo a passo em áudio e vídeo animado para orientar você no preenchimento correto.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Clock className="size-3.5 text-purple-500" />
          <span>Duração: ~1 min 15 seg</span>
        </div>
      </div>

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
            <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/80 text-white select-none">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-semibold backdrop-blur-xs">
                  <Sparkles className="size-3.5 text-purple-300" />
                  Demonstração Interativa com Áudio pt-BR
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  9 passos · 73s
                </span>
              </div>

              <div className="my-auto text-center max-w-lg mx-auto space-y-3">
                <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                  Como abrir um chamado passo a passo
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow-xs">
                  Veja a demonstração animada em tempo real com narração em português: aprenda a conferir seus dados, escolher setor, descrever o problema e usar recursos de IA.
                </p>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleStartPlay}
                    className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
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
                    Sem jargão técnico
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-blue-400" />
                    Dados de teste protegidos
                  </span>
                </div>
                <span className="text-slate-400">
                  Clique no botão acima para iniciar com som
                </span>
              </div>
            </div>
          ) : isCompleted ? (
            /* TELA FINAL DE CONCLUSÃO */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card text-foreground space-y-4 animate-in fade-in zoom-in-95">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="size-10" />
              </div>

              <div className="max-w-md space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Pronto! Você já sabe como abrir seu chamado
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Agora é com você. Preencha o formulário acima com seus dados reais para receber suporte rápido da nossa equipe técnica.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  Assistir novamente
                </button>

                <button
                  type="button"
                  onClick={handleScrollToRealForm}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
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
                  <div className="px-4 py-2 rounded-xl bg-black/85 text-white text-xs sm:text-sm font-medium text-center shadow-lg backdrop-blur-xs max-w-xl border border-white/10 leading-snug animate-in fade-in duration-150">
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

      {/* Bloco recolhível: Ler o passo a passo em texto */}
      <TutorialTranscript
        steps={TUTORIAL_PASSOS}
        currentStepIndex={stepIndex}
        onSelectStep={handleSelectStep}
      />
    </section>
  );
}
export default TutorialPlayer;
