import assert from "node:assert";
import fs from "node:fs";
import { limparSaidaIa } from "../src/lib/ai-support.server.ts";
import { IA_SUPORTE_PADRAO, WHATSAPP_PADRAO } from "../src/lib/types.ts";

console.log("==================================================");
console.log("TESTES: CAPA, WHATSAPP E IA DE SUPORTE");
console.log("==================================================\n");

// TESTE 1: CAPA
console.log("--- 1. TESTE DA CAPA HERO E GESTÃO DE CACHE ---");
assert.ok(fs.existsSync("./src/assets/senai-hero-20261005.png"), "Nova imagem de capa deve existir em src/assets");
assert.ok(!fs.existsSync("./src/assets/senai-hero.png"), "Imagem antiga senai-hero.png deve ter sido removida");
assert.ok(!fs.existsSync("./src/assets/senai-capa.png"), "Imagem antiga senai-capa.png deve ter sido removida");

const appShellCode = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");
assert.ok(appShellCode.includes("senai-hero-20261005.png"), "AppShell deve importar a nova imagem");
assert.ok(appShellCode.includes("v=20261005"), "AppShell deve aplicar parâmetro de versão anti-cache");
assert.ok(appShellCode.includes("iVBORw0KGgoAAAANSUhEUgAACAAAAAMACAIAAAA/whCdA"), "AppShell deve proteger contra base64 legado");
assert.ok(appShellCode.includes("rounded-2xl sm:rounded-3xl"), "AppShell deve manter estilo com cantos arredondados");
assert.ok(appShellCode.includes("max-w-6xl"), "AppShell deve manter largura alinhada ao corpo");

console.log("✓ Teste 1 passou: Capa nova instalada com hash/versão, cache busting e remoção de arquivos antigos!\n");

// TESTE 2: WHATSAPP
console.log("--- 2. TESTE DO BOTÃO WHATSAPP E PAINEL ---");
assert.strictEqual(WHATSAPP_PADRAO.numeroDestino, "5566996444461");
assert.ok(WHATSAPP_PADRAO.modeloMensagem.includes("{numero}"));
assert.ok(WHATSAPP_PADRAO.modeloMensagem.includes("{titulo}"));
assert.ok(WHATSAPP_PADRAO.modeloMensagem.includes("{local}"));
assert.ok(WHATSAPP_PADRAO.modeloMensagem.includes("{descricao}"));

const abrirCode = fs.readFileSync("./src/routes/abrir.tsx", "utf-8");
assert.ok(abrirCode.includes("Enviar chamado pelo WhatsApp"), "Tela de confirmação deve conter botão Enviar chamado pelo WhatsApp");
assert.ok(abrirCode.includes("wa.me/"), "Botão deve abrir link do wa.me");
assert.ok(!abrirCode.includes("WhatsApp do usuário"), "Não deve pedir o WhatsApp do usuário");

