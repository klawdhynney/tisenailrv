import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askSupportAI } from "./ai-support.server";

const inputSchema = z.object({
  texto: z.string().trim().min(10).max(3000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao"),
});

export const revisarTexto = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    return askSupportAI(data.modo === "tecnica"
          ? "Você é assistente de suporte de TI. Em português brasileiro, sugira até três verificações técnicas seguras e objetivas para o problema informado. Não afirme diagnóstico, não invente fatos, não solicite senhas nem proponha passos destrutivos. Responda apenas com sugestões, sem alterar o chamado."
          : "Revise apenas ortografia, gramática e clareza em português brasileiro. Preserve todos os fatos, nomes, horários e detalhes técnicos. Não invente informações. Responda somente com o texto revisado.", data.texto);
  });