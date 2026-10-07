-- ============================================================================
-- ARQUIVO CONSOLIDADO DE MIGRAÇÕES PENDENTES - TI SENAI LRV
-- Destino: Supabase / Lovable Cloud (SQL Editor)
--
-- CARACTERÍSTICAS DESTE SCRIPT:
-- 1. 100% Idempotente: pode ser executado repetidas vezes sem erros.
-- 2. Não destrutivo: não apaga dados reais, chamados nem tabelas existentes.
-- 3. RLS Seguro: sem recursão infinita (funções SECURITY DEFINER e checagens seguras).
-- 4. Abrange todas as migrações pendentes:
--    - Módulo 1: Perfis, Usuários, Papéis e Administradores Iniciais
--    - Módulo 2: SLA Pausado e Histórico de Pausas em Chamados
--    - Módulo 3: Chat Interativo de Chamados (ticket_mensagens)
--    - Módulo 4: Busca Textual para IA de Suporte (buscar_chamados_resolvidos_semelhantes)
--    - Módulo 5: Configurações de IA em 3 Abas, WhatsApp e Capa
--    - Módulo 6: Avaliações de Chamados e Estatísticas Agregadas Públicas
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- MÓDULO 1: PERFIS, PAPÉIS, AUDITORIA E ADMINS
-- ============================================================================

-- 1.1 Tipo app_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('gestor', 'admin', 'usuario');
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
      ALTER TYPE public.app_role ADD VALUE 'admin';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'usuario' AND enumtypid = 'public.app_role'::regtype) THEN
      ALTER TYPE public.app_role ADD VALUE 'usuario';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gestor' AND enumtypid = 'public.app_role'::regtype) THEN
      ALTER TYPE public.app_role ADD VALUE 'gestor';
    END IF;
  END IF;
END $$;

