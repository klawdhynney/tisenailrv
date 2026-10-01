import type { Regras, Ticket } from "./types";

const MIN = 60 * 1000;

function parseHM(hm: string) {
  const partes = (hm || "00:00").split(":");
  return (Number(partes[0]) || 0) * 60 + (Number(partes[1]) || 0);
}

export function toDate(data: string, hora?: string | null) {
  const p = (data || "1970-01-01").split("-").map(Number);
  const h = (hora || "00:00").split(":").map(Number);
  return new Date(p[0] || 1970, (p[1] || 1) - 1, p[2] || 1, h[0] || 0, h[1] || 0, 0, 0);
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getExpedienteDia(d: Date, regras: Regras) {
  const diaNum = d.getDay();
  const custom = regras.expediente.horariosPorDia?.[diaNum];
  if (custom) {
    return {
      ativo: Boolean(custom.ativo),
      ini: parseHM(custom.inicio || regras.expediente.inicio),
      fim: parseHM(custom.fim || regras.expediente.fim),
    };
  }
  return {
    ativo: regras.expediente.dias.includes(diaNum),
    ini: parseHM(regras.expediente.inicio),
    fim: parseHM(regras.expediente.fim),
  };
}

/** Dia é útil? (dia da semana no expediente, não feriado, fora de férias/viagem/atestado) */
export function isDiaUtil(d: Date, regras: Regras) {
  const exp = getExpedienteDia(d, regras);
  if (!exp.ativo) return false;
  const key = ymd(d);
  if (regras.feriados.some((f) => f.data === key)) return false;
  if (regras.periodos.some((p) => key >= p.inicio && key <= p.fim)) return false;
  return true;
}

export function motivoPausa(d: Date, regras: Regras): string | null {
  const exp = getExpedienteDia(d, regras);
  if (!exp.ativo) return "Fora do expediente";
  const key = ymd(d);
  const f = regras.feriados.find((x) => x.data === key);
  if (f) return `Feriado: ${f.nome}`;
  const p = regras.periodos.find((x) => key >= x.inicio && key <= x.fim);
  if (p) return `${p.tipo}: ${p.descricao}`;
  return null;
}

/** Soma horas úteis a partir de uma data, respeitando expediente/feriados/férias. */
export function addHorasUteis(inicio: Date, horas: number, regras: Regras): Date {
  let restante = Math.round(horas * 60);
  const cur = new Date(inicio);

  // normaliza para dentro do expediente
  let guard = 0;
  while (guard++ < 5000) {
    const exp = getExpedienteDia(cur, regras);
    const ini = exp.ini;
    const fim = exp.fim;
    const jornada = Math.max(1, fim - ini);

    if (!isDiaUtil(cur, regras)) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
      const nextExp = getExpedienteDia(cur, regras);
      cur.setMinutes(nextExp.ini);
      continue;
    }
    const minutosDia = cur.getHours() * 60 + cur.getMinutes();
    if (minutosDia < ini) {
      cur.setHours(0, ini, 0, 0);
    } else if (minutosDia >= fim) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
      const nextExp = getExpedienteDia(cur, regras);
      cur.setMinutes(nextExp.ini);
      continue;
    }
    const disponivel = fim - (cur.getHours() * 60 + cur.getMinutes());
    if (restante <= disponivel) {
      cur.setMinutes(cur.getMinutes() + restante);
      return cur;
    }
    restante -= disponivel;
    cur.setDate(cur.getDate() + 1);
    cur.setHours(0, 0, 0, 0);
    const nextExp = getExpedienteDia(cur, regras);
    cur.setMinutes(nextExp.ini);
    if (jornada <= 0) break;
  }
  return cur;
}

