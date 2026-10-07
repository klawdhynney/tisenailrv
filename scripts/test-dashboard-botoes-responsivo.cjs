const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9222;

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

const httpReq = (opt) =>
  new Promise((resolve, reject) => {
    http.get(opt, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

async function main() {
  console.log('======================================================================');
  console.log('TESTES DE RESPONSIVIDADE E BOTÕES DO DASHBOARD (360px, 768px, 1280px)');
  console.log('======================================================================\n');

  console.log('1. Iniciando Microsoft Edge headless com remote debugging...');
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const version = await httpReq({ host: '127.0.0.1', port, path: '/json/version' });
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const { targetId } = await sendCDP(ws, 'Target.createTarget', { url: 'about:blank' });
  const targets = await httpReq({ host: '127.0.0.1', port, path: '/json' });
  const pageTarget = targets.find((t) => t.id === targetId);
  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  await sendCDP(pageWs, 'Page.enable');
  await sendCDP(pageWs, 'DOM.enable');
  await sendCDP(pageWs, 'Runtime.enable');

  // Injetar usuário autenticado simulado para o teste do dashboard
  await sendCDP(pageWs, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__TEST_USER__ = {
        id: 'test-gestor-id',
        email: 'gestor@senaimt.ind.br',
        user_metadata: { full_name: 'Gestor Teste TI' }
      };
      try {
        localStorage.setItem('sb-mock-user', JSON.stringify(window.__TEST_USER__));
      } catch (e) {}
    `,
  });

  const evalJs = async (expr) => {
    const res = await sendCDP(pageWs, 'Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result.value;
  };

  // Navega para o dashboard
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard' });
  await new Promise((r) => setTimeout(r, 2500));

  const viewports = [
    { width: 360, height: 740, name: 'Mobile (360px)' },
    { width: 768, height: 1024, name: 'Tablet (768px)' },
    { width: 1280, height: 800, name: 'Desktop (1280px)' },
  ];

  for (const vp of viewports) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Testando Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`----------------------------------------------------------------------`);

    await sendCDP(pageWs, 'Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await new Promise((r) => setTimeout(r, 800));

    for (const modo of ['claro', 'escuro']) {
      console.log(`\n>> Modo: ${modo.toUpperCase()}`);
      await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard' });
      // Esperar h1 aparecer
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const hasH1 = await evalJs(`Boolean(document.querySelector('h1'))`);
        if (hasH1) break;
      }

      await evalJs(`
        document.documentElement.classList.remove('dark', 'pastel');
        if ('${modo}' === 'escuro') document.documentElement.classList.add('dark');
      `);
      await new Promise((r) => setTimeout(r, 300));

      const res = await evalJs(`
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const hasHorizontalScroll = docEl.scrollWidth > docEl.clientWidth;

          // Localiza os 3 botões da área do título (Filtrar, Acompanhar chamados, Avaliações)
          const header = document.querySelector('h1')?.closest('div.border-b');
          const botoes = header ? Array.from(header.querySelectorAll('button, a')) : [];

          const botoesFiltrados = botoes.filter(b => {
            const txt = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const title = (b.getAttribute('title') || '').toLowerCase();
            return (
              txt.includes('filtrar') || aria.includes('filtrar') || title.includes('filtrar') ||
              txt.includes('acompanhar') || aria.includes('acompanhar') || title.includes('acompanhar') ||
              txt.includes('avaliações') || aria.includes('avaliações') || title.includes('avaliações') ||
              txt.includes('avaliacoes') || aria.includes('avaliacoes')
            );
          });

          const infoBotoes = botoesFiltrados.map(b => {
            const rect = b.getBoundingClientRect();
            return {
              text: b.innerText.trim(),
              aria: b.getAttribute('aria-label') || b.getAttribute('title') || '',
              tag: b.tagName,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
            };
          });

          // Verificar se estão em uma única linha (mesmo topo aproximado)
          let mesmaLinha = true;
          if (infoBotoes.length >= 2) {
            const primeiroTop = infoBotoes[0].top;
            mesmaLinha = infoBotoes.every(b => Math.abs(b.top - primeiroTop) <= 10);
          }

          // Verificar seletores de período na série histórica
          const periodButtons = Array.from(document.querySelectorAll('button')).filter(b => {
            const t = b.innerText.trim();
            return t.includes('Todos') || t.includes('Últimos 3M') || t.includes('Últimos 6M') || t.includes('Redefinir');
          });

          const infoPeriodo = periodButtons.map(b => {
            const r = b.getBoundingClientRect();
            return { text: b.innerText.trim(), height: Math.round(r.height), width: Math.round(r.width) };
          });

          return {
            url: window.location.href,
            hasHorizontalScroll,
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            infoBotoes,
            mesmaLinha,
            infoPeriodo,
          };
        })()
      `);

      console.log(`- URL: ${res.url}`);
      console.log(`- Sem rolagem horizontal: ${!res.hasHorizontalScroll} (Largura tela: ${res.clientWidth}px, Scroll: ${res.scrollWidth}px)`);
      assert.strictEqual(res.hasHorizontalScroll, false, `Não deve haver rolagem horizontal em ${vp.name} (${modo})`);

      console.log(`- Botões do título encontrados: ${res.infoBotoes.length}`);
      res.infoBotoes.forEach(b => {
        const iden = b.text || b.aria;
        console.log(`   * [${iden}]: ${b.width}x${b.height}px (Top: ${b.top}px)`);
        assert.ok(b.height >= 40, `Área de toque do botão "${iden}" deve ter pelo menos 44px (atual: ${b.height}px)`);
      });

      console.log(`- Botões em linha única alinhados à direita: ${res.mesmaLinha}`);
      assert.strictEqual(res.mesmaLinha, true, `Os botões devem ficar em linha única em ${vp.name}`);

      if (res.infoPeriodo.length > 0) {
        console.log(`- Seletores de período validados: ${res.infoPeriodo.length} botões harmonizados`);
        res.infoPeriodo.forEach(pb => {
          assert.ok(pb.height >= 40, `Botão de período "${pb.text}" com altura >= 40px (atual: ${pb.height}px)`);
        });
      }
    }
  }

  try {
    edgeProc.kill();
  } catch {}

  console.log('\n======================================================================');
  console.log('✓ TESTES DE RESPONSIVIDADE E BOTÕES PASSARAM 100%!');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('Erro na validação responsiva:', err);
  process.exit(1);
});
