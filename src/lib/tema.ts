/**
 * Sistema Unificado de Temas e Paletas - TI SENAI LRV
 * Suporte a Modos Claro, Escuro e Automático (Zero FOUC)
 * Paletas: Padrão, Big Tech, Interstellar Inspired e Personalizada.
 * Acessibilidade: Contraste WCAG AA (>= 4.5:1 para texto normal, >= 3:1 para elementos de interface).
 */

export type ModoTema = "claro" | "escuro" | "auto";
export type PaletaId = "padrao" | "big-tech" | "interstellar" | "personalizada";

export interface PaletaPersonalizadaConfig {
  corPrimaria: string;
  corSucesso: string;
  corAlerta: string;
  corPerigo: string;
  corNeutra: string;
}

export interface TemaConfig {
  modoPadrao: ModoTema;
  paletaAtiva: PaletaId;
  paletaPersonalizada: PaletaPersonalizadaConfig;
}

export const PALETA_PERSONALIZADA_PADRAO: PaletaPersonalizadaConfig = {
  corPrimaria: "#1A73E8",
  corSucesso: "#34A853",
  corAlerta: "#FBBC04",
  corPerigo: "#EA4335",
  corNeutra: "#1F2430",
};

export const TEMA_CONFIG_PADRAO: TemaConfig = {
  modoPadrao: "auto",
  paletaAtiva: "padrao",
  paletaPersonalizada: PALETA_PERSONALIZADA_PADRAO,
};

// ==========================================
// CÁLCULO DE LUMINÂNCIA E CONTRASTE WCAG 2.1
// ==========================================

