-- Migração 20261003030000: Correção Consolidada da Plataforma TI SENAI LRV
-- Corrige:
-- 1. Abertura de chamados (ajuste de restrições em open_public_ticket_with_receipt e RLS de tickets)
-- 2. Tabela e RPC de Avaliações de Chamados (avaliacoes_chamados e submit_ticket_evaluation)
-- 3. Gestão de Usuários, Perfis e Permissões (user_profiles, pre_registered_roles, audit_logs_usuarios, admin_get_users)
-- 4. Promove estritamente os 4 administradores autorizados:
--    - klaw.com@gmail.com
--    - klawdhynney@gmail.com
--    - claudineigoncalvesdelima@hotmail.com
--    - claudinei.lima@senaimt.ind.br
-- 5. Garante idempotência total (pode ser executada repetidas vezes sem conflito).

-- ============================================================================
-- PARTE 1: TIPOS E ESTRUTURA BÁSICA DE PERFIS
-- ============================================================================
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

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver o proprio papel" ON public.user_roles;
CREATE POLICY "Ver o proprio papel" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============================================================================
-- PARTE 2: TABELA DE PERFIS DE USUÁRIOS E PRÉ-CADASTROS
-- ============================================================================
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
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pre_registered_roles (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_registered_roles TO authenticated;
GRANT ALL ON public.pre_registered_roles TO service_role;
ALTER TABLE public.pre_registered_roles ENABLE ROW LEVEL SECURITY;

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
GRANT SELECT, INSERT ON public.audit_logs_usuarios TO authenticated;
GRANT ALL ON public.audit_logs_usuarios TO service_role;
ALTER TABLE public.audit_logs_usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 3: TABELA DE TICKETS E POLÍTICAS RLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id serial PRIMARY KEY,
  aberto_em date NOT NULL DEFAULT current_date,
  hora text NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  solicitante text NOT NULL,
  solicitante_email text,
  setor text NOT NULL,
  local text NOT NULL DEFAULT '',
  descricao text NOT NULL,
  categoria text,
  prioridade text NOT NULL DEFAULT 'Média',
  responsavel text,
  status text NOT NULL DEFAULT 'Aberto',
  fechado_em date,
  horario text,
  procedimento text,
  contato text,
  sla_reiniciado_em text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante colunas necessárias em tickets caso tabela já existisse com schema antigo
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS solicitante_email text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS criado_por uuid;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS contato text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS local text DEFAULT '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tickets_id_seq TO authenticated, anon;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 4: TABELA DE AVALIAÇÕES DE CHAMADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.avaliacoes_chamados (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  nota integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_avaliacao_unica UNIQUE (ticket_id)
);
GRANT SELECT, INSERT, UPDATE ON public.avaliacoes_chamados TO authenticated;
GRANT ALL ON public.avaliacoes_chamados TO service_role;
ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 5: FUNÇÕES DE VERIFICAÇÃO DE ADMINISTRADOR E GESTOR
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) IN (
      'klaw.com@gmail.com',
      'klawdhynney@gmail.com',
      'claudineigoncalvesdelima@hotmail.com',
      'claudinei.lima@senaimt.ind.br'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'gestor')
    OR lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) IN (
      'klaw.com@gmail.com',
      'klawdhynney@gmail.com',
      'claudineigoncalvesdelima@hotmail.com',
      'claudinei.lima@senaimt.ind.br'
    )
  );
$$;
REVOKE ALL ON FUNCTION public.is_gestor_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor_or_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_named_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_gestor_or_admin();
$$;
REVOKE ALL ON FUNCTION public.is_named_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_named_manager() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_manager_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(auth.jwt() ->> 'email'));
BEGIN
  IF v_uid IS NULL OR v_email IS NULL THEN RETURN false; END IF;

  IF v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'gestor') ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_manager_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_manager_access() TO authenticated;

-- ============================================================================
-- PARTE 6: POLÍTICAS RLS PARA TICKETS, AVALIAÇÕES E PERFIS
-- ============================================================================

-- RLS: public.tickets
DROP POLICY IF EXISTS "Gestores veem todos os chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores criam chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores atualizam chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores excluem chamados" ON public.tickets;
DROP POLICY IF EXISTS "Solicitante autenticado abre chamado" ON public.tickets;
DROP POLICY IF EXISTS "Solicitante ve apenas seus chamados" ON public.tickets;

CREATE POLICY "Gestores veem todos os chamados" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.is_gestor_or_admin());

CREATE POLICY "Gestores criam chamados" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestor_or_admin());

CREATE POLICY "Gestores atualizam chamados" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.is_gestor_or_admin())
  WITH CHECK (public.is_gestor_or_admin());

