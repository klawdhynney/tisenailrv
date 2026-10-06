const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function checkUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', reject);
  });
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log('==================================================');
  console.log('TESTES COMPLETOS DE NAVEGADOR: PRODUÇÃO VITE PREVIEW');
  console.log('==================================================\n');

  // 1. Static Endpoints check
  console.log('--- 1. VERIFICANDO RESPOSTAS HTTP DOS ARQUIVOS ESTÁTICOS ---');
  const urls = [
    'http://localhost:4173/capa.webp',
    'http://localhost:4173/capa.jpg',
    'http://localhost:4173/capa.png',
    'http://localhost:4173/icone.png',
    'http://localhost:4173/favicon.ico',
    'http://localhost:4173/favicon.png',
    'http://localhost:4173/apple-touch-icon.png',
    'http://localhost:4173/icon-192.png',
    'http://localhost:4173/icon-512.png',
    'http://localhost:4173/manifest.json',
  ];

  for (const u of urls) {
    const res = await checkUrl(u);
    console.log(`Endpoint: ${u} -> Status: ${res.status}`);
    assert.strictEqual(res.status, 200, `Falha ao carregar ${u}: status ${res.status}`);
  }
  console.log('✓ Todos os 10 arquivos estáticos retornam HTTP 200 OK sem erros 404!\n');

  // 2. Launch Edge Headless with CDP
  console.log('--- 2. INICIANDO EDGE HEADLESS COM DEVTOOLS PROTOCOL ---');
  const port = 9222;
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const httpReq = (opt) => new Promise((resolve, reject) => {
    http.get(opt, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const version = await httpReq({ host: '127.0.0.1', port, path: '/json/version' });
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('Conectado ao Microsoft Edge via DevTools Protocol!');

  // Create new target / page
  const { targetId } = await sendCDP(ws, 'Target.createTarget', { url: 'http://localhost:4173/' });
  const targets = await httpReq({ host: '127.0.0.1', port, path: '/json' });
  const pageTarget = targets.find(t => t.id === targetId);

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  await sendCDP(pageWs, 'Page.enable');
  await sendCDP(pageWs, 'Runtime.enable');
  await sendCDP(pageWs, 'Network.enable');

  const failedRequests = [];
  pageWs.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      if (response.status >= 400) {
        failedRequests.push({ url: response.url, status: response.status });
      }
    }
  });

  // Navigate to site
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:4173/' });
  // Wait for load event
  await new Promise((r) => setTimeout(r, 3000));

  // Test across 3 viewports: Desktop (1280px), Tablet (768px), Mobile (360px)
  const viewports = [
    { label: 'Desktop', width: 1280, height: 800 },
    { label: 'Tablet', width: 768, height: 1024 },
    { label: 'Celular / Mobile', width: 360, height: 640 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- 3. TESTANDO LAYOUT EM ${vp.label.toUpperCase()} (${vp.width}x${vp.height}) ---`);

    await sendCDP(pageWs, 'Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 600,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const evalRes = await sendCDP(pageWs, 'Runtime.evaluate', {
      expression: `(() => {
        const icon = document.querySelector('header img[alt*="Ícone"]');
        const header = document.querySelector('header');
        const bannerImg = document.querySelector('main picture img');
        const favLink = document.querySelector('link[rel*="icon"]');

        return {
          windowWidth: window.innerWidth,
          iconLoaded: icon ? (icon.complete && icon.naturalWidth > 0) : false,
          iconSrc: icon ? icon.currentSrc || icon.src : null,
          iconDimensions: icon ? { w: icon.naturalWidth, h: icon.naturalHeight, displayW: icon.offsetWidth, displayH: icon.offsetHeight } : null,
          headerHasText: header ? header.innerText.includes("TI SENAI LRV") : false,
          bannerLoaded: bannerImg ? (bannerImg.complete && bannerImg.naturalWidth > 0) : false,
          bannerSrc: bannerImg ? bannerImg.currentSrc || bannerImg.src : null,
          bannerDimensions: bannerImg ? { w: bannerImg.naturalWidth, h: bannerImg.naturalHeight, displayW: bannerImg.offsetWidth, displayH: bannerImg.offsetHeight } : null,
          faviconUrl: favLink ? favLink.href : null,
        };
      })()`,
      returnByValue: true,
    });

    const info = evalRes.result.value;
    console.log(`Largura da Janela: ${info.windowWidth}px`);
    console.log(`Ícone no Cabeçalho:`);
    console.log(`  - Carregado: ${info.iconLoaded ? 'SIM (Sucesso)' : 'NÃO (Falha)'}`);
    console.log(`  - Resolução Real: ${info.iconDimensions?.w}x${info.iconDimensions?.h}px`);
    console.log(`  - Tamanho de Exibição: ${info.iconDimensions?.displayW}x${info.iconDimensions?.displayH}px`);
    console.log(`  - Título textual 'TI SENAI LRV' visível: ${info.headerHasText ? 'SIM' : 'NÃO'}`);

    console.log(`Banner / Capa:`);
    console.log(`  - Carregado: ${info.bannerLoaded ? 'SIM (Sucesso)' : 'NÃO (Falha)'}`);
    console.log(`  - URL Servida: ${info.bannerSrc}`);
    console.log(`  - Resolução Real: ${info.bannerDimensions?.w}x${info.bannerDimensions?.h}px`);
    console.log(`  - Dimensão Renderizada: ${info.bannerDimensions?.displayW}px largura x ${info.bannerDimensions?.displayH}px altura`);

    assert.ok(info.iconLoaded, `Ícone não carregou em ${vp.label}!`);
    assert.ok(info.headerHasText, `Título de texto não encontrado em ${vp.label}!`);
    assert.ok(info.bannerLoaded, `Capa não carregou em ${vp.label}!`);
    assert.ok(info.bannerDimensions?.displayW > 0, `Largura do banner deve ser maior que 0`);

    if (vp.width === 360) {
      assert.ok(info.bannerDimensions?.displayH <= 230, `Altura do banner no celular deve ser de até 220px (+ folga 10px): ${info.bannerDimensions?.displayH}px`);
    } else if (vp.width === 1280) {
      assert.ok(info.bannerDimensions?.displayH <= 370, `Altura do banner no desktop deve ser de até 360px (+ folga 10px): ${info.bannerDimensions?.displayH}px`);
    }
  }

  console.log('\n--- 4. VERIFICAÇÃO DE ERROS DE REDE E 404 NO CONSOLE ---');
  console.log(`Requisições falhas: ${failedRequests.length}`);
  if (failedRequests.length > 0) {
    console.error('Requisições com erro:', failedRequests);
  }
  assert.strictEqual(failedRequests.length, 0, 'Não deve haver nenhuma requisição 404/500 no carregamento');
  console.log('✓ Nenhuma requisição falha detectada!');

  // Cleanup
  pageWs.close();
  ws.close();
  edgeProc.kill();

  console.log('\n==================================================');
  console.log('TODAS AS VERIFICAÇÕES NO NAVEGADOR PASSARAM (100%)!');
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Falha nos testes de navegador:', err);
  process.exit(1);
});
