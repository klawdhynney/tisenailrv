// Testes automatizados da IA de suporte e aprimoramento de texto
// TISENAILRV (tisenailrv.app)

import assert from "node:assert";
import { sanitizarTextoLgpd } from "../src/lib/revisar-texto.functions.js";
import { limparSaidaIa, askSupportAI } from "../src/lib/ai-support.server.js";
import { PROMPT_IA_SUPORTE_PADRAO } from "../src/lib/types.js";

async function runTests() {
  console.log("=== INICIANDO TESTES DA IA DE SUPORTE E BASE DE RESOLVIDOS ===\n");

  // TESTE 1: Sanitização LGPD
  console.log("Teste 1: Sanitização LGPD (e-mails, telefones, CPFs, limites)");
  const textoComDadosPessoais = "Usuário joao.silva@senai.br ligou do tel (66) 99644-4461 com cpf 123.456.789-00 reclamando do mouse.";
  const sanitizado = sanitizarTextoLgpd(textoComDadosPessoais, 300);
  assert(!sanitizado.includes("joao.silva@senai.br"), "E-mail não foi removido!");
  assert(!sanitizado.includes("99644-4461"), "Telefone não foi removido!");
  assert(!sanitizado.includes("123.456.789-00"), "CPF não foi removido!");
  console.log("✓ Sanitização LGPD aprovada:", sanitizado);

  // TESTE 2: Resposta para 'Solicito um mouse novo'
  console.log("\nTeste 2: Caso 'Solicito um mouse novo'");
  const promptMouse = [
    "MODO: RESPONDER CHAMADO",
    "--- DADOS DO CHAMADO ATUAL ---",
    "Título: Periféricos (Chamado #101)",
    "Categoria: Periféricos",
    "Local: Laboratório 2",
    "Descrição: Solicito um mouse novo",
    "-------------------------------"
  ].join("\n");
  const respMouse = await askSupportAI(PROMPT_IA_SUPORTE_PADRAO, promptMouse);
  console.log("Resposta Mouse:", respMouse);
  assert(respMouse.toLowerCase().includes("mouse"), "Resposta não menciona mouse");
  assert(respMouse.toLowerCase().includes("verifiquei"), "Resposta não está em primeira pessoa");
  assert(!respMouse.includes("```"), "Resposta contém markdown");
  console.log("✓ Resposta do mouse no formato oficial aprovada!");

  // TESTE 3: Resposta para 'Computador não liga'
  console.log("\nTeste 3: Caso 'Computador não liga'");
  const promptPc = [
    "MODO: RESPONDER CHAMADO",
    "--- DADOS DO CHAMADO ATUAL ---",
    "Título: Hardware (Chamado #102)",
    "Categoria: Hardware",
    "Local: Sala dos Professores",
    "Descrição: Computador não liga",
    "-------------------------------"
  ].join("\n");
  const respPc = await askSupportAI(PROMPT_IA_SUPORTE_PADRAO, promptPc);
  console.log("Resposta Computador não liga:", respPc);
  assert(respPc.toLowerCase().includes("computador") || respPc.toLowerCase().includes("tomada"), "Resposta não menciona o problema");
  assert(respPc.toLowerCase().includes("verifiquei") || respPc.toLowerCase().includes("fui"), "Resposta não descreve o que foi feito");
  assert(!respPc.includes("```"), "Resposta contém markdown");
  console.log("✓ Resposta de computador não liga aprovada!");

  // TESTE 4: Resposta para 'Impressora não imprime'
  console.log("\nTeste 4: Caso 'Impressora não imprime'");
  const promptImp = [
    "MODO: RESPONDER CHAMADO",
    "--- DADOS DO CHAMADO ATUAL ---",
    "Título: Impressoras (Chamado #103)",
    "Categoria: Impressoras",
    "Local: Secretaria",
    "Descrição: Impressora não imprime",
    "-------------------------------"
  ].join("\n");
  const respImp = await askSupportAI(PROMPT_IA_SUPORTE_PADRAO, promptImp);
  console.log("Resposta Impressora não imprime:", respImp);
  assert(respImp.toLowerCase().includes("impressora") || respImp.toLowerCase().includes("impressão"), "Resposta não menciona impressora");
  assert(respImp.toLowerCase().includes("verifiquei"), "Resposta não descreve verificação");
  assert(!respImp.includes("```"), "Resposta contém markdown");
  console.log("✓ Resposta de impressora não imprime aprovada!");

  // TESTE 5: Aprimoramento de texto com erros de português e frase incompleta
  console.log("\nTeste 5: Aprimoramento de texto (ortografia + frase incompleta com contexto)");
  const promptAprimorar = [
    "MODO: APRIMORAR TEXTO",
    "--- CONTEXTO DO CHAMADO ---",
    "Título: Rede / Conectividade (Chamado #104)",
    "Categoria: Rede / Conectividade",
    "Local: Sala 3",
    "Descrição: Computador sem internet na sala 3",
    "---------------------------",
    "Texto do técnico a aprimorar:",
    "troquei o cabo de rede mais nao funciono entao"
  ].join("\n");
  const respAprimorada = await askSupportAI(PROMPT_IA_SUPORTE_PADRAO, promptAprimorar);
  console.log("Texto Original: 'troquei o cabo de rede mais nao funciono entao'");
  console.log("Texto Aprimorado:", respAprimorada);
  assert(!respAprimorada.includes("mais nao"), "Erros ortográficos não corrigidos");
  assert(!respAprimorada.includes("funciono "), "Concordância/tempo verbal incorreto");
  assert(!respAprimorada.endsWith("entao") && !respAprimorada.endsWith("então"), "Frase permaneceu incompleta");
  assert(respAprimorada.endsWith("."), "Pontuação final ausente");
  console.log("✓ Aprimoramento de texto aprovado com correção e conclusão contextual!");

  // TESTE 6: Limpeza de saída rigorosa
  console.log("\nTeste 6: Limpeza de saída da IA (sem markdown, sem preâmbulos)");
  const saidaComRuido = "```markdown\n**Resposta técnica:** Fui até o local e verifiquei o equipamento. Espero ter ajudado!\n```";
  const limpo = limparSaidaIa(saidaComRuido);
  assert(!limpo.includes("```"), "Contém blocos de código");
  assert(!limpo.includes("**"), "Contém negrito");
  assert(!limpo.includes("Resposta técnica:"), "Contém rótulo");
  assert(!limpo.includes("Espero ter ajudado"), "Contém despedida clichê");
  console.log("✓ Limpeza de saída aprovada:", limpo);

  console.log("\n=== TODOS OS 6 TESTES DA IA PASSARAM COM SUCESSO! ===");
}

runTests().catch((err) => {
  console.error("Falha nos testes:", err);
  process.exit(1);
});
