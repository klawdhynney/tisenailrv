-- ==============================================================================
-- Migration: 20261006020000_tema_preferido_usuario.sql
-- Descrição: Adiciona preferência de tema do usuário em user_profiles e RPC seguro
-- Idempotente e compatível com RLS
-- ==============================================================================

-- 1. Coluna de preferência de tema em user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tema_preferido text DEFAULT 'auto';

-- 2. Função RPC segura para o usuário atualizar sua preferência de tema
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

  -- Valida os valores aceitos
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
