import fs from "fs";
import path from "path";

console.log("=== INICIANDO VALIDAÇÃO DE SEO, SITEMAP E SEARCH CONSOLE ===\n");

let falhas = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FALHA: ${msg}`);
    falhas++;
  } else {
    console.log(`✅ OK: ${msg}`);
  }
}

// 1. SITEMAP
const sitemapPath = path.resolve("public/sitemap.xml");
assert(fs.existsSync(sitemapPath), "public/sitemap.xml existe");
const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");

assert(sitemapContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "sitemap.xml inicia com declaração XML válida");
assert(sitemapContent.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), "sitemap.xml contém namespace de urlset padrão");
assert(sitemapContent.includes("<loc>https://tisenailrv.app/</loc>"), "sitemap.xml contém https://tisenailrv.app/");
assert(sitemapContent.includes("<loc>https://tisenailrv.app/sobre</loc>"), "sitemap.xml contém https://tisenailrv.app/sobre");
assert(sitemapContent.includes("<loc>https://tisenailrv.app/lgpd</loc>"), "sitemap.xml contém https://tisenailrv.app/lgpd");
assert(sitemapContent.includes("<lastmod>"), "sitemap.xml contém lastmod");
assert(sitemapContent.includes("<changefreq>"), "sitemap.xml contém changefreq");

// Não pode conter áreas privadas
const forbiddenInSitemap = ["/abrir", "/dashboard", "/atendimento", "/usuarios", "/regras", "/auth", "/login", "/meus-chamados", "/preferencias-email"];
for (const rota of forbiddenInSitemap) {
  assert(!sitemapContent.includes(`<loc>https://tisenailrv.app${rota}`), `sitemap.xml NÃO contém a rota privada ${rota}`);
}

// 2. ROBOTS.TXT
const robotsPath = path.resolve("public/robots.txt");
assert(fs.existsSync(robotsPath), "public/robots.txt existe");
const robotsContent = fs.readFileSync(robotsPath, "utf-8");

assert(robotsContent.includes("Sitemap: https://tisenailrv.app/sitemap.xml"), "robots.txt referencia o sitemap completo");
assert(robotsContent.includes("Disallow: /abrir"), "robots.txt bloqueia /abrir");
assert(robotsContent.includes("Disallow: /dashboard"), "robots.txt bloqueia /dashboard");
assert(robotsContent.includes("Disallow: /auth"), "robots.txt bloqueia /auth");
assert(robotsContent.includes("Disallow: /atendimento"), "robots.txt bloqueia /atendimento");
assert(robotsContent.includes("Disallow: /usuarios"), "robots.txt bloqueia /usuarios");
assert(robotsContent.includes("Disallow: /regras"), "robots.txt bloqueia /regras");
assert(robotsContent.includes("Disallow: /meus-chamados"), "robots.txt bloqueia /meus-chamados");

// 3. HOSPEDAGEM SPA E HEADERS
const headersPath = path.resolve("public/_headers");
assert(fs.existsSync(headersPath), "public/_headers existe");
const headersContent = fs.readFileSync(headersPath, "utf-8");
assert(headersContent.includes("Content-Type: application/xml"), "public/_headers define application/xml para sitemap.xml");
assert(headersContent.includes("Content-Type: text/plain"), "public/_headers define text/plain para robots.txt");

const serverPath = path.resolve("src/server.ts");
const serverContent = fs.readFileSync(serverPath, "utf-8");
assert(serverContent.includes('url.pathname === "/sitemap.xml"'), "src/server.ts atende diretamente /sitemap.xml");
assert(serverContent.includes('url.pathname === "/robots.txt"'), "src/server.ts atende diretamente /robots.txt");
assert(serverContent.includes("application/xml"), "src/server.ts retorna Content-Type application/xml para sitemap");
assert(serverContent.includes("text/plain"), "src/server.ts retorna Content-Type text/plain para robots");