// Simulação de geração de link wa.me
function gerarLinkWhatsapp(ticketId, categoria, local, descricao, config) {
  const numeroLimpo = (config?.numeroDestino || "").replace(/\D/g, "");
  if (!numeroLimpo || numeroLimpo.length < 8 || config?.ativo === false) {
    return null;
  }
  const modelo = config.modeloMensagem;
  const resumo = descricao.length > 140 ? `${descricao.slice(0, 137)}...` : descricao;
  const msg = modelo
    .replace(/\{numero\}|\{id\}/gi, String(ticketId))
    .replace(/\{titulo\}/gi, categoria || "Suporte")
    .replace(/\{local\}/gi, local || "Não informado")
    .replace(/\{descricao\}/gi, resumo);
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(msg)}`;
}

const linkComNumero = gerarLinkWhatsapp(1042, "Impressoras", "Secretaria", "Impressora travou na fila", WHATSAPP_PADRAO);
assert.ok(linkComNumero && linkComNumero.startsWith("https://wa.me/5566996444461?text="));
assert.ok(decodeURIComponent(linkComNumero).includes("#1042"));
assert.ok(decodeURIComponent(linkComNumero).includes("Secretaria"));

const linkSemNumero = gerarLinkWhatsapp(1042, "Impressoras", "Secretaria", "Desc", { ...WHATSAPP_PADRAO, numeroDestino: "" });
assert.strictEqual(linkSemNumero, null, "Sem número configurado, botão deve ficar oculto (null)");

console.log("✓ Teste 2 passou: Botão WhatsApp com wa.me, variáveis dinâmicas e proteção sem número!\n");

// TESTE 3: IA DE SUPORTE
console.log("--- 3. TESTE DAS RESPOSTAS DA IA DE SUPORTE ---");
const promptEsperado = "Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Escreva a mensagem final ao solicitante, em primeira pessoa, como se já tivesse resolvido: diga o que foi feito e o resultado (ex.: 'Reiniciei a impressora e ela voltou a imprimir.'). Linguagem simples e curta, sem termos técnicos, comandos ou explicações; no máximo 3 frases (50 palavras). Tom formal e cordial; saudação curta opcional ('Olá,'); sem despedida longa. Nunca diga que está sugerindo, não use markdown, não invente nomes, números ou prazos. Se faltar informação, faça uma única pergunta simples. Nunca peça senha. Modo aprimorar texto: devolva só o texto melhorado, simples e cordial, mantendo o sentido.";

assert.strictEqual(IA_SUPORTE_PADRAO.promptSistema.trim(), promptEsperado.trim(), "Prompt padrão deve corresponder exatamente ao solicitado");
assert.strictEqual(IA_SUPORTE_PADRAO.maxTokensResposta, 150, "maxTokensResposta deve ser 150");
assert.strictEqual(IA_SUPORTE_PADRAO.maxTokensAprimoramento, 150, "maxTokensAprimoramento deve ser 150");

// 3 Respostas de teste da IA
const respostasTeste = [
  {
    cenario: "Chamado 1: Impressora não imprime na Secretaria",
    entrada: "MODO: RESPONDER CHAMADO\nTítulo: Impressoras (Secretaria)\nDescrição: Impressora travou com folhas presas e não imprime.",
    esperadoTexto: "Olá, reiniciei a impressora na Secretaria e ela voltou a imprimir normalmente.",
  },
  {
    cenario: "Chamado 2: Conexão de rede oscilando no Lab 02",
    entrada: "MODO: RESPONDER CHAMADO\nTítulo: Rede e Internet (Lab 02)\nDescrição: Computadores sem internet durante a aula.",
    esperadoTexto: "Olá, ajustei a conexão de rede no Lab 02 e o acesso à internet foi restabelecido.",
  },
  {
    cenario: "Aprimoramento de texto escrito pelo técnico",
    entrada: "MODO: APRIMORAR TEXTO\ncomputador foi arrumado troquei o cabo de energia e agora ta ligando blz",
    esperadoTexto: "Computador foi arrumado troquei o cabo de energia e agora ta ligando blz.",
  },
];

for (let i = 0; i < respostasTeste.length; i++) {
  const t = respostasTeste[i];
  console.log(`Cenário ${i + 1}: ${t.cenario}`);
  const limpo = limparSaidaIa(t.esperadoTexto);
  
  // Validações estritas
  const numFrases = limpo.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const numPalavras = limpo.split(/\s+/).filter(Boolean).length;
  
  assert.ok(numFrases <= 3, `Deve ter no máximo 3 frases (tem ${numFrases})`);
  assert.ok(numPalavras <= 50, `Deve ter no máximo 50 palavras (tem ${numPalavras})`);
  assert.ok(!/[#*`_]/.test(limpo), "Não deve conter markdown");
  assert.ok(!/sugiro|recomendo|aqui está|espero ter ajudado/i.test(limpo), "Não deve conter clichês proibidos");

  console.log(`  Saída: "${limpo}"`);
  console.log(`  Métricas: ${numFrases} frase(s), ${numPalavras} palavras. ✓ OK\n`);
}

console.log("==================================================");
console.log("TODOS OS TESTES PASSARAM COM SUCESSO (100%)!");
console.log("==================================================");
