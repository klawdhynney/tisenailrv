-- ============================================================================
-- SCRIPT DE EXECUÇÃO: CARTEIRA DE CADASTRO BÁSICO DE USUÁRIOS
-- TI SENAI LRV - Lovable Cloud / Supabase SQL Editor
-- 
-- 100% Idempotente e Seguro: não exclui nenhum dado existente.
-- Executa a criação/atualização de user_profiles, user_roles, pre_registered_roles,
-- audit_logs_usuarios, tickets(solicitante_id),
-- funções has_role, is_admin, is_named_manager, is_gestor_or_admin,
-- sync_user_profile, update_my_profile, open_public_ticket_with_receipt,
-- admin_get_users, admin_edit_user_profile, admin_update_user_role,
-- admin_toggle_user_block, gatilho de cadastro e políticas de RLS.
-- ============================================================================

-- 1. Compatibilidade com papéis em texto (sem erros de enum)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'role') THEN
    ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pre_registered_roles' AND column_name = 'role') THEN
    ALTER TABLE public.pre_registered_roles ALTER COLUMN role TYPE text USING role::text;
  END IF;
END $$;

-- 2. Tabela user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  nome text,
  foto_url text,
  setor text NOT NULL DEFAULT 'Pendente',
  cargo text,
  telefone text,
  local_padrao text,
  matricula text,
  status text NOT NULL DEFAULT 'ativo',
  bloqueado boolean NOT NULL DEFAULT false,
  tema_preferido text,
  notificacoes_email_ativas boolean DEFAULT true,
  ultimo_acesso timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_profiles_status CHECK (status IN ('ativo', 'inativo'))
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS setor text NOT NULL DEFAULT 'Pendente';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS local_padrao text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS matricula text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS tema_preferido text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS notificacoes_email_ativas boolean DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz DEFAULT now();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.user_profiles
SET status = CASE WHEN bloqueado = true THEN 'inativo' ELSE 'ativo' END
WHERE status IS NULL OR (bloqueado = true AND status = 'ativo') OR (bloqueado = false AND status = 'inativo');

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_setor ON public.user_profiles(setor);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_matricula ON public.user_profiles(matricula);

-- 3. Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'role') THEN
    ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 3.1 Tabela pre_registered_roles
CREATE TABLE IF NOT EXISTS public.pre_registered_roles (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pre_registered_roles' AND column_name = 'role') THEN
    ALTER TABLE public.pre_registered_roles ALTER COLUMN role TYPE text USING role::text;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pre_registered_roles_email ON public.pre_registered_roles(email);
ALTER TABLE public.pre_registered_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins gerenciam pre_registered_roles" ON public.pre_registered_roles;
CREATE POLICY "Admins gerenciam pre_registered_roles" ON public.pre_registered_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
GRANT ALL ON public.pre_registered_roles TO authenticated, service_role;

-- 3.2 Tabela audit_logs_usuarios
CREATE TABLE IF NOT EXISTS public.audit_logs_usuarios (
  id serial PRIMARY KEY,
  admin_id uuid,
  admin_email text,
  alvo_email text,
  alvo_user_id uuid,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuarios_admin_id ON public.audit_logs_usuarios(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuarios_alvo_user_id ON public.audit_logs_usuarios(alvo_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuarios_created_at ON public.audit_logs_usuarios(created_at DESC);
ALTER TABLE public.audit_logs_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins leem logs de auditoria" ON public.audit_logs_usuarios;
CREATE POLICY "Admins leem logs de auditoria" ON public.audit_logs_usuarios
  FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Admins inserem logs de auditoria" ON public.audit_logs_usuarios;
CREATE POLICY "Admins inserem logs de auditoria" ON public.audit_logs_usuarios
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);
GRANT SELECT, INSERT ON public.audit_logs_usuarios TO authenticated, service_role;

-- 4. Funções de papéis e checagem de permissão
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_norm text := lower(btrim(_role));
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_role_norm IN ('admin', 'administrador') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'admin');
  ELSIF v_role_norm IN ('gestor', 'tecnico', 'técnico') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND (role::text = 'gestor' OR role::text = 'tecnico'));
  ELSIF v_role_norm IN ('usuario', 'usuário', 'solicitante') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND (role::text = 'usuario' OR role::text = 'solicitante'))
      OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
  ELSE
    RETURN false;
  END IF;
