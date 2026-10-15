/**
 * Dicionário central de pronúncias fonéticas para a narração do tutorial.
 * Usado pelo gerador de áudio em scripts/generate-tutorial-audio.mjs
 * e pelo fallback da Web Speech API (speechSynthesis) no navegador.
 */

export const DICIONARIO_PRONUNCIA: { padrao: RegExp; substituicao: string; descricao: string }[] = [
  // Siglas principais
  { padrao: /\bTI\b/g, substituicao: "tê í", descricao: "Sigla TI -> 'tê í'" },
  { padrao: /\bSLA\b/g, substituicao: "ésse éle á", descricao: "Sigla SLA -> 'ésse éle á'" },
  { padrao: /\bLGPD\b/g, substituicao: "éle gê pê dê", descricao: "Sigla LGPD -> 'éle gê pê dê'" },
  { padrao: /\bIA\b/g, substituicao: "i á", descricao: "Sigla IA -> 'i á'" },
  { padrao: /\bPDF\b/g, substituicao: "pê dê éfe", descricao: "Sigla PDF -> 'pê dê éfe'" },
  { padrao: /\bSENAI\b/g, substituicao: "sênai", descricao: "SENAI -> 'sênai'" },
  { padrao: /\bLRV\b/g, substituicao: "Lucas do Rio Verde", descricao: "LRV -> 'Lucas do Rio Verde'" },
  // Abreviações e símbolos
  { padrao: /\bn[º°]\b/gi, substituicao: "número", descricao: "Abreviação nº -> 'número'" },
  { padrao: /#(\d+)/g, substituicao: "número $1", descricao: "Prefixo #ID -> 'número ID'" },
  { padrao: /\bID\b/g, substituicao: "identificador", descricao: "ID -> 'identificador'" },
  { padrao: /\bseg\b/gi, substituicao: "segundos", descricao: "seg -> 'segundos'" },
  { padrao: /\bmin\b/gi, substituicao: "minutos", descricao: "min -> 'minutos'" },
  { padrao: /\blogin\b/gi, substituicao: "lóguin", descricao: "login -> 'lóguin'" },
];

/**
 * Converte um texto padrão em texto com pronúncia fonética adequada para síntese de voz.
 * Garante pausas naturais e pronúncias claras das siglas sem engolir sílabas.
 */
export function aplicarPronuncia(texto: string): string {
  if (!texto) return "";
  let resultado = texto;
  for (const item of DICIONARIO_PRONUNCIA) {
    resultado = resultado.replace(item.padrao, item.substituicao);
  }
  return resultado;
}
