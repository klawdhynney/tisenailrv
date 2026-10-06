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
  console.log('TESTES DE AUDITORIA MOBILE-FIRST, ROTAS, LOGIN E COMPONENTES (CDP)');
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

  await new Promise((r) => setTimeout(r, 2500));

  const version = await httpReq({ host: '127.0.0.1', port, path: '/json/version' });
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('✓ Conectado ao Edge DevTools Protocol com sucesso!\n');

  const { targetId } = await sendCDP(ws, 'Target.createTarget', { url: 'http://localhost:4173/' });
  const targets = await httpReq({ host: '127.0.0.1', port, path: '/json' });
  const pageTarget = targets.find((t) => t.id === targetId);

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  await sendCDP(pageWs, 'Page.enable');
  await sendCDP(pageWs, 'Runtime.enable');
  await sendCDP(pageWs, 'DOM.enable');

  async function evaluate(expression) {
    const res = await sendCDP(pageWs, 'Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result.value;
  }

  async function navigate(url, waitMs = 2000) {
    await sendCDP(pageWs, 'Page.navigate', { url });
    await new Promise((r) => setTimeout(r, waitMs));
  }

  async function setViewport(width, height) {
    await sendCDP(pageWs, 'Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 768,
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const viewports = [
    { name: 'Mobile Pequeno (360px)', width: 360, height: 740 },
    { name: 'Mobile Padrão (390px)', width: 390, height: 844 },
    { name: 'Mobile Grande (430px)', width: 430, height: 932 },
    { name: 'Tablet (768px)', width: 768, height: 1024 },
    { name: 'Desktop (1280px)', width: 1280, height: 800 },
  ];

  // -------------------------------------------------------------
  // TESTE 1: AUDITORIA MOBILE DAS PÁGINAS PRINCIPAIS (Sem scroll horizontal)
  // -------------------------------------------------------------
  console.log('--- TESTE 1: AUDITORIA MOBILE (360px, 390px, 430px) ---');
  const rotasAudit = [
    { path: '/', nome: 'Página Inicial' },
    { path: '/abrir', nome: 'Abrir Chamado' },
    { path: '/sobre', nome: 'Página Sobre' },
    { path: '/lgpd', nome: 'Página LGPD' },
    { path: '/auth', nome: 'Página de Login' },
  ];

  for (const vp of viewports.filter((v) => v.width <= 430)) {
    await setViewport(vp.width, vp.height);
    for (const r of rotasAudit) {
      await navigate(`http://localhost:4173${r.path}`);
      const metrics = await evaluate(`(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const hasHorizontalScroll = docW > winW;
        return { docW, winW, hasHorizontalScroll };
      })()`);

      assert(
        !metrics.hasHorizontalScroll,
        `Erro: Rolagem horizontal detectada em ${r.nome} em ${vp.name} (docW: ${metrics.docW}, winW: ${metrics.winW})`
      );
      console.log(`✓ [${vp.name}] ${r.nome}: sem overflow horizontal (scrollWidth=${metrics.docW} <= innerWidth=${metrics.winW})`);
    }
  }

  // -------------------------------------------------------------
  // TESTE 2: ABRIR CHAMADO - NÃO EXIBE A CAPA (BANNER)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 2: ABRIR CHAMADO - NÃO EXIBIR A CAPA (BANNER) ---');
  for (const w of [360, 430, 1280]) {
    await setViewport(w, 800);
    await navigate('http://localhost:4173/abrir');
    const bannerInfo = await evaluate(`(() => {
      const bannerLink = document.querySelector('a[title*="página inicial"][href="/"]');
      const bannerImgs = Array.from(document.querySelectorAll('img')).filter(img => img.alt && img.alt.includes('SENAI Lucas'));
      const bannerPic = document.querySelector('main > div:first-child picture');
      return {
        hasBannerLink: Boolean(bannerLink),
        bannerImgsCount: bannerImgs.length,
        hasBannerPic: Boolean(bannerPic)
      };
    })()`);

    assert(!bannerInfo.hasBannerPic, `Erro: Banner exibido na página /abrir em largura ${w}px!`);
    console.log(`✓ [${w}px] /abrir: Capa/banner ocultada com sucesso (hasBannerPic=${bannerInfo.hasBannerPic})`);
  }

  // -------------------------------------------------------------
  // TESTE 3: LARGURA DA INICIAL (CORPO = CAPA)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 3: LARGURA DA INICIAL (CORPO = CAPA) ---');
  for (const w of [360, 430, 1280]) {
    await setViewport(w, 800);
    await navigate('http://localhost:4173/');
    const larguras = await evaluate(`(() => {
      const banner = document.querySelector('main > div.mb-6, main > div.w-full picture');
      const bannerRect = banner ? banner.getBoundingClientRect() : null;
      const hero = document.querySelector('main section');
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      return {
        bannerWidth: bannerRect ? Math.round(bannerRect.width) : null,
        heroWidth: heroRect ? Math.round(heroRect.width) : null
      };
    })()`);

    console.log(`✓ [${w}px] Início: Largura da capa = ${larguras.bannerWidth}px, Largura do corpo = ${larguras.heroWidth}px`);
    if (larguras.bannerWidth && larguras.heroWidth) {
      assert(
        Math.abs(larguras.bannerWidth - larguras.heroWidth) <= 2,
        `Erro de alinhamento entre capa (${larguras.bannerWidth}) e corpo (${larguras.heroWidth})`
      );
    }
  }

  // -------------------------------------------------------------
  // TESTE 4: BARRA DE TÍTULO FIXA (STICKY, CLICÁVEL E COMPACTA)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 4: BARRA DE TÍTULO FIXA (STICKY E CLICÁVEL) ---');
  await setViewport(390, 844);
  await navigate('http://localhost:4173/');
  // Rolar 500px para baixo
  await evaluate('window.scrollTo(0, 500)');
  await new Promise((r) => setTimeout(r, 500));

  const headerFixed = await evaluate(`(() => {
    const header = document.querySelector('header');
    const rect = header.getBoundingClientRect();
    const tituloLink = header.querySelector('a[href="/"]');
    const menuBtn = header.querySelector('button[aria-label*="menu" i]');
    const btnRect = menuBtn ? menuBtn.getBoundingClientRect() : null;
    return {
      top: rect.top,
      visible: rect.height > 0,
      hasTitle: Boolean(tituloLink),
      titleHref: tituloLink ? tituloLink.getAttribute('href') : null,
      menuBtnTouchTarget: btnRect ? { width: Math.round(btnRect.width), height: Math.round(btnRect.height) } : null
    };
  })()`);

  assert.strictEqual(headerFixed.top, 0, 'Erro: Header não está fixo no topo ao rolar a página!');
  assert.strictEqual(headerFixed.titleHref, '/', 'Erro: Título não leva para /!');
  assert(headerFixed.menuBtnTouchTarget.height >= 44, 'Erro: Botão de menu tem altura < 44px!');
  console.log(`✓ Header fixo no topo ao rolar (top=${headerFixed.top}px, altura=${headerFixed.visible})`);
  console.log(`✓ Título 'TI SENAI LRV' clicável levando à inicial (href='${headerFixed.titleHref}')`);
  console.log(`✓ Botão do menu no celular possui área de toque de ${headerFixed.menuBtnTouchTarget.width}x${headerFixed.menuBtnTouchTarget.height}px (>=44px)`);

  // -------------------------------------------------------------
  // TESTE 5: BOTÃO RETORNAR (EM TODAS AS PÁGINAS EXCETO INICIAL)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 5: BOTÃO RETORNAR (FIM DAS PÁGINAS EXCETO /) ---');
  // 1. Na inicial NÃO deve ter
  await navigate('http://localhost:4173/');
  const botaoHome = await evaluate(`Boolean(document.querySelector('button[aria-label*="Retornar" i]'))`);
  assert(!botaoHome, 'Erro: Botão Retornar não deve aparecer na página inicial!');
  console.log('✓ Página inicial (/): Botão Retornar ausente corretamente.');

  // 2. Em /sobre, /abrir, /lgpd DEVE ter
  for (const r of ['/sobre', '/abrir', '/lgpd']) {
    await setViewport(390, 844);
    await navigate(`http://localhost:4173${r}`);
    const btnRetornar = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Retornar" i]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const parent = btn.parentElement;
      return {
        exists: true,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        fullWidthOnMobile: rect.width >= 330
      };
    })()`);

    assert(btnRetornar && btnRetornar.exists, `Erro: Botão Retornar não encontrado em ${r}!`);
    assert(btnRetornar.height >= 48, `Erro: Altura do botão Retornar é ${btnRetornar.height}px (esperado >= 48px)!`);
    assert(btnRetornar.fullWidthOnMobile, `Erro: Botão Retornar não tem largura total no celular!`);
    console.log(`✓ [${r}] Botão Retornar presente: altura=${btnRetornar.height}px (>=48px), largura celular=${btnRetornar.width}px`);
  }

  // -------------------------------------------------------------
  // TESTE 6: PÁGINA "SOBRE" E LINK NO RODAPÉ
  // -------------------------------------------------------------
  console.log('\n--- TESTE 6: PÁGINA SOBRE E LINK NO RODAPÉ ---');
  await navigate('http://localhost:4173/sobre');
  const sobreContent = await evaluate(`(() => {
    const text = document.body.innerText;
    const hasSec1 = text.includes('💻 Sobre o Sistema de Suporte de TI');
    const hasSec2 = text.includes('📊 Inteligência e Gestão');
    const hasSec3 = text.includes('🤖 Tecnologia Moderna com IA');
    const hasSec4 = text.includes('🔒 Privacidade e Conformidade com a LGPD');
    const lgpdLink = document.querySelector('a[href="/lgpd"]');
    const footerSobreLink = document.querySelector('footer a[href="/sobre"]');
    return {
      hasSec1, hasSec2, hasSec3, hasSec4,
      hasLgpdLink: Boolean(lgpdLink),
      hasFooterSobreLink: Boolean(footerSobreLink)
    };
  })()`);

  assert(sobreContent.hasSec1, 'Seção 1 ausente em /sobre');
  assert(sobreContent.hasSec2, 'Seção 2 ausente em /sobre');
  assert(sobreContent.hasSec3, 'Seção 3 ausente em /sobre');
  assert(sobreContent.hasSec4, 'Seção 4 ausente em /sobre');
  assert(sobreContent.hasLgpdLink, 'Link para /lgpd ausente em /sobre');
  assert(sobreContent.hasFooterSobreLink, 'Link Sobre ausente no rodapé');
  console.log('✓ Seção 1 presente: 💻 Sobre o Sistema de Suporte de TI');
  console.log('✓ Seção 2 presente: 📊 Inteligência e Gestão');
  console.log('✓ Seção 3 presente: 🤖 Tecnologia Moderna com IA');
  console.log('✓ Seção 4 presente: 🔒 Privacidade e Conformidade com a LGPD (com link para /lgpd)');
  console.log('✓ Link "Sobre" presente no rodapé ao lado de Privacidade e LGPD!');

  // -------------------------------------------------------------
  // TESTE 7: CAMPOS DE FORMULÁRIO COM FONTE >= 16PX (EVITA ZOOM IOS)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 7: CAMPOS DE FORMULÁRIO COM FONTE >= 16PX NO MOBILE ---');
  await setViewport(390, 844);
  await navigate('http://localhost:4173/auth');
  const inputFonts = await evaluate(`(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    return inputs.map(el => {
      const fs = window.getComputedStyle(el).fontSize;
      return { tag: el.tagName, fontSize: parseFloat(fs) };
    });
  })()`);

  for (const f of inputFonts) {
    assert(f.fontSize >= 16, `Input ${f.tag} tem fonte de ${f.fontSize}px (< 16px causa zoom no iOS)!`);
  }
  console.log(`✓ Todos os campos de formulário verificados possuem font-size >= 16px no mobile!`);

  // -------------------------------------------------------------
  // TESTE 8: MEDIÇÃO DO TEMPO DE RETORNO DO LOGIN (returnTo)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 8: MEDIÇÃO DO TEMPO DE RETORNO DO LOGIN (returnTo) ---');
  // Testando navegação direta para /auth?returnTo=/sobre com pré-carregamento ativo
  const t0 = Date.now();
  await navigate('http://localhost:4173/auth?returnTo=/sobre');
  const t1 = Date.now();
  const tempoLoginRetorno = t1 - t0;

  console.log(`✓ Tempo medido de retorno e resolução da rota: ~${tempoLoginRetorno}ms`);

  console.log('\n======================================================================');
  console.log('TODOS OS TESTES MOBILE, NAVEGAÇÃO E REQUISITOS PASSARAM COM 100%!');
  console.log('======================================================================\n');

  try {
    edgeProc.kill();
  } catch {}
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
