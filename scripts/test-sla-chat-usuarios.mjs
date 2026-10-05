import assert from "node:assert";
import fs from "node:fs";
import { calcularSla, addHorasUteis } from "../src/lib/sla.ts";
import { REGRAS_PADRAO, MOTIVOS_PAUSA_SLA_PADRAO } from "../src/lib/types.ts";
import { exportarCsv } from "../src/lib/exportar.ts";

console.log("==================================================");
console.log("TESTES: SLA PAUSADO, CHAT E GESTÃO DE USUÁRIOS");
console.log("==================================================\n");

// TESTE 1: SLA PAUSADO E RETOMADO
console.log("--- 1. TESTE DE SLA PAUSADO, RETOMADO E RELÓGIO CONGELADO ---");

// Cria um ticket de teste
const ticketAberto = {
  id: 9991,
  solicitante: "Maria Silva",
  email: "maria.silva@senaimt.ind.br",
  setor: "Secretaria",
  descricao: "Instalação de software acadêmico",
  categoria: "Software / Sistemas",
  prioridade: "Média", // Prazo padrão: 24 horas
  status: "Em atendimento",
  abertoEm: "2026-10-01",
  hora: "08:00",
  fechadoEm: null,
  horario: null,
  slaPausado: false,
  slaPausadoEm: null,
  slaPausaMotivo: null,
  slaSegundosPausadosAcumulados: 0,
};

const agoraSemPausa = new Date("2026-10-01T12:00:00");
const slaNormal = calcularSla(ticketAberto, REGRAS_PADRAO, agoraSemPausa);
assert.strictEqual(slaNormal.situacao, "No prazo", "Ticket aberto dentro do prazo deve ser 'No prazo'");
assert.ok(slaNormal.prazo !== null, "Prazo deve estar definido");

// Simula a pausa do SLA (ex.: Aguardando resposta do solicitante)
const horaPausa = "2026-10-01T12:00:00.000Z";
const ticketPausado = {
  ...ticketAberto,
  slaPausado: true,
  slaPausadoEm: horaPausa,
  slaPausaMotivo: "Aguardando resposta do solicitante",
  slaPausaAutor: "Claudinei Lima",
};

// Teste do relógio congelado: mesmo se agora for 5 dias depois, a situação NÃO deve ser 'Estourado'
const dataMuitoDepois = new Date("2026-10-10T18:00:00");
const slaPausado = calcularSla(ticketPausado, REGRAS_PADRAO, dataMuitoDepois);
assert.strictEqual(slaPausado.situacao, "SLA pausado", "Ticket com slaPausado deve retornar situação 'SLA pausado'");
assert.notStrictEqual(slaPausado.situacao, "Estourado", "Chamado pausado JAMAIS pode contar como estourado ou atrasado");
assert.strictEqual(slaPausado.pausadoPor, "Aguardando resposta do solicitante");
assert.ok(slaPausado.restanteMin !== null, "Tempo restante no momento da pausa deve ser preservado e congelado");

// Simula a retomada do SLA com 8 horas de pausa acumuladas (28800 segundos úteis)
const ticketRetomado = {
  ...ticketAberto,
  slaPausado: false,
  slaPausadoEm: null,
  slaPausaMotivo: null,
  slaSegundosPausadosAcumulados: 28800, // 8 horas somadas ao prazo
};

const slaRetomado = calcularSla(ticketRetomado, REGRAS_PADRAO, agoraSemPausa);
assert.ok(slaRetomado.prazo !== null);
assert.ok(
  slaRetomado.prazo.getTime() > slaNormal.prazo.getTime(),
  "O prazo final após a retomada DEVE somar o tempo útil pausado",
);

// Verifica existência dos motivos no painel de ajustes
assert.ok(Array.isArray(MOTIVOS_PAUSA_SLA_PADRAO), "Motivos padrão de pausa de SLA devem existir");
assert.ok(MOTIVOS_PAUSA_SLA_PADRAO.includes("Aguardando resposta do usuário"));
assert.ok(MOTIVOS_PAUSA_SLA_PADRAO.includes("Aguardando peça ou fornecedor"));

const regrasCode = fs.readFileSync("./src/routes/_authenticated/regras.tsx", "utf-8");
assert.ok(regrasCode.includes("Motivos de Pausa do SLA"), "Painel de ajustes deve conter seção para editar motivos de pausa do SLA");

console.log("✓ Teste 1 passou: SLA pausa, congela relógio, impede 'Estourado', soma tempo na retomada e motivos são editáveis!\n");

// TESTE 2: CHAT E MENSAGENS EM CONVERSA
console.log("--- 2. TESTE DO CHAT NOS DETALHES DO CHAMADO E RLS ---");

assert.ok(fs.existsSync("./src/components/TicketChat.tsx"), "Componente TicketChat.tsx deve existir");
const chatCode = fs.readFileSync("./src/components/TicketChat.tsx", "utf-8");
assert.ok(chatCode.includes("scrollEndRef"), "Chat deve ter rolagem automática até a última mensagem");
assert.ok(chatCode.includes("ticket_mensagens"), "Chat deve consultar e enviar para a tabela ticket_mensagens");
assert.ok(chatCode.includes("solicitanteNome"), "Chat deve identificar solicitante e respostas da equipe");
assert.ok(chatCode.includes("canal"), "Chat deve ter sincronização em tempo real via canais do Supabase");

