import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const revisarTexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ texto: z.string().min(10).max(3000) }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: gestor, error } = await context.supabase.rpc("is_named_manager");
    if (error || gestor !== true) throw new Error("Acesso restrito ao gestor.");
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("Revisão assistida indisponível no momento.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [
        { role: "system", content: "Revise apenas ortografia, gramática e clareza em português brasileiro. Preserve todos os fatos, nomes, horários e detalhes técnicos. Responda somente com o texto revisado." },
        { role: "user", content: data.texto },
      ] }),
    });
    if (!response.ok) throw new Error("Não foi possível revisar o texto agora.");
    const result = await response.json() as { choices?: { message?: { content?: string } }[] };
    const sugestao = result.choices?.[0]?.message?.content?.trim();
    if (!sugestao || sugestao.length > 4000) throw new Error("Nenhuma sugestão disponível.");
    return sugestao;
  });