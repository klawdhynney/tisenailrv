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

export interface PausaSlaHistorico {
  id?: string;
  inicio: string; // ISO
  fim?: string | null; // ISO
  motivo: string;
  autor: string;
  segundosUteisPausados?: number;
}

export interface TicketMensagem {
  id: string;
  ticketId: number;
  userId?: string | null;
  autorNome: string;
  autorEmail: string;
  autorTipo: "solicitante" | "equipe" | "sistema";
  mensagem: string;
  criadoEm: string;
  editadoEm?: string | null;
  mensagemOriginal?: string | null;
  excluidoEm?: string | null;
  eventoTipo?: string | null;
}

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
  slaPausado?: boolean;
  slaPausadoEm?: string | null;
  slaPausaMotivo?: string | null;
  slaPausaAutor?: string | null;
  slaHistoricoPausas?: PausaSlaHistorico[];
  slaSegundosPausadosAcumulados?: number;
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

export type { ModoTema, PaletaId, PaletaPersonalizadaConfig, TemaConfig } from "./tema";
import { TEMA_CONFIG_PADRAO } from "./tema";

export interface IdentidadeVisualConfig {
  tituloSite: string;
  nome?: string;
  sigla?: string;
  subtitulo?: string;
  logoUrl?: string;
  logoAlt?: string;
  tituloUrl?: string;
  tituloAlt?: string;
  faviconUrl?: string;
  corPrimaria?: string;
  temaPadrao: "claro" | "escuro" | "pastel" | "auto";
}

export const IDENTIDADE_VISUAL_PADRAO: IdentidadeVisualConfig = {
  tituloSite: "TI SENAI LRV",
  nome: "SENAI Lucas do Rio Verde",
  sigla: "TI SENAI LRV",
  subtitulo: "Central de Atendimento ao Usuário",
  logoUrl: "/icone.png",
  logoAlt: "TI SENAI LRV",
  tituloUrl: "/titulo.png",
  tituloAlt: "TI SENAI LRV",
  faviconUrl: "/favicon.png",
  corPrimaria: "#1a73e8",
  temaPadrao: "auto",
};

export interface PaginaInicialConfig {
  badgeTexto: string;
  titulo: string;
  subtitulo: string;
  mostrarBanner: boolean;
  exibirBanner?: boolean;
  bannerUrl?: string;
  bannerAlt?: string;
  posicaoCapa?: "topo" | "centro" | "base";
  cardAbrirTitulo?: string;
  cardAbrirDesc?: string;
  cardAbrirBotao?: string;
  cardAcompTitulo?: string;
  cardAcompDesc?: string;
  cardAcompBotao?: string;
}

export const PAGINA_INICIAL_PADRAO: PaginaInicialConfig = {
  badgeTexto: "Atendimento de TI · SENAI LRV",
  titulo: "Bem-vindo à Central de Chamados de TI!",
  subtitulo: "Central oficial de suporte e serviços de Tecnologia da Informação do SENAI Lucas do Rio Verde.",
  mostrarBanner: true,
  exibirBanner: true,
  bannerUrl: "/capa.png",
  bannerAlt: "TI SENAI Lucas do Rio Verde",
  posicaoCapa: "centro",
  cardAbrirTitulo: "Abrir Chamado",
  cardAbrirDesc: "Registre solicitações de suporte, incidentes e demandas técnicas para triagem e atendimento imediato.",
  cardAbrirBotao: "Abrir chamado agora",
  cardAcompTitulo: "Acompanhar Chamados",
  cardAcompDesc: "Consulte o status operacional, prazos de SLA e histórico detalhado das solicitações registradas.",
  cardAcompBotao: "Acompanhar chamados",
};

export interface IndicadorItemConfig {
  titulo: string;
  desc: string;
  ativo: boolean;
}

export function obterDataHojeCuiaba(): string {
  const d = new Date();
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cuiaba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatador.format(d);
}

export function formatarDataHoraCuiaba(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "-";
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return String(isoOrDate);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Cuiaba",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(isoOrDate);
  }
}

