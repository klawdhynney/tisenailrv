import { useMemo, useState } from "react";
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
  /** Se deve ser renderizado como overlay cobrindo a tela (fundo sutil e sem caixa/card). */
  overlay?: boolean;
  /** Classes CSS adicionais para o container. */
  className?: string;
  /** Tamanho da animação. */
  size?: "sm" | "md" | "lg";
  /** URL de um GIF alternativo (sobrescreve a ema). */
  gifUrl?: string | null;
}

export function EmaLoader({
  texto,
  velocidade,
  ativo,
  overlay = false,
  className = "",
  size = "md",
  gifUrl,
}: EmaLoaderProps) {
  const { regras } = useStore();
  const config = regras.animacaoCarregamento;

  const estaAtivo = ativo ?? config?.ativo ?? true;
  const vel = velocidade ?? config?.velocidade ?? "normal";
  const textoExibicao = texto ?? config?.texto ?? "Carregando...";
  const urlGifAtivo = gifUrl ?? config?.gifUrl ?? null;

  const [gifFalhou, setGifFalhou] = useState(false);

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

  const dimensaoContainer = useMemo(() => {
    switch (size) {
      case "sm":
        return "w-20 h-20";
      case "lg":
        return "w-40 h-40 sm:w-48 sm:h-48";
      case "md":
      default:
        return "w-28 h-28 sm:w-32 sm:h-32";
    }
  }, [size]);

  // Se houver GIF configurado e válido, exibe o GIF no lugar da ema
  const usarGif = Boolean(urlGifAtivo && !gifFalhou);

  const content = estaAtivo ? (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center select-none bg-transparent"
    >
      {/* Cenário da Corrida da Ema (100% Transparente, sem caixa ou borda) */}
      <div className="relative flex flex-col items-center justify-center bg-transparent">
        {/* Linhas de vento de velocidade atrás da ema */}
        <div className="absolute -left-6 top-1/4 flex flex-col gap-1.5 pointer-events-none opacity-70">
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

        {/* Nuvem de poeira levantando atrás das patas */}
        <div className="absolute -left-4 bottom-2.5 pointer-events-none opacity-80">
          <span
            className={`block size-2 rounded-full bg-g-blue/30 ema-anim-poeira ${velClass}`}
            style={{ animationDelay: "0.1s" }}
          />
          <span
            className={`block size-1.5 rounded-full bg-g-blue/20 ema-anim-poeira ${velClass}`}
            style={{ animationDelay: "0.25s" }}
          />
        </div>

        {/* Imagem da Ema ou GIF personalizado */}
        <div className={`relative ${dimensaoContainer} flex items-center justify-center bg-transparent`}>
          {usarGif ? (
            <img
              src={urlGifAtivo!}
              alt="Animação de carregamento"
              className="w-full h-full object-contain bg-transparent"
              onError={() => setGifFalhou(true)}
              draggable={false}
            />
          ) : (
            <div className={`relative w-full h-full ema-anim-correndo ${velClass} bg-transparent`}>
              <img
                src={emaImg}
                alt="Ema correndo"
                className="w-full h-full object-contain drop-shadow-md bg-transparent"
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Sombra dinâmica abaixo das patas */}
        <div
          className={`-mt-1.5 h-2 w-16 sm:w-20 rounded-full bg-black/25 dark:bg-black/40 blur-[1px] ema-anim-sombra ${velClass}`}
        />

        {/* Pista / Linha de chão veloz */}
        <div className="mt-1 h-0.5 w-28 sm:w-36 overflow-hidden rounded-full bg-muted/40 relative">
          <div
            className={`absolute inset-y-0 w-48 bg-gradient-to-r from-transparent via-g-blue/60 to-transparent ema-anim-pista ${velClass}`}
          />
        </div>
      </div>

      {/* Rótulo de texto discreto com ponto pulsante */}
      <div className="mt-3.5 flex items-center gap-1.5 bg-transparent">
        <span className="size-1.5 rounded-full bg-g-blue animate-ping" />
        <p className="text-xs sm:text-sm font-extrabold tracking-tight text-foreground/90">
          {textoExibicao}
        </p>
      </div>
      <span className="sr-only">Aguarde, a operação está em andamento.</span>
    </div>
  ) : (
    /* Indicador alternativo simples quando a animação da ema estiver desligada */
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-3 p-4 select-none bg-transparent"
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
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-200 pointer-events-auto select-none ${className}`}
      >
        {/* Renderiza o conteúdo DIRETAMENTE na tela, 100% transparente, sem cartão ou borda */}
        {content}
      </aside>
    );
  }

  return <div className={`inline-flex items-center justify-center bg-transparent ${className}`}>{content}</div>;
}