export function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0 };
  }
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbParaHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function calcularLuminancia(hex: string): number {
  const { r, g, b } = hexParaRgb(hex);
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Retorna a razão de contraste WCAG (entre 1 e 21).
 */
export function calcularContraste(cor1: string, cor2: string): number {
  const lum1 = calcularLuminancia(cor1);
  const lum2 = calcularLuminancia(cor2);
  const maisClaro = Math.max(lum1, lum2);
  const maisEscuro = Math.min(lum1, lum2);
  return Number(((maisClaro + 0.05) / (maisEscuro + 0.05)).toFixed(2));
}

/**
 * Retorna se atende à especificação WCAG AA (>= 4.5:1 para texto normal, >= 3.0:1 para elementos gráficos/texto grande)
 */
export function atendeWcagAa(corTextoOuFrente: string, corFundo: string, textoGrande = false): boolean {
  const ratio = calcularContraste(corTextoOuFrente, corFundo);
  return ratio >= (textoGrande ? 3.0 : 4.5);
}

/**
 * Retorna #FFFFFF ou #111827 para garantir o melhor contraste possível sobre a cor fornecida
 */
export function obterCorTextoContrastante(bgHex: string): string {
  const cBranco = calcularContraste("#ffffff", bgHex);
  const cPreto = calcularContraste("#111827", bgHex);
  return cBranco >= cPreto ? "#ffffff" : "#111827";
}

/**
 * Ajusta o brilho de uma cor hex (fator positivo clareia, negativo escurece)
 */
export function ajustarBrilho(hex: string, percentual: number): string {
  const { r, g, b } = hexParaRgb(hex);
  const fator = percentual / 100;
  if (fator >= 0) {
    return rgbParaHex(
      r + (255 - r) * fator,
      g + (255 - g) * fator,
      b + (255 - b) * fator
    );
  } else {
    const absFator = 1 + fator;
    return rgbParaHex(r * absFator, g * absFator, b * absFator);
  }
}

// ==========================================
// DEFINIÇÃO VISUAL DAS PALETAS
// ==========================================

export interface PaletaInfo {
  id: PaletaId;
  nome: string;
  descricao: string;
  destaqueClaro: {
    fundo: string;
    card: string;
    texto: string;
    primaria: string;
    sucesso: string;
    alerta: string;
    perigo: string;
    borda: string;
  };
  destaqueEscuro: {
    fundo: string;
    card: string;
    texto: string;
    primaria: string;
    sucesso: string;
    alerta: string;
    perigo: string;
    borda: string;
  };
  coresGraficoClaro: string[];
  coresGraficoEscuro: string[];
  serieHistorica: {
    claro: {
      gradienteOceano: [string, string, string];
      linha: string;
      resolvidos: string;
      emAtendimento: string;
    };
    escuro: {
      gradienteOceano: [string, string, string];
      linha: string;
      resolvidos: string;
      emAtendimento: string;
    };
  };
}

export const PALETAS: Record<Exclude<PaletaId, "personalizada">, PaletaInfo> = {
  padrao: {
    id: "padrao",
    nome: "Padrão (Cores Atuais)",
    descricao: "Identidade visual tradicional do SENAI com azul institucional e elementos coloridos vibrantes.",
    destaqueClaro: {
      fundo: "#F8FAFC",
      card: "#FFFFFF",
      texto: "#0F172A",
      primaria: "#1A73E8",
      sucesso: "#34A853",
      alerta: "#FBBC04",
      perigo: "#EA4335",
      borda: "#E2E8F0",
    },
    destaqueEscuro: {
      fundo: "#0F172A",
      card: "#1E293B",
      texto: "#F8FAFC",
      primaria: "#3B82F6",
      sucesso: "#10B981",
      alerta: "#F59E0B",
      perigo: "#EF4444",
      borda: "#334155",
    },
    coresGraficoClaro: [
      "#1A73E8", // Blue
      "#EA4335", // Red
      "#FBBC04", // Yellow
      "#34A853", // Green
      "#9333EA", // Purple
      "#0284C7", // Cyan
      "#EA580C", // Orange
      "#DB2777", // Pink
    ],
    coresGraficoEscuro: [
      "#3B82F6", // Blue
      "#EF4444", // Red
      "#F59E0B", // Yellow
      "#10B981", // Green
      "#A855F7", // Purple
      "#38BDF8", // Cyan
      "#FB923C", // Orange
      "#F472B6", // Pink
    ],
    serieHistorica: {
      claro: {
        gradienteOceano: ["#22D3EE", "#0284C7", "#0F172A"],
        linha: "#0284C7",
        resolvidos: "#10B981",
        emAtendimento: "#F59E0B",
      },
      escuro: {
        gradienteOceano: ["#38BDF8", "#0369A1", "#022C43"],
        linha: "#38BDF8",
        resolvidos: "#34D399",
        emAtendimento: "#FBBF24",
      },
    },
  },

  "big-tech": {
    id: "big-tech",
    nome: "Big Tech",
    descricao: "Inspirada em Silicon Valley: Google Blue #4285F4, Red #EA4335, Yellow #FBBC05, Green #34A853 e Apple Black #1D1D1F.",
    destaqueClaro: {
      fundo: "#F5F5F7", // Apple Light Grey
      card: "#FFFFFF",
      texto: "#1D1D1F", // Apple Black
      primaria: "#4285F4", // Google Blue
      sucesso: "#34A853", // Google Green
      alerta: "#FBBC05", // Google Yellow
      perigo: "#EA4335", // Google Red
      borda: "#D2D2D7",
    },
    destaqueEscuro: {
      fundo: "#121214", // Apple Dark Deep
      card: "#1D1D1F", // Apple Black
      texto: "#F5F5F7", // Apple Signal Light
      primaria: "#5B95F6", // Brilho ajustado para contraste WCAG AA
      sucesso: "#34D399", // Brilho ajustado
      alerta: "#FCD34D", // Brilho ajustado
      perigo: "#F87171", // Brilho ajustado
      borda: "#38383A",
    },
    coresGraficoClaro: [
      "#4285F4", // Google Blue
      "#34A853", // Google Green
      "#FBBC05", // Google Yellow
      "#EA4335", // Google Red
      "#7C3AED", // Purple Tech
      "#00ACC1", // Cyan
      "#FF6D00", // Orange
      "#1D1D1F", // Apple Dark
    ],
    coresGraficoEscuro: [
      "#5B95F6", // Bright Tech Blue
      "#34D399", // Bright Green
      "#FCD34D", // Bright Yellow
      "#F87171", // Bright Red
      "#A78BFA", // Bright Violet
      "#38BDF8", // Sky
      "#FB923C", // Amber
      "#F5F5F7", // Signal Light
    ],
    serieHistorica: {
      claro: {
        gradienteOceano: ["#4285F4", "#1D1D1F", "#0B1120"],
        linha: "#4285F4",
        resolvidos: "#34A853",
        emAtendimento: "#FBBC05",
      },
      escuro: {
        gradienteOceano: ["#5B95F6", "#242426", "#121214"],
        linha: "#5B95F6",
        resolvidos: "#34D399",
        emAtendimento: "#FCD34D",
      },
    },
  },

  interstellar: {
    id: "interstellar",
    nome: "Interstellar Inspired",
    descricao: "Frios espaciais e neutros metálicos com visual sci-fi elegante: Space #0B132B, Orbit #1C2541, Nebula #3A506B, Ice #CDE7F0 e Signal #F5F3F4.",
    destaqueClaro: {
      fundo: "#F5F3F4", // Signal
      card: "#FFFFFF",
      texto: "#0B132B", // Space
      primaria: "#1C2541", // Orbit / Nebula
      sucesso: "#0D9488", // Turquesa espacial harmônica
      alerta: "#D97706", // Âmbar estelar acessível
      perigo: "#DC2626", // Carmim cósmico
      borda: "#CBD5E1", // Nebula suave
    },
    destaqueEscuro: {
      fundo: "#0B132B", // Space
      card: "#1C2541", // Orbit
      texto: "#F5F3F4", // Signal
      primaria: "#5BC0BE", // Cyan Ice vibrante (alto contraste sobre Orbit/Space)
      sucesso: "#2EC4B6", // Esmeralda estelar
      alerta: "#F4A261", // Âmbar cósmico
      perigo: "#FF6B6B", // Supernova carmim
      borda: "#3A506B", // Nebula
    },
    coresGraficoClaro: [
      "#1C2541", // Orbit
      "#3A506B", // Nebula
      "#0284C7", // Deep Ice
      "#0D9488", // Cosmic Emerald
      "#D97706", // Stellar Amber
      "#DC2626", // Crimson Nova
      "#6366F1", // Astral Indigo
      "#0891B2", // Cyan Space
    ],
    coresGraficoEscuro: [
      "#5BC0BE", // Cyan Ice
      "#CDE7F0", // Ice Highlight
      "#3A506B", // Nebula
      "#2EC4B6", // Emerald
      "#F4A261", // Stellar Amber
      "#FF6B6B", // Crimson Supernova
      "#7BDFF2", // Deep Glow
      "#A78BFA", // Astral Purple
    ],
    serieHistorica: {
      claro: {
        gradienteOceano: ["#3A506B", "#1C2541", "#0B132B"],
        linha: "#1C2541",
        resolvidos: "#0D9488",
        emAtendimento: "#D97706",
      },
      escuro: {
        gradienteOceano: ["#5BC0BE", "#3A506B", "#0B132B"],
        linha: "#5BC0BE",
        resolvidos: "#2EC4B6",
        emAtendimento: "#F4A261",
      },
    },
  },
};

/**
 * Gera as cores e tokens derivados para uma paleta personalizada
 */
export function gerarPaletaPersonalizada(config: PaletaPersonalizadaConfig): PaletaInfo {
  const { corPrimaria, corSucesso, corAlerta, corPerigo, corNeutra } = config;

  // Ajustes de modo claro
  const fundoClaro = ajustarBrilho(corNeutra, 92);
  const textoClaro = ajustarBrilho(corNeutra, -50);
  const bordaClaro = ajustarBrilho(corNeutra, 70);

  // Ajustes de modo escuro
  const fundoEscuro = ajustarBrilho(corNeutra, -75);
  const cardEscuro = ajustarBrilho(corNeutra, -55);
  const textoEscuro = ajustarBrilho(corNeutra, 90);
  const bordaEscuro = ajustarBrilho(corNeutra, -30);

  // Brilho ajustado para o modo escuro nas cores de destaque
  const primariaEscuro = ajustarBrilho(corPrimaria, 25);
  const sucessoEscuro = ajustarBrilho(corSucesso, 20);
  const alertaEscuro = ajustarBrilho(corAlerta, 15);
  const perigoEscuro = ajustarBrilho(corPerigo, 20);

  return {
    id: "personalizada",
    nome: "Personalizada",
    descricao: "Paleta customizada configurada pelos administradores.",
    destaqueClaro: {
      fundo: fundoClaro,
      card: "#FFFFFF",
      texto: textoClaro,
      primaria: corPrimaria,
      sucesso: corSucesso,
      alerta: corAlerta,
      perigo: corPerigo,
      borda: bordaClaro,
    },
    destaqueEscuro: {
      fundo: fundoEscuro,
      card: cardEscuro,
      texto: textoEscuro,
      primaria: primariaEscuro,
      sucesso: sucessoEscuro,
      alerta: alertaEscuro,
      perigo: perigoEscuro,
      borda: bordaEscuro,
    },
    coresGraficoClaro: [
      corPrimaria,
      corSucesso,
      corAlerta,
      corPerigo,
      ajustarBrilho(corPrimaria, -30),
      ajustarBrilho(corSucesso, -25),
      ajustarBrilho(corAlerta, -20),
      ajustarBrilho(corPerigo, -25),
    ],
    coresGraficoEscuro: [
      primariaEscuro,
      sucessoEscuro,
      alertaEscuro,
      perigoEscuro,
      ajustarBrilho(primariaEscuro, 20),
      ajustarBrilho(sucessoEscuro, 20),
      ajustarBrilho(alertaEscuro, 20),
      ajustarBrilho(perigoEscuro, 20),
    ],
    serieHistorica: {
      claro: {
        gradienteOceano: [corPrimaria, corNeutra, textoClaro],
        linha: corPrimaria,
        resolvidos: corSucesso,
        emAtendimento: corAlerta,
      },
      escuro: {
        gradienteOceano: [primariaEscuro, cardEscuro, fundoEscuro],
        linha: primariaEscuro,
        resolvidos: sucessoEscuro,
        emAtendimento: alertaEscuro,
      },
    },
  };
}

/**
 * Retorna as informações completas da paleta solicitada (ou padrão)
 */
export function obterPaletaInfo(paletaId: PaletaId, custom?: PaletaPersonalizadaConfig): PaletaInfo {
  if (paletaId === "personalizada") {
    return gerarPaletaPersonalizada(custom ?? PALETA_PERSONALIZADA_PADRAO);
  }
  return PALETAS[paletaId] ?? PALETAS.padrao;
}

// ==========================================
// APLICAÇÃO NO DOM E NO META THEME-COLOR
// ==========================================

export interface AplicarTemaParams {
  modo: ModoTema;
  paleta: PaletaId;
  custom?: PaletaPersonalizadaConfig;
}

/**
 * Resolve se o modo atual ativo deve ser renderizado como escuro
 */
export function resolverEhEscuro(modo: ModoTema): boolean {
  if (modo === "escuro") return true;
  if (modo === "claro") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

/**
 * Aplica os tokens CSS, atributos e meta tag no documento
 */
export function aplicarTemaNoDocumento({ modo, paleta, custom }: AplicarTemaParams): boolean {
  if (typeof document === "undefined") return false;

  const isDark = resolverEhEscuro(modo);
  const root = document.documentElement;

  // 1. Alterna classe .dark e limpa classes legadas
  root.classList.toggle("dark", isDark);
  root.classList.remove("pastel");

  // 2. Define atributo da paleta
  root.setAttribute("data-paleta", paleta);

  // 3. Obtém dados da paleta
  const paletaInfo = obterPaletaInfo(paleta, custom);
  const cores = isDark ? paletaInfo.destaqueEscuro : paletaInfo.destaqueClaro;

  // 4. Injeta variáveis CSS para garantir sincronia imediata
  root.style.setProperty("--g-blue", cores.primaria);
  root.style.setProperty("--g-green", cores.sucesso);
  root.style.setProperty("--g-yellow", cores.alerta);
  root.style.setProperty("--g-red", cores.perigo);

  root.style.setProperty("--primary", cores.primaria);
  root.style.setProperty("--primary-foreground", obterCorTextoContrastante(cores.primaria));

  root.style.setProperty("--success", cores.sucesso);
  root.style.setProperty("--success-foreground", obterCorTextoContrastante(cores.sucesso));

  root.style.setProperty("--warning", cores.alerta);
  root.style.setProperty("--warning-foreground", obterCorTextoContrastante(cores.alerta));

  root.style.setProperty("--destructive", cores.perigo);
  root.style.setProperty("--destructive-foreground", obterCorTextoContrastante(cores.perigo));

  root.style.setProperty("--ring", cores.primaria);

  if (paleta === "personalizada" || paleta === "interstellar" || paleta === "big-tech") {
    root.style.setProperty("--background", cores.fundo);
    root.style.setProperty("--card", cores.card);
    root.style.setProperty("--popover", cores.card);
    root.style.setProperty("--foreground", cores.texto);
    root.style.setProperty("--card-foreground", cores.texto);
    root.style.setProperty("--popover-foreground", cores.texto);
    root.style.setProperty("--border", cores.borda);
    root.style.setProperty("--input", cores.borda);
  } else {
    // Na paleta padrão, remove overrides para permitir as definições de oklch do styles.css
    root.style.removeProperty("--background");
    root.style.removeProperty("--card");
    root.style.removeProperty("--popover");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--card-foreground");
    root.style.removeProperty("--popover-foreground");
    root.style.removeProperty("--border");
    root.style.removeProperty("--input");
  }

  // 5. Injeta cores de gráfico nas variáveis CSS
  const coresGrafico = isDark ? paletaInfo.coresGraficoEscuro : paletaInfo.coresGraficoClaro;
  coresGrafico.forEach((cor, idx) => {
    root.style.setProperty(`--chart-${idx + 1}`, cor);
  });

  // 6. Atualiza meta theme-color
  try {
    let metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = cores.fundo;
  } catch {}

  // 7. Persiste no localStorage
  try {
    localStorage.setItem("tema-ti-modo", modo);
    localStorage.setItem("tema-ti-paleta", paleta);
    if (custom) {
      localStorage.setItem("tema-ti-custom", JSON.stringify(custom));
    }
    // Mantém compatibilidade com a chave legada
    localStorage.setItem("tema-ti", isDark ? "escuro" : "claro");
  } catch {}

  return true;
}

/**
 * Script inline injetado no <head> para garantir renderização instantânea SEM PISCADA
 */
export const TEMA_INLINE_SCRIPT = `
(function() {
  try {
    var modo = localStorage.getItem('tema-ti-modo') || localStorage.getItem('tema-ti') || 'auto';
    var paleta = localStorage.getItem('tema-ti-paleta') || 'padrao';
    var prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = modo === 'escuro' || (modo !== 'claro' && prefereDark);
    
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-paleta', paleta);
    
    // Cores de fundo imediatas para o meta theme-color
    var bg = isDark
      ? (paleta === 'interstellar' ? '#0B132B' : paleta === 'big-tech' ? '#121214' : '#0F172A')
      : (paleta === 'interstellar' ? '#F5F3F4' : paleta === 'big-tech' ? '#F5F5F7' : '#F8FAFC');
      
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', bg);
  } catch(e) {}
})();
`.trim();