export interface IndicadoresConfig {
  mostrar?: boolean;
  totalLabel?: string;
  totalDesc?: string;
  atendimentoLabel?: string;
  atendimentoDesc?: string;
  resolvidosLabel?: string;
  resolvidosDesc?: string;
  chamadosDiaLabel?: string;
  chamadosDiaDesc?: string;
  atendidosDiaLabel?: string;
  atendidosDiaDesc?: string;
  total: IndicadorItemConfig;
  atendimento: IndicadorItemConfig;
  resolvidos: IndicadorItemConfig;
  chamadosDia?: IndicadorItemConfig;
  atendidosDia?: IndicadorItemConfig;
}

export const INDICADORES_PADRAO: IndicadoresConfig = {
  mostrar: true,
  totalLabel: "Total de chamados",
  totalDesc: "Quantidade de chamados registrados.",
  atendimentoLabel: "Em atendimento",
  atendimentoDesc: "Chamados que estão sendo tratados pela equipe de TI.",
  resolvidosLabel: "Resolvidos",
  resolvidosDesc: "Chamados que já foram concluídos.",
  chamadosDiaLabel: "Chamados do dia",
  chamadosDiaDesc: "Chamados abertos hoje.",
  atendidosDiaLabel: "Atendidos no dia",
  atendidosDiaDesc: "Chamados concluídos hoje.",
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
  chamadosDia: {
    titulo: "Chamados do dia",
    desc: "Chamados abertos hoje.",
    ativo: true,
  },
  atendidosDia: {
    titulo: "Atendidos no dia",
    desc: "Chamados concluídos hoje.",
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
  sucessoTitulo?: string;
  sucessoDescricao?: string;
  botaoWhatsappTexto?: string;
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
  sucessoTitulo: "Chamado #{numero} enviado!",
  sucessoDescricao: "Sua solicitação foi registrada no sistema e encaminhada para a equipe técnica.",
  botaoWhatsappTexto: "Enviar chamado pelo WhatsApp",
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
  descricao?: string;
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
  ordemGraficos?: string[];
  titulosGraficos?: {
    kpi?: string;
    pizza?: string;
    barras?: string;
    historico?: string;
  };
  descricoesGraficos?: {
    kpi?: string;
    pizza?: string;
    barras?: string;
    historico?: string;
  };
}

export const DASHBOARD_PADRAO: DashboardConfig = {
  titulo: "Dashboard de chamados",
  subtitulo: "Indicadores públicos",
  descricao: "Métricas de transparência dos atendimentos de TI SENAI LRV.",
  visaoPadrao: "problemas",
  tipoGraficoPadrao: "kpi",
  graficosAtivos: {
    kpi: true,
    pizza: true,
    barras: true,
    historico: true,
  },
  ordemGraficos: ["kpi", "pizza", "barras", "historico"],
  titulosGraficos: {
    kpi: "Indicadores Principais",
    pizza: "Distribuição por Categoria",
    barras: "Volume por Categoria",
    historico: "Série Histórica Mensal",
  },
  descricoesGraficos: {
    kpi: "Resumo dos chamados abertos, em atendimento e resolvidos.",
    pizza: "Participação percentual de cada categoria de atendimento.",
    barras: "Comparativo quantitativo de chamados por categoria.",
    historico: "Evolução do volume de chamados mês a mês.",
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
  statusConta?: "ativo" | "bloqueado" | "pendente";
  provedor?: string | null;
  totalChamados?: number;
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
  perguntaAtendimento?: string;
  opcoes: [string, string, string, string, string];
  opcoesAtendimento?: [string, string, string, string, string];
  placeholderComentario: string;
  agradecimento: string;
  exibirResumoInicio?: boolean;
  tituloResumoInicio?: string;
  descricaoResumoInicio?: string;
  tituloDashboard?: string;
  subtituloDashboard?: string;
}

export const OPCOES_FACILIDADE_PADRAO: [string, string, string, string, string] = [
  "Muito difícil",
  "Difícil",
  "Regular",
  "Fácil",
  "Muito fácil",
];

export const OPCOES_SATISFACAO_PADRAO: [string, string, string, string, string] = [
  "Muito insatisfeito",
  "Insatisfeito",
  "Regular",
  "Satisfeito",
  "Muito satisfeito",
];

export const AVALIACAO_PADRAO: AvaliacaoConfig = {
  pergunta: "Como foi a facilidade de abrir este chamado?",
  perguntaAtendimento: "Como você avalia o atendimento recebido da equipe de TI?",
  opcoes: OPCOES_FACILIDADE_PADRAO,
  opcoesAtendimento: OPCOES_SATISFACAO_PADRAO,
  placeholderComentario: "Deixe um comentário opcional sobre a sua experiência (até 300 caracteres)...",
  agradecimento: "Obrigado pela sua avaliação! Seu feedback nos ajuda a aprimorar o atendimento.",
  exibirResumoInicio: true,
  tituloResumoInicio: "Avaliações dos usuários",
  descricaoResumoInicio: "Satisfação com a facilidade de abrir chamados.",
  tituloDashboard: "Métricas de Avaliação e Satisfação",
  subtituloDashboard: "Indicadores consolidados sobre a experiência do usuário e a qualidade dos atendimentos de TI.",
};

export interface AvaliacaoResumoPublico {
  total: number;
  media: number;
  satisfacao_pct: number;
  distribuicao: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  total_facilidade?: number;
  media_facilidade?: number;
  distribuicao_facilidade?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface AvaliacaoItemDashboard {
  id?: number;
  ticket_id: number;
  nota: number; // Satisfação do atendimento/chamado (1 a 5)
  nota_facilidade?: number | null; // Facilidade para abrir chamado (1 a 5)
  atendente?: string | null;
  categoria?: string | null;
  setor?: string | null;
  comentario?: string | null;
  created_at: string;
}

export const AVALIACAO_RESUMO_PUBLICO_PADRAO: AvaliacaoResumoPublico = {
  total: 0,
  media: 0,
  satisfacao_pct: 0,
  distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  total_facilidade: 0,
  media_facilidade: 0,
  distribuicao_facilidade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
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

export const PROMPT_SUGERIR_RESPOSTA_PADRAO = `Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Trate o chamado como uma pergunta ou pedido do solicitante e responda diretamente a ele, em primeira pessoa, como se já tivesse atendido: diga o que foi verificado, o que foi constatado e o que foi feito. Use os CHAMADOS RESOLVIDOS SEMELHANTES como referência de como a equipe costuma resolver; adapte ao chamado atual e não copie dados de outros chamados (nomes, locais, números). Linguagem simples, formal e cordial, até 3 frases (50 palavras), sem termos técnicos, sem markdown, sem dizer que está sugerindo, sem explicações. Exemplos: 'Solicito um mouse novo' -> 'Verifiquei o mouse anterior, constatei o defeito e realizei a substituição por um novo.' / 'Computador não liga' -> 'Fui até o local e verifiquei que a tomada estava desconectada; reconectei e o computador ligou normalmente.' Sem referência semelhante, responda com a solução mais comum para esse tipo de problema. Se faltar informação essencial, faça uma única pergunta simples. Não invente nomes, números ou prazos. Nunca peça senha.`;

export const PROMPT_APRIMORAR_TEXTO_PADRAO = `Você é revisor de textos de suporte de TI em português do Brasil. Reescreva o texto recebido: corrija ortografia, acentuação, concordância e pontuação, e expanda abreviações e gírias (q, pq, vc); complete frases inacabadas usando o contexto do chamado; reorganize para ficar claro, simples, formal e cordial. Mantenha sentido, fatos, números e nomes; não invente informações. Havendo qualquer erro ou margem de melhora, devolva uma versão melhorada e diferente da original; só devolva igual se estiver perfeito. Devolva somente o texto final, sem comentários, aspas ou markdown.`;

export const PROMPT_SUGERIR_ABERTURA_PADRAO = `Você ajuda o solicitante a descrever um problema de TI ao abrir um chamado. Com base nas opções escolhidas (setor, local, tipo de problema e demais campos), escreva a descrição em 1 a 2 frases simples e claras, em português do Brasil. Exemplo: setor Secretaria + local Recepção + problema Impressora -> 'Informo que a impressora da recepção, setor Secretaria, está com problemas.' Use somente as informações das opções; não invente sintomas, números ou prazos. Se já houver texto digitado, complemente-o em vez de substituí-lo. Devolva só o texto.`;

export const PROMPT_IA_SUPORTE_PADRAO = PROMPT_SUGERIR_RESPOSTA_PADRAO;

export interface IaConfigItem {
  ativo: boolean;
  prompt: string;
  maxTokens: number;
  temperatura?: number;
}

export interface IaConfigRespostaAtendimento extends IaConfigItem {
  usarChamadosResolvidos?: boolean;
  maxExemplosResolvidos?: number;
}

export interface IaSuporteConfig {
  respostaAtendimento: IaConfigRespostaAtendimento;
  aprimorarTexto: IaConfigItem;
  sugerirAbertura: IaConfigItem;

  // Campos legados para compatibilidade
  promptSistema?: string;
  maxTokensResposta?: number;
  maxTokensAprimoramento?: number;
  temperatura?: number;
  usarChamadosResolvidos?: boolean;
  maxExemplosResolvidos?: number;
}

export const IA_SUPORTE_PADRAO: IaSuporteConfig = {
  respostaAtendimento: {
    ativo: true,
    prompt: PROMPT_SUGERIR_RESPOSTA_PADRAO,
    maxTokens: 150,
    temperatura: 0.2,
    usarChamadosResolvidos: true,
    maxExemplosResolvidos: 5,
  },
  aprimorarTexto: {
    ativo: true,
    prompt: PROMPT_APRIMORAR_TEXTO_PADRAO,
    maxTokens: 150,
    temperatura: 0.2,
  },
  sugerirAbertura: {
    ativo: true,
    prompt: PROMPT_SUGERIR_ABERTURA_PADRAO,
    maxTokens: 100,
    temperatura: 0.2,
  },
  promptSistema: PROMPT_SUGERIR_RESPOSTA_PADRAO,
  maxTokensResposta: 150,
  maxTokensAprimoramento: 150,
  temperatura: 0.2,
  usarChamadosResolvidos: true,
  maxExemplosResolvidos: 5,
};

export interface WhatsappConfig {
  ativo: boolean;
  numeroDestino: string;
  modeloMensagem: string;
}

export const WHATSAPP_PADRAO: WhatsappConfig = {
  ativo: true,
  numeroDestino: "5566996444461",
  modeloMensagem: `Olá, equipe de TI do SENAI LRV! Registrei um novo chamado:
*Chamado:* #{numero}
*Título:* {titulo}
*Local:* {local}
*Descrição:* {descricao}`,
};

export interface AlertasEmailConfig {
  ativo: boolean;
  eventos: {
    status: boolean;
    novaResposta: boolean;
    slaPausadoRetomado: boolean;
    finalizacao: boolean;
  };
  nomeRemetente: string;
  emailResposta: string;
  modeloAssunto: string;
  modeloCorpo: string;
  modeloFinalizadoAssunto: string;
  modeloFinalizadoCorpo: string;
}

export const MODELO_CORPO_EMAIL_PADRAO = `Olá! O seu chamado de suporte nº {numero} recebeu uma nova atualização:

Status: {status}
Prioridade: {prioridade}
Prazo limite (SLA): {prazo}

Última resposta da equipe:
{resposta}

Para acompanhar os detalhes e responder à equipe de suporte, acesse o link abaixo:
{link}`;

export const MODELO_FINALIZADO_CORPO_PADRAO = `Olá! O seu chamado de suporte nº {numero} foi finalizado com sucesso:

Status: {status}
Prioridade: {prioridade}

Resumo do atendimento:
{resposta}

Data de conclusão: {prazo}

Caso precise de novo suporte, você pode abrir uma nova solicitação no portal.
{link}`;

export const ALERTAS_EMAIL_PADRAO: AlertasEmailConfig = {
  ativo: true,
  eventos: {
    status: true,
    novaResposta: true,
    slaPausadoRetomado: true,
    finalizacao: true,
  },
  nomeRemetente: "TI SENAI LRV",
  emailResposta: "suporte@tisenailrv.app",
  modeloAssunto: "Chamado nº {numero}: {status}",
  modeloCorpo: MODELO_CORPO_EMAIL_PADRAO,
  modeloFinalizadoAssunto: "Chamado nº {numero}: {status} (Concluído)",
  modeloFinalizadoCorpo: MODELO_FINALIZADO_CORPO_PADRAO,
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
  motivosPausaSla?: string[];
  planilha?: { filtros: string[]; colunas: string[]; exportacao?: string[] | undefined };
  camposAbertura?: CampoAbertura[] | undefined;
  parametrosPrioridade?: ParametroCor[] | undefined;
  parametrosStatus?: ParametroCor[] | undefined;
  parametrosSla?: ParametroCor[] | undefined;
  lgpd?: LgpdConfig | undefined;
  sobre?: SobreConfig | undefined;
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
  whatsapp?: WhatsappConfig | undefined;
  alertasEmail?: AlertasEmailConfig | undefined;
  temaConfig?: TemaConfig | undefined;
  menu?: MenuItemConfig[] | undefined;
  chat?: ChatConfig | undefined;
  login?: LoginConfig | undefined;
  seo?: SeoConfig | undefined;
  atendimento?: AtendimentoConfig | undefined;
  meusChamados?: MeusChamadosConfig | undefined;
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

export const MOTIVOS_PAUSA_SLA_PADRAO: string[] = [
  "Aguardando resposta do usuário",
  "Aguardando peça ou fornecedor",
  "Aguardando validação externa",
  "Equipamento em bancada",
  "Aguardando agendamento",
  "Outros",
];

export const PARAMETROS_SLA_PADRAO: ParametroCor[] = [
  { id: "sla1", nome: "No prazo", bg: "#34A853", text: "#FFFFFF" },   // Verde
  { id: "sla2", nome: "Estourado", bg: "#EA4335", text: "#FFFFFF" },  // Vermelho
  { id: "sla3", nome: "Cancelado", bg: "#5F6368", text: "#FFFFFF" },  // Grafite
  { id: "sla4", nome: "Aguardando", bg: "#FA7B17", text: "#FFFFFF" }, // Laranja
  { id: "sla5", nome: "SLA pausado", bg: "#F59E0B", text: "#000000" }, // Âmbar
  { id: "sla6", nome: "—", bg: "#E8EAED", text: "#3C4043" },
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
  "SLA pausado": { bg: "#F59E0B", text: "#000000" },
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
  controlador?: string;
  encarregado?: string;
  emailEncarregado?: string;
  baseLegal?: string;
  prazoGuarda?: string;
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
  controlador: "SENAI Lucas do Rio Verde / Claudinei Lima",
  encarregado: "Encarregado de Proteção de Dados (DPO) - TI SENAI LRV",
  emailEncarregado: "privacidade@tisenailrv.app",
  baseLegal: "Execução de contrato e legítimo interesse na prestação de serviços de tecnologia da informação.",
  prazoGuarda: "5 anos após a conclusão do atendimento para fins de auditoria e conformidade legal.",
};

export interface SobreConfig {
  badge?: string;
  titulo?: string;
  subtitulo?: string;
  secao1Titulo: string;
  secao1Texto: string;
  secao2Titulo: string;
  secao2Texto: string;
  secao3Titulo: string;
  secao3Texto: string;
  secao4Titulo: string;
  secao4Texto: string;
}

export const SOBRE_PADRAO: SobreConfig = {
  badge: "Informações Institucionais",
  titulo: "Central de Suporte e Atendimento de TI",
  subtitulo: "Conheça o propósito, a arquitetura e os pilares de tecnologia que impulsionam o suporte no SENAI Lucas do Rio Verde.",
  secao1Titulo: "💻 Sobre o Sistema de Suporte de TI",
  secao1Texto:
    "Nosso sistema foi desenvolvido para tornar a abertura de chamados mais simples e eficiente, garantindo que cada solicitação seja registrada de forma clara e organizada. As informações enviadas pelos usuários são fundamentais para que o suporte possa atuar com precisão e rapidez, além de alimentar o dashboard com dados relevantes para análises estratégicas.",
  secao2Titulo: "📊 Inteligência e Gestão",
  secao2Texto:
    "Com um painel moderno e interativo, gestores têm acesso a gráficos e indicadores que facilitam a tomada de decisão, permitindo identificar tendências, acompanhar desempenho e otimizar processos.",
  secao3Titulo: "🤖 Tecnologia Moderna com IA",
  secao3Texto:
    "A plataforma utiliza inteligência artificial para agilizar fluxos de trabalho, automatizar etapas e reduzir o tempo de resposta, proporcionando uma experiência mais eficiente tanto para usuários quanto para gestores.",
  secao4Titulo: "🔒 Privacidade e Conformidade com a LGPD",
  secao4Texto:
    "A segurança das informações é prioridade. Todos os dados são tratados com responsabilidade, seguindo as diretrizes da Lei Geral de Proteção de Dados (LGPD), garantindo privacidade e transparência no uso das informações.",
};

export interface MenuItemConfig {
  id: string;
  label: string;
  to: string;
  visivel: boolean;
  ordem: number;
}

export interface MenuConfig {
  itens: MenuItemConfig[];
}

export const MENU_PADRAO: MenuItemConfig[] = [
  { id: "inicio", label: "Início", to: "/", visivel: true, ordem: 1 },
  { id: "abrir", label: "Abrir Chamado", to: "/abrir", visivel: true, ordem: 2 },
  { id: "dashboard", label: "Dashboard", to: "/dashboard", visivel: true, ordem: 3 },
  { id: "meusChamados", label: "Meus Chamados", to: "/meus-chamados", visivel: true, ordem: 4 },
  { id: "atendimento", label: "Atendimento", to: "/atendimento", visivel: true, ordem: 5 },
  { id: "painel", label: "Painel de Ajustes", to: "/regras", visivel: true, ordem: 6 },
];

export interface ChatConfig {
  titulo: string;
  subtitulo: string;
  placeholderUsuario: string;
  placeholderEquipe: string;
  textoBotaoEnviar: string;
  textoCarregarAnteriores: string;
  textoVazio: string;
  avisoResolvido: string;
}

export const CHAT_PADRAO: ChatConfig = {
  titulo: "Conversa e Histórico do Chamado",
  subtitulo: "Histórico permanente e interação em tempo real entre solicitante e suporte",
  placeholderUsuario: "Escreva mais detalhes ou esclareça dúvidas com a equipe de TI... (Enter para enviar)",
  placeholderEquipe: "Escreva uma resposta ou orientação técnica para o solicitante... (Enter para enviar)",
  textoBotaoEnviar: "Enviar",
  textoCarregarAnteriores: "Carregar mensagens anteriores",
  textoVazio: "Nenhuma mensagem registrada ainda. Envie a primeira mensagem abaixo!",
  avisoResolvido: "Este chamado foi finalizado. O histórico completo de mensagens e eventos do sistema permanece salvo e auditável.",
};

export interface LoginConfig {
  badge: string;
  titulo: string;
  subtitulo: string;
  botaoApple: string;
  botaoGoogle: string;
  botaoMicrosoft: string;
  textoLgpd: string;
}

export const LOGIN_PADRAO: LoginConfig = {
  badge: "TI SENAI LRV",
  titulo: "Acesso ao Sistema",
  subtitulo: "Identifique-se com sua conta Apple, Google ou Microsoft para abrir chamados e acompanhar atendimentos.",
  botaoApple: "Entrar com Apple",
  botaoGoogle: "Entrar com Google",
  botaoMicrosoft: "Entrar com Microsoft",
  textoLgpd: "O acesso ao suporte técnico de TI é restrito aos colaboradores e alunos autenticados. Seus dados são protegidos conforme nossa Política de Privacidade e LGPD.",
};

export interface PaginaSeoItem {
  titulo: string;
  descricao: string;
}

export interface SeoConfig {
  inicio: PaginaSeoItem;
  abrir: PaginaSeoItem;
  dashboard: PaginaSeoItem;
  acompanhamento: PaginaSeoItem;
  avaliacoes: PaginaSeoItem;
  sobre: PaginaSeoItem;
  lgpd: PaginaSeoItem;
  login: PaginaSeoItem;
}

export const SEO_PADRAO: SeoConfig = {
  inicio: {
    titulo: "TI SENAI LRV | Início",
    descricao: "Central de Chamados de TI do SENAI LRV e indicadores de transparência.",
  },
  abrir: {
    titulo: "Abrir Chamado | TI SENAI LRV",
    descricao: "Formulário para abrir chamado de TI informando setor, descrição do problema e local.",
  },
  dashboard: {
    titulo: "Dashboard de Chamados | TI SENAI LRV",
    descricao: "Gráficos interativos e indicadores de atendimento de TI SENAI LRV.",
  },
  acompanhamento: {
    titulo: "Acompanhar Chamados | TI SENAI LRV",
    descricao: "Acompanhamento dos chamados de TI, status, prioridades e prazos de SLA.",
  },
  avaliacoes: {
    titulo: "Métricas de Avaliação e Satisfação | TI SENAI LRV",
    descricao: "Avaliações consolidadas dos usuários sobre a facilidade e qualidade do atendimento.",
  },
  sobre: {
    titulo: "Sobre o Sistema de Suporte | TI SENAI LRV",
    descricao: "Conheça o Sistema de Suporte de TI do SENAI LRV: gestão inteligente e conformidade LGPD.",
  },
  lgpd: {
    titulo: "Privacidade e Proteção de Dados (LGPD) | TI SENAI LRV",
    descricao: "Política de privacidade e proteção de dados pessoais da Central de Chamados de TI.",
  },
  login: {
    titulo: "Entrar | TI SENAI LRV",
    descricao: "Acesse seus chamados com autenticação segura institucional.",
  },
};

export interface AtendimentoConfig {
  titulo: string;
  subtitulo: string;
  placeholderBusca: string;
  itensPorPaginaPadrao: number;
}

export const ATENDIMENTO_PADRAO: AtendimentoConfig = {
  titulo: "Central de Atendimento ao Usuário",
  subtitulo: "Gerencie chamados, atualize status, registre procedimentos e acompanhe os prazos de SLA.",
  placeholderBusca: "Buscar por número, solicitante, setor, descrição...",
  itensPorPaginaPadrao: 20,
};

export interface MeusChamadosConfig {
  titulo: string;
  subtitulo: string;
  placeholderBusca: string;
  textoSemChamados: string;
  botaoAbrirNovo: string;
}

export const MEUS_CHAMADOS_PADRAO: MeusChamadosConfig = {
  titulo: "Meus Chamados",
  subtitulo: "Acompanhe suas solicitações, visualize prazos e interaja com a equipe de suporte.",
  placeholderBusca: "Buscar chamado por número ou assunto...",
  textoSemChamados: "Você ainda não possui chamados registrados.",
  botaoAbrirNovo: "Abrir novo chamado",
};

export interface ConfiguracaoHistoricoItem {
  id: number;
  secao: string;
  chave: string;
  descricao?: string | null;
  valorAnterior: any;
  valorNovo: any;
  alteradoPorEmail?: string | null;
  alteradoPorNome?: string | null;
  criadoEm: string;
}

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
  motivosPausaSla: [...MOTIVOS_PAUSA_SLA_PADRAO],
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
  whatsapp: { ...WHATSAPP_PADRAO },
  sobre: { ...SOBRE_PADRAO },
  alertasEmail: { ...ALERTAS_EMAIL_PADRAO },
  temaConfig: { ...TEMA_CONFIG_PADRAO },
  menu: [...MENU_PADRAO],
  chat: { ...CHAT_PADRAO },
  login: { ...LOGIN_PADRAO },
  seo: { ...SEO_PADRAO },
  atendimento: { ...ATENDIMENTO_PADRAO },
  meusChamados: { ...MEUS_CHAMADOS_PADRAO },
};

