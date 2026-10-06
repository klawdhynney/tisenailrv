import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("TESTE: SEPARAÇÃO DE ROTAS - USUÁRIOS E REGRAS");
console.log("==================================================\n");

// 1. Rota de Usuários independente
console.log("1. Verificando arquivo da rota /usuarios...");
assert.ok(fs.existsSync("./src/routes/_authenticated/usuarios.tsx"), "src/routes/_authenticated/usuarios.tsx deve existir");
const usuariosRouteContent = fs.readFileSync("./src/routes/_authenticated/usuarios.tsx", "utf-8");
assert.ok(usuariosRouteContent.includes('createFileRoute("/_authenticated/usuarios")'), "Deve criar a rota /_authenticated/usuarios");
assert.ok(usuariosRouteContent.includes("<GestaoUsuarios"), "A rota /usuarios deve renderizar o componente <GestaoUsuarios />");
assert.ok(usuariosRouteContent.includes("isAdmin"), "A rota /usuarios deve checar permissão de administrador");
console.log("✓ Rota /usuarios configurada com sucesso!");

// 2. Rota de redirecionamento de compatibilidade
console.log("2. Verificando redirecionamento em /regras/usuarios...");
assert.ok(fs.existsSync("./src/routes/_authenticated/regras.usuarios.tsx"), "src/routes/_authenticated/regras.usuarios.tsx deve existir");
const regrasUsuariosContent = fs.readFileSync("./src/routes/_authenticated/regras.usuarios.tsx", "utf-8");
assert.ok(regrasUsuariosContent.includes('redirect({ to: "/usuarios" })'), "Deve redirecionar /regras/usuarios para /usuarios");
console.log("✓ Redirecionamento configurado!");

// 3. Verificando AppShell menu
console.log("3. Verificando links no AppShell...");
const appShellContent = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");
assert.ok(appShellContent.includes('to: "/usuarios"'), "Navbar deve apontar para /usuarios");
assert.ok(appShellContent.includes('<Link to="/usuarios"'), "Dropdown menu deve apontar para /usuarios");
assert.ok(appShellContent.includes('to: "/regras"'), "Painel de Ajustes deve apontar para /regras");
console.log("✓ Menu e navegação apontando corretamente para /usuarios e /regras!");

// 4. Verificando routeTree.gen.ts
console.log("4. Verificando routeTree.gen.ts...");
const routeTreeContent = fs.readFileSync("./src/routeTree.gen.ts", "utf-8");
assert.ok(routeTreeContent.includes("AuthenticatedUsuariosRoute"), "routeTree deve registrar AuthenticatedUsuariosRoute");
assert.ok(routeTreeContent.includes("'/usuarios': typeof AuthenticatedUsuariosRoute"), "routeTree deve mapear /usuarios");
console.log("✓ routeTree atualizado e sincronizado!");

console.log("\n==================================================");
console.log("TODAS AS VALIDAÇÕES DE ROTAS PASSARAM COM SUCESSO!");
console.log("==================================================");
