export const GESTOR_EMAILS = [
  "claudinei.lima@senaimt.ind.br",
  "claudineigoncalvesdelima@hotmail.com",
  "klawdhynney@gmail.com",
] as const;

export function gestorAutorizado(email?: string | null, provider?: string | null) {
  return !!email && GESTOR_EMAILS.some((allowed) => allowed === email.toLowerCase())
    && (provider === "google" || provider === "microsoft" || provider === "azure");
}