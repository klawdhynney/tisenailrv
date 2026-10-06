import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("TESTE DE VALIDAÇÃO: NOVAS IMAGENS (FAVICON, ÍCONE, CAPA)");
console.log("==================================================\n");

// 1. Arquivos novos obrigatórios
console.log("1. Verificando presença e integridade das novas imagens...");
assert.ok(fs.existsSync("./public/favicon.png"), "public/favicon.png deve existir");
assert.ok(fs.existsSync("./public/icone.png"), "public/icone.png deve existir");
assert.ok(fs.existsSync("./src/assets/icone.png"), "src/assets/icone.png deve existir");
assert.ok(fs.existsSync("./public/capa.png"), "public/capa.png deve existir");
assert.ok(fs.existsSync("./src/assets/capa.png"), "src/assets/capa.png deve existir");
assert.ok(fs.existsSync("./public/apple-touch-icon.png"), "public/apple-touch-icon.png deve existir");
assert.ok(fs.existsSync("./public/manifest.json"), "public/manifest.json deve existir");

// Verificar se não estão vazios
assert.ok(fs.statSync("./public/favicon.png").size > 100000, "favicon.png deve ter conteúdo válido");
assert.ok(fs.statSync("./public/icone.png").size > 500000, "icone.png deve ter conteúdo de alta definição");
assert.ok(fs.statSync("./public/capa.png").size > 500000, "capa.png deve ter conteúdo de alta definição");
console.log("  [PASS] Todos os arquivos novos existem com tamanho íntegro.");

// 2. Remoção de arquivos antigos para evitar cache
console.log("\n2. Verificando que as imagens antigas sem uso foram removidas...");
const obsoletos = [
  "./public/capa-1x.webp",
  "./public/capa.jpg",
  "./public/capa.webp",
  "./public/capa@2x.webp",
  "./public/favicon-16x16.png",
  "./public/favicon-32x32.png",
  "./public/favicon.ico",
  "./public/icon-192.png",
  "./public/icon-512.png",
  "./src/assets/capa.jpg",
  "./src/assets/capa.webp",
];

for (const o of obsoletos) {
  assert.ok(!fs.existsSync(o), `Arquivo antigo ${o} deve ter sido removido para evitar cache`);
}
console.log("  [PASS] Todas as imagens obsoletas foram removidas.");

// 3. Verificação de código
console.log("\n3. Verificando referências no código...");
const rootCode = fs.readFileSync("./src/routes/__root.tsx", "utf-8");
assert.ok(rootCode.includes('content: "/capa.png?v=20261006_v6"'), "__root.tsx deve apontar og:image e twitter:image para capa.png");
assert.ok(rootCode.includes('href: "/favicon.png?v=20261006_v6"'), "__root.tsx deve apontar icon para favicon.png");
assert.ok(!rootCode.includes("favicon.ico"), "__root.tsx não deve apontar para favicon.ico antigo");

const indexCode = fs.readFileSync("./src/routes/index.tsx", "utf-8");
assert.ok(indexCode.includes('content: "/capa.png?v=20261006_v6"'), "index.tsx deve apontar og:image e twitter:image para capa.png");
assert.ok(!indexCode.includes("capa.webp"), "index.tsx não deve apontar para capa.webp");
assert.ok(!indexCode.includes("capa.jpg"), "index.tsx não deve apontar para capa.jpg");

const appShellCode = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");
assert.ok(appShellCode.includes('import defaultCapaPng from "@/assets/capa.png"'), "AppShell deve importar capa.png");
assert.ok(!appShellCode.includes("from \"@/assets/capa.webp\""), "AppShell não deve importar capa.webp");
assert.ok(!appShellCode.includes("from \"@/assets/capa.jpg\""), "AppShell não deve importar capa.jpg");

const manifest = JSON.parse(fs.readFileSync("./public/manifest.json", "utf-8"));
assert.ok(manifest.icons.every((i: any) => !i.src.includes("192") && !i.src.includes("512")), "Manifest não deve apontar para icons 192/512 excluídos");

console.log("  [PASS] Todas as referências de código foram atualizadas.");

console.log("\n==================================================");
console.log("VALIDAÇÃO CONCLUÍDA COM 100% DE SUCESSO!");
console.log("==================================================");
