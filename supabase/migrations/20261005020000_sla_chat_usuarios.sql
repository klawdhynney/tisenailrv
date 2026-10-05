-- ============================================================================
-- MIGRATION: 20261005020000_sla_chat_usuarios.sql
-- SLA Pausado, Chat de Chamados com RLS, e Listagem/Exportação de Usuários
-- Idempotente, não destrutiva e que preserva todos os dados existentes
-- ============================================================================

-- 1. ADICIONAR COLUNAS DE PAUSA DE SLA NA TABELA TICKETS
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado_em timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_motivo text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_autor text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_historico_pausas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_segundos_pausados_acumulados integer NOT NULL DEFAULT 0;

-- 2. CRIAR TABELA DE MENSAGENS / CONVERSAS DO CHAMADO (CHAT)
CREATE TABLE IF NOT EXISTS public.ticket_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  autor_nome text NOT NULL,
  autor_email text NOT NULL,
  autor_tipo text NOT NULL CHECK (autor_tipo IN ('solicitante', 'equipe', 'sistema')),
  mensagem text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;

-- Índices de desempenho
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens(ticket_id, criado_em ASC);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_user_id ON public.ticket_mensagens(user_id);

-- Políticas de RLS para ticket_mensagens
DROP POLICY IF EXISTS "ticket_mensagens_select_policy" ON public.ticket_mensagens;
CREATE POLICY "ticket_mensagens_select_policy" ON public.ticket_mensagens
  FOR SELECT TO authenticated
  USING (
    public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_mensagens.ticket_id
        AND (
          t.user_id = auth.uid()
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt()->>'email')))
        )
    )
  );

DROP POLICY IF EXISTS "ticket_mensagens_insert_policy" ON public.ticket_mensagens;
CREATE POLICY "ticket_mensagens_insert_policy" ON public.ticket_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_named_manager()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_mensagens.ticket_id
        AND (
          t.user_id = auth.uid()
          OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt()->>'email')))
        )
    )
  );

GRANT SELECT, INSERT ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;

-- Publicação em Realtime para conversa instantânea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_mensagens;
  END IF;
END $$;

-- 3. MIGRAÇÃO DE INFORMAÇÕES ATUAIS (PROCEDIMENTOS E NOTAS) PARA O CHAT SEM PERDER NADA
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

-- 4. ATUALIZAR public_ticket_sla_progress PARA EXPOR STATUS DO SLA PAUSADO
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
  sla_reiniciado_em text,
  sla_pausado boolean,
  sla_pausado_em timestamptz,
  sla_pausa_motivo text,
  sla_segundos_pausados_acumulados integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF public.is_named_manager() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin') THEN
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
      t.sla_reiniciado_em,
      COALESCE(t.sla_pausado, false),
      t.sla_pausado_em,
      t.sla_pausa_motivo,
      COALESCE(t.sla_segundos_pausados_acumulados, 0)
    FROM public.tickets t
    ORDER BY t.id DESC;
  ELSE
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
      t.sla_reiniciado_em,
      COALESCE(t.sla_pausado, false),
      t.sla_pausado_em,
      t.sla_pausa_motivo,
      COALESCE(t.sla_segundos_pausados_acumulados, 0)
    FROM public.tickets t
    WHERE t.criado_por = auth.uid()
       OR t.user_id = auth.uid()
       OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt()->>'email')))
    ORDER BY t.id DESC;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;

-- 5. ATUALIZAR admin_get_users PARA INCLUIR PROVEDOR E TOTAL DE CHAMADOS
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
  provedor text,
  total_chamados bigint,
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
    coalesce(
      (SELECT u.raw_app_meta_data->>'provider' FROM auth.users u WHERE u.id = p.id),
      (SELECT u.raw_app_meta_data->'providers'->>0 FROM auth.users u WHERE u.id = p.id),
      'email'
    ) AS provedor,
    coalesce(
      (SELECT count(*)::bigint FROM public.tickets t WHERE t.user_id = p.id OR lower(btrim(t.solicitante_email)) = lower(btrim(p.email))),
      0::bigint
    ) AS total_chamados,
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
    'pendente'::text AS provedor,
    coalesce(
      (SELECT count(*)::bigint FROM public.tickets t WHERE lower(btrim(t.solicitante_email)) = lower(btrim(pr.email))),
      0::bigint
    ) AS total_chamados,
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
