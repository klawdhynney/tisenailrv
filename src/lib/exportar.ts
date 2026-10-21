import type { Ticket, Regras } from "./types";
import {
  extrairSetor,
  extrairLocal,
  obterRotuloStatus,
  CORES_PRIORIDADE,
  CORES_STATUS,
  CORES_SLA,
} from "./types";
import { calcularSla, formatarData, formatarDataHora } from "./sla";

export type LinhaExportacao = Record<string, string | number>;

function baixarBlob(conteudo: BlobPart, tipo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function escaparXml(valor: string | number) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Expressão regular para identificar e isolar qualquer apêndice inserido posteriormente ao chamado
 * (ex.: informações adicionais do solicitante, registros de chat ou avaliações de satisfação).
 */
const REGEX_APENDICE_DESCRICAO = /(?:[\r\n]+|\s+)(?:\[\s*(?:informa[cç][aã]o|info)\s+(?:adicional|complementar|do\s+solicitante|do\s+usu[aá]rio)(?:\s+em\s+[^\]]+)?\]\s*:?|informa[cç][aã]o\s+(?:adicional|complementar)(?:\s+do\s+solicitante)?\s*:?|informa[cç][aã]o\s+do\s+(?:solicitante|usu[aá]rio)\s*:?|(?:\[\s*)?avalia[cç][aã]o(?:\s+do\s+(?:usu[aá]rio|solicitante))?[^\]\r\n]*\]?\s*:?)/i;

/**
 * Retorna estritamente a descrição do problema original do chamado,
 * removendo qualquer acréscimo posterior (informações adicionais, avaliações com emoji, etc.),
 * garantindo que o relatório contenha apenas a descrição do problema.
 */
