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
// CONFIGURAÇÕES DE CORES DOS BOTÕES DO SISTEMA
// ==========================================

export interface CorBotaoItem {
  bg: string;
  text: string;
  hover: string;
  border?: string;
  hoverText?: string;
}

export interface CoresBotoesConfig {
  primario: CorBotaoItem;
  secundario: CorBotaoItem;
  outline: CorBotaoItem;
  destaque: CorBotaoItem;
  sucesso: CorBotaoItem;
  perigo: CorBotaoItem;
  topoDashboard: CorBotaoItem;
  exportacao: CorBotaoItem;
  abasGraficoAtiva: CorBotaoItem;
  abasGraficoInativa: CorBotaoItem;
  abaRecorrentes: CorBotaoItem;
  abaSetores: CorBotaoItem;
  abaPrioridades: CorBotaoItem;
  abaStatus: CorBotaoItem;
  abaSla: CorBotaoItem;
}

export interface CoresBotoesPorTemaConfig {
  claro: CoresBotoesConfig;
  escuro: CoresBotoesConfig;
}

export interface CategoriaBotaoMeta {
  id: keyof CoresBotoesConfig;
  nome: string;
  descricao: string;
  ondeEUsado: string;
  temBorda?: boolean;
}

export const CATEGORIAS_BOTOES: CategoriaBotaoMeta[] = [
  {
    id: "primario",
    nome: "Botão Primário (Principal)",
    descricao: "Ação de confirmação principal e envio.",
    ondeEUsado: "Formulários de chamado, modais, diálogos de salvar e telas principais.",
  },
  {
    id: "secundario",
    nome: "Botão Secundário",
    descricao: "Ações complementares de apoio com fundo neutro suave.",
    ondeEUsado: "Ações secundárias em formulários e diálogos.",
  },
  {
    id: "outline",
    nome: "Botão de Contorno (Outline)",
    descricao: "Botões vazados com borda sutil e fundo transparente ou card.",
    ondeEUsado: "Botões de navegação, 'Cancelar', 'Voltar' e ações neutras.",
    temBorda: true,
  },
  {
    id: "destaque",
    nome: "Botão de Destaque (Google Azul)",
    descricao: "Botão de chamada de atenção prioritária institucional.",
    ondeEUsado: "Botão 'Dashboard' na Home, login Google/Microsoft, ações de destaque.",
  },
  {
    id: "sucesso",
    nome: "Botão de Sucesso (Google Verde)",
    descricao: "Botão verde institucional para abertura e confirmação positiva.",
    ondeEUsado: "Botão 'Abrir Chamado' na Home, submissão de chamados e ações de sucesso.",
  },
  {
    id: "perigo",
    nome: "Botão de Perigo / Excluir (Destrutivo)",
    descricao: "Botão vermelho de alerta para ações destrutivas ou cancelamento.",
    ondeEUsado: "Exclusão de registros, cancelar chamado, confirmações irreversíveis.",
  },
  {
    id: "topoDashboard",
    nome: "Botões do Topo do Dashboard",
    descricao: "Botões superiores de filtros e navegação do Dashboard.",
    ondeEUsado: "Botões 'Mês', 'Acompanhar chamados' e 'Avaliações' no topo de /dashboard.",
    temBorda: true,
  },
  {
    id: "exportacao",
    nome: "Botões de Exportação do Dashboard",
    descricao: "Botões de download de dados do Dashboard.",
    ondeEUsado: "Botões 'Exportar planilha' e 'Exportar PDF' no Dashboard.",
    temBorda: true,
  },
  {
    id: "abasGraficoAtiva",
    nome: "Abas Secundárias de Gráficos (Ativa)",
    descricao: "Aba atualmente selecionada entre as visualizações de gráficos.",
    ondeEUsado: "Abas 'Indicadores Principais', 'Distribuição', 'Volume', 'Série Histórica' (quando ativa).",
  },
  {
    id: "abasGraficoInativa",
    nome: "Abas Secundárias de Gráficos (Inativa)",
    descricao: "Abas de visualização de gráficos quando não estão selecionadas.",
    ondeEUsado: "Abas secundárias do Dashboard em estado de repouso.",
    temBorda: true,
  },
  {
    id: "abaRecorrentes",
    nome: "Aba: Chamados recorrentes",
    descricao: "Primeira dimensão colorida da Análise Categórica no Dashboard.",
    ondeEUsado: "Botão 'Chamados recorrentes' no painel 'Análise Categórica' do Dashboard.",
  },
  {
    id: "abaSetores",
    nome: "Aba: Chamados por setores",
    descricao: "Segunda dimensão colorida da Análise Categórica no Dashboard.",
    ondeEUsado: "Botão 'Chamados por setores' no painel 'Análise Categórica' do Dashboard.",
  },
  {
    id: "abaPrioridades",
    nome: "Aba: Prioridades dos chamados",
    descricao: "Terceira dimensão colorida da Análise Categórica no Dashboard.",
    ondeEUsado: "Botão 'Prioridades dos chamados' no painel 'Análise Categórica' do Dashboard.",
  },
  {
    id: "abaStatus",
    nome: "Aba: Status dos chamados",
    descricao: "Quarta dimensão colorida da Análise Categórica no Dashboard.",
    ondeEUsado: "Botão 'Status dos chamados' no painel 'Análise Categórica' do Dashboard.",
  },
  {
    id: "abaSla",
    nome: "Aba: SLA dos chamados",
    descricao: "Quinta dimensão colorida da Análise Categórica no Dashboard.",
    ondeEUsado: "Botão 'SLA dos chamados' no painel 'Análise Categórica' do Dashboard.",
  },
];

