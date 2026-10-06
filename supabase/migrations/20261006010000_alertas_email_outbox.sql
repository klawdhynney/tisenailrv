-- ============================================================================
-- MIGRATION: 20261006010000_alertas_email_outbox.sql
-- Alertas por E-mail: Fila Outbox, Gatilhos Automáticos, Agregação de 3 Minutos,
-- Preferência do Usuário (Opt-out) e RPCs Seguras.
-- Idempotente, não destrutiva e que preserva todos os dados existentes.
-- ============================================================================

-- 1. TABELA DE FILA OUTBOX (notificacoes_email)
CREATE TABLE IF NOT EXISTS public.notificacoes_email (
  id bigserial PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  destinatario text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('status', 'mensagem', 'sla_pausado', 'sla_retomado', 'finalizado', 'teste')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'erro', 'ignorado')),
  tentativas integer NOT NULL DEFAULT 0,
  erro_mensagem text,
  dados_evento jsonb NOT NULL DEFAULT '{}'::jsonb,
  agendado_para timestamptz NOT NULL DEFAULT (now() + interval '3 minutes'),
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de desempenho
CREATE INDEX IF NOT EXISTS idx_notificacoes_email_ticket_id ON public.notificacoes_email(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_email_status_agendado ON public.notificacoes_email(status, agendado_para) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_notificacoes_email_created_at ON public.notificacoes_email(created_at DESC);

-- 2. COLUNA DE PREFERÊNCIA DO USUÁRIO EM USER_PROFILES
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS notificacoes_email_ativas boolean NOT NULL DEFAULT true;

-- 3. FUNÇÃO AUXILIAR: VERIFICA SE USUÁRIO DESEJA ALERTAS POR E-MAIL
CREATE OR REPLACE FUNCTION public.usuario_deseja_alertas_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ativo boolean;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN false;
  END IF;

  SELECT notificacoes_email_ativas INTO v_ativo
  FROM public.user_profiles
  WHERE lower(btrim(email)) = lower(btrim(p_email))
  LIMIT 1;

  IF v_ativo IS NULL THEN
    RETURN true; -- Padrão ligado se ainda não houver perfil
  END IF;

  RETURN v_ativo;
END;
$$;

-- 4. FUNÇÃO AUXILIAR: VERIFICA SE O EVENTO ESTÁ HABILITADO NAS REGRAS DO SISTEMA
CREATE OR REPLACE FUNCTION public.alerta_email_habilitado_nas_regras(p_evento text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regras jsonb;
  v_alertas jsonb;
  v_evento_ativo boolean;
BEGIN
  SELECT regras INTO v_regras FROM public.configuracoes WHERE id = 1 LIMIT 1;
  IF v_regras IS NULL THEN
    RETURN true;
  END IF;

  v_alertas := v_regras -> 'alertasEmail';
  IF v_alertas IS NULL THEN
    RETURN true;
  END IF;

  -- Interruptor geral
  IF (v_alertas ->> 'ativo')::boolean IS FALSE THEN
    RETURN false;
  END IF;

  IF p_evento = 'teste' THEN
    RETURN true;
  END IF;

  IF p_evento = 'status' THEN
    v_evento_ativo := COALESCE((v_alertas -> 'eventos' ->> 'status')::boolean, true);
  ELSIF p_evento = 'mensagem' THEN
    v_evento_ativo := COALESCE((v_alertas -> 'eventos' ->> 'novaResposta')::boolean, true);
  ELSIF p_evento IN ('sla_pausado', 'sla_retomado') THEN
    v_evento_ativo := COALESCE((v_alertas -> 'eventos' ->> 'slaPausadoRetomado')::boolean, true);
  ELSIF p_evento = 'finalizado' THEN
    v_evento_ativo := COALESCE((v_alertas -> 'eventos' ->> 'finalizacao')::boolean, true);
  ELSE
    v_evento_ativo := true;
  END IF;

  RETURN COALESCE(v_evento_ativo, true);
END;
$$;

-- 5. TRIGGER FUNCTION: ATUALIZAÇÕES DE TICKETS
CREATE OR REPLACE FUNCTION public.fn_trigger_ticket_notificacao_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_destinatario text;
  v_tipo text;
  v_evento_desc text;
  v_acting_email text;
  v_pendente_id bigint;
  v_dados jsonb;
BEGIN
  -- Destinatário é o solicitante do chamado
  v_destinatario := btrim(COALESCE(NEW.solicitante_email, ''));
  IF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
    RETURN NEW;
  END IF;

  -- Não envia por ação do próprio usuário solicitante
  BEGIN
    v_acting_email := btrim(COALESCE(auth.jwt()->>'email', ''));
  EXCEPTION WHEN OTHERS THEN
    v_acting_email := '';
  END;

  IF v_acting_email <> '' AND lower(v_acting_email) = lower(v_destinatario) THEN
    RETURN NEW;
  END IF;

  -- Determina o tipo de evento
  IF (NEW.status IN ('Resolvido', 'Concluído') AND (OLD.status NOT IN ('Resolvido', 'Concluído') OR OLD.fechado_em IS DISTINCT FROM NEW.fechado_em)) THEN
    v_tipo := 'finalizado';
    v_evento_desc := 'Chamado finalizado como ' || NEW.status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_tipo := 'status';
    v_evento_desc := 'Status alterado de ' || COALESCE(OLD.status, 'Aberto') || ' para ' || NEW.status;
  ELSIF NEW.sla_pausado IS DISTINCT FROM OLD.sla_pausado THEN
    IF NEW.sla_pausado THEN
      v_tipo := 'sla_pausado';
      v_evento_desc := 'SLA pausado: ' || COALESCE(NEW.sla_pausa_motivo, 'Aguardando');
    ELSE
      v_tipo := 'sla_retomado';
      v_evento_desc := 'SLA retomado pelo suporte';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Respeita preferência do usuário (opt-out)
  IF NOT public.usuario_deseja_alertas_email(v_destinatario) THEN
    RETURN NEW;
  END IF;

  -- Respeita regras do painel de administração
  IF NOT public.alerta_email_habilitado_nas_regras(v_tipo) THEN
    RETURN NEW;
  END IF;

  -- Prepara dados do evento com fuso America/Cuiaba
  v_dados := jsonb_build_object(
    'numero', NEW.id,
    'titulo', COALESCE(NEW.descricao, 'Chamado #' || NEW.id),
    'status', NEW.status,
    'prioridade', NEW.prioridade,
    'setor', NEW.setor,
    'local', COALESCE(NEW.local, ''),
    'prazo', COALESCE(NEW.fechado_em::text, NEW.aberto_em::text),
    'resposta', COALESCE(NEW.procedimento, 'Atualização realizada pela equipe de suporte.'),
    'evento_desc', v_evento_desc,
    'atualizado_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
  );

  -- Regra de agregação de até 3 minutos por chamado (idempotência na fila)
  SELECT id INTO v_pendente_id
  FROM public.notificacoes_email
  WHERE ticket_id = NEW.id
    AND destinatario = v_destinatario
    AND status = 'pendente'
    AND agendado_para > now()
  ORDER BY id DESC
  LIMIT 1;

  IF v_pendente_id IS NOT NULL THEN
    UPDATE public.notificacoes_email
    SET
      tipo = CASE WHEN v_tipo = 'finalizado' THEN 'finalizado' ELSE tipo END,
      dados_evento = dados_evento || v_dados,
      updated_at = now()
    WHERE id = v_pendente_id;
  ELSE
    INSERT INTO public.notificacoes_email (
      ticket_id,
      destinatario,
      tipo,
      status,
      dados_evento,
      agendado_para
    ) VALUES (
      NEW.id,
      v_destinatario,
      v_tipo,
      'pendente',
      v_dados,
      now() + interval '3 minutes'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao enfileirar notificação de e-mail para ticket %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_notificacao_email ON public.tickets;
CREATE TRIGGER trg_ticket_notificacao_email
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_ticket_notificacao_email();

-- 6. TRIGGER FUNCTION: NOVAS MENSAGENS DA EQUIPE
CREATE OR REPLACE FUNCTION public.fn_trigger_mensagem_notificacao_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_destinatario text;
  v_pendente_id bigint;
  v_dados jsonb;
BEGIN
  -- Apenas mensagens da equipe ou sistema notificam o solicitante
  IF NEW.autor_tipo = 'solicitante' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = NEW.ticket_id LIMIT 1;
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_destinatario := btrim(COALESCE(v_ticket.solicitante_email, ''));
  IF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
    RETURN NEW;
  END IF;

  -- Se o autor da mensagem tiver o mesmo e-mail do solicitante, não envia
  IF lower(btrim(NEW.autor_email)) = lower(v_destinatario) THEN
    RETURN NEW;
  END IF;

  -- Respeita preferência do usuário (opt-out)
  IF NOT public.usuario_deseja_alertas_email(v_destinatario) THEN
    RETURN NEW;
  END IF;

  -- Respeita regras do painel de administração
  IF NOT public.alerta_email_habilitado_nas_regras('mensagem') THEN
    RETURN NEW;
  END IF;

  v_dados := jsonb_build_object(
    'numero', v_ticket.id,
    'titulo', COALESCE(v_ticket.descricao, 'Chamado #' || v_ticket.id),
    'status', v_ticket.status,
    'prioridade', v_ticket.prioridade,
    'setor', v_ticket.setor,
    'local', COALESCE(v_ticket.local, ''),
    'resposta', NEW.mensagem,
    'autor_resposta', NEW.autor_nome,
    'evento_desc', 'Nova resposta da equipe de suporte (' || NEW.autor_nome || ')',
    'atualizado_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
  );

  -- Regra de agregação de até 3 minutos por chamado
  SELECT id INTO v_pendente_id
  FROM public.notificacoes_email
  WHERE ticket_id = v_ticket.id
    AND destinatario = v_destinatario
    AND status = 'pendente'
    AND agendado_para > now()
  ORDER BY id DESC
  LIMIT 1;

  IF v_pendente_id IS NOT NULL THEN
    UPDATE public.notificacoes_email
    SET
      dados_evento = dados_evento || v_dados,
      updated_at = now()
    WHERE id = v_pendente_id;
  ELSE
    INSERT INTO public.notificacoes_email (
      ticket_id,
      destinatario,
      tipo,
      status,
      dados_evento,
      agendado_para
    ) VALUES (
      v_ticket.id,
      v_destinatario,
      'mensagem',
      'pendente',
      v_dados,
      now() + interval '3 minutes'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao enfileirar notificação de mensagem para ticket %: %', NEW.ticket_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensagem_notificacao_email ON public.ticket_mensagens;
CREATE TRIGGER trg_mensagem_notificacao_email
  AFTER INSERT ON public.ticket_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_mensagem_notificacao_email();

-- 7. SEGURANÇA E POLÍTICAS RLS
ALTER TABLE public.notificacoes_email ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_email_admin_select" ON public.notificacoes_email;
CREATE POLICY "notificacoes_email_admin_select" ON public.notificacoes_email
  FOR SELECT TO authenticated
  USING (
    public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "notificacoes_email_admin_modify" ON public.notificacoes_email;
CREATE POLICY "notificacoes_email_admin_modify" ON public.notificacoes_email
  FOR ALL TO authenticated
  USING (
    public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
  );

GRANT ALL ON public.notificacoes_email TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.notificacoes_email TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.notificacoes_email_id_seq TO authenticated, service_role;

-- 8. RPC FUNCTIONS

-- 8.1 Listar últimos logs (somente gestores e admins)
CREATE OR REPLACE FUNCTION public.get_email_notification_logs(p_limite integer DEFAULT 100)
RETURNS TABLE (
  id bigint,
  ticket_id bigint,
  destinatario text,
  tipo text,
  status text,
  tentativas integer,
  erro_mensagem text,
  dados_evento jsonb,
  agendado_para timestamptz,
  enviado_em timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores ou administradores podem visualizar o log de e-mails.';
  END IF;

  RETURN QUERY
  SELECT
    ne.id,
    ne.ticket_id,
    ne.destinatario,
    ne.tipo,
    ne.status,
    ne.tentativas,
    ne.erro_mensagem,
    ne.dados_evento,
    ne.agendado_para,
    ne.enviado_em,
    ne.created_at
  FROM public.notificacoes_email ne
  ORDER BY ne.id DESC
  LIMIT LEAST(p_limite, 200);
END;
$$;

-- 8.2 Obter notificações pendentes para disparo
CREATE OR REPLACE FUNCTION public.get_pending_email_notifications(p_limite integer DEFAULT 20)
RETURNS TABLE (
  id bigint,
  ticket_id bigint,
  destinatario text,
  tipo text,
  status text,
  tentativas integer,
  dados_evento jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.id,
    ne.ticket_id,
    ne.destinatario,
    ne.tipo,
    ne.status,
    ne.tentativas,
    ne.dados_evento
  FROM public.notificacoes_email ne
  WHERE ne.status = 'pendente'
    AND ne.agendado_para <= now()
    AND ne.tentativas < 3
  ORDER BY ne.agendado_para ASC
  LIMIT p_limite;
END;
$$;

-- 8.3 Marcar resultado do disparo
CREATE OR REPLACE FUNCTION public.mark_email_notification_result(
  p_id bigint,
  p_status text,
  p_erro text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notificacoes_email
  SET
    status = p_status,
    tentativas = tentativas + 1,
    erro_mensagem = p_erro,
    enviado_em = CASE WHEN p_status = 'enviado' THEN now() ELSE enviado_em END,
    agendado_para = CASE WHEN p_status = 'erro' THEN now() + interval '5 minutes' ELSE agendado_para END,
    updated_at = now()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

-- 8.4 Enfileirar e-mail de teste
CREATE OR REPLACE FUNCTION public.enqueue_test_email(p_destinatario text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id bigint;
  v_ticket_id bigint;
BEGIN
  IF NOT (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas gestores ou administradores podem disparar e-mails de teste.';
  END IF;

  SELECT id INTO v_ticket_id FROM public.tickets ORDER BY id DESC LIMIT 1;
  IF v_ticket_id IS NULL THEN
    v_ticket_id := 1;
  END IF;

  INSERT INTO public.notificacoes_email (
    ticket_id,
    destinatario,
    tipo,
    status,
    dados_evento,
    agendado_para
  ) VALUES (
    v_ticket_id,
    btrim(p_destinatario),
    'teste',
    'pendente',
    jsonb_build_object(
      'numero', v_ticket_id,
      'titulo', 'Chamado de Teste - TI SENAI LRV',
      'status', 'Em atendimento',
      'prioridade', 'Média',
      'prazo', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI'),
      'resposta', 'Este é um e-mail de teste disparado pelo Painel de Ajustes para validar a integração.',
      'evento_desc', 'Disparo manual de teste pelo gestor',
      'atualizado_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
    ),
    now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 8.5 Atualizar preferências de notificação do usuário
CREATE OR REPLACE FUNCTION public.set_user_email_notifications(p_ativo boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid;
  v_email text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  v_email := auth.jwt()->>'email';

  INSERT INTO public.user_profiles (id, email, notificacoes_email_ativas, updated_at)
  VALUES (v_uid, COALESCE(v_email, ''), p_ativo, now())
  ON CONFLICT (id) DO UPDATE
  SET
    notificacoes_email_ativas = EXCLUDED.notificacoes_email_ativas,
    updated_at = now();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_notification_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_email_notifications(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_email_notification_result(bigint, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_test_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_email_notifications(boolean) TO authenticated;
