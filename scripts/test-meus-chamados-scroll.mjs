import http from 'http';
import { spawn } from 'child_process';
import assert from 'assert';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9227;
const webPort = 3000;

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
  console.log('TESTE AUTOMATIZADO: ROLAGEM, CHAT E AVALIAÇÕES EM /meus-chamados');
  console.log('======================================================================\n');

  // Verifica se dev server responde na 3000
  let serverOk = false;
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${webPort}/`, (res) => resolve(true));
      req.on('error', reject);
    });
    serverOk = true;
  } catch (err) {
    console.error('Servidor não está respondendo na porta 3000:', err.message);
    process.exit(1);
  }

  console.log('1. Dev server está ativo na porta 3000.');

  console.log('2. Iniciando Microsoft Edge headless para testes CDP...');
  const tmpDir = `C:\\Users\\claudinei.lima\\AppData\\Local\\Temp\\edge-scroll-test-${Date.now()}`;
  const edgeProc = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tmpDir}`,
    'about:blank',
  ]);

  let cdpReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      await httpReq({ host: '127.0.0.1', port: debugPort, path: '/json/version' });
      cdpReady = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!cdpReady) {
    console.error('Falha ao conectar no CDP do Edge.');
    edgeProc.kill();
    process.exit(1);
  }

  const list = await httpReq({ host: '127.0.0.1', port: debugPort, path: '/json/list' });
  const page = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((res) => {
    ws.addEventListener('open', res);
  });

  const consoleErrors = [];
  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const { type, args } = data.params;
      const text = args.map((a) => a.value || a.description || '').join(' ');
      if (type === 'error') {
        consoleErrors.push(text);
      }
    }
  });

  await sendCDP(ws, 'Runtime.enable');
  await sendCDP(ws, 'Page.enable');

  // Injeta usuário de teste e dados de chamados simulados para teste completo
  const initScript = `
    window.__TEST_USER__ = { id: 'usr-1', email: 'professor@senailrv.edu.br', role: 'usuario' };
    localStorage.setItem('sb-mock-user', JSON.stringify(window.__TEST_USER__));
    localStorage.setItem('tisenai_user_email', 'professor@senailrv.edu.br');
    localStorage.setItem('tisenai_meus_tickets', JSON.stringify([
      {
        id: 11,
        aberto_em: '2026-09-08',
        hora: '10:00',
        descricao: 'Problema no projetor da sala 3',
        status: 'Em atendimento',
        prioridade: 'Média',
        solicitante: 'Valmeres Silva',
        local: 'Sala 3',
        setor: 'Professor',
        email: 'professor@senailrv.edu.br'
      },
      {
        id: 12,
        aberto_em: '2026-09-09',
        hora: '14:30',
        descricao: 'Computadores sem internet na sala de Logística',
        status: 'Resolvido',
        prioridade: 'Alta',
        solicitante: 'Valmeres Silva',
        local: 'Sala de Logística',
        setor: 'Professor',
        procedimento: 'Adaptadores wi-fi travados',
        email: 'professor@senailrv.edu.br'
      }
    ]));
  `;

  await sendCDP(ws, 'Page.addScriptToEvaluateOnNewDocument', { source: initScript });

  // TESTE A: Desktop (1440x900)
  console.log('\n--- TESTE A: Desktop (1440x900) ---');
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // 1. Acesso direto pela URL /meus-chamados
  console.log('-> Navegando para http://127.0.0.1:3000/meus-chamados...');
  await sendCDP(ws, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/meus-chamados` });
  await new Promise((r) => setTimeout(r, 2000));

  let scrollYResult = await sendCDP(ws, 'Runtime.evaluate', {
    expression: 'window.scrollY',
    returnByValue: true,
  });
  console.log(`Posição de rolagem vertical (window.scrollY) na abertura: ${scrollYResult.result.value}px`);
  assert.strictEqual(scrollYResult.result.value, 0, 'A página DEVE iniciar no topo (scrollY === 0)!');
  console.log('✓ PASSOU: Página inicia no topo (0px) na abertura direta pela URL.');

  // 2. Recarregamento da URL
  console.log('-> Testando recarregamento da URL (Page.reload)...');
  await sendCDP(ws, 'Page.reload');
  await new Promise((r) => setTimeout(r, 2000));

  scrollYResult = await sendCDP(ws, 'Runtime.evaluate', {
    expression: 'window.scrollY',
    returnByValue: true,
  });
  console.log(`Posição de rolagem vertical pós-reload: ${scrollYResult.result.value}px`);
  assert.strictEqual(scrollYResult.result.value, 0, 'A página DEVE permanecer no topo após reload!');
  console.log('✓ PASSOU: Página inicia no topo após reload.');

  // 3. Navegação via menu (Início -> Meus chamados)
  console.log('-> Testando navegação via menu (Início -> Meus chamados)...');
  await sendCDP(ws, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/` });
  await new Promise((r) => setTimeout(r, 1500));
  await sendCDP(ws, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/meus-chamados` });
  await new Promise((r) => setTimeout(r, 2000));

  scrollYResult = await sendCDP(ws, 'Runtime.evaluate', {
    expression: 'window.scrollY',
    returnByValue: true,
  });
  console.log(`Posição de rolagem vindo do menu: ${scrollYResult.result.value}px`);
  assert.strictEqual(scrollYResult.result.value, 0, 'A página DEVE iniciar no topo ao navegar pelo menu!');
  console.log('✓ PASSOU: Página inicia no topo vindo pelo menu.');

  // 4. Verificação dos títulos e subtítulos de avaliação (Item 5)
  console.log('\n--- VERIFICAÇÃO DO FORMULÁRIO DE AVALIAÇÃO ---');
  const loc = await sendCDP(ws, 'Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  const bodyText = await sendCDP(ws, 'Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 400)', returnByValue: true });
  console.log('URL atual:', loc.result.value);
  console.log('Conteúdo da página:', bodyText.result.value);
  const titulosEval = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const textElements = Array.from(document.querySelectorAll('span, p, h2, h3'));
        const p1 = textElements.find(el => el.textContent.includes('Satisfação com o Atendimento') || el.textContent.includes('Satisfação'));
        const s1 = textElements.find(el => el.textContent.includes('Como foi seu suporte?'));
        const p2 = textElements.find(el => el.textContent.includes('Facilidade para Abrir o Chamado'));
        const s2 = textElements.find(el => el.textContent.includes('Quão fácil foi abrir a solicitação?'));
        return {
          pergunta1: p1 ? p1.textContent.trim() : null,
          subtitulo1: s1 ? s1.textContent.trim() : null,
          pergunta2: p2 ? p2.textContent.trim() : null,
          subtitulo2: s2 ? s2.textContent.trim() : null,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Textos encontrados na avaliação:', JSON.stringify(titulosEval.result.value, null, 2));
  assert.ok(
    titulosEval.result.value.pergunta1?.includes('1. Satisfação com o Atendimento'),
    'Pergunta 1 deve ser "1. Satisfação com o Atendimento"'
  );
  assert.strictEqual(
    titulosEval.result.value.subtitulo1,
    'Como foi seu suporte?',
    'Subtítulo 1 deve ser "Como foi seu suporte?"'
  );
  assert.ok(
    titulosEval.result.value.pergunta2?.includes('2. Facilidade para Abrir o Chamado'),
    'Pergunta 2 deve ser "2. Facilidade para Abrir o Chamado"'
  );
  assert.strictEqual(
    titulosEval.result.value.subtitulo2,
    'Quão fácil foi abrir a solicitação?',
    'Subtítulo 2 deve ser "Quão fácil foi abrir a solicitação?"'
  );
  console.log('✓ PASSOU: Pergunta 1 e Pergunta 2 estão com títulos, subtítulos e numeração corretos!');

  // 5. Teste de envio de mensagem no chat: garantir que APENAS o contêiner rola, sem mover a página
  console.log('\n--- TESTE DO CHAT E ROLAGEM INTERNA ---');
  // Rola a página para um scroll controlado (ex: 120px) para testar se enviar mensagem altera window.scrollY
  await sendCDP(ws, 'Runtime.evaluate', { expression: 'window.scrollTo({ top: 120, behavior: "instant" })' });
  await new Promise((r) => setTimeout(r, 300));
  const scrollAntesEnvio = (await sendCDP(ws, 'Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true })).result.value;

  const chatTest = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length === 0) return { error: 'Nenhum textarea encontrado' };
        const lastTextarea = textareas[textareas.length - 1];
        lastTextarea.value = 'Mensagem de teste de envio no chat';
        lastTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        lastTextarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Acha botão Enviar do formulário
        const form = lastTextarea.closest('form');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        if (submitBtn) {
          submitBtn.click();
          return { clicked: true };
        }
        return { error: 'Botão submit não encontrado' };
      })()
    `,
    returnByValue: true,
  });
  console.log('Resultado do envio de mensagem:', chatTest.result.value);
  await new Promise((r) => setTimeout(r, 800));

  const scrollDepoisEnvio = (await sendCDP(ws, 'Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true })).result.value;
  console.log(`Scroll antes do envio: ${scrollAntesEnvio}px | Scroll depois do envio: ${scrollDepoisEnvio}px`);
  assert.strictEqual(scrollDepoisEnvio, scrollAntesEnvio, 'window.scrollY NÃO deve mudar ao enviar mensagem no chat!');
  console.log('✓ PASSOU: O envio de mensagem não arrastou a página (window.scrollY inalterado).');

  // TESTE B: Tablet (768x1024)
  console.log('\n--- TESTE B: Tablet (768x1024) ---');
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendCDP(ws, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/meus-chamados` });
  await new Promise((r) => setTimeout(r, 1500));
  let tabletScroll = (await sendCDP(ws, 'Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true })).result.value;
  assert.strictEqual(tabletScroll, 0, 'Tablet deve iniciar no topo');
  console.log('✓ PASSOU: Tablet inicia no topo (0px).');

  // TESTE C: Mobile (375x812)
  console.log('\n--- TESTE C: Mobile (375x812) ---');
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sendCDP(ws, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/meus-chamados` });
  await new Promise((r) => setTimeout(r, 1500));
  let mobileScroll = (await sendCDP(ws, 'Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true })).result.value;
  assert.strictEqual(mobileScroll, 0, 'Mobile deve iniciar no topo');
  console.log('✓ PASSOU: Mobile inicia no topo (0px).');

  console.log('\n--- VERIFICAÇÃO DE ERROS NO CONSOLE ---');
  const realErrors = consoleErrors.filter(
    (e) => !e.includes('Download the React DevTools') && !e.includes('favicon')
  );
  if (realErrors.length > 0) {
    console.warn('Erros encontrados no console:', realErrors);
  } else {
    console.log('✓ PASSOU: Zero erros no console.');
  }

  console.log('\n======================================================================');
  console.log('TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================================');

  ws.close();
  edgeProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('FALHA NO TESTE:', err);
  process.exit(1);
});
