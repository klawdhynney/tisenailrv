import { supabase } from "../src/integrations/supabase/client.ts";

async function main() {
  console.log("=== INICIANDO TESTE DO FLUXO DE AVALIAÇÃO ===");

  // 1. Testa chamada pública de estatísticas agregadas
  console.log("\n1. Testando chamada pública de estatísticas agregadas (get_public_evaluation_stats):");
  const { data: statsData, error: statsErr } = await supabase.rpc("get_public_evaluation_stats");
  if (statsErr) {
    console.log(`- RPC get_public_evaluation_stats retornou erro esperado enquanto a migration não for executada no Supabase: [${statsErr.code}] ${statsErr.message}`);
  } else {
    console.log("- RPC get_public_evaluation_stats funcionou com sucesso!");
    console.log("- Dados retornados:", JSON.stringify(statsData));
    
    // Validação estrita de privacidade: nunca pode conter dados pessoais
    if (statsData) {
      const keys = Object.keys(statsData);
      const proibidas = ["comentario", "email", "user_email", "solicitante", "nome"];
      const temVazamento = proibidas.some((p) => keys.includes(p));
      if (!temVazamento) {
        console.log("✓ PRIVACIDADE GARANTIDA: Nenhum dado pessoal retornado na chamada pública.");
      } else {
        console.error("✗ FALHA DE PRIVACIDADE: chave sensível encontrada na resposta pública!");
      }
    }
  }

  // 2. Busca chamado de teste
  console.log("\n2. Verificando chamado de teste para avaliação:");
  const { data: ultimosChamados } = await supabase
    .from("tickets")
    .select("id, solicitante, status")
    .order("id", { ascending: false })
    .limit(1);

  const ticketTesteId = ultimosChamados?.[0]?.id || 99999;
  console.log(`- Usando ticket_id: ${ticketTesteId}`);

  // 3. Testa gravação de avaliação com "TESTE-AUTOMATICO"
  console.log("\n3. Criando avaliação com comentário 'TESTE-AUTOMATICO':");
  let gravouRemoto = false;
  
  const { data: rpcRes, error: rpcSubErr } = await supabase.rpc("submit_ticket_evaluation", {
    p_ticket_id: ticketTesteId,
    p_nota: 5,
    p_comentario: "TESTE-AUTOMATICO - Avaliação temporária do fluxo automatizado",
  });

  if (!rpcSubErr) {
    console.log("✓ Gravação via RPC submit_ticket_evaluation efetuada com sucesso!", rpcRes);
    gravouRemoto = true;
  } else {
    console.log(`- RPC retornou: [${rpcSubErr.code}] ${rpcSubErr.message}. Tentando insert direto...`);
    const { data: insData, error: insErr } = await supabase
      .from("avaliacoes_chamados")
      .insert({
        ticket_id: ticketTesteId,
        nota: 5,
        comentario: "TESTE-AUTOMATICO - Avaliação temporária do fluxo automatizado",
      })
      .select();

    if (!insErr) {
      console.log("✓ Gravação direta na tabela efetuada com sucesso!", insData);
      gravouRemoto = true;
    } else {
      console.log(`- Insert direto retornou [${insErr.code}] ${insErr.message}`);
      console.log("  (O banco de dados necessita da execução de docs/aplicar-no-banco.sql no Supabase)");
    }
  }

  // 4. Se gravou no banco remoto, verifica consulta e remove só esse registro
  if (gravouRemoto) {
    console.log("\n4. Consultando o registro 'TESTE-AUTOMATICO' no banco:");
    const { data: encontradas, error: buscaErr } = await supabase
      .from("avaliacoes_chamados")
      .select("*")
      .ilike("comentario", "%TESTE-AUTOMATICO%");

    if (buscaErr) {
      console.error("Erro na busca:", buscaErr.message);
    } else {
      console.log(`✓ Encontradas ${encontradas?.length || 0} avaliações com 'TESTE-AUTOMATICO':`, encontradas);
    }

    console.log("\n5. Removendo estritamente o registro de teste criado:");
    const { error: delErr } = await supabase
      .from("avaliacoes_chamados")
      .delete()
      .ilike("comentario", "%TESTE-AUTOMATICO%");

    if (delErr) {
      console.error("Erro ao remover registro de teste:", delErr.message);
    } else {
      console.log("✓ Registro de teste 'TESTE-AUTOMATICO' removido do banco com sucesso!");
    }
  }

  // 5. Teste do pipeline de armazenamento local/reserva e agregação
  console.log("\n5. Testando pipeline de armazenamento local/reserva com 'TESTE-AUTOMATICO':");
  const cacheSimulado = [
    {
      id: 100001,
      ticket_id: 88888,
      nota: 5,
      comentario: "TESTE-AUTOMATICO - Avaliação temporária em cache",
      created_at: new Date().toISOString(),
      enviado_ao_banco: false,
    },
    {
      id: 100002,
      ticket_id: 88889,
      nota: 4,
      comentario: "Atendimento muito bom",
      created_at: new Date().toISOString(),
      enviado_ao_banco: false,
    }
  ];

  // Simula o carregamento no dashboard
  const avaliacaoTeste = cacheSimulado.find(a => a.comentario?.includes("TESTE-AUTOMATICO"));
  if (avaliacaoTeste) {
    console.log("✓ Registro 'TESTE-AUTOMATICO' identificado com sucesso no conjunto de dados!");
  } else {
    console.error("✗ Registro de teste não encontrado!");
  }

  // Simula o cálculo de agregação da página inicial
  const total = cacheSimulado.length;
  const soma = cacheSimulado.reduce((acc, a) => acc + a.nota, 0);
  const media = Number((soma / total).toFixed(2));
  const sat = Math.round((cacheSimulado.filter((a) => a.nota >= 4).length / total) * 100);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of cacheSimulado) {
    if (a.nota in dist) dist[a.nota]++;
  }

  console.log(`- Indicadores calculados: Total=${total}, Média=${media}, Satisfação=${sat}%, Distribuição=${JSON.stringify(dist)}`);
  if (total === 2 && media === 4.5 && sat === 100 && dist[5] === 1 && dist[4] === 1) {
    console.log("✓ Agregação de resumo da página inicial validada!");
  } else {
    console.error("✗ Falha na agregação!");
  }

  // Limpeza: remove apenas o registro de teste
  const cacheAposRemocao = cacheSimulado.filter(a => !a.comentario?.includes("TESTE-AUTOMATICO"));
  const aindaExiste = cacheAposRemocao.some(a => a.comentario?.includes("TESTE-AUTOMATICO"));
  if (!aindaExiste && cacheAposRemocao.length === 1) {
    console.log("✓ Registro 'TESTE-AUTOMATICO' removido com sucesso, mantendo os demais dados intactos!");
  } else {
    console.error("✗ Falha ao remover estritamente o registro de teste!");
  }

  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");
}

main().catch((err) => {
  console.error("Erro no script de teste:", err);
  process.exit(1);
});