// 4. HTML ESTÁTICO E LANG PT-BR
const indexPath = path.resolve("index.html");
assert(fs.existsSync(indexPath), "index.html existe na raiz");
const indexContent = fs.readFileSync(indexPath, "utf-8");
assert(indexContent.includes('lang="pt-BR"'), "index.html possui lang='pt-BR'");
assert(indexContent.includes('<meta name="google-site-verification" content="'), "index.html possui meta google-site-verification estática");
assert(indexContent.includes('<link rel="canonical" href="https://tisenailrv.app/"'), "index.html possui canonical link");
assert(indexContent.includes('<title>'), "index.html possui title");
assert(indexContent.includes('<meta name="description"'), "index.html possui meta description");

const rootPath = path.resolve("src/routes/__root.tsx");
const rootContent = fs.readFileSync(rootPath, "utf-8");
assert(rootContent.includes('lang="pt-BR"'), "src/routes/__root.tsx possui lang='pt-BR'");
assert(rootContent.includes('GOOGLE_SITE_VERIFICATION_CODE'), "src/routes/__root.tsx define constante GOOGLE_SITE_VERIFICATION_CODE");
assert(rootContent.includes('"google-site-verification"'), "src/routes/__root.tsx injeta google-site-verification nas meta tags SSR");

// 5. PÁGINAS PÚBLICAS COM CANONICAL E OG TAGS
const paginasPublicas = [
  { file: "src/routes/index.tsx", canonical: "https://tisenailrv.app/" },
  { file: "src/routes/sobre.tsx", canonical: "https://tisenailrv.app/sobre" },
  { file: "src/routes/lgpd.tsx", canonical: "https://tisenailrv.app/lgpd" },
];

for (const pub of paginasPublicas) {
  const c = fs.readFileSync(path.resolve(pub.file), "utf-8");
  assert(c.includes("title:"), `${pub.file} possui title`);
  assert(c.includes('name: "description"') || c.includes("name: 'description'"), `${pub.file} possui meta description`);
  assert(c.includes(`href: "${pub.canonical}"`), `${pub.file} possui canonical link ${pub.canonical}`);
  assert(c.includes('property: "og:title"'), `${pub.file} possui og:title`);
  assert(c.includes('property: "og:description"'), `${pub.file} possui og:description`);
  assert(c.includes('property: "og:url"'), `${pub.file} possui og:url`);
  assert(c.includes('property: "og:image"'), `${pub.file} possui og:image`);
}

// 6. PÁGINAS PRIVADAS E LOGIN COM NOINDEX, NOFOLLOW
const paginasPrivadas = [
  "src/routes/auth.tsx",
  "src/routes/abrir.tsx",
  "src/routes/meus-chamados.tsx",
  "src/routes/preferencias-email.tsx",
  "src/routes/dashboard.tsx",
  "src/routes/dashboard.index.tsx",
  "src/routes/dashboard.acompanhamento.tsx",
  "src/routes/dashboard.avaliacoes.tsx",
  "src/routes/_authenticated/route.tsx",
  "src/routes/_authenticated/atendimento.tsx",
  "src/routes/_authenticated/chamados.tsx",
  "src/routes/_authenticated/chamados.$ticketId.tsx",
  "src/routes/_authenticated/regras.tsx",
  "src/routes/_authenticated/regras.usuarios.tsx",
];

for (const priv of paginasPrivadas) {
  const c = fs.readFileSync(path.resolve(priv), "utf-8");
  assert(c.includes('"noindex, nofollow"') || c.includes("'noindex, nofollow'"), `${priv} possui meta robots noindex, nofollow`);
}

console.log(`\n=== FIM DOS TESTES: ${falhas === 0 ? "TODOS PASSARAM COM SUCESSO!" : `${falhas} FALHAS ENCONTRADAS.`} ===`);
process.exit(falhas > 0 ? 1 : 0);
