-- ============================================================================
-- MIGRATION: 0022_sla_chat_usuarios.sql
-- SLA Pausado, Chat de Chamados com RLS, e Listagem/Exportação de Usuários
-- ============================================================================

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausado_em timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_motivo text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_pausa_autor text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_historico_pausas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_segundos_pausados_acumulados integer NOT NULL DEFAULT 0;

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

ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens(ticket_id, criado_em ASC);
