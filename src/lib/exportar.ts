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
  return String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
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
  const colunas = Object.keys(linhas[0] ?? {});
  const conteudo = [colunas, ...linhas.map((linha) => colunas.map((c) => linha[c] ?? ""))]
    .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  baixarBlob(`\uFEFF${conteudo}`, "text/csv;charset=utf-8", `${nome}.csv`);
}

export async function exportarXlsx(linhas: LinhaExportacao[], nome: string) {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const arquivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arquivo, planilha, "Chamados");
  XLSX.writeFile(arquivo, `${nome}.xlsx`);
}

export function exportarXml(linhas: LinhaExportacao[], nome: string) {
  const registros = linhas.map((linha) => `<chamado>${Object.entries(linha).map(([chave, valor]) => `<${chave}>${escaparXml(valor)}</${chave}>`).join("")}</chamado>`).join("");
  baixarBlob(`<?xml version="1.0" encoding="UTF-8"?><chamados>${registros}</chamados>`, "application/xml;charset=utf-8", `${nome}.xml`);
}

export async function exportarPdf(linhas: LinhaExportacao[], nome: string, titulo: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const colunas = Object.keys(linhas[0] ?? {});
  doc.setFontSize(15);
  doc.text(titulo, 14, 14);
  autoTableModule.default(doc, {
    startY: 20,
    head: [colunas],
    body: linhas.map((linha) => colunas.map((c) => String(linha[c] ?? ""))),
    styles: { fontSize: 6, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: [66, 133, 244] },
    margin: { left: 8, right: 8 },
  });
  doc.save(`${nome}.pdf`);
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
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral:", 14, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
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

    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(corHeader[0], corHeader[1], corHeader[2]);
    doc.text(titulo, 14, currentY);
    currentY += 2;

    autoTable(doc, {
      startY: currentY,
      head: [["Item / Descrição", "Chamados", "Participação (%)"]],
      body,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: corHeader, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 36, halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error autoTable attaches lastAutoTable to jsPDF instance
    currentY = (doc.lastAutoTable?.finalY ?? currentY + 30) + 7;
  };

  criarSecao("1. Chamados Recorrentes", dados.recorrentes, [26, 115, 232]);
  criarSecao("2. Chamados por Setores", dados.setores, [234, 67, 53]);
  criarSecao("3. Prioridades dos Chamados", dados.prioridades, [249, 171, 0]);
  criarSecao("4. Status dos Chamados", dados.status, [52, 168, 83]);
  criarSecao("5. SLA dos Chamados", dados.sla, [161, 66, 244]);

  doc.save(`${nome}.pdf`);
}