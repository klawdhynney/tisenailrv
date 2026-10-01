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
  { id: "local", label: "Local exato / Sala", obrigatorio: false, ativo: true, tipo: "text" },
  { id: "contato", label: "WhatsApp / Contato", obrigatorio: false, ativo: true, tipo: "text" },
  { id: "descricao", label: "Descrição do problema e local", obrigatorio: true, ativo: true, tipo: "textarea" },
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
  planilha?: { filtros: string[]; colunas: string[]; exportacao?: string[] };
  camposAbertura?: CampoAbertura[];
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

export const CORES_PRIORIDADE: Record<Prioridade, { bg: string; text: string }> = {
  Crítica: { bg: "#EA4335", text: "#FFFFFF" },
  Alta: { bg: "#FBBC04", text: "#202124" },
  Média: { bg: "#1A73E8", text: "#FFFFFF" },
  Baixa: { bg: "#34A853", text: "#FFFFFF" },
};

export const CORES_STATUS: Record<Status, { bg: string; text: string }> = {
  Aberto: { bg: "#E8EAED", text: "#3C4043" },
  "Em andamento": { bg: "#1A73E8", text: "#FFFFFF" },
  Aguardando: { bg: "#FBBC04", text: "#202124" },
  Resolvido: { bg: "#34A853", text: "#FFFFFF" },
  Cancelado: { bg: "#80868B", text: "#FFFFFF" },
};

export const CORES_SLA: Record<string, { bg: string; text: string }> = {
  "No prazo": { bg: "#34A853", text: "#FFFFFF" },
  Estourado: { bg: "#EA4335", text: "#FFFFFF" },
  Cancelado: { bg: "#80868B", text: "#FFFFFF" },
  "—": { bg: "#E8EAED", text: "#3C4043" },
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
};
