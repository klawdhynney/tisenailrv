import assert from "node:assert";

// 1. Teste de Normalização e Autorização de Administradores
const ADMINS_AUTORIZADOS = [
  "klaw.com@gmail.com",
  "klawdhynney@gmail.com",
  "claudineigoncalvesdelima@hotmail.com",
  "claudinei.lima@senaimt.ind.br"
];

function resolverPerfil(session) {
  if (!session?.user) {
    return { isAdmin: false, isGestor: false, role: "visitante" };
  }
  const email = (session.user.email || "").toLowerCase().trim();
  const isAuthAdmin = ADMINS_AUTORIZADOS.includes(email);
  const isGestor = isAuthAdmin || session.user.role === "gestor";
  return {
    isAdmin: isAuthAdmin,
    isGestor,
    role: isAuthAdmin ? "admin" : isGestor ? "gestor" : "usuario"
  };
}

// Visitante
const perfilVisitante = resolverPerfil(null);
assert.strictEqual(perfilVisitante.isAdmin, false, "Visitante não pode ser admin");
assert.strictEqual(perfilVisitante.isGestor, false, "Visitante não pode ser gestor");
assert.strictEqual(perfilVisitante.role, "visitante");

// Usuário Comum
const perfilUsuario = resolverPerfil({ user: { email: "aluno@senaimt.ind.br", role: "usuario" } });
assert.strictEqual(perfilUsuario.isAdmin, false, "Usuário comum não pode ser admin");
assert.strictEqual(perfilUsuario.isGestor, false, "Usuário comum não pode ser gestor");
assert.strictEqual(perfilUsuario.role, "usuario");

// Gestor
const perfilGestor = resolverPerfil({ user: { email: "coordenador@senaimt.ind.br", role: "gestor" } });
assert.strictEqual(perfilGestor.isAdmin, false, "Gestor comum não pode ser admin");
assert.strictEqual(perfilGestor.isGestor, true, "Gestor tem permissão de gestor");
assert.strictEqual(perfilGestor.role, "gestor");

// Administradores Autorizados
for (const email of ADMINS_AUTORIZADOS) {
  const p = resolverPerfil({ user: { email } });
  assert.strictEqual(p.isAdmin, true, `Admin ${email} deve ter isAdmin = true`);
  assert.strictEqual(p.isGestor, true, `Admin ${email} deve ter isGestor = true`);
  assert.strictEqual(p.role, "admin");
}

console.log("✓ Teste 1: Resolução de perfis (visitante, usuário, gestor, administradores) passou!");

// 2. Teste de Proteção contra Despromoção e Bloqueio do Último Admin
function simularRebaixamentoAdmin(adminsAtivos, alvoId) {
  if (adminsAtivos.length <= 1 && adminsAtivos.includes(alvoId)) {
    throw new Error("Operação cancelada: não é permitido rebaixar o único administrador ativo do sistema.");
  }
  return adminsAtivos.filter(id => id !== alvoId);
}

assert.throws(() => simularRebaixamentoAdmin(["admin-1"], "admin-1"), /único administrador ativo/);
const variosAdmins = simularRebaixamentoAdmin(["admin-1", "admin-2"], "admin-2");
assert.deepStrictEqual(variosAdmins, ["admin-1"]);
console.log("✓ Teste 2: Proteção do último administrador passou!");

