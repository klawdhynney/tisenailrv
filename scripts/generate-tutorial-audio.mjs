import fs from "node:fs";
import path from "node:path";
import * as googleTTS from "google-tts-api";
import { MPEGDecoder } from "mpg123-decoder";
import { SoundTouch } from "soundtouch-ts";
import { Mp3Encoder } from "@breezystack/lamejs";
import { TUTORIAL_PASSOS, AUDIO_TUTORIAL_VERSAO } from "../src/content/tutorial-abrir-chamado.ts";
import { aplicarPronuncia } from "../src/content/tutorial-pronuncia.ts";

const OUTPUT_DIR = path.resolve(process.cwd(), "public", "audio", "tutorial", AUDIO_TUTORIAL_VERSAO);
const TEMPO_ACCELERATION = 1.45; // Ritmo 1.45x mais ágil e dinâmico

console.log("=== GERADOR DE ÁUDIO DO TUTORIAL ACELERADO (pt-BR - v2) ===");
console.log(`Destino dos arquivos: ${OUTPUT_DIR}`);
console.log(`Fator de aceleração nativo (SoundTouch WSOLA): ${TEMPO_ACCELERATION}x`);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let totalBytes = 0;

for (const passo of TUTORIAL_PASSOS) {
  const fileName = `step-${passo.id}.mp3`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  const textoFonético = passo.fala || aplicarPronuncia(passo.textoLeitura);

  console.log(`\n[Passo ${passo.id}/${TUTORIAL_PASSOS.length}] Gerando áudio acelerado para: "${passo.tituloCurto}"...`);
  console.log(`Legenda: "${passo.legenda}"`);
  console.log(`Fala fonética: "${textoFonético}"`);

  try {
    // 1. Obter áudio neural base do Google TTS
    const base64 = await googleTTS.getAudioBase64(textoFonético, {
      lang: "pt",
      slow: false,
      timeout: 15000,
    });
    const mp3RawBuffer = Buffer.from(base64, "base64");

    // 2. Decodificar MP3 para PCM 32-bit float
    const decoder = new MPEGDecoder();
    await decoder.ready;
    const { channelData, sampleRate } = decoder.decode(mp3RawBuffer);

    // 3. Aplicar Time-Stretch SoundTouch (WSOLA com pitch e formantes intactos)
    const soundTouch = new SoundTouch();
    soundTouch.tempo = TEMPO_ACCELERATION;

    const leftChannel = channelData[0];
    const interleaved = new Float32Array(leftChannel.length * 2);
    for (let i = 0; i < leftChannel.length; i++) {
      interleaved[i * 2] = leftChannel[i];
      interleaved[i * 2 + 1] = leftChannel[i];
    }

    soundTouch.inputBuffer.putSamples(interleaved, 0, leftChannel.length);
    soundTouch.process();

    const outFrameCount = soundTouch.outputBuffer.frameCount;
    const outBuffer = new Float32Array(outFrameCount * 2);
    soundTouch.outputBuffer.receiveSamples(outBuffer, outFrameCount);

    // 4. Converter Float32 para Int16 Mono
    const int16Samples = new Int16Array(outFrameCount);
    for (let i = 0; i < outFrameCount; i++) {
      const sample = outBuffer[i * 2];
      const clamped = Math.max(-1, Math.min(1, sample));
      int16Samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    }

    // 5. Codificar de volta em MP3 Mono 64kbps leve
    const encoder = new Mp3Encoder(1, sampleRate, 64);
    const chunks = [];
    const blockSize = 1152;
    for (let i = 0; i < int16Samples.length; i += blockSize) {
      const chunk = encoder.encodeBuffer(int16Samples.subarray(i, i + blockSize));
      if (chunk.length > 0) chunks.push(Buffer.from(chunk));
    }
    const endChunk = encoder.flush();
    if (endChunk.length > 0) chunks.push(Buffer.from(endChunk));

    const finalMp3Buffer = Buffer.concat(chunks);
    fs.writeFileSync(filePath, finalMp3Buffer);
    totalBytes += finalMp3Buffer.length;

    console.log(
      `✓ Gravado: ${fileName} (${(finalMp3Buffer.length / 1024).toFixed(1)} KB) - Aceleração: ${(leftChannel.length / outFrameCount).toFixed(2)}x`
    );
  } catch (err) {
    console.error(`✗ Erro ao gerar áudio para passo ${passo.id}:`, err?.message || err);
  }
}

console.log("\n==============================================");
console.log(`Total gerado (${AUDIO_TUTORIAL_VERSAO}): ${(totalBytes / 1024).toFixed(1)} KB`);
console.log(`Arquivos prontos em public/audio/tutorial/${AUDIO_TUTORIAL_VERSAO}/`);
console.log("==============================================");
