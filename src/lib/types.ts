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

export interface Regras {
  prazos: Record<Prioridade, number>; // horas úteis
  expediente: { inicio: string; fim: string; dias: number[] }; // 1=seg ... 5=sex
  statusQuePausam: Status[];
  feriados: Feriado[];
  periodos: Periodo[];
  setores: string[];
  categorias: string[];
  responsaveis: string[];
  planilha?: { filtros: string[]; colunas: string[] };
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
  Crítica: { bg: "#FF0000", text: "#FFFFFF" },
  Alta: { bg: "#FFFF00", text: "#1F1F1F" },
  Média: { bg: "#00B050", text: "#FFFFFF" },
  Baixa: { bg: "#00B0F0", text: "#1F1F1F" },
};

export const CORES_STATUS: Record<Status, { bg: string; text: string }> = {
  Aberto: { bg: "#D9D9D9", text: "#1F1F1F" },
  "Em andamento": { bg: "#008000", text: "#FFFFFF" },
  Aguardando: { bg: "#FFFF00", text: "#1F1F1F" },
  Resolvido: { bg: "#00B050", text: "#FFFFFF" },
  Cancelado: { bg: "#7F7F7F", text: "#FFFFFF" },
};

export const CORES_SLA: Record<string, { bg: string; text: string }> = {
  "No prazo": { bg: "#00B050", text: "#FFFFFF" },
  Estourado: { bg: "#FF0000", text: "#FFFFFF" },
  Cancelado: { bg: "#7F7F7F", text: "#FFFFFF" },
  "—": { bg: "#D9D9D9", text: "#1F1F1F" },
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
  planilha: { filtros: [...FILTROS_PLANILHA], colunas: [...COLUNAS_PLANILHA] },
};
