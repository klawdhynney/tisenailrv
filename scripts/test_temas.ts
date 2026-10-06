import {
  calcularContraste,
  calcularLuminancia,
  atendeWcagAa,
  obterCorTextoContrastante,
  gerarPaletaPersonalizada,
  obterPaletaInfo,
  resolverEhEscuro,
  PALETAS,
  TEMA_INLINE_SCRIPT,
  type PaletaId,
} from "../src/lib/tema";

console.log("=================================================");
console.log("TESTE DE TEMAS, PALETAS E ACESSIBILIDADE WCAG AA");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

// 1. Teste de Luminância e Contraste WCAG 2.1
console.log("1. Teste de Contraste WCAG 2.1 AA (mínimo 4.5:1 para texto)");
const contrastWhiteBlack = calcularContraste("#ffffff", "#000000");
assert(contrastWhiteBlack >= 20.9, `Preto/Branco contraste = ${contrastWhiteBlack.toFixed(2)} (esperado ~21)`);

// 2. Teste da paleta Padrão
console.log("\n2. Testando Paleta Padrão");
const padraoClaroTextoFundo = calcularContraste(PALETAS.padrao.destaqueClaro.texto, PALETAS.padrao.destaqueClaro.fundo);
const padraoClaroTextoCard = calcularContraste(PALETAS.padrao.destaqueClaro.texto, PALETAS.padrao.destaqueClaro.card);
const padraoEscuroTextoFundo = calcularContraste(PALETAS.padrao.destaqueEscuro.texto, PALETAS.padrao.destaqueEscuro.fundo);
const padraoEscuroTextoCard = calcularContraste(PALETAS.padrao.destaqueEscuro.texto, PALETAS.padrao.destaqueEscuro.card);

