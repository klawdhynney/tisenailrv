export const GESTOR_EMAIL = "claudinei.lima@senaimt.ind.br";

export function emailCorporativo(email?: string | null) {
  return !!email && /^[^@\s]+@(?:senaimt|sesisenaimt)\.[^@\s]+$/i.test(email);
}

export function sessaoMicrosoft(provider?: string | null) {
  return provider === "microsoft" || provider === "azure";
}