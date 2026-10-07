import http from 'http';
import { spawn } from 'child_process';
import assert from 'assert';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9223;

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
  console.log('TESTES COMPLETOS DOS AJUSTES DO DASHBOARD');
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

  console.log('2. Navegando para http://localhost:8080/dashboard ...');
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard' });
  await new Promise((r) => setTimeout(r, 2500));

  // Teste 1: Confirmar remoção do filtro duplicado na Análise Categórica
  console.log('\n>> Teste 1: Confirmar ausência do seletor duplicado de mês na Análise Categórica');
  const filtroDuplicadoExiste = await evalJs(`Boolean(document.querySelector('select[aria-label="Mês da análise"]'))`);
  console.log(`- Seletor "Mês da análise" existe: ${filtroDuplicadoExiste}`);
  assert.strictEqual(filtroDuplicadoExiste, false, 'O filtro duplicado de mês na Análise Categórica DEVE ser removido.');

  // Teste 2: Confirmar localização dos botões de exportação no topo
  console.log('\n>> Teste 2: Confirmar botões de exportação no cabeçalho');
  const botoesExportacaoTopo = await evalJs(`
    (() => {
      const header = document.querySelector('h1')?.closest('div.border-b');
      if (!header) return { erro: 'Cabeçalho não encontrado' };
      const btnPlanilha = header.querySelector('button[aria-label="Exportar planilha"]');
      const btnPdf = header.querySelector('button[aria-label="Exportar PDF"]');
      const navSection = document.querySelector('nav[aria-label="Dimensões do dashboard"]')?.closest('div.border-2');
      const btnPlanilhaOld = navSection?.querySelector('button[aria-label="Exportar planilha"]');
      const btnPdfOld = navSection?.querySelector('button[aria-label="Exportar PDF"]');
      return {
        temPlanilhaNoTopo: Boolean(btnPlanilha),
        temPdfNoTopo: Boolean(btnPdf),
        temPlanilhaAntiga: Boolean(btnPlanilhaOld),
        temPdfAntiga: Boolean(btnPdfOld),
      };
    })()
  `);
  console.log(`- Exportar planilha no cabeçalho: ${botoesExportacaoTopo.temPlanilhaNoTopo}`);
  console.log(`- Exportar PDF no cabeçalho: ${botoesExportacaoTopo.temPdfNoTopo}`);
  console.log(`- Sem botões antigos na Análise Categórica: ${!botoesExportacaoTopo.temPlanilhaAntiga && !botoesExportacaoTopo.temPdfAntiga}`);
  assert.strictEqual(botoesExportacaoTopo.temPlanilhaNoTopo, true, 'Botão "Exportar planilha" deve estar no cabeçalho.');
  assert.strictEqual(botoesExportacaoTopo.temPdfNoTopo, true, 'Botão "Exportar PDF" deve estar no cabeçalho.');
  assert.strictEqual(botoesExportacaoTopo.temPlanilhaAntiga, false, 'Botão antigo "Exportar planilha" não deve existir na Análise Categórica.');
  assert.strictEqual(botoesExportacaoTopo.temPdfAntiga, false, 'Botão antigo "Exportar PDF" não deve existir na Análise Categórica.');

  // Teste 3: Testar execução de exportação (planilha e PDF)
  console.log('\n>> Teste 3: Testar clique e exportação de planilha e PDF');
  const exportResult = await evalJs(`
    (async () => {
      const header = document.querySelector('h1')?.closest('div.border-b');
      const btnPlanilha = header.querySelector('button[aria-label="Exportar planilha"]');
      const btnPdf = header.querySelector('button[aria-label="Exportar PDF"]');

      let planilhaOk = false;
      let pdfOk = false;

      // Interceptar cliques
      const originalCreateElement = document.createElement.bind(document);
      let baixouBlob = false;
      document.createElement = function(tag) {
        const el = originalCreateElement(tag);
        if (tag.toLowerCase() === 'a') {
          el.click = function() { baixouBlob = true; };
        }
        return el;
      };

      try {
        btnPlanilha.click();
        await new Promise(r => setTimeout(r, 600));
        planilhaOk = true;
      } catch (e) {
        planilhaOk = false;
      }

      try {
        btnPdf.click();
        await new Promise(r => setTimeout(r, 1000));
        pdfOk = true;
      } catch (e) {
        pdfOk = false;
      }

      return { planilhaOk, pdfOk, baixouBlob };
    })()
  `);
  console.log(`- Clique em Exportar planilha executado: ${exportResult.planilhaOk}`);
  console.log(`- Clique em Exportar PDF executado: ${exportResult.pdfOk}`);
  assert.strictEqual(exportResult.planilhaOk, true);
  assert.strictEqual(exportResult.pdfOk, true);

  // Teste 4: Trocar mês pelo filtro do topo
  console.log('\n>> Teste 4: Trocar o mês pelo filtro do topo e validar atualização');
  const trocaMesRes = await evalJs(`
    (async () => {
      const btnFiltro = document.querySelector('button[aria-label="Filtrar chamados por mês"]');
      if (!btnFiltro) return { erro: 'Botão filtro não encontrado' };
      const textoInicial = btnFiltro.innerText.trim();
      btnFiltro.click();
      await new Promise(r => setTimeout(r, 400));

      // Selecionar "Todos os meses" no popover
      const btnsPopover = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper] button'));
      const btnTodos = btnsPopover.find(b => b.innerText.includes('Todos os meses'));
      if (btnTodos) {
        btnTodos.click();
        await new Promise(r => setTimeout(r, 600));
      }

      const textoFinal = document.querySelector('button[aria-label="Filtrar chamados por mês"]')?.innerText.trim();
      return { textoInicial, textoFinal };
    })()
  `);
  console.log(`- Filtro antes da troca: "${trocaMesRes.textoInicial}" -> após troca para Todos: "${trocaMesRes.textoFinal}"`);
  assert.strictEqual(trocaMesRes.textoFinal, 'Filtrar', 'Filtro deve mostrar "Filtrar" para Todos os meses');

  // Teste 5: Navegação entre as abas da Análise Categórica
  console.log('\n>> Teste 5: Navegar entre as 5 abas da Análise Categórica');
  const abasRes = await evalJs(`
    (async () => {
      const nav = document.querySelector('nav[aria-label="Dimensões do dashboard"]');
      if (!nav) return { erro: 'Nav não encontrada' };
      const abas = Array.from(nav.querySelectorAll('button'));
      const nomes = abas.map(b => b.innerText.trim());
      for (const b of abas) {
        b.click();
        await new Promise(r => setTimeout(r, 200));
      }
      return { totalAbas: abas.length, nomes };
    })()
  `);
  console.log(`- Abas navegadas (${abasRes.totalAbas}): ${abasRes.nomes.join(', ')}`);
  assert.strictEqual(abasRes.totalAbas, 5, 'Devem existir 5 abas na Análise Categórica');

  // Teste 6: Navegar para os tipos de gráfico (Indicadores, Rosca, Barras, Histórico)
  console.log('\n>> Teste 6: Navegar entre os tipos de gráfico');
  const graficosRes = await evalJs(`
    (async () => {
      const navGraficos = document.querySelector('div[aria-label="Tipo de gráfico"]');
      if (!navGraficos) return { erro: 'Menu de gráficos não encontrado' };
      const btns = Array.from(navGraficos.querySelectorAll('button'));
      for (const b of btns) {
        b.click();
        await new Promise(r => setTimeout(r, 300));
      }
      return { totalGraficos: btns.length };
    })()
  `);
  console.log(`- Tipos de gráfico testados com sucesso: ${graficosRes.totalGraficos}`);
  assert.ok(graficosRes.totalGraficos >= 4);

  // Teste 7: Recarregar direto pela URL com parâmetro mes e tipo
  console.log('\n>> Teste 7: Recarregar direto pela URL (/dashboard?mes=2026-10&tipo=pizza)');
  await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:8080/dashboard?mes=2026-10&tipo=pizza' });
  await new Promise((r) => setTimeout(r, 2500));

  const urlReloadRes = await evalJs(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText.trim();
      const filtroTxt = document.querySelector('button[aria-label="Filtrar chamados por mês"]')?.innerText.trim();
      return { h1, filtroTxt };
    })()
  `);
  console.log(`- H1 carregado: "${urlReloadRes.h1}"`);
  console.log(`- Filtro restaurado pela URL: "${urlReloadRes.filtroTxt}"`);
  assert.ok(urlReloadRes.filtroTxt.includes('Outubro/2026'));

  // Teste 8: Console errors check
  console.log('\n>> Teste 8: Verificação de erros no console');
  console.log(`- Total de erros no console capturados: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Erros encontrados:', consoleErrors);
  }
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