export const CORES_BOTOES_CLARO_PADRAO: CoresBotoesConfig = {
  primario: { bg: "#1a73e8", text: "#ffffff", hover: "#1557b0" },
  secundario: { bg: "#f1f3f4", text: "#202124", hover: "#e8eaed" },
  outline: { bg: "#ffffff", text: "#202124", border: "#dadce0", hover: "#f1f3f4", hoverText: "#202124" },
  destaque: { bg: "#1a73e8", text: "#ffffff", hover: "#1557b0" },
  sucesso: { bg: "#34a853", text: "#ffffff", hover: "#2d9249" },
  perigo: { bg: "#ea4335", text: "#ffffff", hover: "#d93025" },
  topoDashboard: { bg: "#ffffff", text: "#202124", border: "#dadce0", hover: "#f8f9fa", hoverText: "#1a73e8" },
  exportacao: { bg: "#ffffff", text: "#202124", border: "#dadce0", hover: "#f8f9fa", hoverText: "#202124" },
  abasGraficoAtiva: { bg: "#1a73e8", text: "#ffffff", hover: "#1557b0" },
  abasGraficoInativa: { bg: "#ffffff", text: "#202124", border: "#dadce0", hover: "#f1f3f4", hoverText: "#202124" },
  abaRecorrentes: { bg: "#1a73e8", text: "#ffffff", hover: "#1557b0" },
  abaSetores: { bg: "#ea4335", text: "#ffffff", hover: "#d93025" },
  abaPrioridades: { bg: "#fbbc04", text: "#09090b", hover: "#f29900" },
  abaStatus: { bg: "#34a853", text: "#ffffff", hover: "#2d9249" },
  abaSla: { bg: "#a142f4", text: "#ffffff", hover: "#8e24aa" },
};