export function extrairApenasDescricao(texto: string): string {
  if (!texto) return "";
  let limpo = texto.replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();

  // Procurar apêndices adicionados ao chamado
  const match = limpo.search(REGEX_APENDICE_DESCRICAO);
  if (match !== -1) {
    limpo = limpo.slice(0, match).trim();
  }

  // Se por ventura sobrar apenas avaliação solta como [Avaliação do Usuário]...
  const matchAvaliacao = limpo.search(/(?:\[\s*)?avalia[cç][aã]o(?:\s+do\s+(?:usu[aá]rio|solicitante))?/i);
  if (matchAvaliacao !== -1) {
    limpo = limpo.slice(0, matchAvaliacao).trim();
  }

  // Limpa eventuais hífens, dois-pontos ou travessões soltos deixados no final após o corte
  limpo = limpo.replace(/[\s\-\–—:]+$/, "").trim();

  return limpo || texto.trim();
}

export function ticketsParaLinhas(tickets: Ticket[], camposSelecionados?: string[], regras?: Regras | null): LinhaExportacao[] {
  return tickets.map((t) => {
    const descricaoLimpa = extrairApenasDescricao(t.descricao || "");
    const linhaCompleta: LinhaExportacao = {
      Numero: t.id,
      Data: t.abertoEm,
      Hora: t.hora,
      Solicitante: t.solicitante,
      SolicitanteEmail: t.solicitanteEmail ?? "",
      Setor: extrairSetor(t.setor),
      Local: extrairLocal(t),
      Descricao: descricaoLimpa,
      Categoria: t.categoria ?? "",
      Prioridade: t.prioridade,
      Responsavel: t.responsavel ?? "",
      Status: obterRotuloStatus(t.status, regras),
      Fechamento: t.fechadoEm ?? "",
      Horario_fechamento: t.horario ?? "",
      Procedimento: t.procedimento ?? "",
      WhatsApp: t.contato ?? "",
    };

    if (camposSelecionados && camposSelecionados.length > 0) {
      const filtrada: LinhaExportacao = {};
      for (const campo of camposSelecionados) {
        const val = linhaCompleta[campo];
        if (val !== undefined) {
          filtrada[campo] = val;
        }
      }
      return filtrada;
    }

    return linhaCompleta;
  });
}

/**
 * Higieniza o texto da descrição do chamado para relatórios (PDF e Excel):
 * - Remove cumprimentos/saudações iniciais (ex: "Prezados,", "Olá,", "Bom dia,")
 * - Remove despedidas e formalidades finais (ex: "Agradeço a atenção.", "Atenciosamente,")
 * - Remove apêndices de avaliações e informações adicionais
 * - Colapsa espaços desnecessários e quebras de linha em branco, deixando o texto limpo, direto e legível.
 */
export function limparDescricaoParaRelatorio(texto: string): string {
  if (!texto) return "";

  // 1. Isola apenas a descrição do problema descartando apêndices
  const textoBase = extrairApenasDescricao(texto);

  // 2. Dividir em linhas para analisar cumprimentos e despedidas
  const linhas = textoBase
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 3. Expressões de cumprimento / saudação formal no início
  const padroesInicio = [
    /^(prezados?|prezadas?|prezado\(a\)s?|prezada\(o\)s?)\s*[,.:;-]?$/i,
    /^(ol[aá]|bom dia|boa tarde|boa noite|oi|sauda[cç][oõ]es)\s*[,.:;-]?$/i,
    /^(prezados?\s+(senhores?|colegas?|atendentes?|amigos?|equipe))\s*[,.:;-]?$/i,
    /^(a\/c\s+ti|aos\s+cuidados\s+da?\s+ti|equipe\s+de\s+ti|ao\s+suporte|suporte\s+ti)\s*[,.:;-]?$/i,
  ];

  // 4. Expressões de despedida / formalidade no final
  const padroesFim = [
    /^(agrade[cç]o(\s+a\s+aten[cç][aã]o|\s+desde\s+j[aá])?|desde\s+j[aá]\s+agrade[cç]o)\s*[.!]?$/i,
    /^(atenciosamente|cordialmente|grato|grata|obrigado|obrigada|valeu)\s*[,.:;!-]?$/i,
    /^(fico\s+no\s+aguardo|no\s+aguardo|atenciosamente,?\s*equipe)\s*[.!]?$/i,
  ];

  // Remove linhas iniciais de saudação
  while (linhas.length > 0 && padroesInicio.some((p) => p.test(linhas[0]))) {
    linhas.shift();
  }

  // Remove linhas finais de despedida
  while (linhas.length > 0 && padroesFim.some((p) => p.test(linhas[linhas.length - 1]))) {
    linhas.pop();
  }

  // 5. Junta as linhas restantes com espaço único, sem quebras desnecessárias
  let resultado = linhas.join(" ").replace(/\s+/g, " ").trim();

  // Limpeza adicional de prefixos ou sufixos inline caso não tenham sido linha separada
  resultado = resultado
    .replace(/^(prezados?|prezadas?|ol[aá]|bom dia|boa tarde|boa noite)\s*,\s*/i, "")
    .replace(/\s*(agrade[cç]o(\s+a\s+aten[cç][aã]o)?|atenciosamente|cordialmente)\s*[.!]?$/i, "")
    .trim();

  return resultado || textoBase;
}

export function ticketsParaLinhasAtendimento(
  tickets: Ticket[],
  colunasAtivas?: { id: string; label: string }[],
  regras?: Regras | null
): LinhaExportacao[] {
  return tickets.map((t) => {
    // Deixa apenas a descrição do problema, sem apêndices de informação adicional ou avaliações
    const descricaoFormatada = extrairApenasDescricao(t.descricao || "");

    // Se colunas específicas forem passadas explicitamente
    if (colunasAtivas && colunasAtivas.length > 0) {
      const sla = calcularSla(t, regras || ({} as Regras));
      const mapaValores: Record<string, string | number> = {
        atender: "",
        "Atender": "",
        numero: t.id,
        "Nº": t.id,
        abertoEm: formatarData(t.abertoEm, t.hora),
        "Aberto em": formatarData(t.abertoEm, t.hora),
        prioridade: t.prioridade,
        "Prioridade": t.prioridade,
        solicitante: t.solicitante,
        "Solicitante": t.solicitante,
        setor: extrairSetor(t.setor),
        "Setor": extrairSetor(t.setor),
        descricao: descricaoFormatada,
        "Descrição do problema": descricaoFormatada,
        status: obterRotuloStatus(t.status, regras),
        "Status": obterRotuloStatus(t.status, regras),
        slaPrazo: `${formatarDataHora(sla.prazo)} - ${sla.situacao}`,
        "SLA / Prazo": `${formatarDataHora(sla.prazo)} - ${sla.situacao}`,
        SLA: sla.situacao,
        sla: sla.situacao,
        procedimento: t.procedimento || "",
        "Procedimento": t.procedimento || "",
        fechadoEm: t.fechadoEm ? formatarData(t.fechadoEm, t.horario) : "—",
        "Fechado em": t.fechadoEm ? formatarData(t.fechadoEm, t.horario) : "—",
        responsavel: t.responsavel || "—",
        "Responsável": t.responsavel || "—",
        local: extrairLocal(t),
        "Local": extrairLocal(t),
        categoria: t.categoria || "",
        "Categoria": t.categoria || "",
        email: t.solicitanteEmail || "",
        "E-mail": t.solicitanteEmail || "",
        whatsapp: t.contato || "",
        "WhatsApp": t.contato || "",
      };

      const linha: LinhaExportacao = {};
      for (const col of colunasAtivas) {
        if (col.id === "atender" || col.label === "Atender") continue;
        const val = mapaValores[col.id] ?? mapaValores[col.label] ?? "";
        linha[col.label] = val;
      }
      return linha;
    }

    // Padrão oficial da planilha de atendimento: exatamente as 8 colunas da regra e do modelo
    return {
      "Nº": t.id,
      "Aberto em": formatarData(t.abertoEm, t.hora),
      "Solicitante": t.solicitante,
      "Setor": extrairSetor(t.setor),
      "Descrição do problema": descricaoFormatada,
      "Responsável": t.responsavel || "—",
      "Fechado em": t.fechadoEm ? formatarData(t.fechadoEm, t.horario) : "—",
      "Status": obterRotuloStatus(t.status, regras),
    };
  });
}

function letrasParaIndice(letras: string): number {
  let num = 0;
  for (let i = 0; i < letras.length; i++) {
    num = num * 26 + (letras.charCodeAt(i) - 64);
  }
  return num - 1;
}

export function aplicarEstiloPlanilha(
  planilha: any,
  linhas: LinhaExportacao[],
  corCabecalhoHex: string = "E26B00"
) {
  if (!planilha || !linhas || linhas.length === 0) return;
  const colunas = Object.keys(linhas[0] ?? {});

  const largurasPadrao: Record<string, number> = {
    "Nº": 9,
    "Numero": 9,
    "Aberto em": 19,
    "Data": 14,
    "Hora": 10,
    "Solicitante": 24,
    "Setor": 20,
    "Descrição do problema": 65,
    "Descricao": 65,
    "Responsável": 22,
    "Responsavel": 22,
    "Fechado em": 19,
    "Fechamento": 14,
    "Status": 18,
    "Prioridade": 14,
    "SLA": 16,
    "SLA / Prazo": 25,
    "Procedimento": 40,
    "Dimensão": 22,
    "Item / Descrição": 38,
    "Item / Categoria": 38,
    "Quantidade": 14,
    "Chamados": 14,
    "Participação": 16,
    "Porcentagem": 16,
  };

  const larguras = colunas.map((col) => {
    if (largurasPadrao[col]) {
      return { wch: largurasPadrao[col] };
    }
    let maxLen = col.length;
    for (const linha of linhas) {
      const val = linha[col];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        const primeiraLinhaLen = strVal.split("\n")[0]?.length ?? strVal.length;
        if (primeiraLinhaLen > maxLen) maxLen = primeiraLinhaLen;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 14), 65) };
  });
  planilha["!cols"] = larguras;

  // Altura do cabeçalho
  planilha["!rows"] = [{ hpt: 26 }];

  // AutoFiltro na primeira linha (ícone de filtro nas colunas como no Excel oficial)
  if (planilha["!ref"]) {
    planilha["!autofilter"] = { ref: planilha["!ref"] };
  }

  // Congelar primeira linha (cabeçalho)
  planilha["!freeze"] = { xSplit: "0", ySplit: "1" };
  planilha["!views"] = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Colunas centralizadas
  const colsCentralizadas = new Set([
    "Nº", "Numero", "Aberto em", "Data", "Hora", "Fechado em", "Fechamento", "Status", "Prioridade", "SLA", "Quantidade", "Chamados", "Participação", "Porcentagem"
  ]);

  for (const cellAddress in planilha) {
    if (cellAddress.startsWith("!")) continue;
    const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;

    const colLetras = match[1];
    const rowNum = parseInt(match[2], 10);
    const isHeader = rowNum === 1;
    const isEvenRow = rowNum % 2 === 0;

    const colIndex = letrasParaIndice(colLetras);
    const colNome = colunas[colIndex] ?? "";
    const isCentralizada = colsCentralizadas.has(colNome);

    const existingCell = planilha[cellAddress] || {};

    existingCell.s = isHeader
      ? {
          font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: corCabecalhoHex } },
          alignment: { wrapText: true, vertical: "center", horizontal: "center" },
        }
      : {
          font: { name: "Arial", sz: 11 },
          fill: isEvenRow && corCabecalhoHex === "E26B00"
            ? { fgColor: { rgb: "FDE8D3" } } // Pêssego suave para linhas alternadas no modelo da tabela oficial
            : isEvenRow
            ? { fgColor: { rgb: "F1F5F9" } }
            : { fgColor: { rgb: "FFFFFF" } },
          alignment: {
            wrapText: true,
            vertical: "center",
            horizontal: isCentralizada ? "center" : "left",
          },
        };

    planilha[cellAddress] = existingCell;
  }
}

export function exportarCsv(linhas: LinhaExportacao[], nome: string) {
  if (!linhas || linhas.length === 0) return;
  const colunas = Object.keys(linhas[0] ?? {});
  const conteudo = [
    colunas.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"),
    ...linhas.map((linha) =>
      colunas
        .map((c) => {
          const valor = linha[c] ?? "";
          return `"${String(valor).replace(/"/g, '""')}"`;
        })
        .join(";"),
    ),
  ].join("\r\n");

  const nomeFinal = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  baixarBlob(`\uFEFF${conteudo}`, "text/csv;charset=utf-8", nomeFinal);
}

