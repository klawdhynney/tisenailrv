export type Prioridade = "Crítica" | "Alta" | "Média" | "Baixa";

export type Status =
  | "Aberto"
  | "Em andamento"
  | "Aguardando"
  | "Resolvido"
  | "Cancelado";

export const PRIORIDADES: Prioridade[] = ["Crítica", "Alta", "Média", "Baixa"];
export const STATUS_LIST: Status[] = [
  "Aberto",
  "Em andamento",
  "Aguardando",
  "Resolvido",
  "Cancelado",
];

export interface Ticket {
  id: number;
  abertoEm: string; // yyyy-mm-dd
  hora: string; // HH:mm
  solicitante: string;
  solicitanteEmail?: string | null;
  setor: string;
  local: string;
  descricao: string;
  categoria?: string;
  prioridade: Prioridade;
  responsavel?: string | null;
  status: Status;
  fechadoEm?: string | null;
  horario?: string | null;
  procedimento?: string | null;
  contato?: string | null;
  slaReiniciadoEm?: string | null;
}

export function mesDoTicket(t: Ticket) {
  return t.abertoEm?.slice(0, 7) ?? "";
}

export interface Periodo {
  id: string;
  tipo: "Férias coletivas" | "Férias" | "Viagem a serviço" | "Atestado médico" | "Outro";
  descricao: string;
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd
}

export interface Feriado {
  id: string;
  data: string; // yyyy-mm-dd
  nome: string;
}

export interface CampoAbertura {
  id: string;
  label: string;
  obrigatorio: boolean;
  ativo: boolean;
  tipo?: "text" | "email" | "select" | "textarea";
}

export const CAMPOS_ABERTURA_PADRAO: CampoAbertura[] = [
  { id: "solicitante", label: "Seu nome", obrigatorio: true, ativo: true, tipo: "text" },
  { id: "email", label: "E-mail", obrigatorio: true, ativo: true, tipo: "email" },
  { id: "setor", label: "Setor", obrigatorio: true, ativo: true, tipo: "select" },
  { id: "categoria", label: "Tipo de problema", obrigatorio: true, ativo: true, tipo: "select" },
  { id: "local", label: "Local do problema*", obrigatorio: false, ativo: true, tipo: "text" },
  { id: "contato", label: "WhatsApp / Contato", obrigatorio: false, ativo: true, tipo: "text" },
  { id: "descricao", label: "Descreva o problema*", obrigatorio: true, ativo: true, tipo: "textarea" },
];

export const CAMPOS_EXPORTACAO = [
  { id: "Numero", label: "Nº do chamado" },
  { id: "Data", label: "Data de abertura" },
  { id: "Hora", label: "Hora de abertura" },
  { id: "Solicitante", label: "Solicitante" },
  { id: "SolicitanteEmail", label: "E-mail do solicitante" },
  { id: "Setor", label: "Setor" },
  { id: "Local", label: "Local exato" },
  { id: "Descricao", label: "Descrição do problema" },
  { id: "Categoria", label: "Tipo / Categoria" },
  { id: "Prioridade", label: "Prioridade" },
  { id: "Responsavel", label: "Responsável" },
  { id: "Status", label: "Status" },
  { id: "Fechamento", label: "Fechamento" },
  { id: "Horario_fechamento", label: "Hora fechamento" },
  { id: "Procedimento", label: "Procedimento" },
  { id: "WhatsApp", label: "WhatsApp" },
] as const;

export interface IdentidadeVisualConfig {
  tituloSite: string;
  nome?: string;
  sigla?: string;
  subtitulo?: string;
  logoUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
  corPrimaria?: string;
  temaPadrao: "claro" | "escuro" | "pastel";
}

export const IDENTIDADE_VISUAL_PADRAO: IdentidadeVisualConfig = {
  tituloSite: "TI SENAI LRV",
  nome: "SENAI Lucas do Rio Verde",
  sigla: "TI SENAI LRV",
  subtitulo: "Central de Atendimento ao Usuário",
  logoUrl: "",
  logoAlt: "SENAI Lucas do Rio Verde",
  faviconUrl: "/favicon.png",
  corPrimaria: "#1a73e8",
  temaPadrao: "claro",
};

export interface PaginaInicialConfig {
  badgeTexto: string;
  titulo: string;
  subtitulo: string;
  mostrarBanner: boolean;
  exibirBanner?: boolean;
  bannerUrl?: string;
  bannerAlt?: string;
}

