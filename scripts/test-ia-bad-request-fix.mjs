import assert from "node:assert/strict";
import {
  askSupportAI,
  AiSupportError,
  limparSaidaIa,
  temErrosOuGiria,
} from "../src/lib/ai-support.server.ts";
import { tratarErroIa } from "../src/lib/revisar-texto.functions.ts";

console.log("=== INICIANDO TESTES DO FIX IA BAD REQUEST (400) ===\n");

// TESTE 1: Validação de tratamento de erro para usuário comum vs gestor
console.log("1. Testando mensagens amigáveis vs detalhe para administrador...");
const erroSimulado = new AiSupportError(
  "A IA não conseguiu responder agora. Tente novamente.",
  "Invalid parameter: temperature não suportado pelo modelo",
  400
);

const erroUsuarioComum = tratarErroIa(erroSimulado, false);
console.log("   Mensagem para usuário comum:", erroUsuarioComum.message);
assert.equal(
  erroUsuarioComum.message,
  "A IA não conseguiu responder agora. Tente novamente.",
  "Usuário comum deve receber mensagem amigável sem detalhes técnicos"
);

const erroGestor = tratarErroIa(erroSimulado, true);
console.log("   Mensagem para administrador/gestor:", erroGestor.message);
assert.ok(
  erroGestor.message.includes("(Motivo: Invalid parameter: temperature não suportado pelo modelo)"),
  "Gestor deve receber motivo técnico resumido"
);
console.log("   ✔ Teste 1 passou com sucesso!\n");

// TESTE 2: Simulação de chamada HTTP direta com interceptação de 400 e retry com payload mínimo
console.log("2. Testando retry automático com parâmetros mínimos ao receber HTTP 400...");
const requisicoesFeitas = [];

// Mock do global fetch para simular provedor de IA com 400 na 1ª tentativa e sucesso no retry mínimo
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const bodyParsed = options?.body ? JSON.parse(options.body) : {};
  requisicoesFeitas.push({
    url: url.toString(),
    body: bodyParsed,
  });

  // Se tem temperature (tentativa 1), simula erro 400 de parâmetro não suportado
  if (bodyParsed.temperature !== undefined) {
    return new Response(JSON.stringify({
      status: 400,
      type: "invalid_request_error",
      title: "Parâmetro temperature não suportado",
      message: "Este modelo não aceita o parâmetro temperature.",
    }), {
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" },
    });
  }

  // Tentativa 2 mínima (sem temperature) -> sucesso!
  return new Response(JSON.stringify({
    id: "chatcmpl-mock-success",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Verifiquei o computador e o funcionamento foi normalizado.",
        },
        finish_reason: "stop",
      },
    ],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

process.env["LOVABLE_API_KEY"] = "sk_mock_lovable_key_test_12345";

const respostaComRetry = await askSupportAI(
  "Você é o técnico de suporte",
  "O computador não liga",
  {
    modo: "resposta",
    temperature: 0.2,
    maxTokens: 150,
  }
);

console.log("   Requisições capturadas:", requisicoesFeitas.length);
assert.equal(requisicoesFeitas.length, 2, "Deveria ter feito exatamente 2 requisições (tentativa 1 e retry mínimo)");

// Valida que a primeira requisição usou /chat/completions (e NUNCA /v1/responses)
assert.ok(
  requisicoesFeitas[0].url.endsWith("/chat/completions"),
  "A URL deve ser /chat/completions"
);
assert.equal(requisicoesFeitas[0].body.temperature, 0.2, "Tentativa 1 deve ter temperature");

// Valida que a segunda requisição removeu os parâmetros opcionais
assert.equal(requisicoesFeitas[1].body.temperature, undefined, "Tentativa 2 mínima NÃO deve ter temperature");
assert.equal(requisicoesFeitas[1].body.max_tokens, undefined, "Tentativa 2 mínima NÃO deve ter max_tokens");
assert.equal(
  respostaComRetry,
  "Verifiquei o computador e o funcionamento foi normalizado.",
  "Deveria ter recuperado com sucesso após o retry mínimo"
);
console.log("   ✔ Teste 2 (recuperação de 400 com retry mínimo) passou com sucesso!\n");

// TESTE 3: Teste dos 3 modos em ambiente sem chave (motor local heurístico)
console.log("3. Testando os 3 modos no motor local resiliente...");
delete process.env["LOVABLE_API_KEY"];
delete process.env["OPENAI_API_KEY"];

// a) Resposta com IA
const resResposta = await askSupportAI(
  "Você é o técnico de suporte de TI",
  "Título: Chamado #10\nDescrição: Impressora não puxa folha",
  { modo: "resposta" }
);
console.log("   a) Resposta com IA:", resResposta);
assert.ok(resResposta.length > 10, "Deveria gerar resposta de atendimento");

// b) Aprimorar texto
const resAprimorar = await askSupportAI(
  "Você é revisor",
  "o pc ta lento pq vc ta com muitos arquivo abert e nao",
  { modo: "aprimorar", textoOriginal: "o pc ta lento pq vc ta com muitos arquivo abert e nao" }
);
console.log("   b) Aprimorar texto:", resAprimorar);
assert.ok(resAprimorar.includes("computador"), "Deveria expandir 'pc'");
assert.ok(resAprimorar.includes("porque"), "Deveria expandir 'pq'");
assert.ok(resAprimorar.includes("muitos arquivos abertos"), "Deveria corrigir concordância");

// c) Sugerir texto ao abrir chamado
const resAbertura = await askSupportAI(
  "Você ajuda a descrever",
  "Opções selecionadas pelo solicitante:\n- Setor: Secretaria\n- Local: Recepção\n- Tipo de problema: Impressora",
  {
    modo: "abertura",
    dadosOpcoes: { setor: "Secretaria", local: "Recepção", categoria: "Impressora" },
  }
);
console.log("   c) Sugerir texto ao abrir chamado:", resAbertura);
assert.equal(
  resAbertura,
  "Informo que a impressora da recepção, setor Secretaria, está com problemas.",
  "Deveria gerar sugestão correta na abertura"
);
console.log("   ✔ Teste 3 (3 modos no motor resiliente) passou com sucesso!\n");

// Restaura global fetch
globalThis.fetch = originalFetch;

console.log("=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===");
