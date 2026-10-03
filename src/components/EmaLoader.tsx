import { useMemo } from "react";
import emaImg from "@/assets/ema-loader.png";
import { useStore } from "@/lib/store-context";
import type { VelocidadeAnimacao } from "@/lib/types";

export interface EmaLoaderProps {
  /** Texto personalizado para exibição. Se omitido, usa a configuração salva nas regras. */
  texto?: string;
  /** Velocidade da corrida. Se omitida, usa a velocidade configurada nas regras. */
  velocidade?: VelocidadeAnimacao;
  /** Se a animação da ema está ativa. Se false, exibe o indicador minimalista alternativo. */
  ativo?: boolean;
  /** Se deve ser renderizado como overlay fixo com desfoque cobrindo a tela. */
  overlay?: boolean;
  /** Classes CSS adicionais para o container. */
  className?: string;
  /** Tamanho da animação. */
  size?: "sm" | "md" | "lg";
}

export function EmaLoader({
  texto,
  velocidade,
  ativo,
  overlay = false,
  className = "",
  size = "md",
}: EmaLoaderProps) {
  const { regras } = useStore();
  const config = regras.animacaoCarregamento;

  const estaAtivo = ativo ?? config?.ativo ?? true;
  const vel = velocidade ?? config?.velocidade ?? "normal";
  const textoExibicao = texto ?? config?.texto ?? "Carregando...";

  const velClass = useMemo(() => {
    switch (vel) {
      case "lenta":
        return "ema-vel-lenta";
      case "rapida":
        return "ema-vel-rapida";
      case "normal":
      default:
        return "ema-vel-normal";
    }
  }, [vel]);

  const dimensaoEma = useMemo(() => {
    switch (size) {
      case "sm":
        return "w-16 h-16";
      case "lg":
        return "w-32 h-32 sm:w-40 sm:h-40";
      case "md":
      default:
        return "w-24 h-24 sm:w-28 sm:h-28";
    }
  }, [size]);

  const content = estaAtivo ? (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center select-none"
    >
      {/* Cenário da Corrida da Ema */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Linhas de vento de velocidade atrás da ema */}
        <div className="absolute -left-6 top-1/3 flex flex-col gap-1.5 pointer-events-none opacity-70">
          <span
            className={`block h-0.5 w-6 rounded-full bg-g-blue/70 ema-anim-vento ${velClass}`}
            style={{ animationDelay: "0.05s" }}
          />
          <span
            className={`block h-0.5 w-8 rounded-full bg-g-blue/80 ema-anim-vento ${velClass}`}
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-cyan-500/70 ema-anim-vento ${velClass}`}
            style={{ animationDelay: "0.12s" }}
          />
        </div>

        {/* Nuvem de poeira nas patas */}
        <div className="absolute -left-3 bottom-2 pointer-events-none opacity-80">
          <span
            className={`block size-2 rounded-full bg-g-blue/30 ema-anim-poeira ${velClass}`}
            style={{ animationDelay: "0.1s" }}
          />
          <span
            className={`block size-1.5 rounded-full bg-g-blue/20 ema-anim-poeira ${velClass}`}
            style={{ animationDelay: "0.25s" }}
          />
        </div>

        {/* Imagem da Ema com balanço de corrida */}
        <div className={`relative ${dimensaoEma}`}>
          <img
            src={emaImg}
            alt="Ema correndo"
            className={`w-full h-full object-contain drop-shadow-md ema-anim-correndo ${velClass}`}
            draggable={false}
          />
        </div>

        {/* Sombra dinâmica abaixo das patas */}
        <div
          className={`-mt-1.5 h-2 w-16 sm:w-20 rounded-full bg-black/25 dark:bg-black/40 blur-[1px] ema-anim-sombra ${velClass}`}
        />

        {/* Pista / Linha de chão veloz */}
        <div className="mt-1 h-0.5 w-28 sm:w-36 overflow-hidden rounded-full bg-muted/60 relative">
          <div
            className={`absolute inset-y-0 w-48 bg-gradient-to-r from-transparent via-g-blue/60 to-transparent ema-anim-pista ${velClass}`}
          />
        </div>
      </div>

      {/* Rótulo de texto com efeito pulsante suave */}
      <div className="mt-3.5 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-g-blue animate-ping" />
        <p className="text-xs sm:text-sm font-extrabold tracking-tight text-foreground/90">
          {textoExibicao}
        </p>
      </div>
      <span className="sr-only">Aguarde, a operação está em andamento.</span>
    </div>
  ) : (
    /* Indicador alternativo simples quando a ema estiver desligada */
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-3 p-4 select-none"
    >
      <div className="relative flex items-center justify-center">
        <div className="size-8 sm:size-10 rounded-full border-3 border-muted border-t-g-blue animate-spin" />
        <span className="absolute size-2 rounded-full bg-g-blue" />
      </div>
      <p className="text-xs sm:text-sm font-bold text-muted-foreground tracking-tight">
        {textoExibicao}
      </p>
      <span className="sr-only">Aguarde, carregando...</span>
    </div>
  );

  if (overlay) {
    return (
      <aside
        aria-label="Carregando"
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all animate-in fade-in duration-200 ${className}`}
      >
        <div className="rounded-3xl border-2 border-border/80 bg-card/95 px-7 py-6 shadow-2xl backdrop-blur-md">
          {content}
        </div>
      </aside>
    );
  }

  return <div className={`inline-flex items-center justify-center ${className}`}>{content}</div>;
}