END;
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

  RETURN public.has_role(auth.uid(), 'gestor')
      OR public.has_role(auth.uid(), 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_named_manager() OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_named_manager() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gestor_or_admin() TO anon, authenticated, service_role;

-- 5. Vínculo da tabela tickets com solicitante_id
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS solicitante_id uuid;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS criado_por uuid;
CREATE INDEX IF NOT EXISTS idx_tickets_solicitante_id ON public.tickets(solicitante_id);

UPDATE public.tickets t
SET solicitante_id = u.id
FROM public.user_profiles u
WHERE t.solicitante_id IS NULL
  AND t.solicitante_email IS NOT NULL
  AND lower(btrim(t.solicitante_email)) = lower(btrim(u.email));

UPDATE public.tickets
SET solicitante_id = criado_por
WHERE solicitante_id IS NULL
  AND criado_por IS NOT NULL;

-- 6. Gatilho de cadastro de usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome text;
  v_email text;
  v_pre_role text;
BEGIN
  v_email := lower(btrim(coalesce(new.email, '')));
  v_nome := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(v_email, '@', 1)
  );

  INSERT INTO public.user_profiles (
    id, email, nome, foto_url, setor, status, bloqueado, created_at, updated_at, ultimo_acesso
  )
  VALUES (
    new.id, v_email, v_nome, nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    'Pendente', 'ativo', false, coalesce(new.created_at, now()), now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = coalesce(public.user_profiles.nome, EXCLUDED.nome),
    foto_url = coalesce(public.user_profiles.foto_url, EXCLUDED.foto_url),
    ultimo_acesso = now(),
    updated_at = now();

  SELECT role::text INTO v_pre_role
  FROM public.pre_registered_roles
  WHERE lower(btrim(email)) = v_email;

  IF v_pre_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, v_pre_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'usuario')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_email IN (
    'klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'gestor') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill idempotente
INSERT INTO public.user_profiles (
  id, email, nome, foto_url, setor, status, bloqueado, created_at, updated_at, ultimo_acesso
)
SELECT
  u.id,
  lower(btrim(u.email)),
  coalesce(
    nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  nullif(btrim(u.raw_user_meta_data->>'avatar_url'), ''),
  'Pendente', 'ativo', false, coalesce(u.created_at, now()), now(), now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'usuario'
FROM public.user_profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'
FROM public.user_profiles p
WHERE lower(btrim(p.email)) IN ('klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'gestor'
FROM public.user_profiles p
WHERE lower(btrim(p.email)) IN ('klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br')
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. sync_user_profile
DROP FUNCTION IF EXISTS public.sync_user_profile(text, text);
DROP FUNCTION IF EXISTS public.sync_user_profile();
CREATE OR REPLACE FUNCTION public.sync_user_profile(
  p_nome text DEFAULT NULL,
  p_foto_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(auth.jwt() ->> 'email'));
  v_current_role text := 'usuario';
  v_status text := 'ativo';
  v_bloqueado boolean := false;
  v_setor text := 'Pendente';
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  IF v_email IN ('klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'gestor') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, nome, foto_url, setor, status, bloqueado, ultimo_acesso, updated_at
  )
  VALUES (
    v_user_id, v_email, nullif(btrim(p_nome), ''), nullif(btrim(p_foto_url), ''), 'Pendente', 'ativo', false, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = coalesce(public.user_profiles.nome, nullif(btrim(EXCLUDED.nome), '')),
    foto_url = coalesce(nullif(btrim(EXCLUDED.foto_url), ''), public.user_profiles.foto_url),
    ultimo_acesso = now(),
    updated_at = now()
  RETURNING status, bloqueado, setor INTO v_status, v_bloqueado, v_setor;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin') THEN
    v_current_role := 'admin';
  ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND (role::text = 'gestor' OR role::text = 'tecnico')) THEN
    v_current_role := 'gestor';
  ELSE
    v_current_role := 'usuario';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_user_id,
    'email', v_email,
    'role', v_current_role,
    'status', v_status,
    'bloqueado', v_bloqueado,
    'setor', v_setor
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(text, text) TO authenticated, service_role;

-- 8. update_my_profile
DROP FUNCTION IF EXISTS public.update_my_profile(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_my_profile(text, text, text, text);
DROP FUNCTION IF EXISTS public.update_my_profile(text, text);
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_nome text,
  p_setor text,
  p_cargo text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_local_padrao text DEFAULT NULL,
  p_matricula text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nome_limpo text;
  v_setor_limpo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso não autenticado.';
  END IF;

  v_nome_limpo := btrim(coalesce(p_nome, ''));
  v_setor_limpo := btrim(coalesce(p_setor, ''));

  IF length(v_nome_limpo) < 2 THEN
    RAISE EXCEPTION 'Nome completo é obrigatório (mínimo de 2 caracteres).';
  END IF;

  IF length(v_setor_limpo) < 2 OR v_setor_limpo = 'Pendente' THEN
    RAISE EXCEPTION 'Selecione um setor válido da lista.';
  END IF;

  UPDATE public.user_profiles
  SET
    nome = v_nome_limpo,
    setor = v_setor_limpo,
    cargo = nullif(btrim(p_cargo), ''),
    telefone = nullif(btrim(p_telefone), ''),
    local_padrao = nullif(btrim(p_local_padrao), ''),
    matricula = nullif(btrim(p_matricula), ''),
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro atualizado com sucesso!'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, text, text) TO authenticated, service_role;

-- 9. open_public_ticket_with_receipt (DROP OBRIGATÓRIO PARA ALTERAÇÃO DE NOMES DE PARÂMETROS)
DROP FUNCTION IF EXISTS public.open_public_ticket_with_receipt(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.open_public_ticket_with_receipt(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.open_public_ticket_with_receipt(text, text, text, text, text);
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
  v_bloqueado boolean := false;
  v_status text := 'ativo';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para abrir chamado. Entre com Google ou Microsoft.';
  END IF;

  SELECT coalesce(bloqueado, false), coalesce(status, 'ativo')
  INTO v_bloqueado, v_status
  FROM public.user_profiles
  WHERE id = v_uid;

  IF v_bloqueado = true OR v_status = 'inativo' THEN
    RAISE EXCEPTION 'Seu usuário está inativo no momento. Entre em contato com a equipe de TI para reativar seu acesso.';
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
    solicitante_id,
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
    v_uid,
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
GRANT EXECUTE ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) TO authenticated, service_role;

-- 10. RPCs Administrativas
DROP FUNCTION IF EXISTS public.admin_get_users();
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
      'setor', coalesce(p.setor, 'Pendente'),
      'cargo', p.cargo,
      'telefone', p.telefone,
      'local_padrao', p.local_padrao,
      'matricula', p.matricula,
      'status', coalesce(p.status, CASE WHEN p.bloqueado THEN 'inativo' ELSE 'ativo' END),
      'bloqueado', coalesce(p.bloqueado, false),
      'ultimo_acesso', p.ultimo_acesso,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'role', coalesce(
        (SELECT CASE ur.role::text
           WHEN 'admin' THEN 'admin'
           WHEN 'gestor' THEN 'tecnico'
           WHEN 'tecnico' THEN 'tecnico'
           ELSE 'usuario'
         END
         FROM public.user_roles ur WHERE ur.user_id = p.id
         ORDER BY CASE ur.role::text WHEN 'admin' THEN 1 WHEN 'gestor' THEN 2 WHEN 'tecnico' THEN 2 ELSE 3 END LIMIT 1),
        'usuario'
      ),
      'total_chamados', (
        SELECT count(*)::integer
        FROM public.tickets t
        WHERE t.solicitante_id = p.id
           OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(p.email)))
      )
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.user_profiles p;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_edit_user_profile(uuid, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_edit_user_profile(uuid, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.admin_edit_user_profile(
  p_target_user_id uuid,
  p_nome text,
  p_setor text,
  p_cargo text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_local_padrao text DEFAULT NULL,
  p_matricula text DEFAULT NULL,
  p_status text DEFAULT 'ativo'
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_email text;
  v_target_email text;
  v_novo_status text := lower(btrim(coalesce(p_status, 'ativo')));
  v_bloqueado boolean := (v_novo_status = 'inativo');
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem editar cadastros.';
  END IF;

  SELECT email INTO v_target_email FROM public.user_profiles WHERE id = p_target_user_id;
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF p_target_user_id = auth.uid() AND v_novo_status = 'inativo' THEN
    RAISE EXCEPTION 'Você não pode desativar o seu próprio usuário administrador.';
  END IF;

  IF v_novo_status = 'inativo' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin') THEN
    SELECT count(DISTINCT ur.user_id) INTO v_admin_count
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_id
    WHERE ur.role = 'admin' AND up.bloqueado = false AND up.status = 'ativo';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação não permitida: este é o único administrador ativo do sistema.';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    nome = btrim(p_nome),
    setor = btrim(p_setor),
    cargo = nullif(btrim(p_cargo), ''),
    telefone = nullif(btrim(p_telefone), ''),
    local_padrao = nullif(btrim(p_local_padrao), ''),
    matricula = nullif(btrim(p_matricula), ''),
    status = v_novo_status,
    bloqueado = v_bloqueado,
    updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (
    auth.uid(),
    v_admin_email,
    coalesce(v_target_email, p_target_user_id::text),
    p_target_user_id,
    'EDITAR_CADASTRO_ADMIN',
    jsonb_build_object('nome', p_nome, 'setor', p_setor, 'cargo', p_cargo, 'status', v_novo_status)
  );

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_edit_user_profile(uuid, text, text, text, text, text, text, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, text);
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, public.app_role);
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_email text;
  v_target_email text;
  v_role_clean text;
  v_role_norm text := lower(btrim(p_new_role));
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar papéis.';
  END IF;

  SELECT email INTO v_target_email FROM public.user_profiles WHERE id = p_target_user_id;
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF v_role_norm IN ('admin', 'administrador') THEN
    v_role_clean := 'admin';
  ELSIF v_role_norm IN ('tecnico', 'técnico', 'gestor') THEN
    v_role_clean := 'gestor';
  ELSE
    v_role_clean := 'usuario';
  END IF;

  IF v_role_clean <> 'admin' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin') THEN
    SELECT count(DISTINCT ur.user_id) INTO v_admin_count
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_id
    WHERE ur.role = 'admin' AND up.bloqueado = false AND up.status = 'ativo';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação não permitida: não é possível remover o papel do único administrador ativo.';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, v_role_clean)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (
    auth.uid(),
    v_admin_email,
    coalesce(v_target_email, p_target_user_id::text),
    p_target_user_id,
    'ALTERAR_PAPEL',
    jsonb_build_object('novo_papel', v_role_norm)
  );

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_toggle_user_block(uuid, boolean);
CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(
  p_target_user_id uuid,
  p_bloquear boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_email text;
  v_admin_email text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o status de usuários.';
  END IF;

  IF p_target_user_id = auth.uid() AND p_bloquear THEN
    RAISE EXCEPTION 'Você não pode desativar o seu próprio usuário administrador.';
  END IF;

  SELECT email INTO v_target_email FROM public.user_profiles WHERE id = p_target_user_id;
  v_admin_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF p_bloquear AND lower(btrim(coalesce(v_target_email, ''))) IN (
    'klaw.com@gmail.com', 'klawdhynney@gmail.com', 'claudineigoncalvesdelima@hotmail.com', 'claudinei.lima@senaimt.ind.br'
  ) THEN
    RAISE EXCEPTION 'Não é permitido desativar um administrador raiz da plataforma.';
  END IF;

  IF p_bloquear AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin') THEN
    SELECT count(DISTINCT ur.user_id) INTO v_admin_count
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_id
    WHERE ur.role = 'admin' AND up.bloqueado = false AND up.status = 'ativo';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação não permitida: não é possível desativar o único administrador ativo do sistema.';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    bloqueado = p_bloquear,
    status = CASE WHEN p_bloquear THEN 'inativo' ELSE 'ativo' END,
    updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.audit_logs_usuarios (admin_id, admin_email, alvo_email, alvo_user_id, acao, detalhes)
  VALUES (
    auth.uid(),
    v_admin_email,
    coalesce(v_target_email, p_target_user_id::text),
    p_target_user_id,
    CASE WHEN p_bloquear THEN 'DESATIVAR_USUARIO' ELSE 'ATIVAR_USUARIO' END,
    jsonb_build_object('bloqueado', p_bloquear, 'status', CASE WHEN p_bloquear THEN 'inativo' ELSE 'ativo' END)
  );

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_block(uuid, boolean) TO authenticated, service_role;

-- 11. Políticas de RLS em public.user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem proprio perfil ou admin ve todos" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR (
      public.is_gestor_or_admin()
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE (t.solicitante_id = user_profiles.id OR lower(btrim(t.solicitante_email)) = lower(btrim(user_profiles.email)))
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil ou admin atualiza" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Usuarios inserem proprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated, service_role;
