import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("TESTES: NOVO ÍCONE, PROPORÇÕES DA CAPA E HARMONIA");
console.log("==================================================\n");

// 1. ÍCONE E FORMATOS DO FAVICON / PWA
console.log("--- 1. TESTE DOS ARQUIVOS DE ÍCONE E FAVICON ---");
assert.ok(fs.existsSync("./src/assets/icone.png"), "src/assets/icone.png deve existir");
assert.ok(fs.existsSync("./public/icone.png"), "public/icone.png deve existir");
assert.ok(fs.existsSync("./public/icon-512.png"), "public/icon-512.png deve existir");
assert.ok(fs.existsSync("./public/icon-192.png"), "public/icon-192.png deve existir");
assert.ok(fs.existsSync("./public/apple-touch-icon.png"), "public/apple-touch-icon.png deve existir");
assert.ok(fs.existsSync("./public/favicon.png"), "public/favicon.png deve existir");
assert.ok(fs.existsSync("./public/favicon-32x32.png"), "public/favicon-32x32.png deve existir");
assert.ok(fs.existsSync("./public/favicon-16x16.png"), "public/favicon-16x16.png deve existir");
assert.ok(fs.existsSync("./public/favicon.ico"), "public/favicon.ico deve existir");

// Verificar tamanhos dos arquivos (devem ser não-vazios)
const iconStats = fs.statSync("./src/assets/icone.png");
assert.ok(iconStats.size > 10000, "src/assets/icone.png deve ter conteúdo de alta resolução");

const manifest = JSON.parse(fs.readFileSync("./public/manifest.json", "utf-8"));
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Manifest deve declarar os ícones PWA");
assert.ok(manifest.icons.some((i) => i.src === "/icon-192.png"), "Manifest deve ter icon-192");
assert.ok(manifest.icons.some((i) => i.src === "/icon-512.png"), "Manifest deve ter icon-512");
assert.ok(manifest.icons.some((i) => i.src === "/icone.png"), "Manifest deve ter icone.png");
console.log("✓ Arquivos de ícone, favicons e manifest validados com sucesso!\n");

// 2. CABEÇALHO E REMOÇÃO DE IMAGENS INDEVIDAS
console.log("--- 2. TESTE DO CABEÇALHO, LOGIN E RODAPÉ ---");
const appShellCode = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");
assert.ok(appShellCode.includes("icone.png"), "AppShell deve carregar o novo icone");
assert.ok(appShellCode.includes("TI SENAI LRV"), "AppShell deve exibir o título em texto 'TI SENAI LRV'");
assert.ok(!appShellCode.includes("titulo.png"), "AppShell não deve importar titulo.png");

// Rodapé textual
const footerPart = appShellCode.substring(appShellCode.indexOf("<footer"));
assert.ok(!footerPart.includes("<img"), "Rodapé não deve ter imagens");

// Login textual
const authCode = fs.readFileSync("./src/routes/auth.tsx", "utf-8");
assert.ok(!authCode.includes("<img"), "Tela de login (auth.tsx) não deve ter imagens");
console.log("✓ Cabeçalho, login e rodapé textuais validados com sucesso!\n");

// 3. CAPA HARMÔNICA COM O CORPO DO SITE
console.log("--- 3. TESTE DA CAPA HARMÔNICA E PROPORÇÕES ---");
assert.ok(fs.existsSync("./src/assets/capa.png"), "src/assets/capa.png deve existir");
assert.ok(fs.existsSync("./public/capa.png"), "public/capa.png deve existir");
assert.ok(fs.existsSync("./src/assets/capa.webp"), "src/assets/capa.webp otimizada deve existir");
assert.ok(fs.existsSync("./public/capa.webp"), "public/capa.webp deve existir");
assert.ok(fs.existsSync("./public/capa-1x.webp"), "public/capa-1x.webp deve existir");

// Mesma largura máxima e alinhamento lateral do corpo e do cabeçalho
assert.ok(appShellCode.includes("max-w-6xl"), "AppShell deve alinhar largura do banner a max-w-6xl");
assert.ok(appShellCode.includes("px-4 sm:px-6 lg:px-8"), "AppShell deve manter o mesmo espaçamento lateral");

