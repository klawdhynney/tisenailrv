/**
 * Gerenciador Singleton de Áudio do Tutorial Interativo
 * 
 * Centraliza 100% da reprodução de som do tutorial em uma única instância compartilhada
 * entre o player da janela (modal) e o player da seção de rodapé.
 * 
 * Garante:
 * 1. Um único motor de áudio ativo no navegador por vez (nunca dois elementos Audio ou speechSynthesis em paralelo).
 * 2. Voz padrão oficial: MP3 neural acelerado (voz feminina pt-BR).
 * 3. Fallback inteligente: Web Speech API só é chamado se o carregamento/reprodução do MP3 falhar de fato
 *    (nunca em abortos de pause, troca de passo ou React StrictMode).
 * 4. Isolamento estrito entre Modal e Rodapé: ao tocar em um, o outro é pausado e liberado.
 */

export interface TutorialAudioEvent {
  type: "play" | "pause" | "stop" | "ended" | "fallback" | "owner_change";
  ownerId: string | null;
  stepId: number | null;
}

export interface PlayStepOptions {
  ownerId: string;
  stepId: number;
  audioSrc: string;
  playbackRate: number;
  isMuted: boolean;
  fallbackText: string;
  fallbackDurationMs: number;
  onEnded: () => void;
  onFallbackChange?: (usingFallback: boolean) => void;
}

type AudioSubscriber = (event: TutorialAudioEvent) => void;

class TutorialAudioManager {
  private static instance: TutorialAudioManager | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentOwnerId: string | null = null;
  private currentStepId: number | null = null;
  private currentToken: symbol | null = null;
  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private speechTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isFallbackSpeaking = false;
  private subscribers = new Set<AudioSubscriber>();

