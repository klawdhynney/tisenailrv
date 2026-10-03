-- Migração 20261003020000: Cadastrar e Autorizar Administradores Iniciais
-- Promove e autoriza estritamente os 4 e-mails autorizados pelo proprietário do projeto:
-- 1. klaw.com@gmail.com
-- 2. klawdhynney@gmail.com
-- 3. claudineigoncalvesdelima@hotmail.com
-- 4. claudinei.lima@senaimt.ind.br
-- Idempotente, preserva dados existentes e cumpre regras de segurança RLS.

-- 1. Garante que os papéis de enum 'admin' e 'usuario' existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'usuario' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'usuario';
  END IF;
END $$;

-- 2. Garante a tabela de perfis de usuário (se ainda não tiver sido criada)
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

-- 3. Garante a tabela de pré-cadastros de perfis por e-mail
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

-- 4. Garante a tabela de auditoria de alterações administrativas de usuários
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

-- 5. Pré-cadastra os 4 administradores autorizados (idempotente com ON CONFLICT)
INSERT INTO public.pre_registered_roles (email, role)
VALUES
  ('klaw.com@gmail.com', 'admin'::public.app_role),
  ('klawdhynney@gmail.com', 'admin'::public.app_role),
  ('claudineigoncalvesdelima@hotmail.com', 'admin'::public.app_role),
  ('claudinei.lima@senaimt.ind.br', 'admin'::public.app_role)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::public.app_role;

-- 6. Atribui os papéis 'admin' e 'gestor' para contas que já existam em auth.users
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

-- 7. Registra auditoria da concessão inicial de administradores para cada um dos 4 e-mails
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
    'origem', 'migration_20261003020000'
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

-- 8. Função de verificação de Administrador (is_admin)
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

-- 9. Função de verificação de Gestor ou Administrador (is_gestor_or_admin)
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

-- 10. Atualiza is_named_manager() para reconhecer todos os 4 e-mails verificados por OAuth
CREATE OR REPLACE FUNCTION public.is_named_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR (
      public.has_role(auth.uid(), 'gestor')
      AND lower(btrim(auth.jwt() ->> 'email')) IN (
        'klaw.com@gmail.com',
        'klawdhynney@gmail.com',
        'claudineigoncalvesdelima@hotmail.com',
        'claudinei.lima@senaimt.ind.br'
      )
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
          AND email_confirmed_at IS NOT NULL
          AND lower(btrim(email)) = lower(btrim(auth.jwt() ->> 'email'))
      )
      AND EXISTS (
        SELECT 1 FROM auth.identities
        WHERE user_id = auth.uid()
          AND provider IN ('google', 'azure', 'microsoft')
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_named_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_named_manager() TO authenticated;

-- 11. Atualiza claim_manager_access() com os 4 e-mails e validação OAuth
CREATE OR REPLACE FUNCTION public.claim_manager_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_verified_email text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT lower(btrim(email)) INTO v_verified_email
  FROM auth.users
  WHERE id = v_uid AND email_confirmed_at IS NOT NULL;

  IF v_verified_email IS NULL
     OR v_verified_email NOT IN (
       'klaw.com@gmail.com',
       'klawdhynney@gmail.com',
       'claudineigoncalvesdelima@hotmail.com',
       'claudinei.lima@senaimt.ind.br'
     )
     OR v_verified_email IS DISTINCT FROM lower(btrim(auth.jwt() ->> 'email'))
     OR NOT EXISTS (
       SELECT 1 FROM auth.identities
       WHERE user_id = v_uid AND provider IN ('google', 'azure', 'microsoft')
     ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'gestor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_manager_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_manager_access() TO authenticated;

-- 12. Sincronização segura de perfil com concessão no 1º login com Google/Microsoft
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

  -- Regra de Segurança 2: Perfil elevado só é concedido se o e-mail estiver
  -- confirmado pelo provedor (Google ou Microsoft/Azure) e corresponder à identidade
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

  -- 2. Os 4 administradores expressamente autorizados pelo proprietário
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

-- 13. Lista de Usuários na Gestão (inclui pré-cadastros com status 'pendente')
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
  -- 1. Usuários registrados em user_profiles
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

  -- 2. Pré-cadastros pendentes de primeiro login
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

-- 14. Alterar papel de usuário com proteção inegociável do último administrador
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
    -- Se for um pré-cadastro ainda pendente
    SELECT lower(btrim(email)) INTO v_alvo_email FROM public.pre_registered_roles WHERE md5(email)::uuid = p_alvo_id;
    IF v_alvo_email IS NOT NULL THEN
      UPDATE public.pre_registered_roles SET role = p_novo_role::public.app_role WHERE lower(btrim(email)) = v_alvo_email;
      INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, acao, detalhes)
      VALUES (v_admin_id, v_admin_email, v_alvo_email, 'ALTEROU_PERFIL_PRE_CADASTRO', jsonb_build_object('novo_perfil', p_novo_role));
      RETURN jsonb_build_object('success', true, 'novo_role', p_novo_role);
    END IF;
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Regra 5: Não permitir rebaixar a si próprio por engano
  IF p_alvo_id = v_admin_id AND p_novo_role != 'admin' THEN
    RAISE EXCEPTION 'Você não pode rebaixar seu próprio perfil de administrador.';
  END IF;

  -- Regra 5: Não permitir que o último admin seja rebaixado
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

-- 15. Bloquear ou reativar usuário com proteção do último administrador
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

  -- Regra 5: Não permitir bloquear a si próprio
  IF p_alvo_id = v_admin_id AND p_bloqueado THEN
    RAISE EXCEPTION 'Você não pode bloquear a sua própria conta.';
  END IF;

  -- Regra 5: Não permitir bloquear o último admin ativo
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
