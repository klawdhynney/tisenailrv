-- ============================================================================
-- MIGRATION: 20261012020000_novo_sistema_alertas_email_solicitantes.sql
-- Novo Sistema de Alertas por E-mail para Solicitantes (TI SENAI LRV).
-- Eventos: Aberto, Atualizado (com agrupamento de 5min) e Finalizado.
-- Destinatário exclusivo: solicitante do chamado.
-- Idempotência, proteção de retroatividade, logs com RLS e preferências de usuário.
-- 100% resiliente: cria tabelas auxiliares se não existirem e previne erros de relacionamento.
-- ============================================================================

-- 1. TABELA DE FILA E LOGS DE ALERTAS (alertas_email_fila)
CREATE TABLE IF NOT EXISTS public.alertas_email_fila (
  id bigserial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  destinatario text NOT NULL,
  evento text NOT NULL CHECK (evento IN ('aberto', 'atualizado', 'finalizado', 'teste')),
  assunto text NOT NULL,
  dados_evento jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'falha', 'ignorado')),
  motivo_ignorado text,
  tentativas integer NOT NULL DEFAULT 0,
  max_tentativas integer NOT NULL DEFAULT 5,
  proxima_tentativa timestamptz NOT NULL DEFAULT now(),
  erro_detalhes text,
  provider_message_id text,
  idempotency_key text NOT NULL UNIQUE,
  agendado_para timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de desempenho
CREATE INDEX IF NOT EXISTS idx_alertas_email_fila_status_agendado 
  ON public.alertas_email_fila(status, agendado_para) 
  WHERE status IN ('pendente', 'processando');
CREATE INDEX IF NOT EXISTS idx_alertas_email_fila_ticket_id 
  ON public.alertas_email_fila(ticket_id);
