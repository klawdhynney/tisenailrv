import type { Ticket, Regras } from "./types";
import { extrairSetor, extrairLocal, obterRotuloStatus } from "./types";
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

export function ticketsParaLinhas(tickets: Ticket[], camposSelecionados?: string[], regras?: Regras | null): LinhaExportacao[] {
  return tickets.map((t) => {
    const linhaCompleta: LinhaExportacao = {
      Numero: t.id,
      Data: t.abertoEm,
      Hora: t.hora,
      Solicitante: t.solicitante,
      SolicitanteEmail: t.solicitanteEmail ?? "",
      Setor: extrairSetor(t.setor),
      Local: extrairLocal(t),
      Descricao: t.descricao,
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

export function ticketsParaLinhasAtendimento(
  tickets: Ticket[],
  colunasAtivas: { id: string; label: string }[],
  regras?: Regras | null
): LinhaExportacao[] {
  return tickets.map((t) => {
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
      descricao: t.descricao,
      "Descrição do problema": t.descricao,
      status: obterRotuloStatus(t.status, regras),
      "Status": obterRotuloStatus(t.status, regras),
      slaPrazo: `${formatarDataHora(sla.prazo)} - ${sla.situacao}`,
      "SLA / Prazo": `${formatarDataHora(sla.prazo)} - ${sla.situacao}`,
      procedimento: t.procedimento || "",
      "Procedimento": t.procedimento || "",
      fechadoEm: formatarData(t.fechadoEm, t.horario),
      "Fechado em": formatarData(t.fechadoEm, t.horario),
      responsavel: t.responsavel || "",
      "Responsável": t.responsavel || "",
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
  });
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

export async function exportarXlsx(linhas: LinhaExportacao[], nome: string) {
  if (!linhas || linhas.length === 0) return;
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(linhas);

  // Organiza largura das colunas baseada no conteúdo
  const colunas = Object.keys(linhas[0] ?? {});
  const larguras = colunas.map((col) => {
    let maxLen = col.length;
    for (const linha of linhas) {
      const val = linha[col];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        const primeiraLinhaLen = strVal.split("\n")[0]?.length ?? strVal.length;
        if (primeiraLinhaLen > maxLen) maxLen = primeiraLinhaLen;
      }
    }
    // Largura com folga, mínimo 14 e máximo 52
    return { wch: Math.min(Math.max(maxLen + 4, 14), 52) };
  });
  planilha["!cols"] = larguras;

  // Congelar primeira linha (cabeçalho)
  planilha["!freeze"] = { xSplit: "0", ySplit: "1" };
  planilha["!views"] = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Configurar fonte tamanho 12, quebra de linha (wrap text) e estilos visuais
  for (const cellAddress in planilha) {
    if (cellAddress.startsWith("!")) continue;
    const isHeader = /^[A-Z]+1$/.test(cellAddress);
    const existingCell = planilha[cellAddress] || {};

    existingCell.s = isHeader
      ? {
          font: { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1A73E8" } },
          alignment: { wrapText: true, vertical: "center", horizontal: "center" },
        }
      : {
          font: { name: "Arial", sz: 12 },
          alignment: { wrapText: true, vertical: "center" },
        };
    planilha[cellAddress] = existingCell;
  }

  const arquivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arquivo, planilha, "Chamados");
  const nomeFinal = nome.endsWith(".xlsx") ? nome : `${nome}.xlsx`;
  XLSX.writeFile(arquivo, nomeFinal);
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

export async function exportarPdf(linhas: LinhaExportacao[], nome: string, titulo: string) {
  if (!linhas || linhas.length === 0) return;
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const colunas = Object.keys(linhas[0] ?? {});

  // Orientação paisagem para comportar colunas e fonte tamanho 12 com folga
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Banner Cabeçalho com padrão de cores do projeto (Google Blue)
  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, "F");

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 12, 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `TI SENAI LRV · Emitido em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR").slice(0, 5)} · Total de registros: ${linhas.length}`,
    12,
    16,
  );

  autoTable(doc, {
    startY: 24,
    head: [colunas],
    body: linhas.map((linha) => colunas.map((c) => String(linha[c] ?? ""))),
    theme: "striped",
    styles: {
      fontSize: 12, // Tamanho 12 em todo o conteúdo
      cellPadding: 2.5,
      overflow: "linebreak", // Quebra automática de linha
      textColor: [32, 33, 36],
      lineColor: [220, 224, 230],
      lineWidth: 0.1,
      valign: "middle",
    },
    headStyles: {
      fillColor: [26, 115, 232], // Azul Google do tema
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 12,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Linhas alternadas no padrão de cores do site
    },
    margin: { left: 10, right: 10, top: 24, bottom: 15 },
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      const str = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text(
        str,
        doc.internal.pageSize.getWidth() - 32,
        doc.internal.pageSize.getHeight() - 8,
      );
      doc.text(
        "TI SENAI LRV · Documento oficial gerado pelo sistema",
        10,
        doc.internal.pageSize.getHeight() - 8,
      );
    },
  });

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

export async function exportarDashboardCompletoPdf(dados: DashboardExportData, nome: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const autoTable = autoTableModule.default;
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const horaEmissao = new Date().toLocaleTimeString("pt-BR").slice(0, 5);

  const desenharBannerTopo = (tituloSecao = "Dashboard Completo de Indicadores") => {
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, 210, 22, "F");

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`TI SENAI LRV · ${tituloSecao}`, 14, 10);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${dados.mesLabel} | Emitido em: ${dataEmissao} às ${horaEmissao} | Sistema de Chamados TI SENAI LRV`,
      14,
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

  // Função auxiliar para seções analíticas categóricas
  const criarSecaoCategorica = (
    titulo: string,
    itens: { name: string; value: number }[],
    corHeader: [number, number, number],
  ) => {
    const totalSecao = itens.reduce((s, x) => s + x.value, 0);
    const body = itens.length === 0
      ? [["Nenhum registro para o período", "0", "0%"]]
      : itens.map((it) => {
          const pct = totalSecao > 0 ? `${((it.value / totalSecao) * 100).toFixed(1)}%` : "0%";
          return [it.name, String(it.value), pct];
        });

    if (currentY > 215) {
      doc.addPage();
      desenharBannerTopo();
      currentY = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(corHeader[0], corHeader[1], corHeader[2]);
    doc.text(titulo, 14, currentY);
    currentY += 2.5;

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
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 8;
  };

  // 3. ANÁLISE CATEGÓRICA MULTIDIMENSIONAL
  criarSecaoCategorica("3. Chamados Recorrentes (Categorias / Motivos)", dados.recorrentes, [26, 115, 232]);
  criarSecaoCategorica("4. Chamados por Setores Solicitantes", dados.setores, [234, 67, 53]);
  criarSecaoCategorica("5. Prioridades dos Chamados", dados.prioridades, [249, 171, 0]);
  criarSecaoCategorica("6. Status dos Chamados", dados.status, [52, 168, 83]);
  criarSecaoCategorica("7. SLA / Prazos dos Chamados", dados.sla, [161, 66, 244]);

  // 4. SÉRIE HISTÓRICA (EVOLUÇÃO TEMPORAL MÊS A MÊS)
  if (dados.serieHistorica && dados.serieHistorica.length > 0) {
    if (currentY > 190) {
      doc.addPage();
      desenharBannerTopo();
      currentY = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(124, 58, 237);
    doc.text("8. Série Histórica de Chamados (Evolução Temporal)", 14, currentY);
    currentY += 3;

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