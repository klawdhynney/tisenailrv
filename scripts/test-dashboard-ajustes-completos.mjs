import http from 'http';
import { spawn } from 'child_process';
import assert from 'assert';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9224;

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
  console.log('TESTES COMPLETOS: HARMONIZAÇÃO DE FONTES, BOTÕES E ABAS DO DASHBOARD');
  console.log('======================================================================\n');

  console.log('1. Iniciando Microsoft Edge headless com remote debugging na porta ' + port + '...');
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

  const consoleErrors = [];
  pageWs.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = msg.params.args?.map((a) => a.value || a.description || '').join(' ');
      consoleErrors.push(text);
    }
  });

  await sendCDP(pageWs, 'Page.enable');
  await sendCDP(pageWs, 'DOM.enable');
  await sendCDP(pageWs, 'Runtime.enable');

  const evalJs = async (expr) => {
    const res = await sendCDP(pageWs, 'Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result.value;
  };

  const esperarH1 = async () => {
    for (let i = 0; i < 30; i++) {
      const hasH1 = await evalJs(`Boolean(document.querySelector('h1'))`);
      if (hasH1) return;
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  console.log('2. Navegando para http://localhost:8080/dashboard ...');
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard' });
  await esperarH1();
  await new Promise((r) => setTimeout(r, 800));

  // Teste 1: Confirmar remoção do filtro duplicado na Análise Categórica
  console.log('\n>> Teste 1: Confirmar ausência do seletor duplicado de mês na Análise Categórica');
  const filtroDuplicadoExiste = await evalJs(`Boolean(document.querySelector('select[aria-label="Mês da análise"]'))`);
  console.log(`- Seletor "Mês da análise" existe: ${filtroDuplicadoExiste}`);
  assert.strictEqual(filtroDuplicadoExiste, false, 'O filtro duplicado de mês na Análise Categórica DEVE ser removido.');

  // Teste 2: Confirmar localização e padronização dos botões de exportação no topo
  console.log('\n>> Teste 2: Confirmar botões de exportação no cabeçalho com mesma altura dos botões de ação');
  const botoesExportacaoTopo = await evalJs(`
    (() => {
      const header = document.querySelector('h1')?.closest('div.border-b');
      if (!header) return { erro: 'Cabeçalho não encontrado' };
      const btnPlanilha = header.querySelector('button[aria-label="Exportar planilha"]');
      const btnPdf = header.querySelector('button[aria-label="Exportar PDF"]');
      const btnFiltro = header.querySelector('button[aria-label="Filtrar chamados por mês"]');
      const btnAcomp = header.querySelector('a[aria-label="Acompanhar chamados"]');

      const hPlanilha = btnPlanilha ? Math.round(btnPlanilha.getBoundingClientRect().height) : 0;
      const hPdf = btnPdf ? Math.round(btnPdf.getBoundingClientRect().height) : 0;
      const hFiltro = btnFiltro ? Math.round(btnFiltro.getBoundingClientRect().height) : 0;

      return {
        temPlanilhaNoTopo: Boolean(btnPlanilha),
        temPdfNoTopo: Boolean(btnPdf),
        hPlanilha,
        hPdf,
        hFiltro,
      };
    })()
  `);
  console.log(`- Exportar planilha no cabeçalho: ${botoesExportacaoTopo.temPlanilhaNoTopo} (altura: ${botoesExportacaoTopo.hPlanilha}px)`);
  console.log(`- Exportar PDF no cabeçalho: ${botoesExportacaoTopo.temPdfNoTopo} (altura: ${botoesExportacaoTopo.hPdf}px)`);
  console.log(`- Filtro do cabeçalho altura: ${botoesExportacaoTopo.hFiltro}px`);
  assert.strictEqual(botoesExportacaoTopo.temPlanilhaNoTopo, true);
  assert.strictEqual(botoesExportacaoTopo.temPdfNoTopo, true);
  assert.strictEqual(botoesExportacaoTopo.hPlanilha, botoesExportacaoTopo.hFiltro, 'Exportar planilha deve ter a mesma altura do filtro');
  assert.strictEqual(botoesExportacaoTopo.hPdf, botoesExportacaoTopo.hFiltro, 'Exportar PDF deve ter a mesma altura do filtro');

  // Teste 3: Abas coloridas da seção "Análise Categórica"
  console.log('\n>> Teste 3: Padronização das 5 abas da Análise Categórica (altura, linha única e gap)');
  const abasInfo = await evalJs(`
    (() => {
      const nav = document.querySelector('nav[aria-label="Dimensões do dashboard"]');
      if (!nav) return { erro: 'Nav não encontrada' };
      const btns = Array.from(nav.querySelectorAll('button'));
      const rects = btns.map(b => b.getBoundingClientRect());
      const heights = rects.map(r => Math.round(r.height));
      const labels = btns.map(b => b.innerText.trim());

      // Verificar que todas as 5 têm a mesma altura exata
      const primeiraAltura = heights[0];
      const todasMesmaAltura = heights.every(h => h === primeiraAltura);

      // Distância entre o botão vermelho (setores) e o botão amarelo (prioridades)
      let gapVermelhoAmarelo = 0;
      const btnVermelho = rects[1];
      const btnAmarelo = rects[2];
      if (btnVermelho && btnAmarelo) {
        gapVermelhoAmarelo = Math.round(btnAmarelo.left - btnVermelho.right);
      }

      // Verificar que nenhum botão quebrou linha (texto em linha única no desktop)
      const spans = btns.map(b => {
        const span = b.querySelector('span');
        return {
          label: b.innerText.trim(),
          scrollWidth: span ? span.scrollWidth : b.scrollWidth,
          clientWidth: span ? span.clientWidth : b.clientWidth,
          lineBreak: span ? span.scrollHeight > 25 : false,
        };
      });

      return {
        total: btns.length,
        labels,
        heights,
        todasMesmaAltura,
        gapVermelhoAmarelo,
        spans,
      };
    })()
  `);
  console.log(`- Total de abas: ${abasInfo.total}`);
  console.log(`- Alturas de cada aba: ${abasInfo.heights.join('px, ')}px`);
  console.log(`- Todas possuem exatamente a mesma altura: ${abasInfo.todasMesmaAltura}`);
  console.log(`- Gap entre botão vermelho e amarelo: ${abasInfo.gapVermelhoAmarelo}px (espaçamento harmônico >= 8px)`);
  assert.strictEqual(abasInfo.total, 5, 'Devem existir 5 abas coloridas');
  assert.strictEqual(abasInfo.todasMesmaAltura, true, 'Todas as 5 abas coloridas devem ter a mesma altura');
  assert.ok(abasInfo.gapVermelhoAmarelo >= 8, 'Deve haver separação nítida entre botões vermelho e amarelo');

  // Teste 4: Abas secundárias (Tipos de Gráfico)
  console.log('\n>> Teste 4: Padronização das abas secundárias dos gráficos (altura e fontes)');
  const graficosInfo = await evalJs(`
    (() => {
      const menu = document.querySelector('div[aria-label="Tipo de gráfico"]');
      if (!menu) return { erro: 'Menu de gráficos não encontrado' };
      const btns = Array.from(menu.querySelectorAll('button'));
      const heights = btns.map(b => Math.round(b.getBoundingClientRect().height));
      const primeiraAltura = heights[0];
      const todasMesmaAltura = heights.every(h => h === primeiraAltura);
      return {
        total: btns.length,
        heights,
        todasMesmaAltura,
        labels: btns.map(b => b.innerText.trim()),
      };
    })()
  `);
  console.log(`- Abas secundárias encontradas: ${graficosInfo.total} (${graficosInfo.labels.join(', ')})`);
  console.log(`- Alturas das abas secundárias: ${graficosInfo.heights.join('px, ')}px`);
  console.log(`- Todas possuem mesma altura: ${graficosInfo.todasMesmaAltura}`);
  assert.ok(graficosInfo.total >= 4);
  assert.strictEqual(graficosInfo.todasMesmaAltura, true);

  // Teste 5: Troca de mês no filtro do topo
  console.log('\n>> Teste 5: Trocar o mês pelo filtro do topo e validar atualização');
  const trocaMesRes = await evalJs(`
    (async () => {
      const btnFiltro = document.querySelector('button[aria-label="Filtrar chamados por mês"]');
      if (!btnFiltro) return { erro: 'Botão filtro não encontrado' };
      btnFiltro.click();
      await new Promise(r => setTimeout(r, 400));

      const btnsPopover = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper] button'));
      const btnTodos = btnsPopover.find(b => b.innerText.includes('Todos os meses'));
      if (btnTodos) {
        btnTodos.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const textoFinal = document.querySelector('button[aria-label="Filtrar chamados por mês"]')?.innerText.trim();
      return { textoFinal };
    })()
  `);
  console.log(`- Filtro após troca para Todos: "${trocaMesRes.textoFinal}"`);
  assert.strictEqual(trocaMesRes.textoFinal, 'Filtrar');

  // Teste 6: Navegar por todas as abas coloridas
  console.log('\n>> Teste 6: Navegar por todas as abas coloridas');
  const navAbas = await evalJs(`
    (async () => {
      const nav = document.querySelector('nav[aria-label="Dimensões do dashboard"]');
      const btns = Array.from(nav.querySelectorAll('button'));
      for (const b of btns) {
        b.click();
        await new Promise(r => setTimeout(r, 150));
      }
      return { clicadas: btns.length };
    })()
  `);
  console.log(`- Abas navegadas: ${navAbas.clicadas}`);
  assert.strictEqual(navAbas.clicadas, 5);

  // Teste 7: Recarregar direto pela URL
  console.log('\n>> Teste 7: Recarregar direto pela URL (/dashboard?mes=2026-10&tipo=barras)');
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard?mes=2026-10&tipo=barras' });
  await esperarH1();
  await new Promise((r) => setTimeout(r, 600));

  const urlRes = await evalJs(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText.trim();
      const filtroTxt = document.querySelector('button[aria-label="Filtrar chamados por mês"]')?.innerText.trim();
      return { h1, filtroTxt };
    })()
  `);
  console.log(`- Título: "${urlRes.h1}" | Filtro: "${urlRes.filtroTxt}"`);
  assert.ok(urlRes.filtroTxt.includes('Outubro/2026'));

  // Teste 8: Console errors check
  console.log('\n>> Teste 8: Verificação de erros no console');
  console.log(`- Total de erros no console capturados: ${consoleErrors.length}`);
  assert.strictEqual(consoleErrors.length, 0, 'Não deve haver nenhum erro de console');

  try {
    edgeProc.kill();
  } catch {}

  console.log('\n======================================================================');
  console.log('✓ TODOS OS TESTES PASSARAM COM SUCESSO (100%)!');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
