import http from 'http';
import { spawn } from 'child_process';
import assert from 'assert';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9226;
const webPort = 3001;

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
  console.log('TESTE AUTOMATIZADO: NOVO DIÁLOGO DE CONFIRMAÇÃO MODERNO (/abrir)');
  console.log('======================================================================\n');

  console.log('1. Iniciando Vite dev server na porta ' + webPort + '...');
  const viteProc = spawn('cmd.exe', ['/c', 'bun', 'run', 'dev', '--', '--port', String(webPort)], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  // Aguarda vite subir
  let viteReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${webPort}/`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) resolve();
          else reject();
        });
        req.on('error', reject);
      });
      viteReady = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  assert.ok(viteReady, 'Vite dev server deve estar pronto');
  console.log('✓ Vite dev server pronto na porta ' + webPort);

  console.log('2. Iniciando Microsoft Edge headless...');
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const version = await httpReq({ host: '127.0.0.1', port: debugPort, path: '/json/version' });
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const { targetId } = await sendCDP(ws, 'Target.createTarget', { url: 'about:blank' });
  const targets = await httpReq({ host: '127.0.0.1', port: debugPort, path: '/json' });
  const pageTarget = targets.find((t) => t.id === targetId);
  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  await sendCDP(pageWs, 'Page.enable');
  await sendCDP(pageWs, 'Runtime.enable');
  await sendCDP(pageWs, 'DOM.enable');

  const evalJs = async (expression) => {
    const res = await sendCDP(pageWs, 'Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Erro em eval');
    }
    return res.result?.value;
  };

  try {
    console.log('3. Acessando página inicial e configurando usuário de teste...');
    await sendCDP(pageWs, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/` });
    await new Promise((r) => setTimeout(r, 1500));

    await evalJs(`
      localStorage.setItem('sb-mock-user', JSON.stringify({
        id: 'test-user-01',
        email: 'usuario.teste@senaimt.ind.br',
        user_metadata: { full_name: 'Claudinei Lima' },
        app_metadata: { role: 'solicitante' }
      }));
    `);

    console.log('4. Navegando para /abrir...');
    await sendCDP(pageWs, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/abrir` });
    await new Promise((r) => setTimeout(r, 2000));

    // Teste 1: Cancelar sem preencher descrição deve voltar para / direto
    console.log('5. Testando Cancelar com formulário vazio (sem descrição)...');
    const urlAntes = await evalJs('window.location.pathname');
    assert.strictEqual(urlAntes, '/abrir', 'Deve estar em /abrir');

    // Clica no botão Cancelar
    await evalJs(`
      const btns = Array.from(document.querySelectorAll('button'));
      const btnCancelar = btns.find(b => b.textContent.trim() === 'Cancelar');
      btnCancelar.click();
    `);
    await new Promise((r) => setTimeout(r, 1000));

    const urlApos = await evalJs('window.location.pathname');
    assert.strictEqual(urlApos, '/', 'Sem descrição preenchida, deve voltar direto para / sem diálogo');
    console.log('✓ Cancelamento direto quando formulário está sem preenchimento funcionou com sucesso!');

    // Teste 2: Preencher descrição e clicar em Cancelar
    console.log('6. Navegando novamente para /abrir e preenchendo descrição...');
    await sendCDP(pageWs, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/abrir` });
    await new Promise((r) => setTimeout(r, 2000));

    await evalJs(`
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, 'Computador com tela azul na sala 03');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await new Promise((r) => setTimeout(r, 500));

    console.log('7. Clicando em Cancelar com dados preenchidos...');
    await evalJs(`
      const btns = Array.from(document.querySelectorAll('button'));
      const btnCancelar = btns.find(b => b.textContent.trim() === 'Cancelar');
      btnCancelar.click();
    `);
    await new Promise((r) => setTimeout(r, 600));

    // Verifica que o modal apareceu
    const dialogInfo = await evalJs(`
      (() => {
        const dialog = document.querySelector('[role="alertdialog"]');
        if (!dialog) return null;
        const titulo = dialog.querySelector('h2, [id*="radix"]')?.textContent || '';
        const texto = dialog.textContent || '';
        const btns = Array.from(dialog.querySelectorAll('button')).map(b => b.textContent.trim());
        const temIcone = dialog.querySelector('svg') !== null;
        const rect = dialog.getBoundingClientRect();
        return {
          visivel: rect.width > 0 && rect.height > 0,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          texto,
          btns,
          temIcone
        };
      })()
    `);

    assert.ok(dialogInfo, 'Diálogo com role="alertdialog" deve estar presente no DOM');
    assert.ok(dialogInfo.visivel, 'Diálogo deve estar visível');
    assert.ok(dialogInfo.texto.includes('Cancelar preenchimento?'), 'Título deve ser "Cancelar preenchimento?"');
    assert.ok(dialogInfo.texto.includes('Os dados digitados serão perdidos'), 'Mensagem deve alertar sobre dados perdidos');
    assert.ok(dialogInfo.btns.includes('Continuar preenchendo'), 'Deve conter botão "Continuar preenchendo"');
    assert.ok(dialogInfo.btns.includes('Sim, cancelar'), 'Deve conter botão "Sim, cancelar"');
    assert.ok(dialogInfo.temIcone, 'Deve conter ícone no topo');
    console.log('✓ Diálogo moderno renderizado com sucesso com título, mensagem, ícone e botões!');

    // Teste 3: Clicar em "Continuar preenchendo"
    console.log('8. Testando botão "Continuar preenchendo"...');
    await evalJs(`
      const dialog = document.querySelector('[role="alertdialog"]');
      const btnContinuar = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continuar preenchendo');
      btnContinuar.click();
    `);
    await new Promise((r) => setTimeout(r, 500));

    const dialogAposContinuar = await evalJs('document.querySelector("[role=\\"alertdialog\\"]") !== null');
    assert.strictEqual(dialogAposContinuar, false, 'Diálogo deve ter fechado');
    const valorDescricao = await evalJs('document.querySelector("textarea").value');
    assert.strictEqual(valorDescricao, 'Computador com tela azul na sala 03', 'Dados do formulário devem ser preservados');
    console.log('✓ "Continuar preenchendo" fechou o modal e preservou os dados intactos!');

    // Teste 4: Reabrir e testar tecla Escape
    console.log('9. Reabrindo e testando tecla Escape...');
    await evalJs(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btnCancelar = btns.find(b => b.textContent.trim() === 'Cancelar');
        btnCancelar.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    await sendCDP(pageWs, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
    await sendCDP(pageWs, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 500));

    const dialogAposEsc = await evalJs('document.querySelector("[role=\\"alertdialog\\"]") !== null');
    assert.strictEqual(dialogAposEsc, false, 'Tecla Esc deve fechar o diálogo');
    console.log('✓ Fechamento via tecla Escape verificado com sucesso!');

    // Teste 5: Reabrir e testar "Sim, cancelar"
    console.log('10. Reabrindo e testando confirmação definitiva "Sim, cancelar"...');
    await evalJs(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btnCancelar = btns.find(b => b.textContent.trim() === 'Cancelar');
        btnCancelar.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    await evalJs(`
      (() => {
        const dialog = document.querySelector('[role="alertdialog"]');
        const btnConfirmar = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sim, cancelar');
        btnConfirmar.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1000));

    const urlAposConfirmar = await evalJs('window.location.pathname');
    assert.strictEqual(urlAposConfirmar, '/', 'Confirmação deve redirecionar para a página inicial /');
    console.log('✓ Confirmação "Sim, cancelar" executada com sucesso e redirecionou para /!');

    // Teste 6: Teste responsivo mobile (390px)
    console.log('11. Testando layout responsivo mobile (390x844)...');
    await sendCDP(pageWs, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await sendCDP(pageWs, 'Page.navigate', { url: `http://127.0.0.1:${webPort}/abrir` });
    await new Promise((r) => setTimeout(r, 1500));

    await evalJs(`
      (() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeSetter.call(textarea, 'Impressora sem toner');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btns = Array.from(document.querySelectorAll('button'));
        const btnCancelar = btns.find(b => b.textContent.trim() === 'Cancelar');
        btnCancelar.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const mobileDialogInfo = await evalJs(`
      (() => {
        const dialog = document.querySelector('[role="alertdialog"]');
        if (!dialog) return null;
        const rect = dialog.getBoundingClientRect();
        const btns = Array.from(dialog.querySelectorAll('button'));
        const btnBoxes = btns.map(b => b.getBoundingClientRect());
        return {
          dialogWidth: rect.width,
          windowWidth: window.innerWidth,
          semOverflowHorizontal: document.documentElement.scrollWidth <= window.innerWidth + 1,
          botoesEmpilhados: btnBoxes.length >= 2 && btnBoxes[0].top !== btnBoxes[1].top,
          alturasBotoes: btnBoxes.map(b => b.height)
        };
      })()
    `);

    assert.ok(mobileDialogInfo, 'Diálogo mobile deve existir');
    assert.ok(mobileDialogInfo.semOverflowHorizontal, 'Sem scroll horizontal no mobile');
    assert.ok(mobileDialogInfo.botoesEmpilhados, 'No celular os botões devem estar empilhados verticalmente');
    assert.ok(mobileDialogInfo.alturasBotoes.every(h => h >= 40), 'Botões devem ter altura de toque confortável (>=40px)');
    console.log('✓ Layout responsivo mobile verificado: botões empilhados, toque adequado, sem overflow horizontal!');

    console.log('\n======================================================================');
    console.log('TODOS OS 6 TESTES DO DIÁLOGO DE CONFIRMAÇÃO PASSARAM COM 100% DE SUCESSO!');
    console.log('======================================================================');
  } finally {
    edgeProc.kill();
    viteProc.kill();
    try {
      process.kill(viteProc.pid);
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