/** Minutos úteis entre duas datas. */
export function minutosUteis(a: Date, b: Date, regras: Regras): number {
  if (b <= a) return 0;
  let total = 0;
  const cur = new Date(a);
  let guard = 0;
  while (cur < b && guard++ < 5000) {
    if (isDiaUtil(cur, regras)) {
      const exp = getExpedienteDia(cur, regras);
      const diaIni = new Date(cur);
      diaIni.setHours(0, exp.ini, 0, 0);
      const diaFim = new Date(cur);
      diaFim.setHours(0, exp.fim, 0, 0);
      const s = cur > diaIni ? cur : diaIni;
      const e = b < diaFim ? b : diaFim;
      if (e > s) total += (e.getTime() - s.getTime()) / MIN;
    }
    cur.setDate(cur.getDate() + 1);
    cur.setHours(0, 0, 0, 0);
  }
  return Math.round(total);
}

/** Segundos úteis precisos para um relógio que não avança fora do expediente. */
export function segundosUteis(a: Date, b: Date, regras: Regras): number {
  if (b <= a) return 0;
  let total = 0;
  const cur = new Date(a);
  let guard = 0;
  while (cur < b && guard++ < 5000) {
    if (isDiaUtil(cur, regras)) {
      const exp = getExpedienteDia(cur, regras);
      const diaIni = new Date(cur);
      diaIni.setHours(0, exp.ini, 0, 0);
      const diaFim = new Date(cur);
      diaFim.setHours(0, exp.fim, 0, 0);
      const s = cur > diaIni ? cur : diaIni;
      const e = b < diaFim ? b : diaFim;
      if (e > s) total += (e.getTime() - s.getTime()) / 1000;
    }
    cur.setDate(cur.getDate() + 1);
    cur.setHours(0, 0, 0, 0);
  }
  return Math.floor(total);
}

export interface SlaInfo {
  situacao: "No prazo" | "Estourado" | "Cancelado" | "Aguardando" | "—";
  prazo: Date | null;
  restanteMin: number | null;
  pausadoPor: string | null;
  percentual: number;
}

export function calcularSla(t: Ticket, regras: Regras, agora = new Date()): SlaInfo {
  if (t.status === "Cancelado")
    return { situacao: "Cancelado", prazo: null, restanteMin: null, pausadoPor: "Chamado cancelado", percentual: 0 };

  const horas = regras.prazos[t.prioridade];
  if (!horas) return { situacao: "—", prazo: null, restanteMin: null, pausadoPor: null, percentual: 0 };

  const inicio = t.slaReiniciadoEm ? new Date(t.slaReiniciadoEm) : toDate(t.abertoEm, t.hora);
  const prazo = addHorasUteis(inicio, horas, regras);

  if (t.status === "Aguardando" || regras.statusQuePausam.includes(t.status))
    return { situacao: t.status === "Aguardando" ? "Aguardando" : agora > prazo ? "Estourado" : "No prazo", prazo, restanteMin: null, pausadoPor: `Status: ${t.status}`, percentual: 0 };

  const ref = t.fechadoEm ? toDate(t.fechadoEm, t.horario) : agora;
  const encerrado = t.status === "Resolvido" && !!t.fechadoEm;

  if (!encerrado) {
    const mp = motivoPausa(agora, regras);
    if (mp) {
      const restante = minutosUteis(agora, prazo, regras);
      return { situacao: agora > prazo ? "Estourado" : "No prazo", prazo, restanteMin: restante, pausadoPor: mp, percentual: 0 };
    }
  }

  const usados = minutosUteis(inicio, ref, regras);
  const total = horas * 60;
  const percentual = Math.min(100, Math.round((usados / total) * 100));
  const dentro = ref.getTime() <= prazo.getTime() + 1000;
  return {
    situacao: dentro ? "No prazo" : "Estourado",
    prazo,
    restanteMin: dentro ? minutosUteis(ref, prazo, regras) : -minutosUteis(prazo, ref, regras),
    pausadoPor: null,
    percentual,
  };
}

export function formatarDuracao(min: number | null) {
  if (min === null) return "—";
  const neg = min < 0;
  const v = Math.abs(min);
  const h = Math.floor(v / 60);
  const m = v % 60;
  const txt = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return neg ? `${txt} em atraso` : txt;
}

export function formatarData(d: string | null | undefined, hora?: string | null) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}${hora ? ` ${hora}` : ""}`;
}

export function formatarDataHora(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
