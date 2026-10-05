import assert from "node:assert/strict";
import {
  aplicarMelhoriasHeuristicas,
  temErrosOuGiria,
  limparSaidaIa,
  gerarFallbackLocal,
} from "../src/lib/ai-support.server.ts";
import {
  IA_SUPORTE_PADRAO,
  PROMPT_SUGERIR_RESPOSTA_PADRAO,
  PROMPT_APRIMORAR_TEXTO_PADRAO,
  PROMPT_SUGERIR_ABERTURA_PADRAO,
} from "../src/lib/types.ts";

console.log("=== INICIANDO BATERIA DE TESTES: IA APRIMORAR E SUGERIR TEXTO ===\n");

// TESTE 1: Aprimoramento com a frase de teste solicitada
console.log("1. Testando aprimoramento com frase desafiadora...");
const fraseEntrada = "o pc ta lento pq vc ta com muitos arquivo abert e nao";
console.log("   Entrada:", fraseEntrada);

const temErros = temErrosOuGiria(fraseEntrada);
console.log("   Detectou erros/gírias/abreviações?", temErros);
assert.equal(temErros, true, "Deveria detectar erros e abreviações na frase de teste.");

const aprimorado = aplicarMelhoriasHeuristicas(fraseEntrada);
console.log("   Saída aprimorada:", aprimorado);

assert.ok(aprimorado !== fraseEntrada, "A saída NÃO pode ser igual à entrada!");
assert.ok(!aprimorado.includes(" pc "), "Deveria expandir 'pc'");
assert.ok(!aprimorado.includes(" ta "), "Deveria expandir 'ta' para 'está'");
assert.ok(!aprimorado.includes(" pq "), "Deveria expandir 'pq' para 'porque'");
assert.ok(!aprimorado.includes(" vc "), "Deveria expandir 'vc' para 'você'");
assert.ok(aprimorado.includes("computador"), "Deveria conter 'computador'");
assert.ok(aprimorado.includes("porque"), "Deveria conter 'porque'");
assert.ok(aprimorado.includes("você"), "Deveria conter 'você'");
assert.ok(aprimorado.includes("muitos arquivos abertos"), "Deveria corrigir concordância para 'muitos arquivos abertos'");
assert.ok(!aprimorado.endsWith("e nao") && !aprimorado.endsWith("e não"), "Deveria completar frase inacabada");
assert.ok(aprimorado.endsWith("."), "Deveria terminar com pontuação final");
console.log("   ✔ Teste 1 passou com sucesso!\n");

// TESTE 2: Sugestão na abertura com setor Secretaria + local Recepção + Impressora
console.log("2. Testando sugestão na abertura com Secretaria + Recepção + Impressora...");
const promptAbertura = `Opções selecionadas pelo solicitante:
- Setor: Secretaria
- Local: Recepção
- Tipo de problema: Impressora
- Informações adicionais: `;

const sugestaoAbertura = gerarFallbackLocal(
  PROMPT_SUGERIR_ABERTURA_PADRAO,
  promptAbertura,
  {
    modo: "abertura",
    dadosOpcoes: {
      setor: "Secretaria",
      local: "Recepção",
      categoria: "Impressora",
    },
  }
);
console.log("   Sugestão gerada:", sugestaoAbertura);

assert.ok(
  sugestaoAbertura.includes("impressora da recepção, setor Secretaria, está com problemas") ||
  sugestaoAbertura.includes("Recepção"),
  "Deveria gerar a descrição clara baseada nas opções fornecidas"
);
assert.equal(
  sugestaoAbertura,
  "Informo que a impressora da recepção, setor Secretaria, está com problemas.",
  "Deveria corresponder perfeitamente ao formato esperado"
);
console.log("   ✔ Teste 2 passou com sucesso!\n");