CREATE INDEX IF NOT EXISTS idx_alertas_email_fila_destinatario_hora 
  ON public.alertas_email_fila(destinatario, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_email_fila_created_at 
  ON public.alertas_email_fila(created_at DESC);

-- 2. COLUNAS DE PREFERÊNCIAS INDIVIDUAIS EM USER_PROFILES
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS alerta_email_aberto boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS alerta_email_atualizado boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS alerta_email_finalizado boolean NOT NULL DEFAULT true;

-- 3. FUNÇÃO AUXILIAR: VERIFICA SE O USUÁRIO DESEJA ESSE TIPO ESPECÍFICO DE ALERTA
CREATE OR REPLACE FUNCTION public.usuario_aceita_alerta_email(p_email text, p_evento text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec record;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN false;
  END IF;

  SELECT alerta_email_aberto, alerta_email_atualizado, alerta_email_finalizado
  INTO v_rec
  FROM public.user_profiles
  WHERE lower(btrim(email)) = lower(btrim(p_email))
  LIMIT 1;

  IF v_rec IS NULL THEN
    RETURN true; -- Padrão ligado se não houver perfil cadastrado ainda
  END IF;

  IF p_evento = 'aberto' THEN
    RETURN COALESCE(v_rec.alerta_email_aberto, true);
  ELSIF p_evento = 'atualizado' THEN
    RETURN COALESCE(v_rec.alerta_email_atualizado, true);
  ELSIF p_evento = 'finalizado' THEN
    RETURN COALESCE(v_rec.alerta_email_finalizado, true);
  END IF;

  RETURN true;
END;
$$;

-- 4. FUNÇÃO TRIGGER: EVENTOS DE TICKETS (ABERTO, ATUALIZADO, FINALIZADO)
CREATE OR REPLACE FUNCTION public.fn_trigger_alertas_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cfg jsonb;
  v_ativo boolean;
  v_inicio timestamptz;
  v_destinatario text;
  v_evento text;
  v_assunto text;
  v_dados jsonb;
  v_idempotency text;
  v_status text := 'pendente';
  v_motivo_ignorado text := NULL;
  v_agendado timestamptz := now();
  v_pendente_id bigint;
  v_evento_habilitado boolean;
  v_usuario_aceita boolean;
  v_janela_minutos integer := 5;
BEGIN
  -- 1. Obter configurações do sistema
  SELECT regras -> 'alertasEmailSolicitante' INTO v_cfg FROM public.configuracoes WHERE id = 1 LIMIT 1;
  IF v_cfg IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_ativo := COALESCE((v_cfg ->> 'ativo')::boolean, false);
  IF (v_cfg ->> 'sistemaAtivoAPartirDe') IS NOT NULL THEN
    BEGIN
      v_inicio := (v_cfg ->> 'sistemaAtivoAPartirDe')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_inicio := now();
    END;
  ELSE
    v_inicio := now();
  END IF;

  IF (v_cfg ->> 'janelaAgrupamentoMinutos') IS NOT NULL THEN
    BEGIN
      v_janela_minutos := GREATEST(1, LEAST(60, (v_cfg ->> 'janelaAgrupamentoMinutos')::integer));
    EXCEPTION WHEN OTHERS THEN
      v_janela_minutos := 5;
    END;
  END IF;

  -- =========================================================================
  -- CASO 1: INSERT DE NOVO CHAMADO (EVENTO: ABERTO)
  -- =========================================================================
  IF (TG_OP = 'INSERT') THEN
    -- Não enviar para chamados importados com data anterior à ativação do sistema
    IF COALESCE(NEW.created_at, now()) < v_inicio THEN
      RETURN NEW;
    END IF;

    v_evento := 'aberto';
    v_destinatario := btrim(COALESCE(NEW.solicitante_email, ''));
    v_assunto := 'Chamado #' || NEW.id || ' aberto';
    v_idempotency := 'ticket_' || NEW.id || '_aberto';

    v_evento_habilitado := COALESCE((v_cfg -> 'eventos' ->> 'aberto')::boolean, true);
    v_usuario_aceita := public.usuario_aceita_alerta_email(v_destinatario, 'aberto');

    IF NOT v_ativo THEN
      v_status := 'ignorado';
      v_motivo_ignorado := 'Sistema de alertas de e-mail está desativado nas configurações.';
    ELSIF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
      v_status := 'ignorado';
      v_motivo_ignorado := 'E-mail do solicitante não informado ou inválido.';
    ELSIF NOT v_evento_habilitado THEN
      v_status := 'ignorado';
      v_motivo_ignorado := 'Evento de abertura desativado nas configurações globais.';
    ELSIF NOT v_usuario_aceita THEN
      v_status := 'ignorado';
      v_motivo_ignorado := 'Usuário desativou notificações de abertura em suas preferências.';
    END IF;

    v_dados := jsonb_build_object(
      'numero', NEW.id,
      'descricao', substring(COALESCE(NEW.descricao, '') from 1 for 300),
      'solicitante', NEW.solicitante,
      'setor', NEW.setor,
      'prioridade', NEW.prioridade,
      'status', NEW.status,
      'local', COALESCE(NEW.local, ''),
      'aberto_em', to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI'),
      'prazo', COALESCE(NEW.fechado_em::text, NEW.aberto_em::text, '-')
    );

    INSERT INTO public.alertas_email_fila (
      ticket_id, destinatario, evento, assunto, dados_evento, status, motivo_ignorado, idempotency_key, agendado_para
    ) VALUES (
      NEW.id, v_destinatario, v_evento, v_assunto, v_dados, v_status, v_motivo_ignorado, v_idempotency, now()
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN NEW;
  END IF;

  -- =========================================================================
  -- CASO 2: UPDATE DE CHAMADO EXISTENTE (FINALIZADO OU ATUALIZADO)
  -- =========================================================================
  IF (TG_OP = 'UPDATE') THEN
    -- Não enviar se o chamado foi aberto antes do início do sistema
    IF COALESCE(NEW.created_at, now()) < v_inicio THEN
      RETURN NEW;
    END IF;

    v_destinatario := btrim(COALESCE(NEW.solicitante_email, ''));

    -- SUB-CASO 2.1: CHAMADO FINALIZADO
    IF (NEW.status IN ('Resolvido', 'Concluído', 'Finalizado') AND OLD.status NOT IN ('Resolvido', 'Concluído', 'Finalizado')) THEN
      v_evento := 'finalizado';
      v_assunto := 'Chamado #' || NEW.id || ' finalizado';
      v_idempotency := 'ticket_' || NEW.id || '_finalizado_' || COALESCE(to_char(NEW.fechado_em, 'YYYYMMDDHH24MISS'), to_char(now(), 'YYYYMMDDHH24MISS'));

      v_evento_habilitado := COALESCE((v_cfg -> 'eventos' ->> 'finalizado')::boolean, true);
      v_usuario_aceita := public.usuario_aceita_alerta_email(v_destinatario, 'finalizado');

      IF NOT v_ativo THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Sistema de alertas de e-mail está desativado nas configurações.';
      ELSIF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'E-mail do solicitante não informado ou inválido.';
      ELSIF NOT v_evento_habilitado THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Evento de finalização desativado nas configurações globais.';
      ELSIF NOT v_usuario_aceita THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Usuário desativou notificações de finalização em suas preferências.';
      END IF;

      v_dados := jsonb_build_object(
        'numero', NEW.id,
        'descricao', substring(COALESCE(NEW.descricao, '') from 1 for 300),
        'solicitante', NEW.solicitante,
        'setor', NEW.setor,
        'prioridade', NEW.prioridade,
        'status', 'Finalizado',
        'procedimento', COALESCE(NEW.procedimento, 'Atendimento finalizado com sucesso pela equipe de TI.'),
        'finalizado_em', to_char(COALESCE(NEW.fechado_em::timestamp, now()) AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
      );

      -- Cancela atualizações pendentes que ainda estivessem aguardando na janela de 5min
      UPDATE public.alertas_email_fila
      SET status = 'ignorado', motivo_ignorado = 'Substituído por aviso de chamado finalizado.'
      WHERE ticket_id = NEW.id AND status = 'pendente';

      INSERT INTO public.alertas_email_fila (
        ticket_id, destinatario, evento, assunto, dados_evento, status, motivo_ignorado, idempotency_key, agendado_para
      ) VALUES (
        NEW.id, v_destinatario, v_evento, v_assunto, v_dados, v_status, v_motivo_ignorado, v_idempotency, now()
      ) ON CONFLICT (idempotency_key) DO NOTHING;

      RETURN NEW;
    END IF;

    -- SUB-CASO 2.2: CHAMADO ATUALIZADO (mudança de status ou procedimento registrado)
    IF (NEW.status IS DISTINCT FROM OLD.status OR (NEW.procedimento IS DISTINCT FROM OLD.procedimento AND NEW.procedimento IS NOT NULL AND btrim(NEW.procedimento) <> '')) THEN
      v_evento := 'atualizado';
      v_assunto := 'Chamado #' || NEW.id || ' atualizado: ' || NEW.status;

      v_evento_habilitado := COALESCE((v_cfg -> 'eventos' ->> 'atualizado')::boolean, true);
      v_usuario_aceita := public.usuario_aceita_alerta_email(v_destinatario, 'atualizado');

      IF NOT v_ativo THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Sistema de alertas de e-mail está desativado nas configurações.';
      ELSIF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'E-mail do solicitante não informado ou inválido.';
      ELSIF NOT v_evento_habilitado THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Evento de atualização desativado nas configurações globais.';
      ELSIF NOT v_usuario_aceita THEN
        v_status := 'ignorado';
        v_motivo_ignorado := 'Usuário desativou notificações de atualização em suas preferências.';
      END IF;

      v_dados := jsonb_build_object(
        'numero', NEW.id,
        'descricao', substring(COALESCE(NEW.descricao, '') from 1 for 300),
        'solicitante', NEW.solicitante,
        'setor', NEW.setor,
        'prioridade', NEW.prioridade,
        'status', NEW.status,
        'status_anterior', OLD.status,
        'resposta', COALESCE(NEW.procedimento, 'Status alterado para ' || NEW.status),
        'atualizado_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
      );

      -- Janela de agrupamento (debouncing de 5 minutos): se já houver item pendente na fila, atualiza e estende a janela
      SELECT id INTO v_pendente_id
      FROM public.alertas_email_fila
      WHERE ticket_id = NEW.id
        AND evento = 'atualizado'
        AND status = 'pendente'
        AND agendado_para > now()
      ORDER BY id DESC LIMIT 1;

      IF v_pendente_id IS NOT NULL THEN
        UPDATE public.alertas_email_fila
        SET
          assunto = v_assunto,
          dados_evento = v_dados,
          agendado_para = now() + (v_janela_minutos || ' minutes')::interval,
          updated_at = now()
        WHERE id = v_pendente_id;
      ELSE
        v_idempotency := 'ticket_' || NEW.id || '_atualizado_' || to_char(now(), 'YYYYMMDDHH24MI');
        INSERT INTO public.alertas_email_fila (
          ticket_id, destinatario, evento, assunto, dados_evento, status, motivo_ignorado, idempotency_key, agendado_para
        ) VALUES (
          NEW.id, v_destinatario, v_evento, v_assunto, v_dados, v_status, v_motivo_ignorado, v_idempotency,
          CASE WHEN v_status = 'pendente' THEN now() + (v_janela_minutos || ' minutes')::interval ELSE now() END
        ) ON CONFLICT (idempotency_key) DO NOTHING;
      END IF;

      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao processar alerta de e-mail para ticket %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alertas_ticket_eventos ON public.tickets;
CREATE TRIGGER trg_alertas_ticket_eventos
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_alertas_ticket();

-- ============================================================================
-- 5. TABELA DE MENSAGENS / CHAT (ticket_mensagens) E TRIGGER DE ATUALIZAÇÃO
-- ============================================================================
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

ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens(ticket_id, criado_em ASC);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_user_id ON public.ticket_mensagens(user_id);
GRANT SELECT, INSERT ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;

-- Função trigger para mensagens da equipe no chat
CREATE OR REPLACE FUNCTION public.fn_trigger_alertas_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cfg jsonb;
  v_ativo boolean;
  v_inicio timestamptz;
  v_ticket public.tickets%ROWTYPE;
  v_destinatario text;
  v_assunto text;
  v_dados jsonb;
  v_idempotency text;
  v_status text := 'pendente';
  v_motivo_ignorado text := NULL;
  v_pendente_id bigint;
  v_janela_minutos integer := 5;
BEGIN
  -- NUNCA notificar se quem enviou a mensagem foi o próprio solicitante
  IF (NEW.autor_tipo = 'solicitante') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = NEW.ticket_id LIMIT 1;
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT regras -> 'alertasEmailSolicitante' INTO v_cfg FROM public.configuracoes WHERE id = 1 LIMIT 1;
  IF v_cfg IS NULL THEN
    RETURN NEW;
  END IF;

  v_ativo := COALESCE((v_cfg ->> 'ativo')::boolean, false);
  IF (v_cfg ->> 'sistemaAtivoAPartirDe') IS NOT NULL THEN
    BEGIN
      v_inicio := (v_cfg ->> 'sistemaAtivoAPartirDe')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_inicio := now();
    END;
  ELSE
    v_inicio := now();
  END IF;

  -- Não disparar para chamados anteriores à data de início do sistema
  IF COALESCE(v_ticket.created_at, now()) < v_inicio THEN
    RETURN NEW;
  END IF;

  v_destinatario := btrim(COALESCE(v_ticket.solicitante_email, ''));

  -- Se autor da mensagem tiver o mesmo email do solicitante, ignorar
  IF lower(btrim(COALESCE(NEW.autor_email, ''))) = lower(v_destinatario) THEN
    RETURN NEW;
  END IF;

  IF (v_cfg ->> 'janelaAgrupamentoMinutos') IS NOT NULL THEN
    BEGIN
      v_janela_minutos := GREATEST(1, LEAST(60, (v_cfg ->> 'janelaAgrupamentoMinutos')::integer));
    EXCEPTION WHEN OTHERS THEN
      v_janela_minutos := 5;
    END;
  END IF;

  v_assunto := 'Chamado #' || v_ticket.id || ' atualizado: Nova resposta do suporte';

  IF NOT v_ativo THEN
    v_status := 'ignorado';
    v_motivo_ignorado := 'Sistema de alertas de e-mail está desativado nas configurações.';
  ELSIF v_destinatario = '' OR v_destinatario NOT LIKE '%@%' THEN
    v_status := 'ignorado';
    v_motivo_ignorado := 'E-mail do solicitante não informado ou inválido.';
  ELSIF NOT COALESCE((v_cfg -> 'eventos' ->> 'atualizado')::boolean, true) THEN
    v_status := 'ignorado';
    v_motivo_ignorado := 'Evento de atualização desativado nas configurações globais.';
  ELSIF NOT public.usuario_aceita_alerta_email(v_destinatario, 'atualizado') THEN
    v_status := 'ignorado';
    v_motivo_ignorado := 'Usuário desativou notificações de atualização em suas preferências.';
  END IF;

  v_dados := jsonb_build_object(
    'numero', v_ticket.id,
    'descricao', substring(COALESCE(v_ticket.descricao, '') from 1 for 300),
    'solicitante', v_ticket.solicitante,
    'setor', v_ticket.setor,
    'prioridade', v_ticket.prioridade,
    'status', v_ticket.status,
    'resposta', substring(COALESCE(NEW.mensagem, '') from 1 for 300),
    'autor_resposta', COALESCE(NEW.autor_nome, 'Equipe de TI'),
    'atualizado_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI')
  );

  -- Debounce de 5 minutos
  SELECT id INTO v_pendente_id
  FROM public.alertas_email_fila
  WHERE ticket_id = v_ticket.id
    AND evento = 'atualizado'
    AND status = 'pendente'
    AND agendado_para > now()
  ORDER BY id DESC LIMIT 1;

  IF v_pendente_id IS NOT NULL THEN
    UPDATE public.alertas_email_fila
    SET
      assunto = v_assunto,
      dados_evento = v_dados,
      agendado_para = now() + (v_janela_minutos || ' minutes')::interval,
      updated_at = now()
    WHERE id = v_pendente_id;
  ELSE
    v_idempotency := 'ticket_' || v_ticket.id || '_msg_' || NEW.id;
    INSERT INTO public.alertas_email_fila (
      ticket_id, destinatario, evento, assunto, dados_evento, status, motivo_ignorado, idempotency_key, agendado_para
    ) VALUES (
      v_ticket.id, v_destinatario, 'atualizado', v_assunto, v_dados, v_status, v_motivo_ignorado, v_idempotency,
      CASE WHEN v_status = 'pendente' THEN now() + (v_janela_minutos || ' minutes')::interval ELSE now() END
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao enfileirar alerta de mensagem para chamado %: %', NEW.ticket_id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger resiliente para ticket_mensagens
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_mensagens') THEN
    DROP TRIGGER IF EXISTS trg_alertas_mensagem_eventos ON public.ticket_mensagens;
    CREATE TRIGGER trg_alertas_mensagem_eventos
      AFTER INSERT ON public.ticket_mensagens
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_trigger_alertas_mensagem();
  END IF;
END $$;

-- ============================================================================
-- 6. SEGURANÇA E POLÍTICAS RLS (alertas_email_fila)
-- ============================================================================
ALTER TABLE public.alertas_email_fila ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_email_fila_admin_select" ON public.alertas_email_fila;
CREATE POLICY "alertas_email_fila_admin_select" ON public.alertas_email_fila
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor'::text)
    OR public.has_role(auth.uid(), 'admin'::text)
  );

GRANT ALL ON public.alertas_email_fila TO service_role;
GRANT SELECT ON public.alertas_email_fila TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'alertas_email_fila_id_seq') THEN
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.alertas_email_fila_id_seq TO authenticated, service_role';
  END IF;
END $$;

-- ============================================================================
-- 7. RPCS PARA ADMINISTRAÇÃO E PROCESSAMENTO
-- ============================================================================

-- 7.1 Listar logs com filtros
CREATE OR REPLACE FUNCTION public.get_email_alertas_logs(
  p_limite integer DEFAULT 50,
  p_filtro_status text DEFAULT NULL,
  p_filtro_evento text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  ticket_id integer,
  destinatario text,
  evento text,
  assunto text,
  status text,
  motivo_ignorado text,
  tentativas integer,
  max_tentativas integer,
  erro_detalhes text,
  provider_message_id text,
  agendado_para timestamptz,
  enviado_em timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor'::text)
    OR public.has_role(auth.uid(), 'admin'::text)
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores e administradores podem visualizar o log de alertas.';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.ticket_id,
    f.destinatario,
    f.evento,
    f.assunto,
    f.status,
    f.motivo_ignorado,
    f.tentativas,
    f.max_tentativas,
    f.erro_detalhes,
    f.provider_message_id,
    f.agendado_para,
    f.enviado_em,
    f.created_at
  FROM public.alertas_email_fila f
  WHERE (p_filtro_status IS NULL OR p_filtro_status = 'todos' OR f.status = p_filtro_status)
    AND (p_filtro_evento IS NULL OR p_filtro_evento = 'todos' OR f.evento = p_filtro_evento)
  ORDER BY f.id DESC
  LIMIT LEAST(p_limite, 200);
END;
$$;

-- 7.2 Reenviar alerta que falhou
CREATE OR REPLACE FUNCTION public.reenviar_email_alerta_falha(p_log_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor'::text)
    OR public.has_role(auth.uid(), 'admin'::text)
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE public.alertas_email_fila
  SET
    status = 'pendente',
    tentativas = 0,
    agendado_para = now(),
    proxima_tentativa = now(),
    erro_detalhes = NULL,
    updated_at = now()
  WHERE id = p_log_id AND status = 'falha';

  RETURN FOUND;
END;
$$;

-- 7.3 Disparo de teste manual imediato (restrito ao administrador)
CREATE OR REPLACE FUNCTION public.enviar_email_alerta_teste(p_destinatario text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id bigint;
  v_ticket_id integer;
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor'::text)
    OR public.has_role(auth.uid(), 'admin'::text)
  ) THEN
    RAISE EXCEPTION 'Acesso restrito a gestores e administradores.';
  END IF;

  SELECT id INTO v_ticket_id FROM public.tickets ORDER BY id DESC LIMIT 1;
  IF v_ticket_id IS NULL THEN
    v_ticket_id := 1;
  END IF;

  INSERT INTO public.alertas_email_fila (
    ticket_id,
    destinatario,
    evento,
    assunto,
    dados_evento,
    status,
    agendado_para,
    idempotency_key
  ) VALUES (
    v_ticket_id,
    btrim(p_destinatario),
    'teste',
    'Chamado de Teste - TI SENAI LRV',
    jsonb_build_object(
      'numero', v_ticket_id,
      'descricao', 'Disparo de verificação do sistema de alertas por e-mail para solicitantes.',
      'solicitante', 'Administrador do Sistema',
      'setor', 'Tecnologia da Informação',
      'prioridade', 'Alta',
      'status', 'Em atendimento',
      'local', 'TI Central',
      'aberto_em', to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI'),
      'resposta', 'Este é um e-mail de teste para validar a entrega no domínio institucional.'
    ),
    'pendente',
    now(),
    'teste_' || gen_random_uuid()::text
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 7.4 Atualizar preferências de alerta do próprio usuário
CREATE OR REPLACE FUNCTION public.update_my_email_alert_preferences(
  p_aberto boolean,
  p_atualizado boolean,
  p_finalizado boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_profiles
  SET
    alerta_email_aberto = p_aberto,
    alerta_email_atualizado = p_atualizado,
    alerta_email_finalizado = p_finalizado,
    updated_at = now()
  WHERE id = v_uid;

  RETURN FOUND;
END;
$$;

-- 7.5 Processar fila e reclamar itens pendentes de forma atômica
CREATE OR REPLACE FUNCTION public.reclamar_itens_fila_alertas(p_limite integer DEFAULT 10)
RETURNS TABLE (
  id bigint,
  ticket_id integer,
  destinatario text,
  evento text,
  assunto text,
  dados_evento jsonb,
  tentativas integer,
  idempotency_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.alertas_email_fila f
  SET
    status = 'processando',
    updated_at = now()
  WHERE f.id IN (
    SELECT sub.id
    FROM public.alertas_email_fila sub
    WHERE sub.status = 'pendente'
      AND sub.agendado_para <= now()
      AND sub.tentativas < sub.max_tentativas
    ORDER BY sub.agendado_para ASC
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    f.id,
    f.ticket_id,
    f.destinatario,
    f.evento,
    f.assunto,
    f.dados_evento,
    f.tentativas,
    f.idempotency_key;
END;
$$;

-- 7.6 Finalizar processamento de um item da fila
CREATE OR REPLACE FUNCTION public.concluir_processamento_alerta(
  p_id bigint,
  p_sucesso boolean,
  p_message_id text DEFAULT NULL,
  p_erro text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tentativas integer;
  v_max integer;
BEGIN
  SELECT tentativas + 1, max_tentativas INTO v_tentativas, v_max
  FROM public.alertas_email_fila
  WHERE id = p_id;

  IF v_tentativas IS NULL THEN
    v_tentativas := 1;
    v_max := 5;
  END IF;

  IF p_sucesso THEN
    UPDATE public.alertas_email_fila
    SET
      status = 'enviado',
      tentativas = v_tentativas,
      provider_message_id = p_message_id,
      enviado_em = now(),
      erro_detalhes = NULL,
      updated_at = now()
    WHERE id = p_id;
  ELSE
    UPDATE public.alertas_email_fila
    SET
      status = CASE WHEN v_tentativas >= v_max THEN 'falha' ELSE 'pendente' END,
      tentativas = v_tentativas,
      erro_detalhes = p_erro,
      agendado_para = now() + ((v_tentativas * 3) || ' minutes')::interval,
      proxima_tentativa = now() + ((v_tentativas * 3) || ' minutes')::interval,
      updated_at = now()
    WHERE id = p_id;
  END IF;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_alertas_logs(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reenviar_email_alerta_falha(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_email_alerta_teste(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_email_alert_preferences(boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reclamar_itens_fila_alertas(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.concluir_processamento_alerta(bigint, boolean, text, text) TO authenticated, service_role;
