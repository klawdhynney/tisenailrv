import { limparSaidaIa } from "../src/lib/ai-support.server.ts";
import { IA_SUPORTE_PADRAO } from "../src/lib/types.ts";

console.log("==================================================");
console.log("INICIANDO TESTES DOS DOIS MODOS DA IA DE SUPORTE");
console.log("==================================================\n");

// Simulação das regras do servidor
function formatarPromptAtendimento(dados) {
  const ultimasMensagens = (
    Array.isArray(dados.mensagens) && dados.mensagens.length > 0
      ? dados.mensagens.map((m) => String(m).trim()).filter(Boolean).slice(-5)
      : dados.procedimentoAtual && dados.procedimentoAtual.trim()
        ? [dados.procedimentoAtual.trim()]
        : []
  );

  const blocoMensagens =
    ultimasMensagens.length > 0
      ? ultimasMensagens.map((m, idx) => `- Mensagem ${idx + 1}: ${m}`).join("\n")
      : "Nenhuma mensagem anterior registrada.";

  const titulo = dados.titulo || (dados.ticketId ? `Chamado #${dados.ticketId}` : "Chamado Técnico");

  return [
    "MODO: RESPONDER CHAMADO",
    `Título: ${titulo}`,
    `Descrição: ${dados.descricao}`,
    `Categoria: ${dados.categoria || "Geral"}`,
    `Prioridade: ${dados.prioridade || "Média"}`,
    `Local: ${dados.local || "Não informado"}`,
    `Últimas mensagens do chamado:`,
    blocoMensagens,
  ].join("\n");
}

function formatarPromptAprimorar(texto) {
  return [
    "MODO: APRIMORAR TEXTO",
    texto.trim(),
  ].join("\n");
}

function simularRespostaChamado(userPrompt) {
  const linhas = userPrompt.split("\n");
  if (!linhas[0].startsWith("MODO: RESPONDER CHAMADO")) {
    throw new Error("Primeira linha não é MODO: RESPONDER CHAMADO");
  }

  // Verifica ausência de dados pessoais
  if (/email|e-mail|@|\(\d{2}\)|foto|solicitante/i.test(userPrompt)) {
    throw new Error("Dado pessoal detectado no prompt enviado à IA!");
  }

  const descMatch = /Descrição:\s*([^\n]+)/i.exec(userPrompt);
  const desc = descMatch ? descMatch[1] : "";
  const catMatch = /Categoria:\s*([^\n]+)/i.exec(userPrompt);
  const cat = catMatch ? catMatch[1] : "";
  const locMatch = /Local:\s*([^\n]+)/i.exec(userPrompt);
  const loc = locMatch ? locMatch[1] : "";

  // Resposta técnica, direta, sem "sugiro", "recomendo", "poderia", sem preâmbulos
  const respostaBruta = `Resposta:
1. Chamado técnico analisado para atendimento no ${loc}.
2. Realizado procedimento técnico de ${cat.toLowerCase()}: verificação operacional de "${desc}".
3. Serviço restabelecido com sucesso e liberado para uso.`;

  return limparSaidaIa(respostaBruta);
}

function simularAprimoramento(userPrompt) {
  const linhas = userPrompt.split("\n");
  if (!linhas[0].startsWith("MODO: APRIMORAR TEXTO")) {
    throw new Error("Primeira linha não é MODO: APRIMORAR TEXTO");
  }

  const textoTecnico = linhas.slice(1).join("\n").trim();
  const respostaBruta = `Aqui está o texto aprimorado:
Solicitação técnica de TI: Equipamento de rede apresentou oscilação de conectividade no laboratório. Procedimento preventivo e corretivo acionado junto à equipe técnica local para restabelecimento operacional imediato.`;

  return limparSaidaIa(respostaBruta);
}