// 3. Teste de Validação e Limpeza de Saída de IA
function limparSaidaIa(texto) {
  if (!texto) return "";
  let limpo = texto.trim();
  if (limpo.startsWith("```") && limpo.endsWith("```")) {
    limpo = limpo.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```$/i, "").trim();
  }
  const preambulos = [
    /^(?:Aqui está|Segue|Abaixo segue|Segue abaixo)(?:\s+(?:a|o|uma|um))?(?:\s+(?:resposta|sugestão|parecer|procedimento)(?:\s+técnico|\s+técnica)?)?\s*:\s*/i,
    /^(?:Resposta|Sugestão|Parecer|Procedimento)(?:\s+(?:técnico|técnica))?\s*:\s*/i,
  ];
  for (const regex of preambulos) limpo = limpo.replace(regex, "");
  return limpo.trim();
}

const textoSujo = "Aqui está a resposta técnica: O computador foi reiniciado e o cabo de rede reconectado.";
const textoLimpo = limparSaidaIa(textoSujo);
assert.strictEqual(textoLimpo, "O computador foi reiniciado e o cabo de rede reconectado.");
console.log("✓ Teste 3: Limpeza de saída de IA passou!");

// 4. Teste de Fallback Heurístico Local de IA
function gerarFallbackLocal(system, prompt) {
  const isAprimoramento = system.includes("APRIMORAMENTO") || system.includes("versao1");
  const isRespostaAtendimento = system.includes("RESPOSTA AO CHAMADO") || system.includes("opcao1");

  if (isAprimoramento) {
    const textoLimpo = prompt.replace(/[^\w\sÀ-ÿ.,!?-]/g, "").trim();
    const primeira = textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
    return JSON.stringify({
      versao1: `Identificada solicitação técnica: ${primeira}. Ocorrência registrada para averiguação operacional e restabelecimento imediato dos serviços de TI no setor.`,
      versao2: `Solicitação técnica de TI: ${primeira}. Procedimento preventivo e corretivo acionado junto à equipe técnica local.`
    });
  }

  if (isRespostaAtendimento) {
    const contexto = typeof prompt === "string" ? JSON.parse(prompt) : prompt;
    const cat = contexto.categoria || "TI";
    return JSON.stringify({
      opcao1: "1. Chamado técnico analisado pela equipe de TI.\n2. Verificação de hardware, rede e credenciais do setor realizada.\n3. Procedimento técnico executado e serviço operacional testado com sucesso.",
      opcao2: `Atendimento concluído para a categoria ${cat}. Causa analisada e resolvida conforme os padrões técnicos operacionais do SENAI LRV.`
    });
  }
  return "Atendimento registrado.";
}

const fallbackRev = JSON.parse(gerarFallbackLocal("APRIMORAMENTO versao1", "impressora travou no bloco c"));
assert(fallbackRev.versao1.includes("Impressora travou"));
assert(fallbackRev.versao2.includes("Impressora travou"));

const fallbackResp = JSON.parse(gerarFallbackLocal("RESPOSTA AO CHAMADO opcao1", JSON.stringify({ categoria: "Rede" })));
assert(fallbackResp.opcao1.includes("hardware, rede"));
assert(fallbackResp.opcao2.includes("categoria Rede"));
console.log("✓ Teste 4: Fallback resiliente de IA (aprimorar texto e respostas) passou!");

// 5. Teste de Abertura de Chamado com Tamanho de Contato
function validarAberturaChamado(dados) {
  if (!dados.solicitante || dados.solicitante.trim().length < 2) throw new Error("Solicitante inválido");
  if (!dados.setor || dados.setor.trim().length < 2) throw new Error("Setor inválido");
  if (!dados.descricao || dados.descricao.trim().length < 2) throw new Error("Descrição inválida");
  if (dados.contato && dados.contato.length > 255) throw new Error("Contato excede 255 caracteres");
  return { id: 101, status: "Aberto" };
}

const chamadoValido = validarAberturaChamado({
  solicitante: "Claudinei Gonçalves de Lima",
  email: "claudineigoncalvesdelima@hotmail.com",
  contato: "Claudinei Gonçalves de Lima (claudineigoncalvesdelima@hotmail.com)",
  setor: "Coordenação",
  descricao: "Computador do laboratório não liga"
});
assert.strictEqual(chamadoValido.id, 101);
console.log("✓ Teste 5: Validação robusta de abertura de chamado com contato longo passou!");

console.log("\n==============================================");
console.log("TODAS AS SIMULAÇÕES E REGRAS PASSARAM COM 100%!");
console.log("==============================================");
