import type { Ticket } from "./types";

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

export function ticketsParaLinhas(tickets: Ticket[], camposSelecionados?: string[]): LinhaExportacao[] {
  return tickets.map((t) => {
    const linhaCompleta: LinhaExportacao = {
      Numero: t.id,
      Data: t.abertoEm,
      Hora: t.hora,
      Solicitante: t.solicitante,
      SolicitanteEmail: t.solicitanteEmail ?? "",
      Setor: t.setor,
      Local: t.local,
      Descricao: t.descricao,
      Categoria: t.categoria ?? "",
      Prioridade: t.prioridade,
      Responsavel: t.responsavel ?? "",
      Status: t.status,
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
  total: number;
  andamento: number;
  resolvidos: number;
  recorrentes: { name: string; value: number }[];
  setores: { name: string; value: number }[];
  prioridades: { name: string; value: number }[];
  status: { name: string; value: number }[];
  sla: { name: string; value: number }[];
}

export async function exportarDashboardCompletoPdf(dados: DashboardExportData, nome: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const autoTable = autoTableModule.default;

  // Banner Cabeçalho
  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, 210, 24, "F");

  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("TI SENAI LRV · Dashboard Completo de Indicadores", 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Período: ${dados.mesLabel} | Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR").slice(0, 5)}`,
    14,
    18,
  );

  doc.setTextColor(33, 33, 33);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral:", 14, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total de chamados: ${dados.total}`, 14, 37);
  doc.text(`Em atendimento / ativos: ${dados.andamento}`, 80, 37);
  doc.text(`Resolvidos: ${dados.resolvidos}`, 150, 37);

  let currentY = 43;

  const criarSecao = (
    titulo: string,
    itens: { name: string; value: number }[],
    corHeader: [number, number, number],
  ) => {
    const totalSecao = itens.reduce((s, x) => s + x.value, 0);
    const body = itens.map((it) => {
      const pct = totalSecao > 0 ? `${((it.value / totalSecao) * 100).toFixed(1)}%` : "0%";
      return [it.name, String(it.value), pct];
    });

    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(corHeader[0], corHeader[1], corHeader[2]);
    doc.text(titulo, 14, currentY);
    currentY += 2;

    autoTable(doc, {
      startY: currentY,
      head: [["Item / Descrição", "Chamados", "Participação (%)"]],
      body,
      theme: "striped",
      styles: {
        fontSize: 12,
        cellPadding: 2.2,
        overflow: "linebreak",
        textColor: [32, 33, 36],
      },
      headStyles: {
        fillColor: corHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 12,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 105 },
        1: { cellWidth: 38, halign: "center" },
        2: { cellWidth: 38, halign: "center" },
      },
      margin: { left: 14, right: 14, bottom: 15 },
      rowPageBreak: "avoid",
    });

    // @ts-expect-error autoTable attaches lastAutoTable to jsPDF instance
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 8;
  };

  criarSecao("1. Chamados Recorrentes", dados.recorrentes, [26, 115, 232]);
  criarSecao("2. Chamados por Setores", dados.setores, [234, 67, 53]);
  criarSecao("3. Prioridades dos Chamados", dados.prioridades, [249, 171, 0]);
  criarSecao("4. Status dos Chamados", dados.status, [52, 168, 83]);
  criarSecao("5. SLA dos Chamados", dados.sla, [161, 66, 244]);

  const nomeFinal = nome.endsWith(".pdf") ? nome : `${nome}.pdf`;
  doc.save(nomeFinal);
}