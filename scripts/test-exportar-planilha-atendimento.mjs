import { ticketsParaLinhasAtendimento } from "../src/lib/exportar.js";
import assert from "node:assert";

console.log("=== TESTE DA EXPORTAÇÃO DA PLANILHA DE ATENDIMENTO ===");

const ticketsMock = [
  {
    id: 135,
    abertoEm: "2026-10-10",
    hora: "22:47",
    solicitante: "Claudinei Lima",
    setor: "TI",
    descricao: "Solicitar ao fornecedor um cilindro de reserva para a impressora da área técnica.",
    responsavel: "Claudinei Lima",
    status: "Aguardando",
    fechadoEm: null,
    horario: null,
    prioridade: "Média",
  },
  {
    id: 132,
    abertoEm: "2026-10-09",
    hora: "18:56",
    solicitante: "João Félix",
    setor: "Área Técnica",
    descricao: "Solicito a troca do toner da impressora localizada na área técnica. Informação adicional do solicitante: [Avaliação do Usuário]: 😮 Surpreso",
    responsavel: "Claudinei Lima",
    status: "Resolvido",
    fechadoEm: "2026-10-09",
    horario: "20:47",
    prioridade: "Alta",
  },
];

const linhas = ticketsParaLinhasAtendimento(ticketsMock);

console.log("Linhas geradas:", linhas);

assert.strictEqual(linhas.length, 2, "Deveria ter gerado 2 linhas");

const colunasEsperadas = [
  "Nº",
  "Aberto em",
  "Solicitante",
  "Setor",
  "Descrição do problema",
  "Responsável",
  "Fechado em",
  "Status",
];

const chavesPrimeiraLinha = Object.keys(linhas[0]);
console.log("Colunas encontradas:", chavesPrimeiraLinha);
console.log("Colunas esperadas:  ", colunasEsperadas);

assert.deepStrictEqual(
  chavesPrimeiraLinha,
  colunasEsperadas,
  "As 8 colunas e a ordem devem bater rigorosamente com o modelo oficial"
);

// Validação dos dados da linha 1
assert.strictEqual(linhas[0]["Nº"], 135);
assert.strictEqual(linhas[0]["Aberto em"], "10/10/2026 22:47");
assert.strictEqual(linhas[0]["Solicitante"], "Claudinei Lima");
assert.strictEqual(linhas[0]["Setor"], "TI");
assert.strictEqual(linhas[0]["Responsável"], "Claudinei Lima");
assert.strictEqual(linhas[0]["Fechado em"], "—");
assert.strictEqual(linhas[0]["Status"], "Aguardando");

// Validação dos dados da linha 2
assert.strictEqual(linhas[1]["Nº"], 132);
assert.strictEqual(linhas[1]["Aberto em"], "09/10/2026 18:56");
assert.strictEqual(linhas[1]["Solicitante"], "João Félix");
assert.strictEqual(linhas[1]["Setor"], "Área Técnica");
assert.strictEqual(linhas[1]["Fechado em"], "09/10/2026 20:47");
assert.strictEqual(linhas[1]["Status"], "Finalizado");
assert.strictEqual(
  linhas[1]["Descrição do problema"],
  "Solicito a troca do toner da impressora localizada na área técnica.",
  "A descrição deve manter estritamente a descrição do problema, sem acréscimos posteriores"
);
assert(
  !linhas[1]["Descrição do problema"].includes("Informação adicional"),
  "A descrição não deve conter 'Informação adicional'"
);
assert(
  !linhas[1]["Descrição do problema"].includes("Avaliação"),
  "A descrição não deve conter 'Avaliação'"
);

console.log("✓ Todos os testes de colunas e dados passaram com sucesso!");

// Validação do XLSX completo (abas e estilos)
import XLSX from "xlsx";
import { aplicarEstiloPlanilha } from "../src/lib/exportar.js";

const wb = XLSX.utils.book_new();
const sheetChamados = XLSX.utils.json_to_sheet(linhas);
aplicarEstiloPlanilha(sheetChamados, linhas, "E26B00");
XLSX.utils.book_append_sheet(wb, sheetChamados, "Chamados");

assert.strictEqual(wb.SheetNames[0], "Chamados", "Primeira aba deve ser 'Chamados'");
assert(sheetChamados["!autofilter"], "Aba 'Chamados' deve ter autofiltro ativo no cabeçalho");
assert(sheetChamados["!freeze"], "Aba 'Chamados' deve ter cabeçalho congelado");
assert.strictEqual(sheetChamados["A1"].v, "Nº");
assert.strictEqual(sheetChamados["B1"].v, "Aberto em");
assert.strictEqual(sheetChamados["C1"].v, "Solicitante");
assert.strictEqual(sheetChamados["D1"].v, "Setor");
assert.strictEqual(sheetChamados["E1"].v, "Descrição do problema");
assert.strictEqual(sheetChamados["F1"].v, "Responsável");
assert.strictEqual(sheetChamados["G1"].v, "Fechado em");
assert.strictEqual(sheetChamados["H1"].v, "Status");

// Validação dos estilos de células
assert.strictEqual(sheetChamados["A1"].s.fill.fgColor.rgb, "E26B00", "Cabeçalho deve ser fundo laranja #E26B00");
assert.strictEqual(sheetChamados["A2"].s.fill.fgColor.rgb, "FDE8D3", "Linha 2 (par) deve ter fundo pêssego suave #FDE8D3");
assert.strictEqual(sheetChamados["A3"].s.fill.fgColor.rgb, "FFFFFF", "Linha 3 (ímpar) deve ter fundo branco #FFFFFF");

console.log("✓ Validação completa do formato XLSX, abas e estilos visuais aprovada!");
