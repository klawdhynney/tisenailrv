import * as XLSX from "xlsx";
import { PRIORIDADES, STATUS_LIST, type Ticket } from "./types";

export type LinhaImportada = Omit<Ticket, "id"> & { id?: number };

const texto = (v: unknown) => String(v ?? "").trim();
const normal = (v: unknown) => texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function data(v: unknown) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`; }
  const s = texto(v);
  if (/^\d{4}-\d\d-\d\d/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]?.padStart(2, "0")}-${br[1]?.padStart(2, "0")}` : "";
}
function hora(v: unknown) {
  if (v instanceof Date) return `${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`;
  if (typeof v === "number") return `${String(Math.floor(v * 24) % 24).padStart(2, "0")}:${String(Math.round((v * 1440) % 60) % 60).padStart(2, "0")}`;
  return texto(v).match(/^\d{1,2}:\d{2}/)?.[0].padStart(5, "0") ?? "00:00";
}

export async function lerPlanilha(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const linhas: LinhaImportada[] = [];
  const erros: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (!rows.length || !Object.keys(rows[0] ?? {}).some((k) => ["aberto em", "descricao do problema", "descricao"].includes(normal(k)))) continue;
    rows.forEach((raw, index) => {
      const row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [normal(k), v]));
      const abertoEm = data(row["aberto em"]);
      const descricao = texto(row["descricao do problema"] ?? row["descricao"]);
      if (!abertoEm && !descricao) return;
      const prioridade = PRIORIDADES.find((p) => normal(p) === normal(row["prioridade"]));
      const status = STATUS_LIST.find((s) => normal(s) === normal(row["status"]));
      if (!abertoEm || !descricao || !texto(row["solicitante"]) || !prioridade) {
        erros.push(`${sheetName}, linha ${index + 2}: data, solicitante, descrição ou prioridade inválida.`);
        return;
      }
      const id = Number(row["nº"] ?? row["no"] ?? row["numero"]);
      linhas.push({
        ...(Number.isSafeInteger(id) && id > 0 ? { id } : {}), abertoEm, hora: hora(row["hora"]),
        solicitante: texto(row["solicitante"]), setor: texto(row["setor"]) || "Não informado",
        local: texto(row["local"]), descricao, categoria: texto(row["categoria"]),
        prioridade, status: status ?? "Aberto", responsavel: texto(row["responsavel"]) || null,
        fechadoEm: data(row["fechado em"]) || null, horario: texto(row["horario"]) || null,
        procedimento: texto(row["procedimento realizado"] ?? row["procedimento"]) || null,
        slaReiniciadoEm: texto(row["sla reiniciado em"]) || null,
      });
    });
  }
  return { linhas, erros };
}