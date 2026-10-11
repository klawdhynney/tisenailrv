/**
 * Utilitários para formatação e validação de telefones com máscara brasileira.
 * Suporta celulares (11 dígitos) e fixos/ramais (10 dígitos).
 */

export function formatarTelefoneBR(valor: string | null | undefined): string {
  if (!valor) return "";
  const apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);
  if (apenasNumeros.length === 0) return "";
  if (apenasNumeros.length <= 2) return `(${apenasNumeros}`;
  if (apenasNumeros.length <= 6) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  if (apenasNumeros.length <= 10) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 6)}-${apenasNumeros.slice(6)}`;
  }
  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7, 11)}`;
}

export function validarTelefoneBR(valor: string | null | undefined): boolean {
  if (!valor || !valor.trim()) return true; // campo opcional
  const apenasNumeros = valor.replace(/\D/g, "");
  // Válido se tiver 10 (fixo) ou 11 (celular) dígitos
  return apenasNumeros.length === 10 || apenasNumeros.length === 11;
}