export const PAGINA_INICIAL_PADRAO: PaginaInicialConfig = {
  badgeTexto: "Atendimento de TI · SENAI LRV",
  titulo: "Bem-vindo à Central de Chamados de TI!",
  subtitulo: "Central oficial de suporte e serviços de Tecnologia da Informação do SENAI Lucas do Rio Verde.",
  mostrarBanner: true,
  exibirBanner: true,
  bannerUrl: "",
  bannerAlt: "SENAI Lucas do Rio Verde - Ambiente Tecnológico de Inovação e Educação Profissional",
};

export interface IndicadorItemConfig {
  titulo: string;
  desc: string;
  ativo: boolean;
}

export interface IndicadoresConfig {
  mostrar?: boolean;
  totalLabel?: string;
  totalDesc?: string;
  atendimentoLabel?: string;
  atendimentoDesc?: string;
  resolvidosLabel?: string;
  resolvidosDesc?: string;
  total: IndicadorItemConfig;
  atendimento: IndicadorItemConfig;
  resolvidos: IndicadorItemConfig;
}

export const INDICADORES_PADRAO: IndicadoresConfig = {
  mostrar: true,
  totalLabel: "Total de chamados",
  totalDesc: "Quantidade de chamados registrados.",
  atendimentoLabel: "Em atendimento",
  atendimentoDesc: "Chamados que estão sendo tratados pela equipe de TI.",
  resolvidosLabel: "Resolvidos",
  resolvidosDesc: "Chamados que já foram concluídos.",
  total: {
    titulo: "Total de chamados",
    desc: "Quantidade de chamados registrados.",
    ativo: true,
  },
  atendimento: {
    titulo: "Em atendimento",
    desc: "Chamados que estão sendo tratados pela equipe de TI.",
    ativo: true,
  },
  resolvidos: {
    titulo: "Resolvidos",
    desc: "Chamados que já foram concluídos.",
    ativo: true,
  },
};

export interface AbrirChamadoConfig {
  titulo: string;
  textoApoio: string;
  rotuloLocal: string;
  placeholderLocal: string;
  rotuloDescricao: string;
  placeholderDescricao: string;
  textoBotao: string;
  textoConsentimento: string;
  locaisSugeridos?: string[];
}

export const ABRIR_CHAMADO_PADRAO: AbrirChamadoConfig = {
  titulo: "Abrir chamado de TI",
  textoApoio: "Abra o seu chamado, descreva o problema e informe o local exato para agilizar o atendimento.",
  rotuloLocal: "Local do problema*",
  placeholderLocal: "Ex.: Bloco A, Sala 3, Mesa 02",
  rotuloDescricao: "Descreva o problema*",
  placeholderDescricao: "Ex.: Computador sem internet na sala 1",
  textoBotao: "Enviar chamado",
  textoConsentimento: "Ao enviar, você concorda com o uso dos seus dados conforme nossa Política de Privacidade e LGPD.",
  locaisSugeridos: [
    "Bloco A - Secretaria",
    "Bloco A - Coordenação",
    "Bloco B - Laboratório 1",
    "Bloco B - Laboratório 2",
    "Bloco C - Sala dos Professores",
    "Área Técnica - Oficina",
    "Gerência / Administrativo",
  ],
};

export interface AcompanhamentoConfig {
  titulo: string;
  descricao: string;
  colunasVisiveis: string[];
  itensPorPaginaPadrao: number;
}

export const COLUNAS_ACOMPANHAMENTO_MAP: Record<string, string[]> = {
  verChamado: ["verchamado", "ver chamado", "botão 'ver chamado'", "acao", "ações", "ação", "detalhes"],
  numero: ["numero", "número", "nº", "id", "#", "#id"],
  abertura: ["abertura", "data de abertura", "data", "criado em", "aberto em"],
  status: ["status", "situação", "status (chip)"],
  prioridade: ["prioridade", "prioridade (chip)"],
  sla: ["sla", "situação do sla"],
  prazo: ["prazo", "data/hora do prazo", "vencimento", "prazo limite"],
};