CREATE POLICY "Gestores excluem chamados" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.is_gestor_or_admin());

CREATE POLICY "Solicitante autenticado abre chamado" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (criado_por = auth.uid() OR criado_por IS NULL)
  );

CREATE POLICY "Solicitante ve apenas seus chamados" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR (solicitante_email IS NOT NULL AND lower(btrim(solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
    )
  );

-- RLS: public.user_profiles
DROP POLICY IF EXISTS "Usuario ve proprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin ve todos os perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuario atualiza proprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuario insere proprio perfil" ON public.user_profiles;

CREATE POLICY "Usuario ve proprio perfil" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuario atualiza proprio perfil" ON public.user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuario insere proprio perfil" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- RLS: public.pre_registered_roles
DROP POLICY IF EXISTS "Apenas admins gerenciam pre cadastros" ON public.pre_registered_roles;
CREATE POLICY "Apenas admins gerenciam pre cadastros" ON public.pre_registered_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RLS: public.audit_logs_usuarios
DROP POLICY IF EXISTS "Admins leem logs de usuarios" ON public.audit_logs_usuarios;
CREATE POLICY "Admins leem logs de usuarios" ON public.audit_logs_usuarios
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Autenticado registra log de auditoria" ON public.audit_logs_usuarios;
CREATE POLICY "Autenticado registra log de auditoria" ON public.audit_logs_usuarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- RLS: public.avaliacoes_chamados
DROP POLICY IF EXISTS "Gestores e admins veem todas as avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario insere avaliacao de chamado" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario ve propria avaliacao" ON public.avaliacoes_chamados;

CREATE POLICY "Gestores e admins veem todas as avaliacoes" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated USING (public.is_gestor_or_admin());

CREATE POLICY "Usuario insere avaliacao de chamado" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Usuario ve propria avaliacao" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
    OR public.is_gestor_or_admin()
  );