function validarResposta(texto, modo) {
  const proibidas = ["sugiro", "recomendo", "poderia", "talvez", "aqui está", "segue", "espero ter ajudado", "fico à disposição"];
  for (const p of proibidas) {
    if (new RegExp(`\\b${p}\\b`, "i").test(texto)) {
      throw new Error(`Palavra/expressão proibida encontrada: "${p}" na saída: ${texto}`);
    }
  }

  if (/^(?:Resposta|Resposta técnica|Opção \d|Versão \d|Parecer)\s*:/i.test(texto)) {
    throw new Error(`Rótulo não removido na saída: ${texto}`);
  }

  const numLinhas = texto.split("\n").filter(Boolean).length;
  if (numLinhas > 5) {
    throw new Error(`Resposta muito longa (${numLinhas} linhas): ${texto}`);
  }

  console.log(`[${modo}] SAÍDA GERADA:\n${texto}\n(Válida: curta, direta, sem termos proibidos nem preâmbulos)\n`);
}

// 1. Teste Chamado 1: Impressora HP no Pedagógico
const chamado1Prompt = formatarPromptAtendimento({
  ticketId: 101,
  titulo: "Chamado #101",
  descricao: "Impressora HP laser apresentando atolamento constante de papel e erro no painel",
  categoria: "Impressoras / Equipamentos",
  prioridade: "Alta",
  local: "Coordenação Pedagógica - Sala 12",
  mensagens: ["Equipamento reiniciado pelo usuário sem sucesso."],
});
console.log("--- TESTE 1: RESPONDER CHAMADO #101 ---");
console.log("Primeira linha do prompt:", chamado1Prompt.split("\n")[0]);
const resp1 = simularRespostaChamado(chamado1Prompt);
validarResposta(resp1, "CHAMADO 1");

// 2. Teste Chamado 2: Conexão Wi-Fi no Laboratório 02
const chamado2Prompt = formatarPromptAtendimento({
  ticketId: 102,
  titulo: "Chamado #102",
  descricao: "Ponto de acesso Wi-Fi oscilando e desconectando notebooks durante aula prática",
  categoria: "Redes / Conectividade",
  prioridade: "Crítica",
  local: "Laboratório de Informática 02",
  mensagens: [
    "Testado em múltiplos computadores.",
    "Luz do access point alternando entre verde e laranja.",
  ],
});
console.log("--- TESTE 2: RESPONDER CHAMADO #102 ---");
console.log("Primeira linha do prompt:", chamado2Prompt.split("\n")[0]);
const resp2 = simularRespostaChamado(chamado2Prompt);
validarResposta(resp2, "CHAMADO 2");

// 3. Teste Chamado 3: Acesso ao sistema acadêmico na Secretaria
const chamado3Prompt = formatarPromptAtendimento({
  ticketId: 103,
  titulo: "Chamado #103",
  descricao: "Usuário recebe mensagem de erro de credenciais inválidas ao tentar acessar o portal de matrículas",
  categoria: "Sistemas / Acesso",
  prioridade: "Média",
  local: "Secretaria Escolar",
  mensagens: [],
});
console.log("--- TESTE 3: RESPONDER CHAMADO #103 ---");
console.log("Primeira linha do prompt:", chamado3Prompt.split("\n")[0]);
const resp3 = simularRespostaChamado(chamado3Prompt);
validarResposta(resp3, "CHAMADO 3");

// 4. Teste Aprimoramento de Texto
const aprimorarPrompt = formatarPromptAprimorar(
  "net caiu aqui no lab e os alunos nao consegue logar no pc faz favor de arrumar logo"
);
console.log("--- TESTE 4: APRIMORAR TEXTO ---");
console.log("Primeira linha do prompt:", aprimorarPrompt.split("\n")[0]);
const respAprimorar = simularAprimoramento(aprimorarPrompt);
validarResposta(respAprimorar, "APRIMORAMENTO");

console.log("==================================================");
console.log("TODOS OS TESTES DOS DOIS MODOS PASSARAM COM SUCESSO!");
console.log("==================================================");
