-- ============================================================================
-- MIGRATION: 20261012010000_remover_sistema_alertas_email.sql
-- Remoção completa do sistema legado de alertas por e-mail de chamados.
-- Remove triggers, funções, tabela outbox, RPCs e colunas de preferências de alertas.
-- Preserva 100% de usuários, chamados, mensagens, avaliações e login/autenticação.
-- ============================================================================

-- 1. REMOVER GATILHOS (TRIGGERS) DE ALERTAS
DROP TRIGGER IF EXISTS trg_ticket_notificacao_email ON public.tickets;
DROP TRIGGER IF EXISTS trg_mensagem_notificacao_email ON public.ticket_mensagens;

-- 2. REMOVER FUNÇÕES DE GATILHOS E AUXILIARES DE ALERTA
DROP FUNCTION IF EXISTS public.fn_trigger_ticket_notificacao_email() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_mensagem_notificacao_email() CASCADE;
DROP FUNCTION IF EXISTS public.usuario_deseja_alertas_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.alerta_email_habilitado_nas_regras(text) CASCADE;

-- 3. REMOVER RPCS DE FILA, TESTE E LOGS DE NOTIFICAÇÃO
DROP FUNCTION IF EXISTS public.get_email_notification_logs(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_pending_email_notifications(integer) CASCADE;
DROP FUNCTION IF EXISTS public.mark_email_notification_result(bigint, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_test_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_email_notifications(boolean) CASCADE;

-- 4. REMOVER POLÍTICAS RLS E TABELA DE FILA OUTBOX (notificacoes_email)
DROP POLICY IF EXISTS "notificacoes_email_admin_select" ON public.notificacoes_email;
DROP POLICY IF EXISTS "notificacoes_email_admin_modify" ON public.notificacoes_email;
DROP TABLE IF EXISTS public.notificacoes_email CASCADE;

-- 5. REMOVER COLUNA DE PREFERÊNCIA DE ALERTAS EM USER_PROFILES
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS notificacoes_email_ativas;

-- 6. LIMPAR CONFIGURAÇÃO DE ALERTAS EM CONFIGURACOES (ID 1)
UPDATE public.configuracoes
SET regras = regras - 'alertasEmail',
    updated_at = now()
WHERE id = 1 AND regras ? 'alertasEmail';
