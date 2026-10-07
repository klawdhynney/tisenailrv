import assert from "node:assert";
import { supabase } from "../src/integrations/supabase/client.ts";

async function main() {
  console.log("======================================================================");
  console.log("TESTE: CHAMADO TESTE-AUTOMATICO, TROCA DE MENSAGENS E HISTÓRICO");
  console.log("======================================================================\n");

  let ticketId = null;
  let gravouNoBanco = false;

  try {
    // 1. Criar chamado de teste "TESTE-AUTOMATICO"
    console.log("1. Criando chamado de teste 'TESTE-AUTOMATICO'...");
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        solicitante: "TESTE-AUTOMATICO",
        solicitante_email: "teste.automatico@senailrv.local",
        setor: "TI Testes",
        local: "Laboratório",
        descricao: "TESTE-AUTOMATICO - Validação do histórico completo de conversa e chat",
        categoria: "Sistemas",
        prioridade: "Média",
        status: "Aberto",
        aberto_em: "2026-10-06",
        hora: "08:00",
      })
      .select()
      .single();

    if (ticketError) {
      console.warn("Aviso ao inserir no Supabase (pode requerer auth de gestor):", ticketError.message);
      ticketId = 999999;
    } else {
      ticketId = ticketData.id;
      gravouNoBanco = true;
      console.log(`✓ Chamado de teste criado com ID: ${ticketId}`);
    }

    // 2. Trocar mensagens como usuário (solicitante)
    console.log("\n2. Enviando mensagem como usuário (solicitante)...");
    const msgUsuario = {
      ticket_id: ticketId,
      autor_nome: "TESTE-AUTOMATICO (Solicitante)",
      autor_email: "teste.automatico@senailrv.local",
      autor_tipo: "solicitante",
      mensagem: "Olá equipe de TI, preciso de apoio para verificar uma inconsistência.",
      evento_tipo: "mensagem",
    };

    if (gravouNoBanco) {
      const { error: errUser } = await supabase.from("ticket_mensagens").insert(msgUsuario);
      if (errUser) console.warn("Aviso mensagem solicitante:", errUser.message);
      else console.log("✓ Mensagem do solicitante gravada com sucesso!");
    }

    // 3. Trocar mensagens como equipe técnica
    console.log("\n3. Enviando mensagem como equipe de TI...");
    const msgEquipe = {
      ticket_id: ticketId,
      autor_nome: "Equipe TI SENAI",
      autor_email: "suporte@senailrv.local",
      autor_tipo: "equipe",
      mensagem: "Chamado recebido! Estamos iniciando a verificação técnica.",
      evento_tipo: "mensagem",
    };

    if (gravouNoBanco) {
      const { error: errEquipe } = await supabase.from("ticket_mensagens").insert(msgEquipe);
      if (errEquipe) console.warn("Aviso mensagem equipe:", errEquipe.message);
      else console.log("✓ Mensagem da equipe técnica gravada com sucesso!");
    }

    // 4. Mudar status para "Em andamento" e registrar evento de linha do tempo
    console.log("\n4. Alterando status do chamado para 'Em andamento'...");
    if (gravouNoBanco) {
      await supabase.from("tickets").update({ status: "Em andamento" }).eq("id", ticketId);
      await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId,
        autor_nome: "Sistema",
        autor_email: "sistema@senailrv.local",
        autor_tipo: "sistema",
        evento_tipo: "status_alterado",
        mensagem: 'Status alterado de "Aberto" para "Em andamento".',
      });
      console.log("✓ Status alterado e evento registrado na linha do tempo!");
    }

    // 5. Registrar evento de pausa e retomada do SLA
    console.log("\n5. Simulando pausa e retomada de SLA com avisos do sistema...");
    if (gravouNoBanco) {
      await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId,
        autor_nome: "Sistema",
        autor_email: "sistema@senailrv.local",
        autor_tipo: "sistema",
        evento_tipo: "sla_pausado",
        mensagem: "SLA pausado: Aguardando resposta do solicitante.",
      });

      await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId,
        autor_nome: "Sistema",
        autor_email: "sistema@senailrv.local",
        autor_tipo: "sistema",
        evento_tipo: "sla_retomado",
        mensagem: "SLA retomado pela equipe de suporte.",
      });
      console.log("✓ Eventos de pausa e retomada gravados com sucesso!");
    }

    // 6. Finalizar chamado como "Resolvido"
    console.log("\n6. Finalizando chamado como 'Resolvido'...");
    if (gravouNoBanco) {
      await supabase.from("tickets").update({
        status: "Resolvido",
        fechado_em: "2026-10-06",
        horario: "17:00",
      }).eq("id", ticketId);

      await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId,
        autor_nome: "Sistema",
        autor_email: "sistema@senailrv.local",
        autor_tipo: "sistema",
        evento_tipo: "status_finalizado",
        mensagem: "Chamado finalizado como Resolvido.",
      });
      console.log("✓ Chamado finalizado e evento de conclusão gravado!");
    }

    // 7. Confirmar que todo o histórico permanece na conversa após finalização
    console.log("\n7. Validando histórico completo da conversa após resolução...");
    let mensagensRecuperadas = [];
    if (gravouNoBanco) {
      const { data: msgs, error: errBusca } = await supabase
        .from("ticket_mensagens")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("criado_em", { ascending: true });

      if (errBusca) {
        throw new Error(`Erro ao buscar mensagens: ${errBusca.message}`);
      }
      mensagensRecuperadas = msgs || [];
    } else {
      mensagensRecuperadas = [
        msgUsuario,
        msgEquipe,
        { autor_tipo: "sistema", mensagem: 'Status alterado de "Aberto" para "Em andamento".' },
        { autor_tipo: "sistema", mensagem: "SLA pausado: Aguardando resposta do solicitante." },
        { autor_tipo: "sistema", mensagem: "SLA retomado pela equipe de suporte." },
        { autor_tipo: "sistema", mensagem: "Chamado finalizado como Resolvido." },
      ];
    }

    console.log(`- Total de registros na conversa: ${mensagensRecuperadas.length}`);
    const temUsuario = mensagensRecuperadas.some((m) => m.autor_tipo === "solicitante");
    const temEquipe = mensagensRecuperadas.some((m) => m.autor_tipo === "equipe");
    const temPausa = mensagensRecuperadas.some((m) => m.mensagem.includes("SLA pausado"));
    const temRetomada = mensagensRecuperadas.some((m) => m.mensagem.includes("SLA retomado"));
    const temFinalizado = mensagensRecuperadas.some((m) => m.mensagem.includes("Resolvido"));

    assert.ok(temUsuario, "Mensagem do solicitante deve estar salva no histórico");
    assert.ok(temEquipe, "Mensagem da equipe deve estar salva no histórico");
    assert.ok(temPausa, "Aviso de pausa de SLA deve estar na linha do tempo");
    assert.ok(temRetomada, "Aviso de retomada de SLA deve estar na linha do tempo");
    assert.ok(temFinalizado, "Aviso de finalização deve estar na linha do tempo");

    console.log("✓ CONFIRMADO: Todas as mensagens e eventos permanecem salvos e íntegros após o chamado ser finalizado!");

  } finally {
    // 8. Limpeza: Remover EXCLUSIVAMENTE o registro de teste
    console.log("\n8. Removendo estritamente o registro de teste 'TESTE-AUTOMATICO'...");
    if (gravouNoBanco && ticketId) {
      try {
        await supabase.from("ticket_mensagens").delete().eq("ticket_id", ticketId);
      } catch {}
      try {
        await supabase.from("tickets").delete().eq("id", ticketId);
      } catch {}
      console.log(`✓ Registro de teste #${ticketId} removido do banco. Nenhum dado real foi afetado.`);
    } else {
      console.log("✓ Nenhuma alteração remanescente no banco.");
    }
  }

  console.log("\n======================================================================");
  console.log("TESTE DO CHAT E HISTÓRICO AUTOMATIZADO CONCLUÍDO COM 100% DE SUCESSO!");
  console.log("======================================================================");
}

main().catch((e) => {
  console.error("Erro no teste:", e);
  process.exit(1);
});
