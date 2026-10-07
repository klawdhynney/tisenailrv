-- Migration: Painel Gerenciável Total e Histórico de Configurações
-- Descrição: Cria tabela e triggers para rastreamento de alterações com desfazer (undo)
-- e garante políticas de RLS seguras para configuracoes e configuracao_historico.

CREATE TABLE IF NOT EXISTS public.configuracao_historico (
  id BIGSERIAL PRIMARY KEY,
  secao TEXT NOT NULL,
  chave TEXT NOT NULL,
  descricao TEXT,
  valor_anterior JSONB,
  valor_novo JSONB,
  alterado_por_email TEXT,
  alterado_por_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_configuracao_historico_secao ON public.configuracao_historico (secao);
CREATE INDEX IF NOT EXISTS idx_configuracao_historico_criado_em ON public.configuracao_historico (criado_em DESC);

-- Habilitar RLS
ALTER TABLE public.configuracao_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para configuracao_historico
DROP POLICY IF EXISTS "Admins e gestores podem ler historico de configuracoes" ON public.configuracao_historico;
CREATE POLICY "Admins e gestores podem ler historico de configuracoes"
  ON public.configuracao_historico
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admins podem inserir no historico de configuracoes" ON public.configuracao_historico;
CREATE POLICY "Admins podem inserir no historico de configuracoes"
  ON public.configuracao_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- Bloqueia exclusões e updates no histórico para auditoria estrita
CREATE OR REPLACE FUNCTION public.proibir_exclusao_configuracao_historico()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registros de histórico de configurações não podem ser excluídos ou alterados (auditoria estrita).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proibir_delete_config_historico ON public.configuracao_historico;
CREATE TRIGGER trg_proibir_delete_config_historico
  BEFORE UPDATE OR DELETE ON public.configuracao_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.proibir_exclusao_configuracao_historico();

-- RPC Segura para registrar alteração de configuração
CREATE OR REPLACE FUNCTION public.registrar_alteracao_configuracao(
  p_secao TEXT,
  p_chave TEXT,
  p_descricao TEXT,
  p_valor_anterior JSONB,
  p_valor_novo JSONB,
  p_autor_email TEXT,
  p_autor_nome TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.configuracao_historico (
    secao,
    chave,
    descricao,
    valor_anterior,
    valor_novo,
    alterado_por_email,
    alterado_por_nome,
    criado_em
  ) VALUES (
    p_secao,
    p_chave,
    p_descricao,
    p_valor_anterior,
    p_valor_novo,
    p_autor_email,
    p_autor_nome,
    now()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Função RPC para administradores reverterem (desfazer) uma alteração via banco
CREATE OR REPLACE FUNCTION public.desfazer_alteracao_configuracao(p_historico_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem desfazer alterações de configuração.';
  END IF;

  SELECT * INTO v_item FROM public.configuracao_historico WHERE id = p_historico_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Reverte valor_novo para valor_anterior na tabela configuracoes se aplicável
  IF v_item.chave IS NOT NULL AND v_item.valor_anterior IS NOT NULL THEN
    UPDATE public.configuracoes
    SET valor = v_item.valor_anterior,
        atualizado_em = now()
    WHERE chave = v_item.chave;
  END IF;

  -- Registra no histórico que foi desfeita
  INSERT INTO public.configuracao_historico (
    secao,
    chave,
    descricao,
    valor_anterior,
    valor_novo,
    alterado_por_email,
    alterado_por_nome,
    criado_em
  ) VALUES (
    v_item.secao,
    v_item.chave,
    'Reversão (Undo) da alteração #' || p_historico_id,
    v_item.valor_novo,
    v_item.valor_anterior,
    auth.jwt() ->> 'email',
    'Administrador (Reversão)',
    now()
  );

  RETURN true;
END;
$$;


-- Garantir RLS na tabela configuracoes
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de configuracoes" ON public.configuracoes;
CREATE POLICY "Leitura publica de configuracoes"
  ON public.configuracoes
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores podem atualizar configuracoes" ON public.configuracoes;
CREATE POLICY "Apenas administradores podem atualizar configuracoes"
  ON public.configuracoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

COMMENT ON TABLE public.configuracao_historico IS 'Histórico imutável de alterações nas configurações e regras do sistema para auditoria e desfazer (undo).';
