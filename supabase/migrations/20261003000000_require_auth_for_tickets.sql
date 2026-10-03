-- Migração 20261003000000: Exige autenticação (Google / Microsoft) para abertura e visualização de chamados
-- Preserva todo o histórico de chamados existentes sem apagar nenhum registro.
-- Sem login: nenhum chamado individual pode ser lido ou criado.
-- Solicitantes autenticados: veem e abrem apenas os seus próprios chamados (vinculados ao seu auth.uid ou e-mail corporativo).
-- Gestores e equipe de TI: mantêm acesso irrestrito para ver, gerenciar e atualizar todos os chamados (novos e antigos).

-- 1. Revoga permissões anônimas da tabela de chamados
REVOKE ALL ON public.tickets FROM anon;
REVOKE ALL ON public.tickets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza de políticas anteriores que permitiam abertura pública ou leitura ampla
DROP POLICY IF EXISTS "Qualquer pessoa abre chamado" ON public.tickets;
DROP POLICY IF EXISTS "Qualquer pessoa abre chamado com email" ON public.tickets;
DROP POLICY IF EXISTS "Usuario corporativo abre chamado" ON public.tickets;
DROP POLICY IF EXISTS "Usuario corporativo ve seus chamados" ON public.tickets;
DROP POLICY IF EXISTS "Solicitante confirmado ve seus chamados" ON public.tickets;
DROP POLICY IF EXISTS "Usuario autenticado abre chamado" ON public.tickets;
DROP POLICY IF EXISTS "Usuario autenticado ve seus chamados" ON public.tickets;
DROP POLICY IF EXISTS "Usuario autenticado atualiza chamado" ON public.tickets;
DROP POLICY IF EXISTS "Gestores autorizados veem chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores autorizados atualizam chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores autorizados criam chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores autorizados excluem chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestor ve chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestor cria chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestor atualiza chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestor exclui chamados" ON public.tickets;
DROP POLICY IF EXISTS "Solicitante autenticado abre chamado" ON public.tickets;
DROP POLICY IF EXISTS "Solicitante ve apenas seus chamados" ON public.tickets;
DROP POLICY IF EXISTS "Gestores veem todos os chamados" ON public.tickets;

-- 3. Políticas para Gestores / Equipe de TI (acesso completo a chamados novos e históricos)
CREATE POLICY "Gestores veem todos os chamados" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores criam chamados" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores atualizam chamados" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores excluem chamados" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.is_named_manager() OR public.has_role(auth.uid(), 'gestor'));

-- 4. Políticas para Usuários Solicitantes (apenas próprios chamados autenticados)
CREATE POLICY "Solicitante autenticado abre chamado" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (criado_por = auth.uid() OR criado_por IS NULL)
    AND (solicitante_email IS NULL OR lower(solicitante_email) = lower(auth.jwt() ->> 'email'))
    AND status = 'Aberto'
  );

CREATE POLICY "Solicitante ve apenas seus chamados" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR (solicitante_email IS NOT NULL AND lower(solicitante_email) = lower(auth.jwt() ->> 'email'))
    )
  );

-- 5. Atualização da função segura de abertura com comprovante
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para abrir chamado. Entre com Google ou Microsoft.';
  END IF;

  user_email := coalesce(nullif(lower(btrim(p_email)), ''), lower(auth.jwt() ->> 'email'));

  IF p_solicitante IS NULL OR length(btrim(p_solicitante)) NOT BETWEEN 2 AND 120
    OR user_email IS NULL OR length(btrim(user_email)) NOT BETWEEN 5 AND 254
    OR btrim(user_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    OR p_setor IS NULL OR length(btrim(p_setor)) NOT BETWEEN 2 AND 120
    OR p_categoria IS NULL OR length(btrim(p_categoria)) NOT BETWEEN 2 AND 120
    OR p_descricao IS NULL OR length(btrim(p_descricao)) NOT BETWEEN 10 AND 3000
    OR length(coalesce(p_contato, '')) > 40 THEN
    RAISE EXCEPTION 'Dados do chamado inválidos';
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
    btrim(p_solicitante),
    user_email,
    nullif(btrim(p_contato), ''),
    btrim(p_setor),
    left(btrim(coalesce(p_local, '')), 240),
    btrim(p_categoria),
    btrim(p_descricao),
    'Média',
    'Aberto',
    auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) TO authenticated;

-- 6. Atualização de public_ticket_sla_progress para proteger dados individuais
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

  IF public.is_named_manager() OR public.has_role(auth.uid(), 'gestor') THEN
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.hora, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em, t.horario, t.sla_reiniciado_em
    FROM public.tickets t ORDER BY t.id DESC;
  ELSE
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.hora, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em, t.horario, t.sla_reiniciado_em
    FROM public.tickets t
    WHERE t.criado_por = auth.uid() OR (t.solicitante_email IS NOT NULL AND lower(t.solicitante_email) = lower(auth.jwt() ->> 'email'))
    ORDER BY t.id DESC;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;

-- 7. Atualização de public_ticket_progress para proteger dados individuais
CREATE OR REPLACE FUNCTION public.public_ticket_progress()
RETURNS TABLE (
  id integer,
  aberto_em date,
  prioridade text,
  status text,
  categoria text,
  fechado_em date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF public.is_named_manager() OR public.has_role(auth.uid(), 'gestor') THEN
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t ORDER BY t.id DESC;
  ELSE
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t
    WHERE t.criado_por = auth.uid() OR (t.solicitante_email IS NOT NULL AND lower(t.solicitante_email) = lower(auth.jwt() ->> 'email'))
    ORDER BY t.id DESC;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.public_ticket_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_progress() TO authenticated;