export function isColunaAcompAtiva(colunasVisiveis: string[] | undefined, colId: string): boolean {
  if (!colunasVisiveis || !Array.isArray(colunasVisiveis) || colunasVisiveis.length === 0) {
    return true;
  }
  const idLower = colId.toLowerCase().trim();
  const aliases = [idLower, ...(COLUNAS_ACOMPANHAMENTO_MAP[colId] || [])];
  return colunasVisiveis.some((c) => {
    const val = String(c).trim().toLowerCase();
    return aliases.includes(val);
  });
}

export const ACOMPANHAMENTO_PADRAO: AcompanhamentoConfig = {
  titulo: "Acompanhamento dos chamados",
  descricao: "Consulte seus chamados e acompanhe o status, prazo, prioridade e andamento do atendimento.",
  colunasVisiveis: ["verChamado", "numero", "abertura", "status", "prioridade", "sla", "prazo"],
  itensPorPaginaPadrao: 10,
};

export type TipoGrafico = "kpi" | "pizza" | "barras" | "historico";

export interface DashboardConfig {
  titulo: string;
  subtitulo: string;
  visaoPadrao: string;
  tipoGraficoPadrao: TipoGrafico;
  graficosAtivos: {
    kpi: boolean;
    pizza: boolean;
    barras: boolean;
    historico: boolean;
    gauge?: boolean;
    combinado?: boolean;
    serieHistorica?: boolean;
  };
}

export const DASHBOARD_PADRAO: DashboardConfig = {
  titulo: "Dashboard de chamados",
  subtitulo: "Indicadores públicos",
  visaoPadrao: "problemas",
  tipoGraficoPadrao: "kpi",
  graficosAtivos: {
    kpi: true,
    pizza: true,
    barras: true,
    historico: true,
  },
};

export interface RodapeConfig {
  textoDireitos: string;
  mostrarLgpd: boolean;
  exibirLinkLgpd?: boolean;
  rotuloLgpd: string;
  exibirWhatsapp?: boolean;
  whatsappSuporte?: string;
}

export const RODAPE_PADRAO: RodapeConfig = {
  textoDireitos: "© 2026 TI SENAI LRV • Todos os direitos reservados • Criado por Claudinei Lima",
  mostrarLgpd: true,
  exibirLinkLgpd: true,
  rotuloLgpd: "Privacidade e LGPD",
  exibirWhatsapp: true,
  whatsappSuporte: "66 99644-4461",
};

export type PapelUsuario = "admin" | "gestor" | "usuario";

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome?: string | null;
  fotoUrl?: string | null;
  role: PapelUsuario;
  bloqueado: boolean;
  ultimoAcesso?: string | null;
  createdAt: string;
}

export interface AvaliacaoChamado {
  id: number;
  ticketId: number;
  userId: string;
  userEmail?: string | null;
  nota: number; // 1 a 5
  comentario?: string | null;
  createdAt: string;
}

export interface AvaliacaoConfig {
  pergunta: string;
  opcoes: [string, string, string, string, string];
  placeholderComentario: string;
  agradecimento: string;
}

export const AVALIACAO_PADRAO: AvaliacaoConfig = {
  pergunta: "Como foi a facilidade de abrir este chamado?",
  opcoes: ["Muito difícil", "Difícil", "Regular", "Fácil", "Muito fácil"],
  placeholderComentario: "Deixe um comentário opcional sobre a sua experiência (até 300 caracteres)...",
  agradecimento: "Obrigado pela sua avaliação! Seu feedback nos ajuda a aprimorar o atendimento.",
};

export type VelocidadeAnimacao = "lenta" | "normal" | "rapida";

export interface AnimacaoCarregamentoConfig {
  ativo: boolean;
  velocidade: VelocidadeAnimacao;
  texto: string;
  gifUrl?: string | null;
}

export const ANIMACAO_CARREGAMENTO_PADRAO: AnimacaoCarregamentoConfig = {
  ativo: false,
  velocidade: "normal",
  texto: "Carregando...",
  gifUrl: null,
};

export interface IaSuporteConfig {
  promptSistema: string;
  maxTokensResposta: number;
  maxTokensAprimoramento: number;
  temperatura: number;
}

