-- Migração 20261003010000: Gestão de Usuários, Perfis (Admin/Gestor/Usuário), Avaliações de Abertura e Índices de Desempenho
-- Preserva todos os dados existentes sem excluir registros.

-- 1. Expansão de Perfis (Roles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'usuario' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'usuario';
  END IF;
END $$;

-- 2. Tabela de Perfis de Usuário (Status Ativo/Bloqueado e Metadados)
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

-- 3. Tabela de Pré-cadastro de Perfis por E-mail
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

-- 4. Tabela de Auditoria de Ações Administrativas de Usuários
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

-- 5. Tabela de Avaliações de Abertura de Chamados
CREATE TABLE IF NOT EXISTS public.avaliacoes_chamados (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  nota integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_avaliacao_unica UNIQUE (ticket_id)
);

GRANT SELECT, INSERT ON public.avaliacoes_chamados TO authenticated;
GRANT ALL ON public.avaliacoes_chamados TO service_role;
ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

-- 6. Índices para Otimização de Consultas e Ordenação (Ajuste 3)
CREATE INDEX IF NOT EXISTS idx_tickets_aberto_em ON public.tickets (aberto_em DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridade ON public.tickets (prioridade);
CREATE INDEX IF NOT EXISTS idx_tickets_setor ON public.tickets (setor);
CREATE INDEX IF NOT EXISTS idx_tickets_categoria ON public.tickets (categoria);
CREATE INDEX IF NOT EXISTS idx_tickets_solicitante_email ON public.tickets (lower(solicitante_email));
CREATE INDEX IF NOT EXISTS idx_tickets_criado_por ON public.tickets (criado_por);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ticket_id ON public.avaliacoes_chamados (ticket_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created_at ON public.avaliacoes_chamados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON public.avaliacoes_chamados (nota);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_pre_registered_roles_email ON public.pre_registered_roles (lower(email));

-- 7. Funções de Segurança para Verificação de Perfis
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'claudinei.lima@senaimt.ind.br',
      'claudineigoncalvesdelima@hotmail.com',
      'klawdhynney@gmail.com'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'gestor')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'claudinei.lima@senaimt.ind.br',
      'claudineigoncalvesdelima@hotmail.com',
      'klawdhynney@gmail.com'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_gestor_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor_or_admin() TO authenticated;

-- 8. Políticas RLS
-- user_profiles: cada um vê o seu; admins veem todos
DROP POLICY IF EXISTS "Usuario ve proprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin ve todos os perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuario atualiza proprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin atualiza perfis" ON public.user_profiles;

CREATE POLICY "Usuario ve proprio perfil" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuario atualiza proprio perfil" ON public.user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuario insere proprio perfil" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- pre_registered_roles: apenas admins
DROP POLICY IF EXISTS "Apenas admins gerenciam pre cadastros" ON public.pre_registered_roles;
CREATE POLICY "Apenas admins gerenciam pre cadastros" ON public.pre_registered_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- audit_logs_usuarios: apenas admins leem; inserção interna
DROP POLICY IF EXISTS "Admins leem logs de usuarios" ON public.audit_logs_usuarios;
CREATE POLICY "Admins leem logs de usuarios" ON public.audit_logs_usuarios
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Autenticado registra log de auditoria" ON public.audit_logs_usuarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- avaliacoes_chamados: usuario insere para o proprio chamado
DROP POLICY IF EXISTS "Usuario avalia proprio chamado" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Gestores e admins veem todas as avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario ve propria avaliacao" ON public.avaliacoes_chamados;

CREATE POLICY "Usuario avalia proprio chamado" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND (t.criado_por = auth.uid() OR lower(t.solicitante_email) = lower(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "Gestores e admins veem todas as avaliacoes" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (public.is_gestor_or_admin());

CREATE POLICY "Usuario ve propria avaliacao" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 9. Função Segura para Sincronizar Perfil e Aplicar Pré-cadastro no Login
CREATE OR REPLACE FUNCTION public.sync_user_profile(
  p_nome text DEFAULT NULL,
  p_foto_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_pre_role public.app_role;
  v_current_role public.app_role := 'usuario';
  v_bloqueado boolean := false;
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 1. Verifica pré-cadastro por e-mail
  SELECT role INTO v_pre_role FROM public.pre_registered_roles WHERE lower(email) = v_email;
  IF v_pre_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_pre_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 2. Administradores nomeados recebem automaticamente papel admin e gestor
  IF v_email IN ('claudinei.lima@senaimt.ind.br', 'claudineigoncalvesdelima@hotmail.com', 'klawdhynney@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'gestor') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 3. Atualiza ou insere perfil
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

  -- 4. Recupera papel mais alto do usuário
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

-- 10. Funções Administrativas de Gestão de Usuários (Ajuste 5)
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id uuid,
  email text,
  nome text,
  foto_url text,
  role text,
  bloqueado boolean,
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
    p.ultimo_acesso,
    p.created_at
  FROM public.user_profiles p
  ORDER BY p.ultimo_acesso DESC NULLS LAST, p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- Função para alterar papel de usuário com proteção do último admin
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_alvo_id uuid,
  p_novo_role text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text := lower(auth.jwt() ->> 'email');
  v_alvo_email text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar perfis.';
  END IF;

  SELECT email INTO v_alvo_email FROM public.user_profiles WHERE id = p_alvo_id;
  IF v_alvo_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Regra: Não permitir rebaixar a si próprio por engano
  IF p_alvo_id = v_admin_id AND p_novo_role != 'admin' THEN
    RAISE EXCEPTION 'Você não pode rebaixar seu próprio perfil de administrador.';
  END IF;

  -- Regra: Não permitir que o último admin seja rebaixado
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_alvo_id AND role = 'admin') AND p_novo_role != 'admin' THEN
    SELECT count(DISTINCT user_id) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação cancelada: não é permitido rebaixar o único administrador do sistema.';
    END IF;
  END IF;

  -- Aplica novo perfil
  DELETE FROM public.user_roles WHERE user_id = p_alvo_id;
  IF p_novo_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'gestor') ON CONFLICT DO NOTHING;
  ELSIF p_novo_role = 'gestor' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'gestor') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (p_alvo_id, 'usuario') ON CONFLICT DO NOTHING;
  END IF;

  -- Registra auditoria
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

-- Função para bloquear/desbloquear usuário
CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(
  p_alvo_id uuid,
  p_bloqueado boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text := lower(auth.jwt() ->> 'email');
  v_alvo_email text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem bloquear usuários.';
  END IF;

  SELECT email INTO v_alvo_email FROM public.user_profiles WHERE id = p_alvo_id;
  IF v_alvo_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Regra: Não bloquear a si próprio
  IF p_alvo_id = v_admin_id AND p_bloqueado THEN
    RAISE EXCEPTION 'Você não pode bloquear a sua própria conta.';
  END IF;

  -- Regra: Não bloquear o último admin
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

-- Função para pré-cadastrar papel por e-mail
CREATE OR REPLACE FUNCTION public.admin_preregister_role(
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text := lower(auth.jwt() ->> 'email');
  v_clean_email text := lower(btrim(p_email));
  v_target_role public.app_role;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem pré-cadastrar perfis.';
  END IF;

  IF v_clean_email IS NULL OR v_clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail corporativo inválido.';
  END IF;

  v_target_role := p_role::public.app_role;

  INSERT INTO public.pre_registered_roles (email, role, criado_por)
  VALUES (v_clean_email, v_target_role, v_admin_id)
  ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    created_at = now();

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, acao, detalhes)
  VALUES (
    v_admin_id,
    v_admin_email,
    v_clean_email,
    'PRE_CADASTRO_PERFIL',
    jsonb_build_object('role', p_role)
  );

  RETURN jsonb_build_object('success', true, 'email', v_clean_email, 'role', p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preregister_role(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_preregister_role(text, text) TO authenticated;