export const CORES_BOTOES_ESCURO_PADRAO: CoresBotoesConfig = {
  primario: { bg: "#3b82f6", text: "#ffffff", hover: "#2563eb" },
  secundario: { bg: "#27272a", text: "#f4f4f5", hover: "#3f3f46" },
  outline: { bg: "#18181b", text: "#f4f4f5", border: "#3f3f46", hover: "#27272a", hoverText: "#ffffff" },
  destaque: { bg: "#3b82f6", text: "#ffffff", hover: "#2563eb" },
  sucesso: { bg: "#10b981", text: "#ffffff", hover: "#059669" },
  perigo: { bg: "#ef4444", text: "#ffffff", hover: "#dc2626" },
  topoDashboard: { bg: "#18181b", text: "#f4f4f5", border: "#3f3f46", hover: "#27272a", hoverText: "#60a5fa" },
  exportacao: { bg: "#18181b", text: "#f4f4f5", border: "#3f3f46", hover: "#27272a", hoverText: "#ffffff" },
  abasGraficoAtiva: { bg: "#3b82f6", text: "#ffffff", hover: "#2563eb" },
  abasGraficoInativa: { bg: "#18181b", text: "#f4f4f5", border: "#3f3f46", hover: "#27272a", hoverText: "#ffffff" },
  abaRecorrentes: { bg: "#3b82f6", text: "#ffffff", hover: "#2563eb" },
  abaSetores: { bg: "#ef4444", text: "#ffffff", hover: "#dc2626" },
  abaPrioridades: { bg: "#f59e0b", text: "#18181b", hover: "#d97706" },
  abaStatus: { bg: "#10b981", text: "#ffffff", hover: "#059669" },
  abaSla: { bg: "#a855f7", text: "#ffffff", hover: "#9333ea" },
};

export const CORES_BOTOES_PADRAO: CoresBotoesPorTemaConfig = {
  claro: CORES_BOTOES_CLARO_PADRAO,
  escuro: CORES_BOTOES_ESCURO_PADRAO,
};

// ==========================================
// CONFIGURAÇÕES DE CORES GERAIS DO SITE
// ==========================================

export interface CoresSiteModoConfig {
  fundo: string;
  card: string;
  textoTitulo: string;
  textoComum: string;
  textoMuted: string;
  borda: string;
  faixaHeader1: string;
  faixaHeader2: string;
  faixaHeader3: string;
  faixaHeader4: string;
}

export interface CoresSiteConfig {
  claro: CoresSiteModoConfig;
  escuro: CoresSiteModoConfig;
}

export const CORES_SITE_CLARO_PADRAO: CoresSiteModoConfig = {
  fundo: "#f8f9fa",
  card: "#ffffff",
  textoTitulo: "#1f2937",
  textoComum: "#374151",
  textoMuted: "#6b7280",
  borda: "#e5e7eb",
  faixaHeader1: "#1a73e8",
  faixaHeader2: "#ea4335",
  faixaHeader3: "#fbbc04",
  faixaHeader4: "#34a853",
};

export const CORES_SITE_ESCURO_PADRAO: CoresSiteModoConfig = {
  fundo: "#0f172a",
  card: "#1e293b",
  textoTitulo: "#f8fafc",
  textoComum: "#e2e8f0",
  textoMuted: "#94a3b8",
  borda: "#334155",
  faixaHeader1: "#3b82f6",
  faixaHeader2: "#ef4444",
  faixaHeader3: "#f59e0b",
  faixaHeader4: "#10b981",
};

export const CORES_SITE_PADRAO: CoresSiteConfig = {
  claro: CORES_SITE_CLARO_PADRAO,
  escuro: CORES_SITE_ESCURO_PADRAO,
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
  coresBotoes?: CoresBotoesPorTemaConfig;
  coresSite?: CoresSiteConfig;
}

/**
 * Aplica variáveis CSS dos botões e do site no elemento raiz
 */
