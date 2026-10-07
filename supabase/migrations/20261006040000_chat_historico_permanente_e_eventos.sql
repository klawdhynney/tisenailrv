-- ============================================================================
-- MIGRATION: HISTÓRICO PERMANENTE DO CHAT E REGISTRO AUTOMÁTICO DE EVENTOS
-- ============================================================================

-- 1. ESTRUTURA E COLUNAS DE AUDITORIA EM public.ticket_mensagens
CREATE TABLE IF NOT EXISTS public.ticket_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  autor_nome text NOT NULL,
  autor_email text NOT NULL,
  autor_tipo text NOT NULL CHECK (autor_tipo IN ('solicitante', 'equipe', 'sistema')),
  mensagem text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Garantir colunas adicionais para preservação e auditoria
ALTER TABLE public.ticket_mensagens
  ADD COLUMN IF NOT EXISTS editado_em timestamptz,
  ADD COLUMN IF NOT EXISTS mensagem_original text,
  ADD COLUMN IF NOT EXISTS excluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS evento_tipo text DEFAULT 'mensagem';

-- Atualizar restrição de autor_tipo para garantir suporte a 'sistema'
ALTER TABLE public.ticket_mensagens DROP CONSTRAINT IF EXISTS ticket_mensagens_autor_tipo_check;
ALTER TABLE public.ticket_mensagens ADD CONSTRAINT ticket_mensagens_autor_tipo_check CHECK (autor_tipo IN ('solicitante', 'equipe', 'sistema'));

-- Índices otimizados para busca e ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens(ticket_id, criado_em ASC);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_user_id ON public.ticket_mensagens(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_evento_tipo ON public.ticket_mensagens(evento_tipo);

-- 2. BLOQUEIO DE EXCLUSÃO DE MENSAGENS (IMUTABILIDADE DO HISTÓRICO)
CREATE OR REPLACE FUNCTION public.proibir_exclusao_mensagens()
RETURNS trigger AS $$
BEGIN
  -- Impede exclusão acidental ou intencional de mensagens do histórico
  IF current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Exclusão de mensagens não permitida. O histórico do chamado é permanente.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_proibir_exclusao_mensagens ON public.ticket_mensagens;
CREATE TRIGGER trg_proibir_exclusao_mensagens
  BEFORE DELETE ON public.ticket_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.proibir_exclusao_mensagens();

-- 3. TRIGGER AUTOMÁTICO PARA REGISTRO DE EVENTOS RELEVANTES NO CHAT (STATUS, SLA, FINALIZAÇÃO)
CREATE OR REPLACE FUNCTION public.trg_ticket_eventos_historico()
RETURNS trigger AS $$
DECLARE
  v_autor_nome text := 'Sistema';
  v_autor_email text := 'sistema@senailrv.local';
  v_msg text;
  v_tipo text;
BEGIN
  -- A. Mudança de status do chamado
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('Resolvido', 'Concluído') THEN
      v_msg := 'Chamado finalizado como ' || NEW.status || '.';
      v_tipo := 'status_finalizado';
    ELSE
      v_msg := 'Status alterado de "' || coalesce(OLD.status, 'Novo') || '" para "' || NEW.status || '".';
      v_tipo := 'status_alterado';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.ticket_mensagens
      WHERE ticket_id = NEW.id
        AND autor_tipo = 'sistema'
        AND criado_em >= (now() - interval '3 seconds')
        AND mensagem = v_msg
    ) THEN
      INSERT INTO public.ticket_mensagens (
        ticket_id, autor_nome, autor_email, autor_tipo, mensagem, evento_tipo, criado_em
      ) VALUES (
        NEW.id, v_autor_nome, v_autor_email, 'sistema', v_msg, v_tipo, now()
      );
    END IF;
  END IF;

  -- B. Pausa e retomada do SLA
  IF (OLD.sla_pausado IS DISTINCT FROM NEW.sla_pausado) THEN
    IF NEW.sla_pausado IS TRUE THEN
      v_msg := 'SLA pausado' || CASE WHEN NEW.sla_pausa_motivo IS NOT NULL AND NEW.sla_pausa_motivo <> '' THEN ': ' || NEW.sla_pausa_motivo ELSE '' END || '.';
      v_tipo := 'sla_pausado';
    ELSE
      v_msg := 'SLA retomado pela equipe de suporte.';
      v_tipo := 'sla_retomado';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.ticket_mensagens
      WHERE ticket_id = NEW.id
        AND autor_tipo = 'sistema'
        AND criado_em >= (now() - interval '3 seconds')
        AND mensagem = v_msg
    ) THEN
      INSERT INTO public.ticket_mensagens (
        ticket_id, autor_nome, autor_email, autor_tipo, mensagem, evento_tipo, criado_em
      ) VALUES (
        NEW.id, v_autor_nome, v_autor_email, 'sistema', v_msg, v_tipo, now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ticket_eventos_historico ON public.tickets;
CREATE TRIGGER trg_ticket_eventos_historico
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ticket_eventos_historico();

-- 4. POLÍTICAS RLS E PERMISSÕES (USUÁRIO SÓ VÊ SEUS CHAMADOS; GESTOR/ADMIN VÊ TODOS)
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ticket_mensagens FROM anon, public;
GRANT SELECT, INSERT ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;

DROP POLICY IF EXISTS "ticket_mensagens_select_policy" ON public.ticket_mensagens;
CREATE POLICY "ticket_mensagens_select_policy" ON public.ticket_mensagens
  FOR SELECT TO authenticated
  USING (
    public.is_gestor_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_mensagens.ticket_id
        AND (
          (t.criado_por IS NOT NULL AND t.criado_por = auth.uid())
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
        )
    )
  );

DROP POLICY IF EXISTS "ticket_mensagens_insert_policy" ON public.ticket_mensagens;
CREATE POLICY "ticket_mensagens_insert_policy" ON public.ticket_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gestor_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_mensagens.ticket_id
        AND (
          (t.criado_por IS NOT NULL AND t.criado_por = auth.uid())
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
        )
    )
  );

-- 5. REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_mensagens'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_mensagens;
    END IF;
  END IF;
END $$;