  private constructor() {
    if (typeof window !== "undefined") {
      // Pré-carrega vozes do SpeechSynthesis se suportado
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Vozes carregadas
        };
      }
    }
  }

  public static getInstance(): TutorialAudioManager {
    if (!TutorialAudioManager.instance) {
      TutorialAudioManager.instance = new TutorialAudioManager();
    }
    return TutorialAudioManager.instance;
  }

  /**
   * Permite que componentes (ex: players modal/rodapé) se inscrevam para
   * sincronizar seus estados locais quando outro player assumir o controle.
   */
  public subscribe(callback: AudioSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(event: TutorialAudioEvent) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("[TutorialAudio] Erro no subscriber:", err);
      }
    });
  }

  public getCurrentOwner(): string | null {
    return this.currentOwnerId;
  }

  public getCurrentStep(): number | null {
    return this.currentStepId;
  }

  public isUsingFallback(): boolean {
    return this.isFallbackSpeaking;
  }

  /**
   * Para e limpa imediatamente qualquer som em andamento (HTML5 Audio e SpeechSynthesis).
   */
  public stopAll(reason = "stop"): void {
    // Invalida o token atual para ignorar qualquer callback assíncrono pendente
    this.currentToken = null;

    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    if (this.speechTimeoutId) {
      clearTimeout(this.speechTimeoutId);
      this.speechTimeoutId = null;
    }

    // 1. Pausa e reseta elemento HTML5 Audio
    if (this.audioElement) {
      this.audioElement.onended = null;
      this.audioElement.onerror = null;
      this.audioElement.oncanplay = null;
      this.audioElement.onplaying = null;
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
      // Remove o src para cancelar requisições de rede pendentes
      this.audioElement.removeAttribute("src");
      try {
        this.audioElement.load();
      } catch {}
    }

    // 2. Cancela qualquer fala da Web Speech API imediatamente
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isFallbackSpeaking = false;

    this.notify({
      type: "stop",
      ownerId: this.currentOwnerId,
      stepId: this.currentStepId,
    });
  }

  /**
   * Toca o áudio oficial de um passo com controle estrito de concorrência e fallback isolado.
   */
  public playStep(options: PlayStepOptions): void {
    // 1. Para absolutamente qualquer som anterior
    this.stopAll(`playStep_${options.stepId}`);

    const previousOwner = this.currentOwnerId;
    this.currentOwnerId = options.ownerId;
    this.currentStepId = options.stepId;

    if (previousOwner && previousOwner !== options.ownerId) {
      this.notify({
        type: "owner_change",
        ownerId: options.ownerId,
        stepId: options.stepId,
      });
    }

    const token = Symbol(`step_${options.stepId}`);
    this.currentToken = token;

    options.onFallbackChange?.(false);

    // 2. Garante elemento Audio único do singleton
    if (!this.audioElement && typeof Audio !== "undefined") {
      this.audioElement = new Audio();
    }

    if (!this.audioElement) {
      // Ambiente sem suporte a HTML5 Audio -> fallback
      this.triggerSpeechFallback(token, options);
      return;
    }

    const audio = this.audioElement;
    audio.preload = "auto";
    audio.muted = options.isMuted;
    audio.playbackRate = options.playbackRate;
    audio.src = options.audioSrc;

    // Quando o áudio do passo terminar normalmente
    audio.onended = () => {
      if (this.currentToken !== token) return;
      this.stopAll("audio_ended");
      options.onEnded();
    };

    // Erro real de carregamento do MP3 (ex: offline, arquivo corrompido, 404)
    audio.onerror = () => {
      if (this.currentToken !== token) return;
      // Ignora erro se src foi limpo ou se o componente foi pausado
      if (!audio.src || audio.src === window.location.href) return;

      console.warn(
        `[TutorialAudio] Erro ao carregar MP3 do passo ${options.stepId}. Ativando fallback SpeechSynthesis pt-BR.`
      );
      this.triggerSpeechFallback(token, options);
    };

    // Timeout de segurança: se a rede travar por mais de 7 segundos sem bufferizar
    this.loadTimeoutId = setTimeout(() => {
      if (this.currentToken !== token) return;
      if (audio.paused && audio.readyState < 2) {
        console.warn(
          `[TutorialAudio] Timeout de carregamento do passo ${options.stepId}. Ativando fallback SpeechSynthesis.`
        );
        this.triggerSpeechFallback(token, options);
      }
    }, 7000);

    // Inicia a reprodução do áudio
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (this.currentToken !== token) {
            // Se o token mudou enquanto o play resolvia, pausa
            try {
              audio.pause();
            } catch {}
            return;
          }

          if (this.loadTimeoutId) {
            clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = null;
          }

          // Áudio oficial tocando perfeitamente: garante speechSynthesis 100% desligado
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
              window.speechSynthesis.cancel();
            } catch {}
          }
          this.isFallbackSpeaking = false;
          options.onFallbackChange?.(false);

          this.notify({
            type: "play",
            ownerId: this.currentOwnerId,
            stepId: this.currentStepId,
          });
        })
        .catch((err: any) => {
          // CRÍTICO: Se o erro for AbortError (chamada intencional de pause/limpeza/React StrictMode)
          // ou se o token já mudou, NÃO aciona o fallback!
          if (err?.name === "AbortError" || this.currentToken !== token) {
            return;
          }

          console.warn(
            `[TutorialAudio] Reprodução de áudio pré-gerado falhou para o passo ${options.stepId}:`,
            err?.message || err
          );
          this.triggerSpeechFallback(token, options);
        });
    }
  }

  /**
   * Aciona o fallback Web Speech API com voz única em pt-BR.
   * Só entra se o áudio MP3 comprovadamente falhar de verdade.
   */
  private triggerSpeechFallback(token: symbol, options: PlayStepOptions): void {
    if (this.currentToken !== token) return;

    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    // Libera o elemento de áudio antes de falar
    if (this.audioElement) {
      this.audioElement.onended = null;
      this.audioElement.onerror = null;
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
      this.audioElement.removeAttribute("src");
    }

    this.isFallbackSpeaking = true;
    options.onFallbackChange?.(true);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // Dispositivo sem Web Speech API: avança por tempo simulado
      const durationMs = Math.max(2500, (options.fallbackDurationMs * 1000) / options.playbackRate);
      this.speechTimeoutId = setTimeout(() => {
        if (this.currentToken !== token) return;
        this.stopAll("speech_timeout_ended");
        options.onEnded();
      }, durationMs);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(options.fallbackText);
      utterance.lang = "pt-BR";
      utterance.rate = Math.min(2, Math.max(0.6, options.playbackRate * 1.35));

      // Seleciona UMA única voz pt-BR do aparelho, priorizando voz feminina se disponível
      // para manter harmonia com a voz oficial pré-gerada do MP3
      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(
        (v) => v.lang === "pt-BR" || v.lang.toLowerCase().startsWith("pt")
      );

      const femaleVoice = ptVoices.find((v) => {
        const n = v.name.toLowerCase();
        return (
          n.includes("francisca") ||
          n.includes("luciana") ||
          n.includes("heloisa") ||
          n.includes("leticia") ||
          n.includes("maria") ||
          n.includes("female") ||
          n.includes("feminina") ||
          n.includes("google português")
        );
      });

      utterance.voice = femaleVoice || ptVoices[0] || null;

      utterance.onend = () => {
        if (this.currentToken !== token) return;
        this.stopAll("speech_ended");
        options.onEnded();
      };

      utterance.onerror = (e) => {
        if (this.currentToken !== token) return;
        console.warn("[TutorialAudio] Erro na síntese do navegador:", e);
        this.stopAll("speech_error");
        options.onEnded();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[TutorialAudio] Falha ao iniciar SpeechSynthesis:", err);
      const durationMs = Math.max(2500, (options.fallbackDurationMs * 1000) / options.playbackRate);
      this.speechTimeoutId = setTimeout(() => {
        if (this.currentToken !== token) return;
        this.stopAll("speech_catch_ended");
        options.onEnded();
      }, durationMs);
    }
  }

  /**
   * Pausa a reprodução atual se pertencer ao ownerId informado.
   */
  public pause(ownerId?: string): void {
    if (ownerId && this.currentOwnerId !== ownerId) return;

    this.currentToken = null;

    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    if (this.speechTimeoutId) {
      clearTimeout(this.speechTimeoutId);
      this.speechTimeoutId = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch {}
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isFallbackSpeaking = false;

    this.notify({
      type: "pause",
      ownerId: this.currentOwnerId,
      stepId: this.currentStepId,
    });
  }

  /**
   * Libera o dono atual (ex: ao fechar o modal ou desmontar um player).
   */
  public releaseOwner(ownerId: string): void {
    if (this.currentOwnerId === ownerId) {
      this.stopAll("release_owner");
      this.currentOwnerId = null;
      this.currentStepId = null;
    }
  }

  public setMuted(muted: boolean): void {
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }

  public setPlaybackRate(rate: number): void {
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }
}

export const tutorialAudio = TutorialAudioManager.getInstance();
export default tutorialAudio;