export const IA_SUPORTE_PADRAO: IaSuporteConfig = {
  promptSistema: `Você é o assistente técnico da Central de Chamados de TI do SENAI LRV. Sua saída é o texto final que será enviado diretamente ao solicitante no chamado.
Regras:
- Escreva a resposta pronta para uso. Nunca diga que está sugerindo ou recomendando. Proibido usar: 'sugiro', 'recomendo', 'poderia', 'talvez', 'aqui está', 'segue', 'espero ter ajudado', 'fico à disposição' e frases semelhantes.
- Sem introduções, explicações sobre a própria resposta, agradecimentos repetidos ou despedidas longas.
- Tom formal e cordial, técnico e objetivo. Saudação curta opcional ('Prezado(a),') e, se necessário, fechamento em uma linha ('Atenciosamente, Equipe de TI').
- Tamanho: até 5 linhas ou 80 palavras. Quando houver procedimento, use passos numerados curtos, uma ação por passo, no máximo 7 passos.
- Use terminologia técnica correta. Informe a causa provável e a ação a executar, em frases afirmativas e diretas (ex.: 'Reinicie o serviço de impressão.', 'Foi identificado falha de autenticação.').
- Se faltar informação essencial, faça uma única pergunta objetiva ou liste até 3 dados necessários.
- Não invente informações nem prometa prazos que não constem no chamado.
- Ao aprimorar um texto escrito pelo técnico: devolva somente o texto aprimorado, mais direto, técnico, formal e cordial, mantendo o sentido original, sem comentários.`,
  maxTokensResposta: 300,
  maxTokensAprimoramento: 400,
  temperatura: 0.2,
};

export interface Regras {
  prazos: Record<Prioridade, number>; // horas úteis
  expediente: {
    inicio: string;
    fim: string;
    dias: number[];
    horariosPorDia?: Record<number, { ativo: boolean; inicio: string; fim: string }>;
  }; // 1=seg ... 5=sex
  statusQuePausam: Status[];
  feriados: Feriado[];
  periodos: Periodo[];
  setores: string[];
  categorias: string[];
  responsaveis: string[];
  planilha?: { filtros: string[]; colunas: string[]; exportacao?: string[] | undefined };
  camposAbertura?: CampoAbertura[] | undefined;
  parametrosPrioridade?: ParametroCor[] | undefined;
  parametrosStatus?: ParametroCor[] | undefined;
  parametrosSla?: ParametroCor[] | undefined;
  lgpd?: LgpdConfig | undefined;
  // Painel Gerenciável
  identidadeVisual?: IdentidadeVisualConfig | undefined;
  paginaInicial?: PaginaInicialConfig | undefined;
  indicadores?: IndicadoresConfig | undefined;
  abrirChamado?: AbrirChamadoConfig | undefined;
  acompanhamento?: AcompanhamentoConfig | undefined;
  dashboard?: DashboardConfig | undefined;
  rodape?: RodapeConfig | undefined;
  avaliacoes?: AvaliacaoConfig | undefined;
  animacaoCarregamento?: AnimacaoCarregamentoConfig | undefined;
  iaSuporte?: IaSuporteConfig | undefined;
}

export const FILTROS_PLANILHA = ["Mês", "Busca", "Por página", "Categoria", "Setor", "SLA"] as const;
export const COLUNAS_PLANILHA = ["Ver chamado", "Nº", "Aberto em", "Solicitante", "Setor", "Descrição do problema", "Prioridade", "Status", "SLA", "Prazo", "Responsável", "Procedimento", "Fechado em", "E-mail", "WhatsApp", "Categoria"] as const;

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Abas mensais: Setembro/2026 até Dezembro/2026 */
export const MESES_DISPONIVEIS: { key: string; label: string; ano: number; mes: number }[] = [
  { key: "2026-09", label: "Setembro/2026", ano: 2026, mes: 9 },
  { key: "2026-10", label: "Outubro/2026", ano: 2026, mes: 10 },
  { key: "2026-11", label: "Novembro/2026", ano: 2026, mes: 11 },
  { key: "2026-12", label: "Dezembro/2026", ano: 2026, mes: 12 },
];

export interface ParametroCor {
  id: string;
  nome: string;
  bg: string;
  text: string;
}

export const PARAMETROS_PRIORIDADE_PADRAO: ParametroCor[] = [
  { id: "p1", nome: "Crítico", bg: "#EA4335", text: "#FFFFFF" }, // Vermelho
  { id: "p2", nome: "Alta", bg: "#FBBC04", text: "#202124" },    // Amarelo
  { id: "p3", nome: "Média", bg: "#34A853", text: "#FFFFFF" },   // Verde
  { id: "p4", nome: "Baixa", bg: "#1A73E8", text: "#FFFFFF" },   // Azul
];