-- ============================================================================
-- PARTE 7: FUNÇÃO DE ABERTURA DE CHAMADO (ROBUSTA E RESILIENTE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.open_public_ticket_with_receipt(
  p_solicitante text,
  p_email text,
  p_contato text,
  p_setor text,
  p_local text,
  p_categoria text,
  p_descricao text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_id integer;
  user_email text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para abrir chamado. Entre com Google ou Microsoft.';
  END IF;

  user_email := coalesce(nullif(lower(btrim(p_email)), ''), lower(auth.jwt() ->> 'email'));

  IF p_solicitante IS NULL OR length(btrim(p_solicitante)) < 2 THEN
    RAISE EXCEPTION 'Informe seu nome completo.';
  END IF;

  IF user_email IS NULL OR length(btrim(user_email)) < 5 OR btrim(user_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail corporativo inválido.';
  END IF;

  IF p_setor IS NULL OR length(btrim(p_setor)) < 2 THEN
    RAISE EXCEPTION 'Setor não informado.';
  END IF;

  IF p_descricao IS NULL OR length(btrim(p_descricao)) < 2 THEN
    RAISE EXCEPTION 'Descreva o problema com pelo menos 2 caracteres.';
  END IF;

  INSERT INTO public.tickets (
    solicitante,
    solicitante_email,
    contato,
    setor,
    local,
    categoria,
    descricao,
    prioridade,
    status,
    criado_por
  )
  VALUES (
    left(btrim(p_solicitante), 120),
    user_email,
    left(nullif(btrim(p_contato), ''), 255),
    left(btrim(p_setor), 120),
    left(btrim(coalesce(p_local, '')), 240),
    left(btrim(coalesce(p_categoria, 'Geral')), 120),
    left(btrim(p_descricao), 3000),
    'Média',
    'Aberto',
    v_uid
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) TO authenticated;

-- Função auxiliar segura para envio de avaliação de chamado
CREATE OR REPLACE FUNCTION public.submit_ticket_evaluation(
  p_ticket_id integer,
  p_nota integer,
  p_comentario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(auth.jwt() ->> 'email'));
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'Nota de avaliação deve ser entre 1 e 5.';
  END IF;

  INSERT INTO public.avaliacoes_chamados (ticket_id, user_id, user_email, nota, comentario)
  VALUES (p_ticket_id, v_uid, v_email, p_nota, left(btrim(p_comentario), 300))
  ON CONFLICT (ticket_id) DO UPDATE SET
    nota = EXCLUDED.nota,
    comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario),
    created_at = now();

  RETURN jsonb_build_object('success', true, 'ticket_id', p_ticket_id, 'nota', p_nota);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_ticket_evaluation(integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text) TO authenticated;

-- ============================================================================
-- PARTE 8: SINCRONIZAÇÃO DE PERFIL E FUNÇÕES DE GESTÃO DE USUÁRIOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_user_profile(
  p_nome text DEFAULT NULL,
  p_foto_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(auth.jwt() ->> 'email'));
  v_is_oauth_verified boolean := false;
  v_pre_role public.app_role;
  v_current_role public.app_role := 'usuario';
  v_bloqueado boolean := false;
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Verifica se o provedor OAuth é Google ou Microsoft/Azure com e-mail confirmado
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN auth.identities i ON i.user_id = u.id
    WHERE u.id = v_user_id
      AND u.email_confirmed_at IS NOT NULL
      AND lower(btrim(u.email)) = v_email
      AND i.provider IN ('google', 'azure', 'microsoft')
  ) INTO v_is_oauth_verified;

  -- 1. Aplica pré-cadastro apenas para contas verificadas por OAuth Google/Microsoft
  IF v_is_oauth_verified THEN
    SELECT role INTO v_pre_role
    FROM public.pre_registered_roles
    WHERE lower(btrim(email)) = v_email;

    IF v_pre_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, v_pre_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      IF v_pre_role = 'admin' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'gestor')
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- 2. Os 4 administradores autorizados pelo proprietário do projeto
  IF v_is_oauth_verified AND v_email IN (
    'klaw.com@gmail.com',
    'klawdhynney@gmail.com',
    'claudineigoncalvesdelima@hotmail.com',
    'claudinei.lima@senaimt.ind.br'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'gestor') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 3. Atualiza ou insere o perfil do usuário
  INSERT INTO public.user_profiles (id, email, nome, foto_url, ultimo_acesso, updated_at)
  VALUES (
    v_user_id,
    v_email,
    nullif(btrim(p_nome), ''),
    nullif(btrim(p_foto_url), ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = coalesce(nullif(btrim(EXCLUDED.nome), ''), public.user_profiles.nome),
    foto_url = coalesce(nullif(btrim(EXCLUDED.foto_url), ''), public.user_profiles.foto_url),
    ultimo_acesso = now(),
    updated_at = now()
  RETURNING bloqueado INTO v_bloqueado;

  -- 4. Identifica papel mais alto
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin') THEN
    v_current_role := 'admin';
  ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'gestor') THEN
    v_current_role := 'gestor';
  ELSE
    v_current_role := 'usuario';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'role', v_current_role,
    'bloqueado', v_bloqueado
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sync_user_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(text, text) TO authenticated;

-- Listagem de usuários para página de administração
DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id uuid,
  email text,
  nome text,
  foto_url text,
  role text,
  bloqueado boolean,
  status text,
  ultimo_acesso timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.nome,
    p.foto_url,
    coalesce(
      (SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin' LIMIT 1),
      (SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'gestor' LIMIT 1),
      'usuario'
    ) AS role,
    p.bloqueado,
    CASE WHEN p.bloqueado THEN 'bloqueado' ELSE 'ativo' END AS status,
    p.ultimo_acesso,
    p.created_at
  FROM public.user_profiles p

  UNION ALL

  SELECT
    md5(pr.email)::uuid AS id,
    pr.email,
    'Aguardando 1º acesso'::text AS nome,
    NULL::text AS foto_url,
    pr.role::text AS role,
    false AS bloqueado,
    'pendente'::text AS status,
    NULL::timestamptz AS ultimo_acesso,
    pr.created_at
  FROM public.pre_registered_roles pr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p2
    WHERE lower(btrim(p2.email)) = lower(btrim(pr.email))
  )
  ORDER BY status ASC, ultimo_acesso DESC NULLS LAST, created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- Alteração de papel com proteção do último administrador
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_alvo_id uuid,
  p_novo_role text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text := lower(btrim(auth.jwt() ->> 'email'));
  v_alvo_email text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar perfis.';
  END IF;

  SELECT lower(btrim(email)) INTO v_alvo_email FROM public.user_profiles WHERE id = p_alvo_id;
  IF v_alvo_email IS NULL THEN
    SELECT lower(btrim(email)) INTO v_alvo_email FROM public.pre_registered_roles WHERE md5(email)::uuid = p_alvo_id;
    IF v_alvo_email IS NOT NULL THEN
      UPDATE public.pre_registered_roles SET role = p_novo_role::public.app_role WHERE lower(btrim(email)) = v_alvo_email;
      INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, acao, detalhes)
      VALUES (v_admin_id, v_admin_email, v_alvo_email, 'ALTEROU_PERFIL_PRE_CADASTRO', jsonb_build_object('novo_perfil', p_novo_role));
      RETURN jsonb_build_object('success', true, 'novo_role', p_novo_role);
    END IF;
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  IF p_alvo_id = v_admin_id AND p_novo_role != 'admin' THEN
    RAISE EXCEPTION 'Você não pode rebaixar seu próprio perfil de administrador.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_alvo_id AND role = 'admin') AND p_novo_role != 'admin' THEN
    SELECT count(DISTINCT p.id) INTO v_admin_count
    FROM public.user_profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE r.role = 'admin' AND NOT p.bloqueado;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação cancelada: não é permitido rebaixar o único administrador ativo do sistema.';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_alvo_id;
  IF p_novo_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'gestor') ON CONFLICT DO NOTHING;
  ELSIF p_novo_role = 'gestor' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'gestor') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'usuario') ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (
    v_admin_id,
    v_admin_email,
    v_alvo_email,
    p_alvo_id,
    'ALTEROU_PERFIL',
    jsonb_build_object('novo_perfil', p_novo_role)
  );

  RETURN jsonb_build_object('success', true, 'novo_role', p_novo_role);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- Bloqueio de usuário com proteção do último administrador
CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(
  p_alvo_id uuid,
  p_bloqueado boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text := lower(btrim(auth.jwt() ->> 'email'));
  v_alvo_email text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem bloquear usuários.';
  END IF;

  SELECT lower(btrim(email)) INTO v_alvo_email FROM public.user_profiles WHERE id = p_alvo_id;
  IF v_alvo_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  IF p_alvo_id = v_admin_id AND p_bloqueado THEN
    RAISE EXCEPTION 'Você não pode bloquear a sua própria conta.';
  END IF;

  IF p_bloqueado AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_alvo_id AND role = 'admin') THEN
    SELECT count(DISTINCT p.id) INTO v_admin_count
    FROM public.user_profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE r.role = 'admin' AND NOT p.bloqueado;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é permitido bloquear o único administrador ativo do sistema.';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET bloqueado = p_bloqueado, updated_at = now()
  WHERE id = p_alvo_id;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (
    v_admin_id,
    v_admin_email,
    v_alvo_email,
    p_alvo_id,
    CASE WHEN p_bloqueado THEN 'BLOQUEOU_USUARIO' ELSE 'DESBLOQUEOU_USUARIO' END,
    jsonb_build_object('bloqueado', p_bloqueado)
  );

  RETURN jsonb_build_object('success', true, 'bloqueado', p_bloqueado);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;

-- ============================================================================
-- PARTE 9: SEEDING E AUDITORIA DOS 4 ADMINISTRADORES AUTORIZADOS
-- ============================================================================
INSERT INTO public.pre_registered_roles (email, role)
VALUES
  ('klaw.com@gmail.com', 'admin'::public.app_role),
  ('klawdhynney@gmail.com', 'admin'::public.app_role),
  ('claudineigoncalvesdelima@hotmail.com', 'admin'::public.app_role),
  ('claudinei.lima@senaimt.ind.br', 'admin'::public.app_role)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::public.app_role;

-- Atribui papéis para contas já existentes no auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(btrim(u.email)) IN (
  'klaw.com@gmail.com',
  'klawdhynney@gmail.com',
  'claudineigoncalvesdelima@hotmail.com',
  'claudinei.lima@senaimt.ind.br'
)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'gestor'::public.app_role
FROM auth.users u
WHERE lower(btrim(u.email)) IN (
  'klaw.com@gmail.com',
  'klawdhynney@gmail.com',
  'claudineigoncalvesdelima@hotmail.com',
  'claudinei.lima@senaimt.ind.br'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Registro de auditoria do cadastro inicial de administradores
INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
SELECT
  coalesce(u.id, '00000000-0000-0000-0000-000000000000'::uuid) AS admin_id,
  'sistema@senaimt.ind.br' AS admin_email,
  e.email AS alvo_email,
  u.id AS alvo_user_id,
  'cadastro inicial de administradores' AS acao,
  jsonb_build_object(
    'perfil', 'admin',
    'status', CASE WHEN u.id IS NOT NULL THEN 'ativo' ELSE 'pendente' END,
    'autorizacao', 'Autorizado expressamente pelo proprietário do projeto',
    'origem', 'migration_20261003030000'
  ) AS detalhes
FROM (
  VALUES
    ('klaw.com@gmail.com'),
    ('klawdhynney@gmail.com'),
    ('claudineigoncalvesdelima@hotmail.com'),
    ('claudinei.lima@senaimt.ind.br')
) AS e(email)
LEFT JOIN auth.users u ON lower(btrim(u.email)) = e.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_logs_usuarios a
  WHERE a.alvo_email = e.email AND a.acao = 'cadastro inicial de administradores'
);
