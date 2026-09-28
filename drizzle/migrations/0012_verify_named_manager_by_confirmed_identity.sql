CREATE OR REPLACE FUNCTION public.claim_manager_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE verified_email text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 SELECT lower(email) INTO verified_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
 IF verified_email IS NULL OR verified_email NOT IN ('claudinei.lima@senaimt.ind.br','claudineigoncalvesdelima@hotmail.com','klawdhynney@gmail.com')
 OR verified_email IS DISTINCT FROM lower(auth.jwt() ->> 'email')
 OR NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = auth.uid() AND provider IN ('google','azure','microsoft')) THEN RETURN false; END IF;
 INSERT INTO public.user_roles (user_id,role) VALUES (auth.uid(),'gestor') ON CONFLICT (user_id,role) DO NOTHING;
 RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.is_named_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'gestor')
 AND lower(auth.jwt() ->> 'email') IN ('claudinei.lima@senaimt.ind.br','claudineigoncalvesdelima@hotmail.com','klawdhynney@gmail.com')
 AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
 AND EXISTS (SELECT 1 FROM auth.identities WHERE user_id = auth.uid() AND provider IN ('google','azure','microsoft'));
$$;