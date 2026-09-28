CREATE OR REPLACE FUNCTION public.claim_manager_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  verified_email text;
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'provider') NOT IN ('google', 'microsoft', 'azure') THEN
    RETURN false;
  END IF;
  SELECT lower(email) INTO verified_email
    FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL OR verified_email NOT IN (
    'claudinei.lima@senaimt.ind.br',
    'claudineigoncalvesdelima@hotmail.com',
    'klawdhynney@gmail.com'
  ) OR verified_email IS DISTINCT FROM lower(auth.jwt() ->> 'email') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'gestor') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_manager_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_manager_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_named_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'gestor')
    AND (auth.jwt() -> 'app_metadata' ->> 'provider') IN ('google', 'microsoft', 'azure')
    AND lower(auth.jwt() ->> 'email') IN (
      'claudinei.lima@senaimt.ind.br',
      'claudineigoncalvesdelima@hotmail.com',
      'klawdhynney@gmail.com'
    );
$$;
REVOKE ALL ON FUNCTION public.is_named_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_named_manager() TO authenticated;

CREATE POLICY "Gestores autorizados veem chamados" ON public.tickets FOR SELECT TO authenticated USING (public.is_named_manager());
CREATE POLICY "Gestores autorizados atualizam chamados" ON public.tickets FOR UPDATE TO authenticated USING (public.is_named_manager()) WITH CHECK (public.is_named_manager());
CREATE POLICY "Gestores autorizados criam chamados" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.is_named_manager());
CREATE POLICY "Gestores autorizados excluem chamados" ON public.tickets FOR DELETE TO authenticated USING (public.is_named_manager());
CREATE POLICY "Gestores autorizados alteram regras" ON public.configuracoes FOR UPDATE TO authenticated USING (public.is_named_manager()) WITH CHECK (public.is_named_manager());
CREATE POLICY "Gestores autorizados criam regras" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (public.is_named_manager());