export interface AbaPlanilhaXlsx {
  nomeAba: string;
  linhas: LinhaExportacao[];
  corCabecalho?: string;
}

export interface OpcoesExportacaoXlsx {
  abasAdicionais?: AbaPlanilhaXlsx[];
  corCabecalho?: string;
}

export async function exportarXlsx(
  linhas: LinhaExportacao[],
  nome: string,
  opcoes?: OpcoesExportacaoXlsx
) {
  if (!linhas || linhas.length === 0) return;
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const corCabecalho = opcoes?.corCabecalho || (nome.toLowerCase().includes("atendimento") ? "E26B00" : "1A73E8");
  const planilha = XLSX.utils.json_to_sheet(linhas);
  aplicarEstiloPlanilha(planilha, linhas, corCabecalho);
  XLSX.utils.book_append_sheet(workbook, planilha, "Chamados");

  if (opcoes?.abasAdicionais) {
    for (const aba of opcoes.abasAdicionais) {
      if (aba.linhas && aba.linhas.length > 0) {
        const sheetAba = XLSX.utils.json_to_sheet(aba.linhas);
        aplicarEstiloPlanilha(sheetAba, aba.linhas, aba.corCabecalho || "1A73E8");
        XLSX.utils.book_append_sheet(workbook, sheetAba, aba.nomeAba);
      }
    }
  }

  const nomeFinal = nome.endsWith(".xlsx") ? nome : `${nome}.xlsx`;
  XLSX.writeFile(workbook, nomeFinal);
}

export interface DadosConsolidadosExportacao {
  visao?: string;
  categorias?: { name: string; value: number }[];
  setores?: { name: string; value: number }[];
  prioridades?: { name: string; value: number }[];
  status?: { name: string; value: number }[];
  sla?: { name: string; value: number }[];
}

export interface OpcoesPlanilhaAtendimento {
  nome?: string;
  mes?: string;
  regras?: Regras | null;
  colunasAtivas?: { id: string; label: string }[];
  dadosConsolidados?: DadosConsolidadosExportacao;
}

export async function exportarPlanilhaAtendimentoXlsx(
  tickets: Ticket[],
  opcoes?: OpcoesPlanilhaAtendimento
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  // 1. Ordena os tickets por ID decrescente (mais recentes no topo, como no modelo oficial)
  const ticketsOrdenados = [...(tickets || [])].sort((a, b) => b.id - a.id);
  const linhasChamados = ticketsParaLinhasAtendimento(ticketsOrdenados, opcoes?.colunasAtivas, opcoes?.regras);

  // Se não houver chamados no recorte, inclui cabeçalho padrão com linha informativa
  const linhasParaPlanilha =
    linhasChamados.length > 0
      ? linhasChamados
      : [
          {
            "Nº": "",
            "Aberto em": "",
            "Solicitante": "",
            "Setor": "",
            "Descrição do problema": "Nenhum chamado registrado para os filtros selecionados.",
            "Responsável": "",
            "Fechado em": "",
            "Status": "",
          },
        ];

  const sheetChamados = XLSX.utils.json_to_sheet(linhasParaPlanilha);
  aplicarEstiloPlanilha(sheetChamados, linhasParaPlanilha, "E26B00");
  XLSX.utils.book_append_sheet(workbook, sheetChamados, "Chamados");

  // 2. Monta aba secundária: Balanço Consolidado (fornecendo tanto a planilha analítica quanto o balanço)
  const totalVal = ticketsOrdenados.length;
  const linhasBalanco: LinhaExportacao[] = [];
  const dadosCons = opcoes?.dadosConsolidados;

  // Status
  const statusItems =
    dadosCons?.status ||
    (() => {
      const mapa = new Map<string, number>();
      for (const t of ticketsOrdenados) {
        const st = obterRotuloStatus(t.status, opcoes?.regras);
        mapa.set(st, (mapa.get(st) ?? 0) + 1);
      }
      return [...mapa.entries()].map(([name, value]) => ({ name, value }));
    })();

  for (const item of statusItems) {
    const pct = totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%";
    linhasBalanco.push({
      "Dimensão": "Status do Chamado",
      "Item / Descrição": item.name,
      "Quantidade": item.value,
      "Participação": pct,
    });
  }

  // SLA
  const slaItems =
    dadosCons?.sla ||
    (() => {
      const mapa = new Map<string, number>();
      for (const t of ticketsOrdenados) {
        try {
          const sit = calcularSla(t, opcoes?.regras || ({} as Regras)).situacao;
          mapa.set(sit, (mapa.get(sit) ?? 0) + 1);
        } catch {
          mapa.set("—", (mapa.get("—") ?? 0) + 1);
        }
      }
      return ["No prazo", "Estourado", "SLA pausado", "Cancelado", "Aguardando", "—"]
        .filter((n) => mapa.has(n))
        .map((name) => ({ name, value: mapa.get(name) ?? 0 }));
    })();

  for (const item of slaItems) {
    const pct = totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%";
    linhasBalanco.push({
      "Dimensão": "Cumprimento de SLA",
      "Item / Descrição": item.name,
      "Quantidade": item.value,
      "Participação": pct,
    });
  }

  // Prioridades
  const prioridadesItems =
    dadosCons?.prioridades ||
    (() => {
      const mapa = new Map<string, number>();
      for (const t of ticketsOrdenados) {
        const p = t.prioridade || "Média";
        mapa.set(p, (mapa.get(p) ?? 0) + 1);
      }
      return [...mapa.entries()].map(([name, value]) => ({ name, value }));
    })();

  for (const item of prioridadesItems) {
    const pct = totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%";
    linhasBalanco.push({
      "Dimensão": "Prioridade",
      "Item / Descrição": item.name,
      "Quantidade": item.value,
      "Participação": pct,
    });
  }

  // Setores
  const setoresItems =
    dadosCons?.setores ||
    (() => {
      const mapa = new Map<string, number>();
      for (const t of ticketsOrdenados) {
        const s = extrairSetor(t.setor) || "Não informado";
        mapa.set(s, (mapa.get(s) ?? 0) + 1);
      }
      return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    })();

  for (const item of setoresItems) {
    const pct = totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%";
    linhasBalanco.push({
      "Dimensão": "Setor Solicitante",
      "Item / Descrição": item.name,
      "Quantidade": item.value,
      "Participação": pct,
    });
  }

  // Categorias
  const categoriasItems =
    dadosCons?.categorias ||
    (() => {
      const mapa = new Map<string, number>();
      for (const t of ticketsOrdenados) {
        const c = t.categoria || "Geral";
        mapa.set(c, (mapa.get(c) ?? 0) + 1);
      }
      return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    })();

  for (const item of categoriasItems) {
    const pct = totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%";
    linhasBalanco.push({
      "Dimensão": "Categoria / Assunto",
      "Item / Descrição": item.name,
      "Quantidade": item.value,
      "Participação": pct,
    });
  }

  if (linhasBalanco.length > 0) {
    const sheetBalanco = XLSX.utils.json_to_sheet(linhasBalanco);
    aplicarEstiloPlanilha(sheetBalanco, linhasBalanco, "1A73E8");
    XLSX.utils.book_append_sheet(workbook, sheetBalanco, "Balanço Consolidado");
  }

  const nomeArquivo = opcoes?.nome || "Planilha_Atendimento_TI";
  const nomeFinal = nomeArquivo.endsWith(".xlsx") ? nomeArquivo : `${nomeArquivo}.xlsx`;
  XLSX.writeFile(workbook, nomeFinal);
}