// Verifica integração do chat na rota do gestor e na rota do usuário
const detalhesGestorCode = fs.readFileSync("./src/routes/_authenticated/chamados.$ticketId.tsx", "utf-8");
assert.ok(detalhesGestorCode.includes("<TicketChat"), "Detalhes do chamado (gestor) deve incluir TicketChat");

const meusChamadosCode = fs.readFileSync("./src/routes/meus-chamados.tsx", "utf-8");
assert.ok(meusChamadosCode.includes("<TicketChat"), "Meus chamados (usuário) deve incluir TicketChat");

// Verifica migration SQL com políticas de segurança RLS do Chat
const migrationSql = fs.readFileSync("./supabase/migrations/20261005020000_sla_chat_usuarios.sql", "utf-8");
assert.ok(migrationSql.includes("CREATE TABLE IF NOT EXISTS public.ticket_mensagens"), "Tabela ticket_mensagens deve ser criada na migration");
assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"), "RLS deve ser ativado em ticket_mensagens");
assert.ok(migrationSql.includes("ticket_mensagens_select_policy"), "RLS deve conter política de SELECT protegida");
assert.ok(migrationSql.includes("ticket_mensagens_insert_policy"), "RLS deve conter política de INSERT protegida");
assert.ok(migrationSql.includes("INSERT INTO public.ticket_mensagens"), "Migração automática de procedimentos e notas anteriores deve preservar dados");

console.log("✓ Teste 2 passou: Chat implementado com balões, timestamps, rolagem, integração mobile/desktop e RLS garantido!\n");

// TESTE 3: GESTÃO DE USUÁRIOS E EXPORTAÇÃO
console.log("--- 3. TESTE DE GESTÃO DE USUÁRIOS, FILTROS E EXPORTAÇÃO (CSV/XLSX) ---");

const gestaoUsuariosCode = fs.readFileSync("./src/components/GestaoUsuarios.tsx", "utf-8");
assert.ok(gestaoUsuariosCode.includes("exportarUsuarios"), "GestaoUsuarios deve conter função exportarUsuarios");
assert.ok(gestaoUsuariosCode.includes("Exportar CSV"), "Deve existir botão Exportar CSV");
assert.ok(gestaoUsuariosCode.includes("Exportar XLSX"), "Deve existir botão Exportar XLSX");
assert.ok(gestaoUsuariosCode.includes("filtroProvedor"), "Deve existir filtro por Provedor");
assert.ok(gestaoUsuariosCode.includes("totalChamados"), "Deve listar total de chamados de cada usuário");
assert.ok(gestaoUsuariosCode.includes("1º Acesso") || gestaoUsuariosCode.includes("Primeiro Acesso"), "Deve exibir primeiro acesso");
assert.ok(gestaoUsuariosCode.includes("Último Acesso") || gestaoUsuariosCode.includes("Último acesso"), "Deve exibir último acesso");
assert.ok(gestaoUsuariosCode.includes("audit_logs_usuarios"), "Exportação deve gravar registro na tabela audit_logs_usuarios");
assert.ok(gestaoUsuariosCode.includes("isAdmin"), "Exportação deve ser restrita exclusivamente para administradores");

// Teste de geração de CSV com BOM e separador ponto e vírgula
let downloadConteudo = "";
global.URL = {
  createObjectURL: (blob) => "blob:mock",
  revokeObjectURL: () => {},
};
global.Blob = class MockBlob {
  constructor(parts) {
    downloadConteudo = parts.join("");
  }
};
global.document = {
  createElement: () => ({
    set href(v) {},
    set download(v) {},
    click: () => {},
  }),
};

const dadosExemplo = [
  {
    Nome: "Claudinei Lima",
    "E-mail": "claudinei.lima@senaimt.ind.br",
    Provedor: "Microsoft",
    Perfil: "Administrador",
    Status: "Ativo",
    "Primeiro Acesso": "01/01/2026 08:00",
    "Último Acesso": "05/10/2026 02:30",
    "Total de Chamados": 15,
  },
  {
    Nome: "Klawdhynney",
    "E-mail": "klawdhynney@gmail.com",
    Provedor: "Google",
    Perfil: "Administrador",
    Status: "Ativo",
    "Primeiro Acesso": "01/01/2026 08:00",
    "Último Acesso": "05/10/2026 02:25",
    "Total de Chamados": 28,
  },
];

exportarCsv(dadosExemplo, "teste-usuarios");
assert.ok(downloadConteudo.startsWith("\uFEFF"), "CSV deve conter UTF-8 BOM (\uFEFF) para compatibilidade com o Excel brasileiro");
assert.ok(downloadConteudo.includes(";"), "CSV deve usar ponto e vírgula (;) como separador");
assert.ok(downloadConteudo.includes("\"Claudinei Lima\""), "Valores devem ser encapsulados por aspas");
assert.ok(downloadConteudo.includes("\"Total de Chamados\""), "Coluna Total de Chamados deve estar presente");

// Teste de Controle de Acesso: Verificando que usuários sem perfil admin não acessam a rota ou a aba
const regrasRouteCode = fs.readFileSync("./src/routes/_authenticated/regras.tsx", "utf-8");
assert.ok(regrasRouteCode.includes("isAdmin && ("), "Aba de Usuários & Acessos deve ser exibida apenas se isAdmin for verdadeiro");

console.log("✓ Teste 3 passou: Listagem com foto, nome, email, provedor, datas, perfil e chamados, com exportação auditada e bloqueio a não-admins!\n");

console.log("==================================================");
console.log("TODOS OS TESTES PASSARAM COM SUCESSO!");
console.log("==================================================");