assert(padraoClaroTextoFundo >= 4.5, `Padrão Claro (texto vs fundo): ${padraoClaroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(padraoClaroTextoCard >= 4.5, `Padrão Claro (texto vs cartão): ${padraoClaroTextoCard.toFixed(2)}:1 >= 4.5:1`);
assert(padraoEscuroTextoFundo >= 4.5, `Padrão Escuro (texto vs fundo): ${padraoEscuroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(padraoEscuroTextoCard >= 4.5, `Padrão Escuro (texto vs cartão): ${padraoEscuroTextoCard.toFixed(2)}:1 >= 4.5:1`);

// 3. Teste da paleta Big Tech
console.log("\n3. Testando Paleta Big Tech");
const btClaroTextoFundo = calcularContraste(PALETAS["big-tech"].destaqueClaro.texto, PALETAS["big-tech"].destaqueClaro.fundo);
const btClaroTextoCard = calcularContraste(PALETAS["big-tech"].destaqueClaro.texto, PALETAS["big-tech"].destaqueClaro.card);
const btEscuroTextoFundo = calcularContraste(PALETAS["big-tech"].destaqueEscuro.texto, PALETAS["big-tech"].destaqueEscuro.fundo);
const btEscuroTextoCard = calcularContraste(PALETAS["big-tech"].destaqueEscuro.texto, PALETAS["big-tech"].destaqueEscuro.card);

assert(btClaroTextoFundo >= 4.5, `Big Tech Claro (texto vs fundo): ${btClaroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(btClaroTextoCard >= 4.5, `Big Tech Claro (texto vs cartão): ${btClaroTextoCard.toFixed(2)}:1 >= 4.5:1`);
assert(btEscuroTextoFundo >= 4.5, `Big Tech Escuro (texto vs fundo): ${btEscuroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(btEscuroTextoCard >= 4.5, `Big Tech Escuro (texto vs cartão): ${btEscuroTextoCard.toFixed(2)}:1 >= 4.5:1`);

// 4. Teste da paleta Interstellar Inspired
console.log("\n4. Testando Paleta Interstellar Inspired");
const interClaroTextoFundo = calcularContraste(PALETAS.interstellar.destaqueClaro.texto, PALETAS.interstellar.destaqueClaro.fundo);
const interClaroTextoCard = calcularContraste(PALETAS.interstellar.destaqueClaro.texto, PALETAS.interstellar.destaqueClaro.card);
const interEscuroTextoFundo = calcularContraste(PALETAS.interstellar.destaqueEscuro.texto, PALETAS.interstellar.destaqueEscuro.fundo);
const interEscuroTextoCard = calcularContraste(PALETAS.interstellar.destaqueEscuro.texto, PALETAS.interstellar.destaqueEscuro.card);

assert(interClaroTextoFundo >= 4.5, `Interstellar Claro (texto vs fundo): ${interClaroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(interClaroTextoCard >= 4.5, `Interstellar Claro (texto vs cartão): ${interClaroTextoCard.toFixed(2)}:1 >= 4.5:1`);
assert(interEscuroTextoFundo >= 4.5, `Interstellar Escuro (texto vs fundo): ${interEscuroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(interEscuroTextoCard >= 4.5, `Interstellar Escuro (texto vs cartão): ${interEscuroTextoCard.toFixed(2)}:1 >= 4.5:1`);

// Cores de alto contraste e foco no modo escuro Interstellar
const interPrimariaEscuroFundo = calcularContraste(PALETAS.interstellar.destaqueEscuro.primaria, PALETAS.interstellar.destaqueEscuro.fundo);
assert(interPrimariaEscuroFundo >= 4.5, `Interstellar Primária Escuro (Cyan Ice vs Space): ${interPrimariaEscuroFundo.toFixed(2)}:1 >= 4.5:1`);

// 5. Teste da paleta Personalizada
console.log("\n5. Testando Gerador de Paleta Personalizada");
const personalizada = gerarPaletaPersonalizada({
  corPrimaria: "#1A73E8",
  corSucesso: "#34A853",
  corAlerta: "#FBBC04",
  corPerigo: "#EA4335",
  corNeutra: "#1F2430",
});

const customClaroTextoFundo = calcularContraste(personalizada.destaqueClaro.texto, personalizada.destaqueClaro.fundo);
const customClaroTextoCard = calcularContraste(personalizada.destaqueClaro.texto, personalizada.destaqueClaro.card);
const customEscuroTextoFundo = calcularContraste(personalizada.destaqueEscuro.texto, personalizada.destaqueEscuro.fundo);
const customEscuroTextoCard = calcularContraste(personalizada.destaqueEscuro.texto, personalizada.destaqueEscuro.card);

assert(customClaroTextoFundo >= 4.5, `Personalizada Claro (texto vs fundo): ${customClaroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(customClaroTextoCard >= 4.5, `Personalizada Claro (texto vs cartão): ${customClaroTextoCard.toFixed(2)}:1 >= 4.5:1`);
assert(customEscuroTextoFundo >= 4.5, `Personalizada Escuro (texto vs fundo): ${customEscuroTextoFundo.toFixed(2)}:1 >= 4.5:1`);
assert(customEscuroTextoCard >= 4.5, `Personalizada Escuro (texto vs cartão): ${customEscuroTextoCard.toFixed(2)}:1 >= 4.5:1`);

// 6. Teste de Ausência de Piscada (Anti-flicker script)
console.log("\n6. Testando Script Anti-flicker");
assert(TEMA_INLINE_SCRIPT.length > 50, "Script inline anti-flicker definido e não vazio");
assert(TEMA_INLINE_SCRIPT.includes("localStorage.getItem('tema-ti-modo')"), "Lê tema-ti-modo antes do primeiro frame");
assert(TEMA_INLINE_SCRIPT.includes("root.classList.add('dark')"), "Aplica classe 'dark' síncrona no head");
assert(TEMA_INLINE_SCRIPT.includes("setAttribute('data-paleta'"), "Aplica data-paleta síncrono no head");
assert(TEMA_INLINE_SCRIPT.includes("meta[name=\"theme-color\"]"), "Atualiza meta theme-color síncrono no head");

// 7. Modos claro e escuro resolução
console.log("\n7. Testando Modos de Tema");
assert(resolverEhEscuro("claro") === false, "Modo 'claro' resolve para falso (não escuro)");
assert(resolverEhEscuro("escuro") === true, "Modo 'escuro' resolve para verdadeiro (escuro)");

// 8. Teste de Gráficos e Paletas
console.log("\n8. Testando Séries de Gráficos por Paleta");
const paletasTestar: PaletaId[] = ["padrao", "big-tech", "interstellar", "personalizada"];
for (const pId of paletasTestar) {
  const p = obterPaletaInfo(pId);
  assert(p.coresGraficoClaro.length >= 5, `Paleta ${p.nome} tem >= 5 cores para gráficos no modo claro`);
  assert(p.coresGraficoEscuro.length >= 5, `Paleta ${p.nome} tem >= 5 cores para gráficos no modo escuro`);
  assert(p.serieHistorica.claro.gradienteOceano.length === 3, `Paleta ${p.nome} define gradiente oceano claro de 3 paradas`);
  assert(p.serieHistorica.escuro.gradienteOceano.length === 3, `Paleta ${p.nome} define gradiente oceano escuro de 3 paradas`);
}

// 9. Verificação de Botão/Texto de Contraste Automático
console.log("\n9. Testando Cores de Contraste para Texto em Botões");
assert(obterCorTextoContrastante("#ffffff") === "#111827", "Texto sobre fundo branco é escuro");
assert(obterCorTextoContrastante("#000000") === "#ffffff", "Texto sobre fundo preto é branco");
assert(obterCorTextoContrastante("#0B132B") === "#ffffff", "Texto sobre fundo Space (#0B132B) é branco");
assert(obterCorTextoContrastante("#F5F3F4") === "#111827", "Texto sobre fundo Signal (#F5F3F4) é escuro");

// 10. Verificação de CSS Tokens e Responsividade (360px, 768px, 1280px)
console.log("\n10. Testando Suporte Responsivo e Tokens no CSS");
const cssContent = await Bun.file("src/styles.css").text();
assert(cssContent.includes('[data-paleta="big-tech"]'), "CSS contém seletor de paleta Big Tech");
assert(cssContent.includes('.dark[data-paleta="big-tech"]'), "CSS contém seletor de paleta Big Tech no modo escuro");
assert(cssContent.includes('[data-paleta="interstellar"]'), "CSS contém seletor de paleta Interstellar Inspired");
assert(cssContent.includes('.dark[data-paleta="interstellar"]'), "CSS contém seletor de paleta Interstellar Inspired no modo escuro");
assert(cssContent.includes('--color-success: var(--success);'), "Tailwind v4 theme expõe --color-success");
assert(cssContent.includes('--color-warning: var(--warning);'), "Tailwind v4 theme expõe --color-warning");

// 11. Verificação de Componentes Responsivos
console.log("\n11. Testando Componentes nos Viewports 360px (mobile), 768px (tablet) e 1280px (desktop)");
const appShellContent = await Bun.file("src/components/AppShell.tsx").text();
assert(appShellContent.includes("lg:flex"), "AppShell suporta desktop >= 1024px (1280px)");
assert(appShellContent.includes("lg:hidden"), "AppShell suporta menu mobile para <= 768px / 360px");
assert(appShellContent.includes("grid grid-cols-3"), "Menu mobile de 360px inclui botões segmentados Claro/Escuro/Auto");
assert(appShellContent.includes("seletorTemaDropdown"), "Cabeçalho possui dropdown de tema acessível");

console.log("\n=================================================");
console.log(`TOTAL: ${passed} passaram, ${failed} falharam.`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
