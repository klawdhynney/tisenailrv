import React, { useEffect, useState } from "react";

interface LiquidGlassBackgroundProps {
  movimento?: boolean;
}

/**
 * Fundo Vivo Líquido (Liquid Mesh Background) - Estilo Apple Liquid Glass
 * Manchas de cor suaves e desfocadas (gradientes radiais) atrás do conteúdo,
 * com movimento super lento (transform 30 a 60s) acelerado por hardware (GPU).
 * Respeita preferências de redução de movimento e modo econômico.
 */
export function LiquidGlassBackground({ movimento = true }: LiquidGlassBackgroundProps) {
  const [ativa, setAtiva] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checar = () => {
      const root = document.documentElement;
      const paleta = root.getAttribute("data-paleta");
      setAtiva(paleta === "liquid-glass");
      setIsDark(root.classList.contains("dark"));
    };

    checar();

    const observer = new MutationObserver(checar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-paleta", "class", "data-modo-economico", "data-liquid-motion"],
    });

    return () => observer.disconnect();
  }, []);

  if (!ativa) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="liquid-bg-container fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Mancha 1: Superior Esquerda (Órbita / Azul-gelo) */}
      <div
        className={`liquid-blob liquid-blob-1 absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full blur-[80px] md:blur-[120px] transition-opacity duration-1000 ${
          isDark
            ? "bg-[radial-gradient(circle_at_center,rgba(28,37,65,0.85)_0%,rgba(11,19,43,0)_70%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(186,230,253,0.70)_0%,rgba(245,243,244,0)_70%)]"
        }`}
      />

      {/* Mancha 2: Superior Direita (Nebulosa / Azul Suave) */}
      <div
        className={`liquid-blob liquid-blob-2 absolute top-[5%] -right-[15%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full blur-[90px] md:blur-[130px] transition-opacity duration-1000 ${
          isDark
            ? "bg-[radial-gradient(circle_at_center,rgba(58,80,107,0.70)_0%,rgba(11,19,43,0)_70%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(199,223,247,0.65)_0%,rgba(245,243,244,0)_70%)]"
        }`}
      />

      {/* Mancha 3: Inferior Centro-Esquerda (Espaço Profundo / Luz de Gelo) */}
      <div
        className={`liquid-blob liquid-blob-3 absolute -bottom-[20%] left-[10%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full blur-[100px] md:blur-[140px] transition-opacity duration-1000 ${
          isDark
            ? "bg-[radial-gradient(circle_at_center,rgba(205,231,240,0.18)_0%,rgba(28,37,65,0.75)_50%,rgba(11,19,43,0)_80%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(224,242,254,0.80)_0%,rgba(255,255,255,0.50)_50%,rgba(245,243,244,0)_80%)]"
        }`}
      />

      {/* Mancha 4: Centro-Direita (Destaque Cyan Ice sutil) */}
      <div
        className={`liquid-blob liquid-blob-4 absolute top-[40%] right-[5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full blur-[70px] md:blur-[110px] transition-opacity duration-1000 ${
          isDark
            ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22)_0%,rgba(58,80,107,0)_65%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(165,243,252,0.55)_0%,rgba(2,132,199,0)_70%)]"
        }`}
      />

      {/* Filtro SVG Opcional de Refração por Deslocamento Líquido (Displacement) */}
      <svg
        className="sr-only"
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id="liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.02"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