export function aplicarCoresCustomizadasNoDocumento(
  root: HTMLElement,
  isDark: boolean,
  coresBotoesParam?: CoresBotoesPorTemaConfig,
  coresSiteParam?: CoresSiteConfig
) {
  let coresBotoes = coresBotoesParam;
  let coresSite = coresSiteParam;

  if (!coresBotoes || !coresSite) {
    try {
      const cached = localStorage.getItem("tisenai_regras_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!coresBotoes && parsed.coresBotoes) coresBotoes = parsed.coresBotoes;
        if (!coresSite && parsed.coresSite) coresSite = parsed.coresSite;
      }
    } catch {}
  }

  // 1. Injeta cores de botões conforme o modo ativo (claro ou escuro)
  const configBotoesAtiva = isDark
    ? (coresBotoes?.escuro ?? CORES_BOTOES_ESCURO_PADRAO)
    : (coresBotoes?.claro ?? CORES_BOTOES_CLARO_PADRAO);

  if (configBotoesAtiva) {
    // Primário
    if (configBotoesAtiva.primario) {
      root.style.setProperty("--btn-primary-bg", configBotoesAtiva.primario.bg);
      root.style.setProperty("--btn-primary-text", configBotoesAtiva.primario.text);
      root.style.setProperty("--btn-primary-hover", configBotoesAtiva.primario.hover);
    }
    // Secundário
    if (configBotoesAtiva.secundario) {
      root.style.setProperty("--btn-secondary-bg", configBotoesAtiva.secundario.bg);
      root.style.setProperty("--btn-secondary-text", configBotoesAtiva.secundario.text);
      root.style.setProperty("--btn-secondary-hover", configBotoesAtiva.secundario.hover);
    }
    // Outline
    if (configBotoesAtiva.outline) {
      root.style.setProperty("--btn-outline-bg", configBotoesAtiva.outline.bg);
      root.style.setProperty("--btn-outline-text", configBotoesAtiva.outline.text);
      root.style.setProperty("--btn-outline-border", configBotoesAtiva.outline.border || "var(--border)");
      root.style.setProperty("--btn-outline-hover-bg", configBotoesAtiva.outline.hover);
      root.style.setProperty("--btn-outline-hover-text", configBotoesAtiva.outline.hoverText || configBotoesAtiva.outline.text);
    }
    // Destaque (Google Azul)
    if (configBotoesAtiva.destaque) {
      root.style.setProperty("--btn-destaque-bg", configBotoesAtiva.destaque.bg);
      root.style.setProperty("--btn-destaque-text", configBotoesAtiva.destaque.text);
      root.style.setProperty("--btn-destaque-hover", configBotoesAtiva.destaque.hover);
    }
    // Sucesso (Google Verde)
    if (configBotoesAtiva.sucesso) {
      root.style.setProperty("--btn-sucesso-bg", configBotoesAtiva.sucesso.bg);
      root.style.setProperty("--btn-sucesso-text", configBotoesAtiva.sucesso.text);
      root.style.setProperty("--btn-sucesso-hover", configBotoesAtiva.sucesso.hover);
    }
    // Perigo (Destrutivo)
    if (configBotoesAtiva.perigo) {
      root.style.setProperty("--btn-perigo-bg", configBotoesAtiva.perigo.bg);
      root.style.setProperty("--btn-perigo-text", configBotoesAtiva.perigo.text);
      root.style.setProperty("--btn-perigo-hover", configBotoesAtiva.perigo.hover);
    }
    // Topo Dashboard
    if (configBotoesAtiva.topoDashboard) {
      root.style.setProperty("--btn-dash-top-bg", configBotoesAtiva.topoDashboard.bg);
      root.style.setProperty("--btn-dash-top-text", configBotoesAtiva.topoDashboard.text);
      root.style.setProperty("--btn-dash-top-border", configBotoesAtiva.topoDashboard.border || "var(--border)");
      root.style.setProperty("--btn-dash-top-hover-bg", configBotoesAtiva.topoDashboard.hover);
      root.style.setProperty("--btn-dash-top-hover-text", configBotoesAtiva.topoDashboard.hoverText || configBotoesAtiva.topoDashboard.text);
    }
    // Exportação
    if (configBotoesAtiva.exportacao) {
      root.style.setProperty("--btn-export-bg", configBotoesAtiva.exportacao.bg);
      root.style.setProperty("--btn-export-text", configBotoesAtiva.exportacao.text);
      root.style.setProperty("--btn-export-border", configBotoesAtiva.exportacao.border || "var(--border)");
      root.style.setProperty("--btn-export-hover-bg", configBotoesAtiva.exportacao.hover);
      root.style.setProperty("--btn-export-hover-text", configBotoesAtiva.exportacao.hoverText || configBotoesAtiva.exportacao.text);
    }
    // Abas de Gráficos
    if (configBotoesAtiva.abasGraficoAtiva) {
      root.style.setProperty("--btn-chart-tab-active-bg", configBotoesAtiva.abasGraficoAtiva.bg);
      root.style.setProperty("--btn-chart-tab-active-text", configBotoesAtiva.abasGraficoAtiva.text);
      root.style.setProperty("--btn-chart-tab-hover-bg", configBotoesAtiva.abasGraficoAtiva.hover);
    }
    if (configBotoesAtiva.abasGraficoInativa) {
      root.style.setProperty("--btn-chart-tab-inactive-bg", configBotoesAtiva.abasGraficoInativa.bg);
      root.style.setProperty("--btn-chart-tab-inactive-text", configBotoesAtiva.abasGraficoInativa.text);
      root.style.setProperty("--btn-chart-tab-inactive-border", configBotoesAtiva.abasGraficoInativa.border || "var(--border)");
    }
    // 5 Abas da Análise Categórica
    if (configBotoesAtiva.abaRecorrentes) {
      root.style.setProperty("--btn-cat-recorrentes-bg", configBotoesAtiva.abaRecorrentes.bg);
      root.style.setProperty("--btn-cat-recorrentes-text", configBotoesAtiva.abaRecorrentes.text);
      root.style.setProperty("--btn-cat-recorrentes-hover", configBotoesAtiva.abaRecorrentes.hover);
    }
    if (configBotoesAtiva.abaSetores) {
      root.style.setProperty("--btn-cat-setores-bg", configBotoesAtiva.abaSetores.bg);
      root.style.setProperty("--btn-cat-setores-text", configBotoesAtiva.abaSetores.text);
      root.style.setProperty("--btn-cat-setores-hover", configBotoesAtiva.abaSetores.hover);
    }
    if (configBotoesAtiva.abaPrioridades) {
      root.style.setProperty("--btn-cat-prioridades-bg", configBotoesAtiva.abaPrioridades.bg);
      root.style.setProperty("--btn-cat-prioridades-text", configBotoesAtiva.abaPrioridades.text);
      root.style.setProperty("--btn-cat-prioridades-hover", configBotoesAtiva.abaPrioridades.hover);
    }
    if (configBotoesAtiva.abaStatus) {
      root.style.setProperty("--btn-cat-status-bg", configBotoesAtiva.abaStatus.bg);
      root.style.setProperty("--btn-cat-status-text", configBotoesAtiva.abaStatus.text);
      root.style.setProperty("--btn-cat-status-hover", configBotoesAtiva.abaStatus.hover);
    }
    if (configBotoesAtiva.abaSla) {
      root.style.setProperty("--btn-cat-sla-bg", configBotoesAtiva.abaSla.bg);
      root.style.setProperty("--btn-cat-sla-text", configBotoesAtiva.abaSla.text);
      root.style.setProperty("--btn-cat-sla-hover", configBotoesAtiva.abaSla.hover);
    }
  }

  // 2. Injeta cores gerais do site se customizadas
  const configSiteAtiva = isDark
    ? (coresSite?.escuro ?? CORES_SITE_ESCURO_PADRAO)
    : (coresSite?.claro ?? CORES_SITE_CLARO_PADRAO);

  if (configSiteAtiva) {
    if (configSiteAtiva.fundo) {
      root.style.setProperty("--site-bg", configSiteAtiva.fundo);
      root.style.setProperty("--background", configSiteAtiva.fundo);
    }
    if (configSiteAtiva.card) {
      root.style.setProperty("--site-card-bg", configSiteAtiva.card);
      root.style.setProperty("--card", configSiteAtiva.card);
      root.style.setProperty("--popover", configSiteAtiva.card);
    }
    if (configSiteAtiva.textoTitulo) {
      root.style.setProperty("--site-title-color", configSiteAtiva.textoTitulo);
    }
    if (configSiteAtiva.textoComum) {
      root.style.setProperty("--site-text-color", configSiteAtiva.textoComum);
      root.style.setProperty("--foreground", configSiteAtiva.textoComum);
    }
    if (configSiteAtiva.textoMuted) {
      root.style.setProperty("--site-muted-color", configSiteAtiva.textoMuted);
      root.style.setProperty("--muted-foreground", configSiteAtiva.textoMuted);
    }
    if (configSiteAtiva.borda) {
      root.style.setProperty("--site-border-color", configSiteAtiva.borda);
      root.style.setProperty("--border", configSiteAtiva.borda);
      root.style.setProperty("--input", configSiteAtiva.borda);
    }
    if (configSiteAtiva.faixaHeader1) {
      root.style.setProperty("--header-stripe-1", configSiteAtiva.faixaHeader1);
    }
    if (configSiteAtiva.faixaHeader2) {
      root.style.setProperty("--header-stripe-2", configSiteAtiva.faixaHeader2);
    }
    if (configSiteAtiva.faixaHeader3) {
      root.style.setProperty("--header-stripe-3", configSiteAtiva.faixaHeader3);
    }
    if (configSiteAtiva.faixaHeader4) {
      root.style.setProperty("--header-stripe-4", configSiteAtiva.faixaHeader4);
    }
  }
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
export function aplicarTemaNoDocumento({
  modo,
  paleta,
  custom,
  coresBotoes,
  coresSite,
}: AplicarTemaParams): boolean {
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

  // 6. Injeta botões e cores do site customizadas
  aplicarCoresCustomizadasNoDocumento(root, isDark, coresBotoes, coresSite);

  // 7. Atualiza meta theme-color
  try {
    let metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = cores.fundo;
  } catch {}

  // 8. Persiste no localStorage
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

    // Carrega cache de regras para Zero FOUC de cores customizadas
    var cachedRegras = localStorage.getItem('tisenai_regras_cache');
    if (cachedRegras) {
      try {
        var r = JSON.parse(cachedRegras);
        var b = isDark ? r.coresBotoes && r.coresBotoes.escuro : r.coresBotoes && r.coresBotoes.claro;
        if (b) {
          if (b.primario) { root.style.setProperty('--btn-primary-bg', b.primario.bg); root.style.setProperty('--btn-primary-text', b.primario.text); }
          if (b.sucesso) { root.style.setProperty('--btn-sucesso-bg', b.sucesso.bg); root.style.setProperty('--btn-sucesso-text', b.sucesso.text); }
          if (b.destaque) { root.style.setProperty('--btn-destaque-bg', b.destaque.bg); root.style.setProperty('--btn-destaque-text', b.destaque.text); }
          if (b.perigo) { root.style.setProperty('--btn-perigo-bg', b.perigo.bg); root.style.setProperty('--btn-perigo-text', b.perigo.text); }
        }
        var s = isDark ? r.coresSite && r.coresSite.escuro : r.coresSite && r.coresSite.claro;
        if (s) {
          if (s.fundo) { root.style.setProperty('--site-bg', s.fundo); root.style.setProperty('--background', s.fundo); }
          if (s.card) { root.style.setProperty('--site-card-bg', s.card); root.style.setProperty('--card', s.card); }
          if (s.textoComum) { root.style.setProperty('--site-text-color', s.textoComum); root.style.setProperty('--foreground', s.textoComum); }
          if (s.borda) { root.style.setProperty('--site-border-color', s.borda); root.style.setProperty('--border', s.borda); }
          if (s.faixaHeader1) root.style.setProperty('--header-stripe-1', s.faixaHeader1);
          if (s.faixaHeader2) root.style.setProperty('--header-stripe-2', s.faixaHeader2);
          if (s.faixaHeader3) root.style.setProperty('--header-stripe-3', s.faixaHeader3);
          if (s.faixaHeader4) root.style.setProperty('--header-stripe-4', s.faixaHeader4);
        }
      } catch(err){}
    }
  } catch(e) {}
})();
`.trim();