export function exportarXml(linhas: LinhaExportacao[], nome: string) {
  const registros = linhas
    .map(
      (linha) =>
        `<chamado>${Object.entries(linha)
          .map(([chave, valor]) => `<${chave}>${escaparXml(valor)}</${chave}>`)
          .join("")}</chamado>`,
    )
    .join("");
  const nomeFinal = nome.endsWith(".xml") ? nome : `${nome}.xml`;
  baixarBlob(`<?xml version="1.0" encoding="UTF-8"?><chamados>${registros}</chamados>`, "application/xml;charset=utf-8", nomeFinal);
}

async function obterIconeBase64(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 160;
        const pad = 6;
        const innerW = size - 2 * pad;
        const innerH = size - 2 * pad;
        const radius = innerW * 0.22;

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, size, size);

          const desenharCaminhoArredondado = (x: number, y: number, w: number, h: number, r: number) => {
            ctx.beginPath();
            if (typeof ctx.roundRect === "function") {
              ctx.roundRect(x, y, w, h, r);
            } else {
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.arcTo(x + w, y, x + w, y + r, r);
              ctx.lineTo(x + w, y + h - r);
              ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
              ctx.lineTo(x + r, y + h);
              ctx.arcTo(x, y, x, y + h - r, r);
              ctx.lineTo(x, y + r);
              ctx.arcTo(x, y, x + r, y, r);
              ctx.closePath();
            }
          };

          // 1. Recorte dos cantos arredondados (elimina 100% de qualquer fundo preto externo)
          ctx.save();
          desenharCaminhoArredondado(pad, pad, innerW, innerH, radius);
          ctx.clip();
          ctx.drawImage(img, pad - 1, pad - 1, innerW + 2, innerH + 2);
          ctx.restore();

          // 2. Borda branca suave com leve acabamento para destacar com elegância no cabeçalho azul
          ctx.save();
          desenharCaminhoArredondado(pad, pad, innerW, innerH, radius);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
          ctx.lineWidth = 3.2;
          ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
          ctx.shadowBlur = 3;
          ctx.stroke();
          ctx.restore();

          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch {
        // fallback
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = "/icone.png";
  });
}