-- 1.2 Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Funções fundamentais de verificação de papéis (SECURITY DEFINER para evitar recursão no RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    RETURN true;
  END IF;

  RETURN public.has_role(auth.uid(), 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_named_manager()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    RETURN true;
  END IF;

  RETURN public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_named_manager() OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_named_manager() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gestor_or_admin() TO anon, authenticated, service_role;

-- Políticas RLS em user_roles
DROP POLICY IF EXISTS "Ver o proprio papel" ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia papeis" ON public.user_roles;

CREATE POLICY "Ver o proprio papel" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin gerencia papeis" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 1.4 Tabela user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  nome text,
  foto_url text,
  bloqueado boolean NOT NULL DEFAULT false,
  ultimo_acesso timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated, service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem proprio perfil ou admin ve todos" ON public.user_profiles;
CREATE POLICY "Usuarios veem proprio perfil ou admin ve todos" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_gestor_or_admin());

DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil ou admin atualiza" ON public.user_profiles;
CREATE POLICY "Usuarios atualizam proprio perfil ou admin atualiza" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Usuarios inserem proprio perfil" ON public.user_profiles;
CREATE POLICY "Usuarios inserem proprio perfil" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- 1.5 Tabela pre_registered_roles (pré-cadastro de perfis por email)
CREATE TABLE IF NOT EXISTS public.pre_registered_roles (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_registered_roles TO authenticated, service_role;
ALTER TABLE public.pre_registered_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam pre cadastros" ON public.pre_registered_roles;
CREATE POLICY "Admins gerenciam pre cadastros" ON public.pre_registered_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 1.6 Tabela audit_logs_usuarios
CREATE TABLE IF NOT EXISTS public.audit_logs_usuarios (
  id serial PRIMARY KEY,
  admin_id uuid NOT NULL,
  admin_email text,
  alvo_email text NOT NULL,
  alvo_user_id uuid,
  acao text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs_usuarios TO authenticated, service_role;
ALTER TABLE public.audit_logs_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins veem logs de auditoria" ON public.audit_logs_usuarios;
CREATE POLICY "Admins veem logs de auditoria" ON public.audit_logs_usuarios
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins inserem logs de auditoria" ON public.audit_logs_usuarios;
CREATE POLICY "Admins inserem logs de auditoria" ON public.audit_logs_usuarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR auth.uid() = admin_id);

-- 1.7 Sincronização de perfil e reivindicação de papéis
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_nome text;
  v_foto text;
  v_pre_role public.app_role;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_nome := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', split_part(v_email, '@', 1));
  v_foto := auth.jwt() -> 'user_metadata' ->> 'avatar_url';

  INSERT INTO public.user_profiles (id, email, nome, foto_url, ultimo_acesso, updated_at)
  VALUES (v_uid, v_email, v_nome, v_foto, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = coalesce(EXCLUDED.nome, public.user_profiles.nome),
    foto_url = coalesce(EXCLUDED.foto_url, public.user_profiles.foto_url),
    ultimo_acesso = now(),
    updated_at = now();

  -- Se for um dos 4 admins autorizados, garante papel admin
  IF v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Verifica se existe pré-cadastro para este e-mail
  SELECT role INTO v_pre_role FROM public.pre_registered_roles WHERE lower(btrim(email)) = v_email LIMIT 1;
  IF v_pre_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_pre_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.pre_registered_roles WHERE lower(btrim(email)) = v_email;
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_uid);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_user_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_manager_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN public.is_named_manager();
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_manager_access() TO authenticated, service_role;

-- 1.8 RPCs de Administração de Usuários
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar a lista de usuários.';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'nome', p.nome,
      'foto_url', p.foto_url,
      'bloqueado', p.bloqueado,
      'ultimo_acesso', p.ultimo_acesso,
      'created_at', p.created_at,
      'role', coalesce((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'gestor' THEN 2 ELSE 3 END LIMIT 1), 'usuario')
    )
  ), '[]'::jsonb)
  INTO v_result
  FROM public.user_profiles p;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_target_user_id uuid,
  p_new_role public.app_role
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_email text;
  v_target_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar papéis.';
  END IF;

  SELECT email INTO v_target_email FROM public.user_profiles WHERE id = p_target_user_id;
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (auth.uid(), v_admin_email, coalesce(v_target_email, p_target_user_id::text), p_target_user_id, 'ALTERAR_PAPEL', jsonb_build_object('novo_papel', p_new_role::text));

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(
  p_target_user_id uuid,
  p_bloquear boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_email text;
  v_admin_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem bloquear/desbloquear usuários.';
  END IF;

  SELECT email INTO v_target_email FROM public.user_profiles WHERE id = p_target_user_id;
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  -- Protege os 4 admins contra bloqueio
  IF p_bloquear AND lower(btrim(coalesce(v_target_email, ''))) IN (
    'klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br'
  ) THEN
    RAISE EXCEPTION 'Não é permitido bloquear um administrador raiz da plataforma.';
  END IF;

  UPDATE public.user_profiles
  SET bloqueado = p_bloquear, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (auth.uid(), v_admin_email, coalesce(v_target_email, p_target_user_id::text), p_target_user_id, CASE WHEN p_bloquear THEN 'BLOQUEAR_USUARIO' ELSE 'DESBLOQUEAR_USUARIO' END, jsonb_build_object('bloqueado', p_bloquear));

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_block(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_pre_register_role(
  p_email text,
  p_role public.app_role
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_email text;
  v_email_limpo text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem pré-cadastrar permissões.';
  END IF;

  v_email_limpo := lower(btrim(p_email));
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  INSERT INTO public.pre_registered_roles (email, role, criado_por)
  VALUES (v_email_limpo, p_role, auth.uid())
  ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, criado_por = EXCLUDED.criado_por;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, acao, detalhes)
  VALUES (auth.uid(), v_admin_email, v_email_limpo, 'PRE_CADASTRAR_PAPEL', jsonb_build_object('papel', p_role::text));

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pre_register_role(text, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_remove_pre_registration(p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email_limpo text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover pré-cadastros.';
  END IF;

  v_email_limpo := lower(btrim(p_email));
  DELETE FROM public.pre_registered_roles WHERE lower(btrim(email)) = v_email_limpo;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_pre_registration(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_audit_logs()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem consultar auditoria.';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'admin_id', admin_id,
      'admin_email', admin_email,
      'alvo_email', alvo_email,
      'alvo_user_id', alvo_user_id,
      'acao', acao,
      'detalhes', detalhes,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.audit_logs_usuarios;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_logs() TO authenticated, service_role;

-- 1.9 Pré-registro dos 4 administradores autorizados
INSERT INTO public.pre_registered_roles (email, role)
VALUES
  ('klaw.com@gmail.com', 'admin'),
  ('klawdhynney@gmail.com', 'admin'),
  ('claudineigoncalvesdelima@hotmail.com', 'admin'),
  ('claudinei.lima@senaimt.ind.br', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- ============================================================================
-- MÓDULO 2: SLA PAUSADO E HISTÓRICO DE PAUSAS NA TABELA TICKETS
-- ============================================================================

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado_em timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_motivo text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_autor text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_historico_pausas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_segundos_pausados_acumulados integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.pause_ticket_sla(
  p_ticket_id integer,
  p_motivo text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_autor text;
  v_agora timestamptz := now();
BEGIN
  IF NOT public.is_gestor_or_admin() THEN
    RAISE EXCEPTION 'Apenas a equipe de gestão de TI pode pausar o SLA do chamado.';
  END IF;

  v_autor := coalesce(nullif(btrim(auth.jwt() ->> 'email'), ''), 'Gestão de TI');

  UPDATE public.tickets
  SET
    sla_pausado = true,
    sla_pausado_em = v_agora,
    sla_pausa_motivo = nullif(btrim(p_motivo), ''),
    sla_pausa_autor = v_autor,
    updated_at = v_agora
  WHERE id = p_ticket_id AND sla_pausado = false;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pause_ticket_sla(integer, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resume_ticket_sla(p_ticket_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket record;
  v_agora timestamptz := now();
  v_delta_segundos integer := 0;
  v_novo_historico jsonb;
BEGIN
  IF NOT public.is_gestor_or_admin() THEN
    RAISE EXCEPTION 'Apenas a equipe de gestão de TI pode retomar o SLA do chamado.';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id;
  IF NOT FOUND OR v_ticket.sla_pausado IS NOT TRUE THEN
    RETURN false;
  END IF;

  IF v_ticket.sla_pausado_em IS NOT NULL THEN
    v_delta_segundos := greatest(0, floor(extract(epoch from (v_agora - v_ticket.sla_pausado_em)))::integer);
  END IF;

  v_novo_historico := coalesce(v_ticket.sla_historico_pausas, '[]'::jsonb) || jsonb_build_object(
    'pausado_em', v_ticket.sla_pausado_em,
    'retomado_em', v_agora,
    'motivo', v_ticket.sla_pausa_motivo,
    'autor', v_ticket.sla_pausa_autor,
    'segundos_pausados', v_delta_segundos
  );

  UPDATE public.tickets
  SET
    sla_pausado = false,
    sla_pausado_em = NULL,
    sla_pausa_motivo = NULL,
    sla_pausa_autor = NULL,
    sla_historico_pausas = v_novo_historico,
    sla_segundos_pausados_acumulados = coalesce(v_ticket.sla_segundos_pausados_acumulados, 0) + v_delta_segundos,
    updated_at = v_agora
  WHERE id = p_ticket_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resume_ticket_sla(integer) TO authenticated, service_role;

-- ============================================================================
-- MÓDULO 3: CHAT DE CHAMADOS (TICKET_MENSAGENS)
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

-- Habilitar Realtime para o chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_mensagens;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignora se publicação supabase_realtime não estiver ativa no cluster
  NULL;
END $$;

-- Migração de notas técnicas existentes em tickets.procedimento para o chat
INSERT INTO public.ticket_mensagens (ticket_id, autor_nome, autor_email, autor_tipo, mensagem, criado_em)
SELECT
  t.id,
  COALESCE(NULLIF(btrim(t.responsavel), ''), 'Equipe de TI SENAI LRV'),
  'suporte@senailrv.local',
  'equipe',
  t.procedimento,
  COALESCE(t.fechado_em::timestamptz, t.aberto_em::timestamptz, now())
FROM public.tickets t
WHERE t.procedimento IS NOT NULL
  AND length(btrim(t.procedimento)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_mensagens tm
    WHERE tm.ticket_id = t.id AND tm.mensagem = t.procedimento
  );

-- RPCs para envio e listagem de mensagens
CREATE OR REPLACE FUNCTION public.list_chat_messages(p_ticket_id integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_has_access boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF public.is_gestor_or_admin() THEN
    v_has_access := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (
          (t.criado_por IS NOT NULL AND t.criado_por = auth.uid())
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
        )
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Acesso negado a este chamado.';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'ticket_id', m.ticket_id,
      'user_id', m.user_id,
      'autor_nome', m.autor_nome,
      'autor_email', m.autor_email,
      'autor_tipo', m.autor_tipo,
      'mensagem', m.mensagem,
      'criado_em', m.criado_em
    ) ORDER BY m.criado_em ASC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.ticket_mensagens m
  WHERE m.ticket_id = p_ticket_id;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_chat_messages(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_ticket_id integer,
  p_mensagem text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_nome text;
  v_tipo text;
  v_is_gestor boolean;
  v_msg_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_nome := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', split_part(v_email, '@', 1));
  v_is_gestor := public.is_gestor_or_admin();

  IF v_is_gestor THEN
    v_tipo := 'equipe';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (
          (t.criado_por IS NOT NULL AND t.criado_por = v_uid)
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_email)
        )
    ) THEN
      RAISE EXCEPTION 'Acesso negado: você não tem permissão para enviar mensagens neste chamado.';
    END IF;
    v_tipo := 'solicitante';
  END IF;

  INSERT INTO public.ticket_mensagens (ticket_id, user_id, autor_nome, autor_email, autor_tipo, mensagem)
  VALUES (p_ticket_id, v_uid, v_nome, v_email, v_tipo, btrim(p_mensagem))
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('success', true, 'id', v_msg_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_chat_message(integer, text) TO authenticated, service_role;

-- ============================================================================
-- MÓDULO 4: BUSCA TEXTUAL PARA IA DE SUPORTE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tickets_busca_resolvidos
  ON public.tickets
  USING gin (to_tsvector('portuguese', coalesce(categoria, '') || ' ' || coalesce(descricao, '')));

CREATE OR REPLACE FUNCTION public.buscar_chamados_resolvidos_semelhantes(
  p_termo text,
  p_categoria text DEFAULT NULL,
  p_ticket_id_atual integer DEFAULT NULL,
  p_limite integer DEFAULT 5
)
RETURNS TABLE (
  id integer,
  categoria text,
  titulo text,
  problema text,
  solucao text,
  relevancia real
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_query tsquery;
  v_limite integer;
  v_termo_limpo text;
BEGIN
  v_limite := LEAST(GREATEST(COALESCE(p_limite, 5), 1), 5);
  v_termo_limpo := TRIM(COALESCE(p_termo, ''));

  IF v_termo_limpo <> '' THEN
    BEGIN
      v_query := plainto_tsquery('portuguese', v_termo_limpo);
    EXCEPTION WHEN OTHERS THEN
      v_query := NULL;
    END;
  ELSE
    v_query := NULL;
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT 
      t.id,
      COALESCE(t.categoria, 'Suporte de TI') AS categoria,
      COALESCE(t.categoria || ' #' || t.id::text, 'Chamado #' || t.id::text) AS titulo,
      SUBSTRING(REGEXP_REPLACE(t.descricao, '\s+', ' ', 'g') FROM 1 FOR 300) AS problema,
      SUBSTRING(
        REGEXP_REPLACE(
          COALESCE(
            (
              SELECT tm.mensagem
              FROM public.ticket_mensagens tm
              WHERE tm.ticket_id = t.id 
                AND tm.autor_tipo IN ('equipe', 'sistema')
                AND tm.mensagem IS NOT NULL
                AND TRIM(tm.mensagem) <> ''
              ORDER BY tm.criado_em DESC
              LIMIT 1
            ),
            NULLIF(TRIM(t.procedimento), ''),
            'Atendimento realizado e chamado resolvido.'
          ),
          '\s+', ' ', 'g'
        ) FROM 1 FOR 300
      ) AS solucao,
      CASE 
        WHEN p_categoria IS NOT NULL AND LOWER(t.categoria) = LOWER(p_categoria) THEN 2.0 
        ELSE 0.0 
      END AS bonus_categoria,
      CASE
        WHEN v_query IS NOT NULL THEN
          ts_rank(to_tsvector('portuguese', coalesce(t.categoria, '') || ' ' || coalesce(t.descricao, '')), v_query)
        ELSE 0.0
      END AS rank_busca
    FROM public.tickets t
    WHERE LOWER(t.status) IN ('resolvido', 'concluido', 'concluído')
      AND (p_ticket_id_atual IS NULL OR t.id <> p_ticket_id_atual)
      AND (
        v_query IS NULL 
        OR to_tsvector('portuguese', coalesce(t.categoria, '') || ' ' || coalesce(t.descricao, '')) @@ v_query
        OR (p_categoria IS NOT NULL AND LOWER(t.categoria) = LOWER(p_categoria))
      )
      AND (
        (t.procedimento IS NOT NULL AND TRIM(t.procedimento) <> '')
        OR EXISTS (
          SELECT 1 FROM public.ticket_mensagens tm 
          WHERE tm.ticket_id = t.id 
            AND tm.autor_tipo IN ('equipe', 'sistema')
            AND tm.mensagem IS NOT NULL 
            AND TRIM(tm.mensagem) <> ''
        )
      )
  )
  SELECT 
    c.id,
    c.categoria,
    c.titulo,
    c.problema,
    c.solucao,
    (c.rank_busca + c.bonus_categoria)::real AS relevancia
  FROM candidatos c
  ORDER BY (c.rank_busca + c.bonus_categoria) DESC, c.id DESC
  LIMIT v_limite;
END;
$$;
GRANT EXECUTE ON FUNCTION public.buscar_chamados_resolvidos_semelhantes(text, text, integer, integer) TO authenticated, service_role;

-- ============================================================================
-- MÓDULO 5: CONFIGURAÇÕES DA IA, WHATSAPP E CAPA HERO
-- ============================================================================

DO $$
DECLARE
  v_regras JSONB;
  v_ia JSONB;
BEGIN
  SELECT regras INTO v_regras FROM public.configuracoes WHERE id = 1;
  IF v_regras IS NULL THEN
    v_regras := '{}'::jsonb;
  END IF;

  v_ia := COALESCE(v_regras->'iaSuporte', '{}'::jsonb);

  v_ia := jsonb_build_object(
    'respostaAtendimento', jsonb_build_object(
      'ativo', COALESCE((v_ia->'respostaAtendimento'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'respostaAtendimento'->>'prompt', v_ia->>'promptSistema', 'Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Responda diretamente ao solicitante, em primeira pessoa, como se já tivesse atendido: diga o que foi feito e o resultado.'),
      'maxTokens', COALESCE((v_ia->'respostaAtendimento'->>'maxTokens')::int, (v_ia->>'maxTokensResposta')::int, 150),
      'temperatura', COALESCE((v_ia->'respostaAtendimento'->>'temperatura')::numeric, 0.2),
      'usarChamadosResolvidos', COALESCE((v_ia->'respostaAtendimento'->>'usarChamadosResolvidos')::boolean, true),
      'maxExemplosResolvidos', COALESCE((v_ia->'respostaAtendimento'->>'maxExemplosResolvidos')::int, 5)
    ),
    'aprimorarTexto', jsonb_build_object(
      'ativo', COALESCE((v_ia->'aprimorarTexto'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'aprimorarTexto'->>'prompt', 'Você é revisor de textos de suporte de TI em português do Brasil. Reescreva o texto recebido corrigindo ortografia e pontuação de forma clara, mantendo o sentido original.'),
      'maxTokens', COALESCE((v_ia->'aprimorarTexto'->>'maxTokens')::int, 150),
      'temperatura', COALESCE((v_ia->'aprimorarTexto'->>'temperatura')::numeric, 0.2)
    ),
    'sugerirAbertura', jsonb_build_object(
      'ativo', COALESCE((v_ia->'sugerirAbertura'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'sugerirAbertura'->>'prompt', 'Você ajuda o solicitante a descrever um problema de TI ao abrir um chamado em 1 a 2 frases simples e claras.'),
      'maxTokens', COALESCE((v_ia->'sugerirAbertura'->>'maxTokens')::int, 100),
      'temperatura', COALESCE((v_ia->'sugerirAbertura'->>'temperatura')::numeric, 0.2)
    )
  );

  UPDATE public.configuracoes
  SET regras = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(regras, '{}'::jsonb),
        '{paginaInicial,bannerUrl}',
        '""'::jsonb,
        true
      ),
      '{iaSuporte}',
      v_ia,
      true
    ),
    '{whatsapp}',
    jsonb_build_object(
      'ativo', true,
      'numeroDestino', COALESCE(regras->'whatsapp'->>'numeroDestino', '5566996444461'),
      'modeloMensagem', COALESCE(regras->'whatsapp'->>'modeloMensagem', 'Olá, equipe de TI do SENAI LRV! Registrei um novo chamado:' || chr(10) || '*Chamado:* #{numero}' || chr(10) || '*Título:* {titulo}' || chr(10) || '*Local:* {local}' || chr(10) || '*Descrição:* {descricao}')
    ),
    true
  ),
  updated_at = now()
  WHERE id = 1;
END $$;

-- ============================================================================
-- MÓDULO 6: AVALIAÇÕES DE CHAMADOS E RESUMO PÚBLICO
-- ============================================================================

-- 6.1 Tabela avaliacoes_chamados
CREATE TABLE IF NOT EXISTS public.avaliacoes_chamados (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ticket_avaliacao_unica UNIQUE (ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_ticket_id ON public.avaliacoes_chamados (ticket_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created_at ON public.avaliacoes_chamados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON public.avaliacoes_chamados (nota);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_chamados TO authenticated, service_role;
GRANT INSERT ON public.avaliacoes_chamados TO anon;
ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS em avaliacoes_chamados
DROP POLICY IF EXISTS "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Visitante insere avaliacao de chamado recente" ON public.avaliacoes_chamados;

CREATE POLICY "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados
  FOR ALL TO authenticated
  USING (public.is_gestor_or_admin())
  WITH CHECK (public.is_gestor_or_admin());

CREATE POLICY "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  );

CREATE POLICY "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  );

CREATE POLICY "Visitante insere avaliacao de chamado recente" ON public.avaliacoes_chamados
  FOR INSERT TO anon
  WITH CHECK (
    ticket_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id)
  );

-- Habilitar Realtime para avaliacoes_chamados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'avaliacoes_chamados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes_chamados;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6.2 RPC de Submissão Segura de Avaliação
CREATE OR REPLACE FUNCTION public.submit_ticket_evaluation(
  p_ticket_id integer,
  p_nota integer,
  p_comentario text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE id = p_ticket_id) THEN
    RAISE EXCEPTION 'Chamado com id % não encontrado.', p_ticket_id;
  END IF;

  INSERT INTO public.avaliacoes_chamados (
    ticket_id,
    user_id,
    user_email,
    nota,
    comentario,
    created_at
  )
  VALUES (
    p_ticket_id,
    v_uid,
    nullif(v_email, ''),
    p_nota,
    nullif(left(btrim(p_comentario), 300), ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (ticket_id) DO UPDATE SET
    nota = EXCLUDED.nota,
    comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario),
    created_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'nota', p_nota
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text) TO anon, authenticated, service_role;

-- 6.3 RPC de Estatísticas Agregadas Públicas (Apenas Números, Zero Dados Pessoais)
CREATE OR REPLACE FUNCTION public.get_public_evaluation_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer := 0;
  v_media numeric := 0.0;
  v_satisfacao integer := 0;
  v_d1 integer := 0;
  v_d2 integer := 0;
  v_d3 integer := 0;
  v_d4 integer := 0;
  v_d5 integer := 0;
BEGIN
  SELECT
    count(*),
    coalesce(round(avg(nota)::numeric, 2), 0.0),
    coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer,
    count(*) FILTER (WHERE nota = 1),
    count(*) FILTER (WHERE nota = 2),
    count(*) FILTER (WHERE nota = 3),
    count(*) FILTER (WHERE nota = 4),
    count(*) FILTER (WHERE nota = 5)
  INTO
    v_total, v_media, v_satisfacao,
    v_d1, v_d2, v_d3, v_d4, v_d5
  FROM public.avaliacoes_chamados;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'media', coalesce(v_media, 0.0),
    'satisfacao_pct', coalesce(v_satisfacao, 0),
    'distribuicao', jsonb_build_object(
      '1', coalesce(v_d1, 0),
      '2', coalesce(v_d2, 0),
      '3', coalesce(v_d3, 0),
      '4', coalesce(v_d4, 0),
      '5', coalesce(v_d5, 0)
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_evaluation_stats() TO anon, authenticated, service_role;

-- 6.4 View Pública Agregada
CREATE OR REPLACE VIEW public.avaliacoes_public_stats AS
SELECT
  count(*)::integer AS total,
  coalesce(round(avg(nota)::numeric, 2), 0.0) AS media,
  coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer AS satisfacao_pct,
  count(*) FILTER (WHERE nota = 1)::integer AS nota_1,
  count(*) FILTER (WHERE nota = 2)::integer AS nota_2,
  count(*) FILTER (WHERE nota = 3)::integer AS nota_3,
  count(*) FILTER (WHERE nota = 4)::integer AS nota_4,
  count(*) FILTER (WHERE nota = 5)::integer AS nota_5
FROM public.avaliacoes_chamados;

GRANT SELECT ON public.avaliacoes_public_stats TO anon, authenticated, service_role;

-- ============================================================================
-- MÓDULO 7: SEGURANÇA DO DASHBOARD E INDICADORES DO DIA (AMERICA/CUIABA)
-- ============================================================================

-- 7.1 Indicadores diários em tempo real (00:00 às 23:59 America/Cuiaba UTC-4)
CREATE OR REPLACE FUNCTION public.get_public_daily_stats()
RETURNS TABLE (
  chamados_do_dia integer,
  atendidos_no_dia integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hoje_cuiaba date;
  v_chamados_dia integer := 0;
  v_atendidos_dia integer := 0;
BEGIN
  -- Data oficial de hoje no fuso America/Cuiaba (UTC-4)
  v_hoje_cuiaba := (timezone('America/Cuiaba', now()))::date;

  -- 1. Chamados abertos no dia corrente
  SELECT COUNT(*)::integer
  INTO v_chamados_dia
  FROM public.tickets t
  WHERE (t.aberto_em = v_hoje_cuiaba)
     OR (t.created_at IS NOT NULL AND (timezone('America/Cuiaba', t.created_at))::date = v_hoje_cuiaba);

  -- 2. Chamados atendidos/concluídos no dia corrente
  SELECT COUNT(*)::integer
  INTO v_atendidos_dia
  FROM public.tickets t
  WHERE (t.status IN ('Concluído', 'Resolvido'))
    AND (
      (t.fechado_em = v_hoje_cuiaba)
      OR (t.fechado_em IS NULL AND t.updated_at IS NOT NULL AND (timezone('America/Cuiaba', t.updated_at))::date = v_hoje_cuiaba)
    );

  RETURN QUERY SELECT COALESCE(v_chamados_dia, 0), COALESCE(v_atendidos_dia, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_daily_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_daily_stats() TO anon, authenticated, service_role;

-- 7.2 Restringir consulta analítica de SLA do dashboard exclusivamente a usuários autenticados
CREATE OR REPLACE FUNCTION public.public_ticket_sla_progress()
RETURNS TABLE (
  id integer,
  aberto_em date,
  hora text,
  prioridade text,
  status text,
  categoria text,
  fechado_em date,
  horario text,
  sla_reiniciado_em text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.aberto_em,
    t.hora,
    t.prioridade,
    t.status,
    COALESCE(t.categoria, 'Outros'),
    t.fechado_em,
    t.horario,
    t.sla_reiniciado_em
  FROM public.tickets t
  ORDER BY t.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;

-- ============================================================================
-- 15. TEMA PREFERIDO DO USUÁRIO EM USER_PROFILES
-- ============================================================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tema_preferido text DEFAULT 'auto';

CREATE OR REPLACE FUNCTION public.set_user_theme_preference(p_tema text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_valido text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF p_tema NOT IN ('claro', 'escuro', 'auto') THEN
    v_valido := 'auto';
  ELSE
    v_valido := p_tema;
  END IF;

  UPDATE public.user_profiles
  SET tema_preferido = v_valido,
      updated_at = now()
  WHERE id = v_uid;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_theme_preference(text) TO authenticated;

-- ============================================================================
-- MÓDULO 9: AVALIAÇÃO DE FACILIDADE DE ABERTURA E INDICADORES DO DASHBOARD
-- ============================================================================

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS nota_facilidade integer CHECK (nota_facilidade IS NULL OR (nota_facilidade >= 1 AND nota_facilidade <= 5));

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS atendente text;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota_facilidade ON public.avaliacoes_chamados (nota_facilidade);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_atendente ON public.avaliacoes_chamados (atendente);

DROP POLICY IF EXISTS "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados;
CREATE POLICY "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND (
        t.criado_por = auth.uid()
        OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
        OR public.is_gestor_or_admin()
      )
    )
  );

DROP FUNCTION IF EXISTS public.submit_ticket_evaluation(integer, integer, text);
DROP FUNCTION IF EXISTS public.submit_ticket_evaluation(integer, integer, text, integer, text);

CREATE OR REPLACE FUNCTION public.submit_ticket_evaluation(
  p_ticket_id integer,
  p_nota integer,
  p_comentario text DEFAULT NULL,
  p_nota_facilidade integer DEFAULT NULL,
  p_atendente text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_resp text := nullif(btrim(p_atendente), '');
  v_ticket_owner_email text;
  v_ticket_criado_por uuid;
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5.';
  END IF;

  IF p_nota_facilidade IS NOT NULL AND (p_nota_facilidade < 1 OR p_nota_facilidade > 5) THEN
    RAISE EXCEPTION 'A nota de facilidade deve ser entre 1 e 5.';
  END IF;

  SELECT responsavel, solicitante_email, criado_por
  INTO v_resp, v_ticket_owner_email, v_ticket_criado_por
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado com id % não encontrado.', p_ticket_id;
  END IF;

  IF v_uid IS NOT NULL AND NOT public.is_gestor_or_admin() THEN
    IF v_ticket_criado_por IS NOT NULL AND v_ticket_criado_por <> v_uid AND
       (v_ticket_owner_email IS NULL OR lower(btrim(v_ticket_owner_email)) <> v_email) THEN
      RAISE EXCEPTION 'Acesso negado: você só pode avaliar chamados abertos por você.';
    END IF;
  END IF;

  IF p_atendente IS NOT NULL AND btrim(p_atendente) <> '' THEN
    v_resp := btrim(p_atendente);
  END IF;

  INSERT INTO public.avaliacoes_chamados (
    ticket_id,
    user_id,
    user_email,
    nota,
    nota_facilidade,
    atendente,
    comentario,
    created_at
  )
  VALUES (
    p_ticket_id,
    v_uid,
    nullif(v_email, ''),
    p_nota,
    p_nota_facilidade,
    v_resp,
    nullif(left(btrim(p_comentario), 300), ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (ticket_id) DO UPDATE SET
    nota = EXCLUDED.nota,
    nota_facilidade = coalesce(EXCLUDED.nota_facilidade, public.avaliacoes_chamados.nota_facilidade),
    atendente = coalesce(EXCLUDED.atendente, public.avaliacoes_chamados.atendente),
    comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario),
    created_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'nota', p_nota,
    'nota_facilidade', p_nota_facilidade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text, integer, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_evaluations_for_dashboard()
RETURNS TABLE (
  id integer,
  ticket_id integer,
  nota integer,
  nota_facilidade integer,
  atendente text,
  categoria text,
  setor text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id,
    a.ticket_id,
    a.nota,
    a.nota_facilidade,
    coalesce(nullif(btrim(a.atendente), ''), nullif(btrim(t.responsavel), ''), 'Equipe de TI') as atendente,
    coalesce(nullif(btrim(t.categoria), ''), 'Geral / Outros') as categoria,
    coalesce(nullif(btrim(t.setor), ''), 'Geral') as setor,
    a.created_at
  FROM public.avaliacoes_chamados a
  LEFT JOIN public.tickets t ON t.id = a.ticket_id
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_evaluations_for_dashboard() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_evaluation_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer := 0;
  v_media numeric := 0.0;
  v_satisfacao integer := 0;
  v_d1 integer := 0;
  v_d2 integer := 0;
  v_d3 integer := 0;
  v_d4 integer := 0;
  v_d5 integer := 0;
  v_total_facilidade integer := 0;
  v_media_facilidade numeric := 0.0;
  v_f1 integer := 0;
  v_f2 integer := 0;
  v_f3 integer := 0;
  v_f4 integer := 0;
  v_f5 integer := 0;
BEGIN
  SELECT
    count(*),
    coalesce(round(avg(nota)::numeric, 2), 0.0),
    coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer,
    count(*) FILTER (WHERE nota = 1),
    count(*) FILTER (WHERE nota = 2),
    count(*) FILTER (WHERE nota = 3),
    count(*) FILTER (WHERE nota = 4),
    count(*) FILTER (WHERE nota = 5),
    count(*) FILTER (WHERE nota_facilidade IS NOT NULL),
    coalesce(round(avg(nota_facilidade)::numeric, 2), 0.0),
    count(*) FILTER (WHERE nota_facilidade = 1),
    count(*) FILTER (WHERE nota_facilidade = 2),
    count(*) FILTER (WHERE nota_facilidade = 3),
    count(*) FILTER (WHERE nota_facilidade = 4),
    count(*) FILTER (WHERE nota_facilidade = 5)
  INTO
    v_total, v_media, v_satisfacao,
    v_d1, v_d2, v_d3, v_d4, v_d5,
    v_total_facilidade, v_media_facilidade,
    v_f1, v_f2, v_f3, v_f4, v_f5
  FROM public.avaliacoes_chamados;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'media', coalesce(v_media, 0.0),
    'satisfacao_pct', coalesce(v_satisfacao, 0),
    'distribuicao', jsonb_build_object(
      '1', coalesce(v_d1, 0),
      '2', coalesce(v_d2, 0),
      '3', coalesce(v_d3, 0),
      '4', coalesce(v_d4, 0),
      '5', coalesce(v_d5, 0)
    ),
    'total_facilidade', coalesce(v_total_facilidade, 0),
    'media_facilidade', coalesce(v_media_facilidade, 0.0),
    'distribuicao_facilidade', jsonb_build_object(
      '1', coalesce(v_f1, 0),
      '2', coalesce(v_f2, 0),
      '3', coalesce(v_f3, 0),
      '4', coalesce(v_f4, 0),
      '5', coalesce(v_f5, 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_evaluation_stats() TO anon, authenticated, service_role;

-- ============================================================================
-- FIM DO SCRIPT CONSOLIDADO
-- ============================================================================

