import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("TESTE DAS NOVAS IMAGENS: ÍCONE, TÍTULO E CAPA");
console.log("==================================================\n");

// 1. Arquivos em src/assets
assert.ok(fs.existsSync("./src/assets/icone.png"), "src/assets/icone.png deve existir");
assert.ok(fs.existsSync("./src/assets/titulo.png"), "src/assets/titulo.png deve existir");
assert.ok(fs.existsSync("./src/assets/capa.png"), "src/assets/capa.png deve existir");

// 2. Arquivos em public
assert.ok(fs.existsSync("./public/icone.png"), "public/icone.png deve existir");
assert.ok(fs.existsSync("./public/capa.png"), "public/capa.png deve existir");
assert.ok(fs.existsSync("./public/favicon.png"), "public/favicon.png deve existir");
assert.ok(fs.existsSync("./public/apple-touch-icon.png"), "public/apple-touch-icon.png deve existir");
assert.ok(fs.existsSync("./public/manifest.json"), "public/manifest.json deve existir");

// 3. Verificação de remoção de imagens antigas
assert.ok(!fs.existsSync("./public/capa-1x.webp"), "capa-1x.webp antigo deve ter sido removido");
assert.ok(!fs.existsSync("./public/capa.jpg"), "capa.jpg antigo deve ter sido removido");
assert.ok(!fs.existsSync("./public/capa.webp"), "capa.webp antigo deve ter sido removido");
assert.ok(!fs.existsSync("./public/favicon.ico"), "favicon.ico antigo deve ter sido removido para evitar cache");
assert.ok(!fs.existsSync("./src/assets/capa.webp"), "capa.webp antigo em assets deve ter sido removido");

// 4. Verificação de referências no código
const checkFilesInSrc = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      checkFilesInSrc(full);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      const content = fs.readFileSync(full, "utf-8");
      assert.ok(!content.includes("favicon.jpg"), `Arquivo ${full} ainda faz referência a favicon.jpg`);
      assert.ok(!content.includes("technology-lab.jpg"), `Arquivo ${full} ainda faz referência a technology-lab.jpg`);
      assert.ok(!content.includes("senai-hero-20261005.png"), `Arquivo ${full} ainda faz referência a senai-hero-20261005.png`);
    }
  }
};
checkFilesInSrc("./src");

// 5. Verificação do manifest
const manifest = JSON.parse(fs.readFileSync("./public/manifest.json", "utf-8"));
assert.ok(manifest.icons && manifest.icons.length >= 2, "Manifest deve conter ícones configurados");

console.log("✓ Todos os testes de imagens e integridade passaram com 100% de sucesso!");
