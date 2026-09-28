import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GESTOR_EMAIL } from "./corporate";

const linha = z.object({
  id: z.number().int().positive().optional(), abertoEm: z.string().regex(/^\d{4}-\d\d-\d\d$/),
  hora: z.string().regex(/^\d\d:\d\d$/), solicitante: z.string().min(1), setor: z.string().min(1),
  local: z.string(), descricao: z.string().min(1), categoria: z.string(),
  prioridade: z.enum(["Crítica", "Alta", "Média", "Baixa"]),
  status: z.enum(["Aberto", "Em andamento", "Aguardando", "Pausado", "Resolvido", "Cancelado"]),
  responsavel: z.string().nullable().optional(), fechadoEm: z.string().nullable().optional(),
  horario: z.string().nullable().optional(), procedimento: z.string().nullable().optional(),
  slaReiniciadoEm: z.string().nullable().optional(),
});

export const importarChamados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.array(linha).min(1).max(1000).parse(input))
  .handler(async ({ context, data }) => {
    const { data: role, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "gestor").maybeSingle();
    const provider = context.claims.app_metadata?.provider;
    if (roleError || !role || context.claims.email?.toLowerCase() !== GESTOR_EMAIL || (provider !== "microsoft" && provider !== "azure")) throw new Error("Apenas o gestor autorizado com conta Microsoft pode importar chamados.");
    const existentes: { aberto_em: string; hora: string; solicitante: string; setor: string; descricao: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: pagina, error } = await context.supabase.from("tickets")
        .select("aberto_em,hora,solicitante,setor,descricao").order("id").range(offset, offset + 999);
      if (error) throw error;
      existentes.push(...(pagina ?? []));
      if (!pagina || pagina.length < 1000) break;
    }
    const chave = (t: { aberto_em: string; hora: string; solicitante: string; setor: string; descricao: string }) =>
      [t.aberto_em, t.hora, t.solicitante, t.setor, t.descricao].map((v) => v.trim().toLocaleLowerCase("pt-BR")).join("|");
    const chaves = new Set(existentes.map(chave));
    let inseridos = 0, ignorados = 0;
    for (const item of data) {
      const registro = { aberto_em: item.abertoEm, hora: item.hora, solicitante: item.solicitante, setor: item.setor, descricao: item.descricao };
      const fingerprint = chave(registro);
      // Imported numbering can collide with an unrelated ticket. Content is the deduplication key.
      if (chaves.has(fingerprint)) { ignorados++; continue; }
      const payload = {
        ...registro, local: item.local, categoria: item.categoria || null,
        prioridade: item.prioridade, status: item.status, responsavel: item.responsavel ?? null,
        fechado_em: item.fechadoEm ?? null, horario: item.horario ?? null,
        procedimento: item.procedimento ?? null, sla_reiniciado_em: item.slaReiniciadoEm ?? null,
      };
      // The generated identity owns new IDs. Source IDs are used only to recognize existing tickets.
      const result = await context.supabase.from("tickets").insert(payload).select("id").single();
      if (result.error) throw new Error(`Importação interrompida após ${inseridos} chamados: ${result.error.message}`);
      chaves.add(fingerprint);
      inseridos++;
    }
    return { inseridos, ignorados };
  });