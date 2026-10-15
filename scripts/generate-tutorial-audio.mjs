import fs from "node:fs";
import path from "node:path";
import * as googleTTS from "google-tts-api";
import { TUTORIAL_PASSOS } from "../src/content/tutorial-abrir-chamado.ts";

const OUTPUT_DIR = path.resolve(process.cwd(), "public", "audio", "tutorial");

console.log("=== GERADOR DE ÁUDIO DO TUTORIAL (pt-BR) ===");
console.log(`Destino dos arquivos: ${OUTPUT_DIR}`);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let totalBytes = 0;

for (const passo of TUTORIAL_PASSOS) {
  const fileName = `step-${passo.id}.mp3`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  console.log(`\n[Passo ${passo.id}/${TUTORIAL_PASSOS.length}] Gerando áudio para: "${passo.tituloCurto}"...`);
  console.log(`Texto: "${passo.narracao}"`);

  try {
    const base64 = await googleTTS.getAudioBase64(passo.narracao, {
      lang: "pt",
      slow: false,
      timeout: 15000,
    });

    const buffer = Buffer.from(base64, "base64");
    fs.writeFileSync(filePath, buffer);
    totalBytes += buffer.length;
    console.log(`✓ Gravado: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`✗ Erro ao gerar áudio para passo ${passo.id}:`, err?.message || err);
  }
}

console.log("\n==============================================");
console.log(`Total gerado: ${(totalBytes / 1024).toFixed(1)} KB`);
console.log("Arquivos prontos em public/audio/tutorial/");
console.log("==============================================");