export const PARAMETROS_STATUS_PADRAO: ParametroCor[] = [
  { id: "s1", nome: "Em atendimento", bg: "#34A853", text: "#FFFFFF" }, // Verde
  { id: "s2", nome: "Aguardando", bg: "#FA7B17", text: "#FFFFFF" },     // Laranja
  { id: "s3", nome: "Cancelado", bg: "#5F6368", text: "#FFFFFF" },      // Grafite
  { id: "s4", nome: "Aberto", bg: "#1A73E8", text: "#FFFFFF" },         // Azul
  { id: "s5", nome: "Resolvido", bg: "#0D652D", text: "#FFFFFF" },      // Verde escuro
];

export const PARAMETROS_SLA_PADRAO: ParametroCor[] = [
  { id: "sla1", nome: "No prazo", bg: "#34A853", text: "#FFFFFF" },   // Verde
  { id: "sla2", nome: "Estourado", bg: "#EA4335", text: "#FFFFFF" },  // Vermelho
  { id: "sla3", nome: "Cancelado", bg: "#5F6368", text: "#FFFFFF" },  // Grafite
  { id: "sla4", nome: "Aguardando", bg: "#FA7B17", text: "#FFFFFF" }, // Laranja
  { id: "sla5", nome: "—", bg: "#E8EAED", text: "#3C4043" },
];

export const CORES_PRIORIDADE: Record<string, { bg: string; text: string }> = {
  Crítico: { bg: "#EA4335", text: "#FFFFFF" },
  Crítica: { bg: "#EA4335", text: "#FFFFFF" },
  Alta: { bg: "#FBBC04", text: "#202124" },
  Média: { bg: "#34A853", text: "#FFFFFF" },
  Baixa: { bg: "#1A73E8", text: "#FFFFFF" },
};

export const CORES_STATUS: Record<string, { bg: string; text: string }> = {
  "Em atendimento": { bg: "#34A853", text: "#FFFFFF" },
  "Em andamento": { bg: "#34A853", text: "#FFFFFF" },
  Aguardando: { bg: "#FA7B17", text: "#FFFFFF" },
  Cancelado: { bg: "#5F6368", text: "#FFFFFF" },
  Aberto: { bg: "#1A73E8", text: "#FFFFFF" },
  Resolvido: { bg: "#0D652D", text: "#FFFFFF" },
};

export const CORES_SLA: Record<string, { bg: string; text: string }> = {
  "No prazo": { bg: "#34A853", text: "#FFFFFF" },
  Estourado: { bg: "#EA4335", text: "#FFFFFF" },
  Cancelado: { bg: "#5F6368", text: "#FFFFFF" },
  Aguardando: { bg: "#FA7B17", text: "#FFFFFF" },
  "—": { bg: "#E8EAED", text: "#3C4043" },
};

export interface LgpdConfig {
  titulo: string;
  subtitulo: string;
  ultimaAtualizacao: string;
  responsavel: string;
  dadosColetados: string;
  finalidade: string;
  compartilhamento: string;
  seguranca: string;
  direitos: string;
  mudancas: string;
}