export async function exportarPdf(linhas: LinhaExportacao[], nome: string, titulo: string) {
  if (!linhas || linhas.length === 0) return;
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const colunas = Object.keys(linhas[0] ?? {});
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const horaEmissao = new Date().toLocaleTimeString("pt-BR").slice(0, 5);

  // Orientação paisagem em A4 (297mm x 210mm) com margens de 10mm (largura útil = 277mm)
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Banner Cabeçalho com padrão de cores do projeto (Google Blue)
  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, "F");

  // Inserção do ícone oficial do site do lado esquerdo antes do título
  const iconeDataUrl = await obterIconeBase64();
  if (iconeDataUrl) {
    try {
      doc.addImage(iconeDataUrl, "PNG", 10, 3, 12, 12);
    } catch {
      // fallback silencioso
    }
  }

  const startTextX = iconeDataUrl ? 25 : 10;
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`TI SENAI LRV · ${titulo}`, startTextX, 9.5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Emitido em ${dataEmissao} às ${horaEmissao} · Total de registros: ${linhas.length} · Relatório oficial do sistema`,
    startTextX,
    15,
  );

  // Mapeamento de larguras adaptativas para que todas as informações fiquem visíveis sem corte
  const columnStyles: Record<number, any> = {};
  colunas.forEach((col, idx) => {
    if (col === "Nº" || col === "Numero") {
      columnStyles[idx] = { cellWidth: 14, halign: "center", fontStyle: "bold", textColor: [26, 115, 232] };
    } else if (col === "Aberto em" || col === "Data") {
      columnStyles[idx] = { cellWidth: 28, halign: "center" };
    } else if (col === "Solicitante") {
      columnStyles[idx] = { cellWidth: 32, halign: "left" };
    } else if (col === "Setor") {
      columnStyles[idx] = { cellWidth: 26, halign: "left" };
    } else if (col === "Descrição do problema" || col === "Descricao") {
      columnStyles[idx] = { cellWidth: 93, halign: "left" };
    } else if (col === "Responsável" || col === "Responsavel") {
      columnStyles[idx] = { cellWidth: 30, halign: "left" };
    } else if (col === "Fechado em" || col === "Fechamento") {
      columnStyles[idx] = { cellWidth: 28, halign: "center" };
    } else if (col === "Status") {
      columnStyles[idx] = { cellWidth: 26, halign: "center", fontStyle: "bold" };
    }
  });

  autoTable(doc, {
    startY: 22,
    head: [colunas],
    body: linhas.map((linha) => colunas.map((c) => String(linha[c] ?? ""))),
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      overflow: "linebreak", // Quebra automática de linha garantida
      textColor: [32, 33, 36],
      lineColor: [220, 224, 230],
      lineWidth: 0.12,
      valign: "middle",
    },
    headStyles: {
      fillColor: [26, 115, 232],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 2.8,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 10, right: 10, top: 22, bottom: 12 },
    rowPageBreak: "avoid",
  });

  // Numeração correta de páginas e rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `TI SENAI LRV · Documento oficial gerado pelo sistema · Emitido em ${dataEmissao} às ${horaEmissao}`,
      10,
      doc.internal.pageSize.getHeight() - 6,
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      doc.internal.pageSize.getWidth() - 28,
      doc.internal.pageSize.getHeight() - 6,
    );
  }

  const nomeFinal = nome.endsWith(".pdf") ? nome : `${nome}.pdf`;
  doc.save(nomeFinal);
}

export interface DashboardExportData {
  mesLabel: string;
  // Indicadores Principais (KPIs)
  total: number;
  andamento: number;
  resolvidos: number;
  chamadosDia?: number;
  atendidosDia?: number;
  taxaResolucao?: string;
  // Análise Categórica (5 dimensões)
  recorrentes: { name: string; value: number }[];
  setores: { name: string; value: number }[];
  prioridades: { name: string; value: number }[];
  status: { name: string; value: number }[];
  sla: { name: string; value: number }[];
  // Série Histórica (Evolução temporal)
  serieHistorica?: {
    mes: string;
    label: string;
    total: number;
    resolvidos: number;
    emAtendimento: number;
    taxa: string;
  }[];
  mediaMensalHistorica?: number;
  mesPicoHistorico?: { label: string; total: number };
  // Métricas de Avaliações e Satisfação
  avaliacoes?: {
    total: number;
    media: number;
    satisfacaoPct: number;
    mediaFacilidade?: number;
    distribuicao: { [key: number]: number };
  };
}

const CORES_GOOGLE_PALETA = [
  "#1a73e8", // Google Blue
  "#ea4335", // Google Red
  "#f9ab00", // Google Yellow
  "#34a853", // Google Green
  "#a142f4", // Google Purple
  "#24c1e0", // Google Cyan
  "#fa7b17", // Google Orange
  "#f439a0", // Google Pink
];

function obterCorItemGrafico(nome: string, index: number, tipoVisao: string): string {
  if (nome === "Outros") return "#94A3B8";
  if (tipoVisao === "sla") {
    return CORES_SLA[nome]?.bg || CORES_GOOGLE_PALETA[index % CORES_GOOGLE_PALETA.length];
  }
  if (tipoVisao === "prioridades") {
    return CORES_PRIORIDADE[nome]?.bg || CORES_GOOGLE_PALETA[index % CORES_GOOGLE_PALETA.length];
  }
  if (tipoVisao === "status") {
    return CORES_STATUS[nome]?.bg || CORES_GOOGLE_PALETA[index % CORES_GOOGLE_PALETA.length];
  }
  return CORES_GOOGLE_PALETA[index % CORES_GOOGLE_PALETA.length];
}

function desenharCaminhoArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | [number, number, number, number]
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rad = typeof r === "number" ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + rad[0], y);
  ctx.lineTo(x + w - rad[1], y);
  ctx.arcTo(x + w, y, x + w, y + rad[1], rad[1]);
  ctx.lineTo(x + w, y + h - rad[2]);
  ctx.arcTo(x + w, y + h, x + w - rad[2], y + h, rad[2]);
  ctx.lineTo(x + rad[3], y + h);
  ctx.arcTo(x, y + h, x, y + h - rad[3], rad[3]);
  ctx.lineTo(x, y + rad[0]);
  ctx.arcTo(x, y, x + rad[0], y, rad[0]);
  ctx.closePath();
}

/**
 * Gera imagem de alta resolução com os gráficos da dimensão categórica:
 * Rosca de Distribuição + Barras de Volume com percentuais + Card de Legenda com cores do site.
 */
function gerarGraficoCategoricoBase64(
  itens: { name: string; value: number }[],
  tipoVisao: "recorrentes" | "setores" | "prioridades" | "status" | "sla",
  tituloCurto: string,
  corHex: string
): string | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  const width = 1400;
  const height = 440;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo principal do card (estilo container do site)
  ctx.fillStyle = "#FFFFFF";
  desenharCaminhoArredondado(ctx, 0, 0, width, height, 16);
  ctx.fill();

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  desenharCaminhoArredondado(ctx, 1, 1, width - 2, height - 2, 16);
  ctx.stroke();

  const totalVal = itens.reduce((s, x) => s + x.value, 0);

  if (itens.length === 0 || totalVal === 0) {
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 16px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Nenhum chamado registrado para esta dimensão no período.", width / 2, height / 2);
    return canvas.toDataURL("image/png");
  }

  // Se houver mais que 6 itens, agrupa o excedente em "Outros"
  const maxItensExibir = 6;
  const itensProcessados: { name: string; value: number; cor: string; pct: number }[] = [];
  if (itens.length <= maxItensExibir) {
    itens.forEach((it, idx) => {
      itensProcessados.push({
        name: it.name,
        value: it.value,
        cor: obterCorItemGrafico(it.name, idx, tipoVisao),
        pct: totalVal > 0 ? (it.value / totalVal) * 100 : 0,
      });
    });
  } else {
    const top = itens.slice(0, maxItensExibir - 1);
    const resto = itens.slice(maxItensExibir - 1);
    const somaResto = resto.reduce((s, x) => s + x.value, 0);

    top.forEach((it, idx) => {
      itensProcessados.push({
        name: it.name,
        value: it.value,
        cor: obterCorItemGrafico(it.name, idx, tipoVisao),
        pct: totalVal > 0 ? (it.value / totalVal) * 100 : 0,
      });
    });

    if (somaResto > 0) {
      itensProcessados.push({
        name: "Outros",
        value: somaResto,
        cor: "#94A3B8",
        pct: totalVal > 0 ? (somaResto / totalVal) * 100 : 0,
      });
    }
  }

  // =========================================================================
  // COLUNA 1: DISTRIBUIÇÃO (GRÁFICO DE ROSCA / DONUT CHART) - x: 20 a 380
  // =========================================================================
  ctx.fillStyle = corHex;
  ctx.beginPath();
  ctx.arc(42, 38, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = corHex;
  ctx.font = "bold 13px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("DISTRIBUIÇÃO POR " + tituloCurto.toUpperCase(), 54, 38);

  const cx = 195;
  const cy = 245;
  const outerR = 135;
  const innerR = 62;

  let startAngle = -Math.PI / 2;
  itensProcessados.forEach((it) => {
    const sliceAngle = (it.value / totalVal) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.fillStyle = it.cor;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle, false);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    // Separador sutil branco entre fatias
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rótulo de porcentagem nas fatias maiores ou iguais a 5%
    if (it.pct >= 5) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = (outerR + innerR) / 2;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 12px 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(it.pct)}%`, lx, ly);
    }

    startAngle = endAngle;
  });

  // Centro do Donut
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0F172A";
  ctx.font = "900 30px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(totalVal), cx, cy - 7);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 10px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("TOTAL", cx, cy + 16);

  // Divisória vertical suave entre coluna 1 e coluna 2
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(385, 25);
  ctx.lineTo(385, height - 25);
  ctx.stroke();

  // =========================================================================
  // COLUNA 2: VOLUME (GRÁFICO DE BARRAS HORIZONTAIS) - x: 405 a 970
  // =========================================================================
  ctx.fillStyle = corHex;
  ctx.font = "bold 13px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VOLUME POR " + tituloCurto.toUpperCase(), 410, 32);

  ctx.fillStyle = "#64748B";
  ctx.font = "11px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Comparativo quantitativo e proporção dos registros", 410, 50);

  const numRows = itensProcessados.length;
  const barAreaTop = 75;
  const barAreaHeight = height - barAreaTop - 25;
  const rowHeight = barAreaHeight / numRows;
  const maxVal = Math.max(...itensProcessados.map((it) => it.value), 1);

  const barTrackStartX = 575;
  const barTrackWidth = 270;

  // Linhas de grade verticais sutis
  [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
    const gridX = barTrackStartX + barTrackWidth * ratio;
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gridX, barAreaTop);
    ctx.lineTo(gridX, barAreaTop + barAreaHeight);
    ctx.stroke();
  });

  itensProcessados.forEach((it, idx) => {
    const rowY = barAreaTop + idx * rowHeight;
    const barHeight = Math.min(22, rowHeight * 0.6);
    const barY = rowY + (rowHeight - barHeight) / 2;

    // Nome na esquerda
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12.5px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const nomeTruncado = it.name.length > 20 ? it.name.slice(0, 19) + "…" : it.name;
    ctx.fillText(nomeTruncado, barTrackStartX - 14, barY + barHeight / 2);

    // Track de fundo da barra
    ctx.fillStyle = "#F1F5F9";
    desenharCaminhoArredondado(ctx, barTrackStartX, barY, barTrackWidth, barHeight, 5);
    ctx.fill();

    // Barra preenchida
    const fillWidth = Math.max(8, (it.value / maxVal) * barTrackWidth);
    ctx.fillStyle = it.cor;
    desenharCaminhoArredondado(ctx, barTrackStartX, barY, fillWidth, barHeight, [0, 5, 5, 0]);
    ctx.fill();

    // Rótulo de contagem e porcentagem ao lado direito da barra: "10 (33.3%)"
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 12px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${it.value} (${it.pct.toFixed(1)}%)`, barTrackStartX + fillWidth + 10, barY + barHeight / 2);
  });

  // =========================================================================
  // COLUNA 3: LEGENDA (CARD DE LEGENDA DO SITE) - x: 990 a 1375
  // =========================================================================
  const cardLegendaX = 990;
  const cardLegendaY = 20;
  const cardLegendaW = 385;
  const cardLegendaH = height - 40;

  ctx.fillStyle = "#F8FAFC";
  desenharCaminhoArredondado(ctx, cardLegendaX, cardLegendaY, cardLegendaW, cardLegendaH, 14);
  ctx.fill();

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.2;
  desenharCaminhoArredondado(ctx, cardLegendaX, cardLegendaY, cardLegendaW, cardLegendaH, 14);
  ctx.stroke();

  // Cabeçalho da Legenda: "LEGENDA" e "X chamados"
  ctx.fillStyle = "#1A73E8";
  ctx.font = "900 12px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("LEGENDA", cardLegendaX + 16, cardLegendaY + 22);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 11px monospace, Courier, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${totalVal} chamados`, cardLegendaX + cardLegendaW - 16, cardLegendaY + 22);

  // Linha separadora do cabeçalho da legenda
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardLegendaX + 14, cardLegendaY + 40);
  ctx.lineTo(cardLegendaX + cardLegendaW - 14, cardLegendaY + 40);
  ctx.stroke();

  // Lista de Itens da Legenda
  const legListTop = cardLegendaY + 46;
  const legListHeight = cardLegendaH - 52;
  const legRowHeight = legListHeight / numRows;

  itensProcessados.forEach((it, idx) => {
    const itemCenterY = legListTop + idx * legRowHeight + legRowHeight / 2;

    // Dot circular colorido
    ctx.fillStyle = it.cor;
    ctx.beginPath();
    ctx.arc(cardLegendaX + 22, itemCenterY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Nome do item na legenda
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const nomeLeg = it.name.length > 18 ? it.name.slice(0, 17) + "…" : it.name;
    ctx.fillText(nomeLeg, cardLegendaX + 36, itemCenterY);

    // Contagem e porcentagem: "10 (33.3%)" alinhados à direita
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 11.5px monospace, Courier, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${it.value} (${it.pct.toFixed(1)}%)`, cardLegendaX + cardLegendaW - 16, itemCenterY);
  });

  return canvas.toDataURL("image/png");
}

/**
 * Gera imagem de alta resolução com a curva da Série Histórica (evolução temporal mês a mês).
 */
function gerarGraficoHistoricoBase64(
  serie: {
    mes: string;
    label: string;
    total: number;
    resolvidos: number;
    emAtendimento: number;
    taxa: string;
  }[]
): string | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  const width = 1400;
  const height = 440;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo principal do card
  ctx.fillStyle = "#FFFFFF";
  desenharCaminhoArredondado(ctx, 0, 0, width, height, 16);
  ctx.fill();

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  desenharCaminhoArredondado(ctx, 1, 1, width - 2, height - 2, 16);
  ctx.stroke();

  if (serie.length === 0) {
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 16px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Nenhum dado histórico registrado.", width / 2, height / 2);
    return canvas.toDataURL("image/png");
  }

  // Cabeçalho da Série Histórica
  ctx.fillStyle = "#7C3AED";
  ctx.font = "bold 13px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("SÉRIE HISTÓRICA CONTÍNUA (EVOLUÇÃO TEMPORAL)", 35, 32);

  ctx.fillStyle = "#64748B";
  ctx.font = "11px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Evolução mês a mês dos chamados registrados, resolvidos e em andamento", 35, 50);

  // Legenda no canto superior direito
  const legendas = [
    { label: "Total de Chamados", cor: "#1A73E8" },
    { label: "Finalizados", cor: "#34A853" },
    { label: "Em Atendimento", cor: "#F9AB00" },
  ];
  let legX = width - 40;
  ctx.textAlign = "right";
  legendas.reverse().forEach((leg) => {
    ctx.font = "bold 11px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText(leg.label, legX, 40);
    const textWidth = ctx.measureText(leg.label).width;

    ctx.fillStyle = leg.cor;
    ctx.beginPath();
    ctx.arc(legX - textWidth - 10, 40, 5, 0, Math.PI * 2);
    ctx.fill();

    legX -= textWidth + 30;
  });

  // Área do gráfico
  const padLeft = 70;
  const padRight = 50;
  const padTop = 80;
  const padBottom = 55;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...serie.map((s) => Math.max(s.total, s.resolvidos, s.emAtendimento)), 5);
  const maxTeto = Math.ceil(maxVal / 5) * 5;

  // Linhas de grade horizontais e números no eixo Y
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const valStep = Math.round((maxTeto / gridSteps) * (gridSteps - i));
    const gridY = padTop + (chartH / gridSteps) * i;

    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padLeft, gridY);
    ctx.lineTo(padLeft + chartW, gridY);
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 11px monospace, Courier, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(valStep), padLeft - 12, gridY);
  }

  const obterPonto = (idx: number, valor: number) => {
    const x = serie.length === 1 ? padLeft + chartW / 2 : padLeft + (idx / (serie.length - 1)) * chartW;
    const y = padTop + chartH - (valor / maxTeto) * chartH;
    return { x, y };
  };

  const desenharSerie = (chave: "total" | "resolvidos" | "emAtendimento", cor: string, gradienteCor: string) => {
    const pontos = serie.map((s, idx) => obterPonto(idx, s[chave]));

    // Preenchimento de área sob a curva
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, gradienteCor);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, padTop + chartH);
    ctx.lineTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) {
      ctx.lineTo(pontos[i].x, pontos[i].y);
    }
    ctx.lineTo(pontos[pontos.length - 1].x, padTop + chartH);
    ctx.closePath();
    ctx.fill();

    // Linha principal da série
    ctx.strokeStyle = cor;
    ctx.lineWidth = chave === "total" ? 3.8 : 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) {
      ctx.lineTo(pontos[i].x, pontos[i].y);
    }
    ctx.stroke();

    // Pontos (círculos com centro branco e borda colorida)
    pontos.forEach((p, idx) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = cor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (chave === "total") {
        ctx.fillStyle = "#0F172A";
        ctx.font = "900 12px 'Helvetica Neue', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(serie[idx].total), p.x, p.y - 8);
      }
    });
  };

  desenharSerie("emAtendimento", "#F9AB00", "rgba(249, 171, 0, 0.22)");
  desenharSerie("resolvidos", "#34A853", "rgba(52, 168, 83, 0.25)");
  desenharSerie("total", "#1A73E8", "rgba(26, 115, 232, 0.32)");

  // Rótulos dos meses no eixo X
  serie.forEach((s, idx) => {
    const p = obterPonto(idx, 0);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 11.5px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(s.label, p.x, padTop + chartH + 12);
  });

  return canvas.toDataURL("image/png");
}

export async function exportarDashboardCompletoPdf(dados: DashboardExportData, nome: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const autoTable = autoTableModule.default;
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const horaEmissao = new Date().toLocaleTimeString("pt-BR").slice(0, 5);
  const iconeDataUrl = await obterIconeBase64();

  const desenharBannerTopo = (tituloSecao = "Dashboard Completo de Indicadores") => {
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, 210, 22, "F");

    if (iconeDataUrl) {
      try {
        doc.addImage(iconeDataUrl, "PNG", 12, 3.5, 15, 15);
      } catch {
        // fallback
      }
    }

    const startX = iconeDataUrl ? 30 : 14;
    doc.setFontSize(13.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`TI SENAI LRV · ${tituloSecao}`, startX, 10.5);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${dados.mesLabel} | Emitido em: ${dataEmissao} às ${horaEmissao} | Sistema de Chamados TI SENAI LRV`,
      startX,
      17,
    );
  };

  // Página 1: Banner e Indicadores Gerais
  desenharBannerTopo();
  let currentY = 30;

  // 1. INDICADORES PRINCIPAIS (KPIs)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 115, 232);
  doc.text("1. Indicadores Principais (KPIs Operacionais)", 14, currentY);
  currentY += 3;

  const kpisBody = [
    [
      "Total de Chamados",
      String(dados.total),
      "Em Atendimento (Ativos)",
      String(dados.andamento),
      "Finalizados / Resolvidos",
      String(dados.resolvidos),
    ],
    [
      "Taxa de Finalização",
      dados.taxaResolucao ?? (dados.total > 0 ? `${((dados.resolvidos / dados.total) * 100).toFixed(1)}%` : "0%"),
      "Chamados Abertos Hoje",
      String(dados.chamadosDia ?? 0),
      "Chamados Concluídos Hoje",
      String(dados.atendidosDia ?? 0),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: kpisBody,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: [32, 33, 36],
      lineColor: [220, 224, 230],
    },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [241, 243, 244], textColor: [95, 99, 104] },
      1: { fontStyle: "bold", halign: "center", textColor: [26, 115, 232], fontSize: 11 },
      2: { fontStyle: "bold", fillColor: [241, 243, 244], textColor: [95, 99, 104] },
      3: { fontStyle: "bold", halign: "center", textColor: [249, 171, 0], fontSize: 11 },
      4: { fontStyle: "bold", fillColor: [241, 243, 244], textColor: [95, 99, 104] },
      5: { fontStyle: "bold", halign: "center", textColor: [52, 168, 83], fontSize: 11 },
    },
    margin: { left: 14, right: 14 },
    rowPageBreak: "avoid",
  });

  // @ts-expect-error autoTable attaches lastAutoTable
  currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 9;

  // 2. AVALIAÇÕES E SATISFAÇÃO DOS USUÁRIOS
  if (dados.avaliacoes && dados.avaliacoes.total > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11);
    doc.text("2. Métricas de Avaliação e Satisfação dos Usuários", 14, currentY);
    currentY += 3;

    const av = dados.avaliacoes;
    const totalAv = av.total || 1;
    const dist = av.distribuicao || {};

    const resumoAvaliacoesBody = [
      [
        "Total de Avaliações",
        String(av.total),
        "Média de Satisfação",
        `${av.media.toFixed(1)} / 5.0 ⭐`,
        "Índice de Satisfação",
        `${av.satisfacaoPct}%`,
      ],
      [
        "Facilidade de Abertura",
        av.mediaFacilidade ? `${av.mediaFacilidade.toFixed(1)} / 5.0` : "—",
        "Percepção Positiva (4-5★)",
        `${((((dist[5] || 0) + (dist[4] || 0)) / totalAv) * 100).toFixed(0)}%`,
        "Necessita Atenção (1-2★)",
        `${((((dist[1] || 0) + (dist[2] || 0)) / totalAv) * 100).toFixed(0)}%`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      body: resumoAvaliacoesBody,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [32, 33, 36],
        lineColor: [220, 224, 230],
      },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [255, 251, 235], textColor: [146, 64, 14] },
        1: { fontStyle: "bold", halign: "center", textColor: [32, 33, 36] },
        2: { fontStyle: "bold", fillColor: [255, 251, 235], textColor: [146, 64, 14] },
        3: { fontStyle: "bold", halign: "center", textColor: [217, 119, 6], fontSize: 11 },
        4: { fontStyle: "bold", fillColor: [255, 251, 235], textColor: [146, 64, 14] },
        5: { fontStyle: "bold", halign: "center", textColor: [52, 168, 83], fontSize: 11 },
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: "avoid",
    });

    // @ts-expect-error autoTable attaches lastAutoTable
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 4;

    const distribuicaoEstrelasBody = [
      [
        "5 Estrelas (Excelente)",
        String(dist[5] || 0),
        `${(((dist[5] || 0) / totalAv) * 100).toFixed(1)}%`,
      ],
      [
        "4 Estrelas (Muito Bom)",
        String(dist[4] || 0),
        `${(((dist[4] || 0) / totalAv) * 100).toFixed(1)}%`,
      ],
      [
        "3 Estrelas (Regular)",
        String(dist[3] || 0),
        `${(((dist[3] || 0) / totalAv) * 100).toFixed(1)}%`,
      ],
      [
        "2 Estrelas (Ruim)",
        String(dist[2] || 0),
        `${(((dist[2] || 0) / totalAv) * 100).toFixed(1)}%`,
      ],
      [
        "1 Estrela (Péssimo)",
        String(dist[1] || 0),
        `${(((dist[1] || 0) / totalAv) * 100).toFixed(1)}%`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Classificação por Estrelas", "Quantidade de Avaliações", "Participação (%)"]],
      body: distribuicaoEstrelasBody,
      theme: "striped",
      styles: {
        fontSize: 9.5,
        cellPadding: 2,
        textColor: [32, 33, 36],
      },
      headStyles: {
        fillColor: [245, 158, 11],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 43, halign: "center" },
        2: { cellWidth: 44, halign: "center" },
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: "avoid",
    });

    // @ts-expect-error autoTable attaches lastAutoTable
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 9;
  }

  // Função auxiliar para seções analíticas categóricas com inclusão do gráfico visual e tabela detalhada
  const criarSecaoCategorica = (
    titulo: string,
    itens: { name: string; value: number }[],
    corHeader: [number, number, number],
    tipoVisao: "recorrentes" | "setores" | "prioridades" | "status" | "sla",
    tituloCurto: string,
    corHex: string,
  ) => {
    const totalSecao = itens.reduce((s, x) => s + x.value, 0);
    const body =
      itens.length === 0
        ? [["Nenhum registro para o período", "0", "0%"]]
        : itens.map((it) => {
            const pct = totalSecao > 0 ? `${((it.value / totalSecao) * 100).toFixed(1)}%` : "0%";
            return [it.name, String(it.value), pct];
          });

    const chartHeightMm = 58;

    // Se o título + gráfico não couberem na página atual, abre nova página
    if (currentY + chartHeightMm + 24 > 275) {
      doc.addPage();
      desenharBannerTopo();
      currentY = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(corHeader[0], corHeader[1], corHeader[2]);
    doc.text(titulo, 14, currentY);
    currentY += 4;

    // Renderiza o gráfico visual com Rosca de Distribuição, Barras de Volume e Legenda do site
    try {
      const chartImg = gerarGraficoCategoricoBase64(itens, tipoVisao, tituloCurto, corHex);
      if (chartImg) {
        doc.addImage(chartImg, "PNG", 14, currentY, 182, chartHeightMm);
        currentY += chartHeightMm + 5;
      }
    } catch (err) {
      console.error("Erro ao desenhar gráfico no PDF:", err);
    }

    // Se a tabela não couber após o gráfico, move para a próxima página
    if (currentY > 260) {
      doc.addPage();
      desenharBannerTopo();
      currentY = 30;
    }

    autoTable(doc, {
      startY: currentY,
      head: [["Item / Dimensão", "Chamados Registrados", "Participação (%)"]],
      body,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 2.2,
        overflow: "linebreak",
        textColor: [32, 33, 36],
      },
      headStyles: {
        fillColor: corHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 102 },
        1: { cellWidth: 40, halign: "center" },
        2: { cellWidth: 40, halign: "center" },
      },
      margin: { left: 14, right: 14, bottom: 15 },
      rowPageBreak: "avoid",
    });

    // @ts-expect-error autoTable attaches lastAutoTable
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 9;
  };

  // 3. ANÁLISE CATEGÓRICA MULTIDIMENSIONAL COM TODOS OS GRÁFICOS DO SITE
  criarSecaoCategorica(
    "3. Chamados Recorrentes (Categorias / Motivos)",
    dados.recorrentes,
    [26, 115, 232],
    "recorrentes",
    "Categoria",
    "#1a73e8",
  );
  criarSecaoCategorica(
    "4. Chamados por Setores Solicitantes",
    dados.setores,
    [234, 67, 53],
    "setores",
    "Setor",
    "#ea4335",
  );
  criarSecaoCategorica(
    "5. Prioridades dos Chamados",
    dados.prioridades,
    [249, 171, 0],
    "prioridades",
    "Prioridade",
    "#f9ab00",
  );
  criarSecaoCategorica(
    "6. Status dos Chamados",
    dados.status,
    [52, 168, 83],
    "status",
    "Status",
    "#34a853",
  );
  criarSecaoCategorica(
    "7. SLA / Prazos dos Chamados",
    dados.sla,
    [161, 66, 244],
    "sla",
    "SLA",
    "#a142f4",
  );

  // 4. SÉRIE HISTÓRICA (EVOLUÇÃO TEMPORAL MÊS A MÊS)
  if (dados.serieHistorica && dados.serieHistorica.length > 0) {
    const histChartHeightMm = 60;
    if (currentY + histChartHeightMm + 24 > 275) {
      doc.addPage();
      desenharBannerTopo();
      currentY = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(124, 58, 237);
    doc.text("8. Série Histórica de Chamados (Evolução Temporal)", 14, currentY);
    currentY += 4;

    try {
      const histChartImg = gerarGraficoHistoricoBase64(dados.serieHistorica);
      if (histChartImg) {
        doc.addImage(histChartImg, "PNG", 14, currentY, 182, histChartHeightMm);
        currentY += histChartHeightMm + 5;
      }
    } catch (err) {
      console.error("Erro ao desenhar gráfico da série histórica no PDF:", err);
    }

    // Resumo executivo da série histórica
    const totalHistorico = dados.serieHistorica.reduce((acc, it) => acc + it.total, 0);
    const totalResolvidosHist = dados.serieHistorica.reduce((acc, it) => acc + it.resolvidos, 0);
    const mediaMensal = dados.mediaMensalHistorica ?? Math.round(totalHistorico / dados.serieHistorica.length);
    const mesPico = dados.mesPicoHistorico ?? [...dados.serieHistorica].sort((a, b) => b.total - a.total)[0];

    const resumoHistoricoBody = [
      [
        "Volume Total Acumulado",
        String(totalHistorico),
        "Finalizados no Histórico",
        String(totalResolvidosHist),
      ],
      [
        "Média Mensal de Atendimentos",
        `${mediaMensal} chamados/mês`,
        "Mês com Maior Pico",
        mesPico ? `${mesPico.label} (${mesPico.total})` : "—",
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      body: resumoHistoricoBody,
      theme: "grid",
      styles: {
        fontSize: 9.5,
        cellPadding: 2.5,
        textColor: [32, 33, 36],
      },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [245, 243, 255], textColor: [109, 40, 217] },
        1: { fontStyle: "bold", halign: "center", textColor: [32, 33, 36] },
        2: { fontStyle: "bold", fillColor: [245, 243, 255], textColor: [109, 40, 217] },
        3: { fontStyle: "bold", halign: "center", textColor: [124, 58, 237] },
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: "avoid",
    });

    // @ts-expect-error autoTable attaches lastAutoTable
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 4;

    const tabelaHistoricaBody = dados.serieHistorica.map((h) => [
      h.label,
      String(h.total),
      String(h.resolvidos),
      String(h.emAtendimento),
      h.taxa,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Mês / Ano", "Total Registrado", "Finalizados", "Em Atendimento", "Taxa de Resolução"]],
      body: tabelaHistoricaBody,
      theme: "striped",
      styles: {
        fontSize: 9.5,
        cellPadding: 2.2,
        textColor: [32, 33, 36],
      },
      headStyles: {
        fillColor: [124, 58, 237],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 58 },
        1: { cellWidth: 32, halign: "center", fontStyle: "bold", textColor: [26, 115, 232] },
        2: { cellWidth: 32, halign: "center", textColor: [52, 168, 83] },
        3: { cellWidth: 32, halign: "center", textColor: [249, 171, 0] },
        4: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14, bottom: 15 },
      rowPageBreak: "avoid",
    });
  }

  // Adicionar Rodapé com numeração e informações em TODAS as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `TI SENAI LRV · Relatório Executivo Completo do Dashboard · Emitido em ${dataEmissao} às ${horaEmissao}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      doc.internal.pageSize.getWidth() - 32,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const nomeFinal = nome.endsWith(".pdf") ? nome : `${nome}.pdf`;
  doc.save(nomeFinal);
}

