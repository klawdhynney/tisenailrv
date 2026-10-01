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
        if (campo in linhaCompleta) {
          filtrada[campo] = linhaCompleta[campo];
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