// Proporção por tela
assert.ok(
  appShellCode.includes("aspect-[16/10]") && appShellCode.includes("max-h-[220px]"),
  "Celular deve ter proporção 16:10 com max-h de aprox 220px",
);
assert.ok(
  appShellCode.includes("sm:aspect-[16/9]") && appShellCode.includes("sm:max-h-[300px]"),
  "Tablet deve ter proporção 16:9",
);
assert.ok(
  appShellCode.includes("lg:aspect-[21/9]") && appShellCode.includes("lg:max-h-[360px]"),
  "Desktop deve ter proporção cerca de 21:9 com max-h de aprox 360px",
);

// Cantos arredondados e sombra suave iguais aos cartões
assert.ok(appShellCode.includes("rounded-2xl"), "Banner deve ter raio rounded-2xl igual aos cartões");
assert.ok(appShellCode.includes("shadow-xs"), "Banner deve ter sombra suave shadow-xs igual aos cartões");

// Espaçamento vertical entre cabeçalho, banner e conteúdo igual ao padrão entre seções
assert.ok(appShellCode.includes("mb-6 sm:mb-8"), "Espaço vertical abaixo do banner deve ser mb-6 sm:mb-8");

// Tag picture com fallback e WebP
assert.ok(appShellCode.includes("<picture"), "AppShell deve usar tag <picture> para servir WebP responsivo");
assert.ok(appShellCode.includes("image/webp"), "Deve servir formato WebP otimizado");

// Posição da imagem da capa configurável
assert.ok(appShellCode.includes("posicaoCapaClass"), "AppShell deve aplicar a classe dinâmica de posicaoCapa");
console.log("✓ Harmonia da capa e proporções por tela validadas com sucesso!\n");

// 4. PAINEL DE AJUSTES (ADMIN)
console.log("--- 4. TESTE DO PAINEL DE AJUSTES (ADMIN) ---");
const regrasCode = fs.readFileSync("./src/routes/_authenticated/regras.tsx", "utf-8");
assert.ok(regrasCode.includes("Posição da imagem da capa"), "regras.tsx deve ter o campo Posição da imagem da capa");
assert.ok(regrasCode.includes("posicaoCapa"), "regras.tsx deve manipular o estado posicaoCapa");

const typesCode = fs.readFileSync("./src/lib/types.ts", "utf-8");
assert.ok(typesCode.includes("posicaoCapa?: \"topo\" | \"centro\" | \"base\""), "types.ts deve tipar posicaoCapa");
assert.ok(typesCode.includes("posicaoCapa: \"centro\""), "types.ts deve definir padrão centro");
console.log("✓ Painel de ajustes e tipos validados com sucesso!\n");

// 5. CACHE BUSTING E VERIFICAÇÃO DE ARQUIVOS ANTIGOS
console.log("--- 5. TESTE DE GESTÃO DE CACHE E ARQUIVOS ANTIGOS ---");
assert.ok(appShellCode.includes("20261005_v5") || appShellCode.includes("20261005_v4"), "AppShell deve usar parâmetro de versão atualizado");

const rootCode = fs.readFileSync("./src/routes/__root.tsx", "utf-8");
assert.ok(rootCode.includes("20261005_v5") || rootCode.includes("20261005_v4"), "__root.tsx deve usar parâmetro de versão atualizado");

assert.ok(!fs.existsSync("./public/favicon.jpg"), "favicon.jpg não deve existir");
assert.ok(!fs.existsSync("./src/assets/technology-lab.jpg"), "technology-lab.jpg não deve existir");
assert.ok(!fs.existsSync("./src/assets/senai-hero-20261005.png"), "senai-hero-20261005.png não deve existir");
console.log("✓ Cache busting e limpeza de arquivos antigos validados!\n");

console.log("==================================================");
console.log("TODOS OS TESTES PASSARAM COM SUCESSO (100%)!");
console.log("==================================================");