export const LGPD_PADRAO: LgpdConfig = {
  titulo: "Privacidade e proteção dos seus dados",
  subtitulo:
    "Aqui explicamos, em linguagem simples, quais dados usamos ao atender seu chamado de TI e como a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) protege você.",
  ultimaAtualizacao: "Última atualização: outubro de 2026",
  responsavel:
    "O controlador dos dados é o proprietário do site o Sr. Claudinei Lima. A Central de Chamados de TI usa esses dados somente para prestar o suporte que você solicitou.",
  dadosColetados:
    "Coletamos apenas o estritamente necessário para autenticação, suporte e melhoria dos serviços:\n• Nome, e-mail e foto de perfil da conta Google ou Microsoft utilizados no login\n• Setor, sala ou local exato onde o problema ocorre\n• Descrição técnica da demanda ou problema informado\n• Avaliações e comentários voluntários sobre a facilidade de abertura do chamado\n• Histórico do atendimento: protocolo, status, procedimentos técnicos e prazos de SLA\n\nNão solicitamos dados sensíveis nem telefone. Evite incluir senhas, documentos pessoais ou informações confidenciais na descrição do chamado.",
  finalidade:
    "• Registrar, atender e acompanhar seu chamado de TI\n• Entrar em contato para esclarecer ou concluir o atendimento\n• Gerar indicadores gerais de atendimento, sem identificar pessoas\n• Manter a segurança do site.",
  compartilhamento:
    "Seus dados ficam acessíveis à equipe de TI responsável pelo atendimento. Só os compartilhamos com terceiros quando for necessário para prestar o suporte, quando a lei exigir ou por ordem de autoridade competente. Os indicadores exibidos na página inicial são números gerais e não identificam ninguém.",
  seguranca:
    "Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados, perda e alteração. O acesso aos chamados é restrito a quem precisa dele para o atendimento.\n\nGuardamos os dados pelo período legal. Depois disso, eles são eliminados ou anonimizados.",
  direitos:
    "Você pode pedir, a qualquer momento e sem custo:\n• Confirmar que tratamos seus dados e acessá-los\n• Corrigir dados incompletos, inexatos ou desatualizados\n• Pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei\n• Pedir a portabilidade dos dados, conforme regulamentação da ANPD\n• Saber com quais entidades públicas e privadas compartilhamos seus dados\n• Saber que pode não fornecer consentimento e quais as consequências\n• Revogar o consentimento, quando ele for a base do tratamento\n• Pedir a eliminação dos dados tratados com base no consentimento",
  mudancas:
    "Podemos atualizar este texto quando o sistema ou a legislação mudarem. A data da última revisão aparece no topo da página.",
};

export const REGRAS_PADRAO: Regras = {
  prazos: { Crítica: 2, Alta: 8, Média: 72, Baixa: 168 },
  expediente: { inicio: "08:00", fim: "18:00", dias: [1, 2, 3, 4, 5] },
  statusQuePausam: ["Aguardando"],
  feriados: [
    { id: "f1", data: "2026-10-12", nome: "Nossa Senhora Aparecida" },
    { id: "f2", data: "2026-11-02", nome: "Finados" },
    { id: "f3", data: "2026-11-15", nome: "Proclamação da República" },
    { id: "f4", data: "2026-11-20", nome: "Consciência Negra" },
    { id: "f5", data: "2026-12-25", nome: "Natal" },
  ],
  periodos: [
    {
      id: "p1",
      tipo: "Férias coletivas",
      descricao: "Recesso de fim de ano",
      inicio: "2026-12-23",
      fim: "2026-12-31",
    },
  ],
  setores: [
    "Secretaria",
    "TI",
    "Professor",
    "Área Técnica",
    "Coordenação",
    "SFIEMT",
    "GTI",
    "Gerência",
  ],
  categorias: [
    "Internet / Rede",
    "Impressora",
    "Computador / Notebook",
    "Sistema / Software",
    "WhatsApp / Comunicação",
    "E-mail / Office 365",
    "Projetor / Multimídia",
    "Telefonia",
    "Acesso / Senha",
    "Outros",
  ],
  responsaveis: ["Claudinei Lima"],
  planilha: {
    filtros: [...FILTROS_PLANILHA],
    colunas: [...COLUNAS_PLANILHA],
    exportacao: CAMPOS_EXPORTACAO.map((c) => c.id),
  },
  camposAbertura: [...CAMPOS_ABERTURA_PADRAO],
  parametrosPrioridade: [...PARAMETROS_PRIORIDADE_PADRAO],
  parametrosStatus: [...PARAMETROS_STATUS_PADRAO],
  parametrosSla: [...PARAMETROS_SLA_PADRAO],
  lgpd: { ...LGPD_PADRAO },
  identidadeVisual: { ...IDENTIDADE_VISUAL_PADRAO },
  paginaInicial: { ...PAGINA_INICIAL_PADRAO },
  indicadores: { ...INDICADORES_PADRAO },
  abrirChamado: { ...ABRIR_CHAMADO_PADRAO },
  acompanhamento: { ...ACOMPANHAMENTO_PADRAO },
  dashboard: { ...DASHBOARD_PADRAO },
  rodape: { ...RODAPE_PADRAO },
  avaliacoes: { ...AVALIACAO_PADRAO },
  animacaoCarregamento: { ...ANIMACAO_CARREGAMENTO_PADRAO },
  iaSuporte: { ...IA_SUPORTE_PADRAO },
};