export async function exportarUsuariosPdf(
  usuarios: {
    nome: string;
    email: string;
    setor: string;
    cargo: string;
    telefone: string;
    papel: string;
    status: string;
    ultimoAcesso: string;
    matricula: string;
  }[],
  nomeArquivo: string
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setTextColor(26, 115, 232);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TI SENAI LRV • Base de Usuários Cadastrados", 14, 15);

  doc.setTextColor(95, 99, 104);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Total de usuários: ${usuarios.length} | Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR").slice(0, 5)}`,
    14,
    22,
  );

  const head = [["Nome", "E-mail", "Setor", "Cargo / Função", "Telefone", "Matrícula", "Perfil", "Status", "Último Acesso"]];
  const body = usuarios.map((u) => [
    u.nome || "—",
    u.email || "—",
    u.setor || "—",
    u.cargo || "—",
    u.telefone || "—",
    u.matricula || "—",
    u.papel || "—",
    u.status || "—",
    u.ultimoAcesso || "—",
  ]);

  autoTable(doc, {
    startY: 28,
    head,
    body,
    theme: "striped",
    styles: {
      fontSize: 10,
      cellPadding: 2.5,
      overflow: "linebreak",
      textColor: [32, 33, 36],
    },
    headStyles: {
      fillColor: [26, 115, 232],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  const finalName = nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`;
  doc.save(finalName);
}