// TESTE 3: Sugestão na abertura complementando texto já existente
console.log("3. Testando complementação de texto já existente na abertura...");
const sugestaoComTextoPrevio = gerarFallbackLocal(
  PROMPT_SUGERIR_ABERTURA_PADRAO,
  promptAbertura,
  {
    modo: "abertura",
    textoOriginal: "Liguei o cabo de energia.",
    dadosOpcoes: {
      setor: "Secretaria",
      local: "Recepção",
      categoria: "Impressora",
    },
  }
);
console.log("   Texto complementado:", sugestaoComTextoPrevio);
assert.ok(
  sugestaoComTextoPrevio.startsWith("Liguei o cabo de energia."),
  "Deveria preservar o texto original quando solicitado complementar"
);
assert.ok(
  sugestaoComTextoPrevio.includes("impressora"),
  "Deveria adicionar a descrição gerada"
);
console.log("   ✔ Teste 3 passou com sucesso!\n");

// TESTE 4: Configurações dos 3 modos e padrões de IA
console.log("4. Testando estrutura de configuração dos 3 modos de IA...");
assert.ok(IA_SUPORTE_PADRAO.respostaAtendimento, "Deveria ter aba 'respostaAtendimento'");
assert.ok(IA_SUPORTE_PADRAO.aprimorarTexto, "Deveria ter aba 'aprimorarTexto'");
assert.ok(IA_SUPORTE_PADRAO.sugerirAbertura, "Deveria ter aba 'sugerirAbertura'");

// Validação dos prompts padrão
assert.equal(IA_SUPORTE_PADRAO.respostaAtendimento.prompt, PROMPT_SUGERIR_RESPOSTA_PADRAO);
assert.equal(IA_SUPORTE_PADRAO.aprimorarTexto.prompt, PROMPT_APRIMORAR_TEXTO_PADRAO);
assert.equal(IA_SUPORTE_PADRAO.sugerirAbertura.prompt, PROMPT_SUGERIR_ABERTURA_PADRAO);

// Validação dos limites de token padrão
assert.equal(IA_SUPORTE_PADRAO.respostaAtendimento.maxTokens, 150);
assert.equal(IA_SUPORTE_PADRAO.aprimorarTexto.maxTokens, 150);
assert.equal(IA_SUPORTE_PADRAO.sugerirAbertura.maxTokens, 100);

// Simulação de edição e restauração individual
const configCustom = JSON.parse(JSON.stringify(IA_SUPORTE_PADRAO));
configCustom.aprimorarTexto.prompt = "Prompt customizado de aprimoramento";
configCustom.aprimorarTexto.maxTokens = 200;
configCustom.aprimorarTexto.ativo = false;

assert.equal(configCustom.aprimorarTexto.prompt, "Prompt customizado de aprimoramento");
assert.equal(configCustom.aprimorarTexto.maxTokens, 200);
assert.equal(configCustom.aprimorarTexto.ativo, false);

// Restaurando apenas aprimorarTexto para o padrão
configCustom.aprimorarTexto = {
  ...IA_SUPORTE_PADRAO.aprimorarTexto,
};
assert.equal(configCustom.aprimorarTexto.prompt, PROMPT_APRIMORAR_TEXTO_PADRAO);
assert.equal(configCustom.aprimorarTexto.maxTokens, 150);
assert.equal(configCustom.aprimorarTexto.ativo, true);
console.log("   ✔ Teste 4 passou com sucesso!\n");

// TESTE 5: Limpeza de saída da IA (remover aspas, markdown, comentários)
console.log("5. Testando limpeza de saída de IA...");
const saidaSuja1 = '```markdown\n"Texto com aspas e bloco"\n```';
const saidaLimpa1 = limparSaidaIa(saidaSuja1);
assert.equal(saidaLimpa1, "Texto com aspas e bloco");

const saidaSuja2 = 'Aqui está a versão melhorada: O chamado foi resolvido com sucesso.';
const saidaLimpa2 = limparSaidaIa(saidaSuja2);
assert.equal(saidaLimpa2, "O chamado foi resolvido com sucesso.");
console.log("   ✔ Teste 5 passou com sucesso!\n");

console.log("=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===");
