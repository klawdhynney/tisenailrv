import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { TUTORIAL_PASSOS, AUDIO_TUTORIAL_VERSAO, TUTORIAL_SIMULATED_URL } from "../src/content/tutorial-abrir-chamado.ts";

console.log("==================================================================");
console.log("TESTE: SINGLETON DE ÁUDIO DO TUTORIAL E CORREÇÕES DE CONCORRÊNCIA");
console.log("==================================================================\n");

// 1. Verificação da URL simulada
console.log("1. Verificando URL simulada na barra de endereço...");
assert.strictEqual(
  TUTORIAL_SIMULATED_URL,
  "https://tisenailrv.app/abrir",
  "TUTORIAL_SIMULATED_URL deve ser 'https://tisenailrv.app/abrir'"
);
const simulationSource = fs.readFileSync("./src/components/tutorial/TutorialFormSimulation.tsx", "utf-8");
assert.ok(
  !simulationSource.includes("ti.senailrv.com.br"),
  "TutorialFormSimulation.tsx NÃO deve conter o domínio antigo 'ti.senailrv.com.br'"
);
assert.ok(
  simulationSource.includes("{TUTORIAL_SIMULATED_URL}"),
  "TutorialFormSimulation.tsx deve usar {TUTORIAL_SIMULATED_URL}"
);
console.log("✓ URL simulada correta: https://tisenailrv.app/abrir!");

// 2. Verificação dos arquivos de áudio pré-gerados
console.log("\n2. Verificando integridade dos 9 arquivos de áudio pré-gerados (v2)...");
assert.strictEqual(AUDIO_TUTORIAL_VERSAO, "v2", "Versão deve ser 'v2'");
assert.strictEqual(TUTORIAL_PASSOS.length, 9, "Devem existir 9 passos no tutorial");

for (let i = 1; i <= 9; i++) {
  const filePath = path.join(process.cwd(), "public", "audio", "tutorial", "v2", `step-${i}.mp3`);
  assert.ok(fs.existsSync(filePath), `Arquivo de áudio step-${i}.mp3 deve existir em public/audio/tutorial/v2/`);
  const stat = fs.statSync(filePath);
  assert.ok(stat.size > 20000, `Arquivo step-${i}.mp3 deve ter tamanho válido (> 20KB), encontrado: ${stat.size} bytes`);
  console.log(`  ✓ step-${i}.mp3 verificado (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 3. Verificação de ausência de arquivos órfãos fora de v2
console.log("\n3. Verificando se não há arquivos de áudio órfãos na pasta tutorial...");
const tutorialDir = path.join(process.cwd(), "public", "audio", "tutorial");
const filesInTutorial = fs.readdirSync(tutorialDir);
const orphanFiles = filesInTutorial.filter((f) => f.endsWith(".mp3"));
assert.strictEqual(
  orphanFiles.length,
  0,
  `Não deve haver arquivos .mp3 na raiz de public/audio/tutorial/, encontrados: ${orphanFiles.join(", ")}`
);
console.log("✓ Nenhum arquivo órfão encontrado!");

// 4. Verificação do gerenciador de áudio singleton
console.log("\n4. Verificando arquitetura do gerenciador singleton TutorialAudioManager...");
const managerSource = fs.readFileSync("./src/components/tutorial/tutorial-audio-manager.ts", "utf-8");
assert.ok(
  managerSource.includes("class TutorialAudioManager"),
  "Deve definir a classe TutorialAudioManager"
);
assert.ok(
  managerSource.includes("TutorialAudioManager.getInstance()"),
  "Deve implementar padrão Singleton getInstance()"
);
assert.ok(
  managerSource.includes("err?.name === \"AbortError\""),
  "Deve ignorar AbortError para não disparar fallback de fala durante pausas e trocas de passo"
);
assert.ok(
  managerSource.includes("window.speechSynthesis.cancel()"),
  "Deve cancelar SpeechSynthesis ao iniciar MP3 ou ao parar"
);
assert.ok(
  managerSource.includes("releaseOwner"),
  "Deve implementar método releaseOwner para isolar modal e rodapé"
);
console.log("✓ Arquitetura do TutorialAudioManager validada!");

// 5. Verificação da integração no TutorialPlayer e TutorialModal
console.log("\n5. Verificando integração no TutorialPlayer e TutorialModal...");
const playerSource = fs.readFileSync("./src/components/tutorial/TutorialPlayer.tsx", "utf-8");
assert.ok(
  playerSource.includes("tutorialAudio.playStep"),
  "TutorialPlayer deve chamar tutorialAudio.playStep"
);
assert.ok(
  playerSource.includes("tutorialAudio.pause(ownerId)"),
  "TutorialPlayer deve chamar tutorialAudio.pause"
);
assert.ok(
  playerSource.includes("tutorialAudio.releaseOwner(ownerId)"),
  "TutorialPlayer deve chamar tutorialAudio.releaseOwner"
);
assert.ok(
  !playerSource.includes("new Audio()"),
  "TutorialPlayer NÃO deve criar new Audio() localmente"
);
assert.ok(
  !playerSource.includes("window.speechSynthesis.speak"),
  "TutorialPlayer NÃO deve invocar speechSynthesis diretamente (responsabilidade exclusiva do singleton)"
);

const modalSource = fs.readFileSync("./src/components/tutorial/TutorialModal.tsx", "utf-8");
assert.ok(
  modalSource.includes("tutorialAudio.releaseOwner(\"tutorial-modal\")"),
  "TutorialModal deve liberar o owner 'tutorial-modal' ao fechar ou desmontar"
);

const abrirSource = fs.readFileSync("./src/routes/abrir.tsx", "utf-8");
assert.ok(
  abrirSource.includes("tutorialAudio.releaseOwner(\"tutorial-footer\")"),
  "abrir.tsx deve liberar o player de rodapé ao abrir o modal"
);
console.log("✓ Integração entre componentes, modal e rota /abrir validada!");

console.log("\n==================================================================");
console.log("TODAS AS VALIDAÇÕES DO GERENCIADOR DE ÁUDIO PASSARAM COM SUCESSO!");
console.log("==================================================================");
