CREATE FUNCTION public.open_public_ticket_with_receipt(p_solicitante text, p_email text, p_contato text, p_setor text, p_local text, p_categoria text, p_descricao text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id integer;
BEGIN
  IF p_solicitante IS NULL OR length(btrim(p_solicitante)) NOT BETWEEN 2 AND 120
    OR p_email IS NULL OR length(btrim(p_email)) NOT BETWEEN 5 AND 254
    OR btrim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    OR p_setor IS NULL OR length(btrim(p_setor)) NOT BETWEEN 2 AND 120
    OR p_local IS NULL OR length(btrim(p_local)) NOT BETWEEN 3 AND 240
    OR p_categoria IS NULL OR length(btrim(p_categoria)) NOT BETWEEN 2 AND 120
    OR p_descricao IS NULL OR length(btrim(p_descricao)) NOT BETWEEN 10 AND 3000
    OR length(coalesce(p_contato, '')) > 40 THEN
    RAISE EXCEPTION 'Dados do chamado inválidos';
  END IF;
  INSERT INTO public.tickets (solicitante, solicitante_email, contato, setor, local, categoria, descricao, prioridade, status, criado_por)
  VALUES (btrim(p_solicitante), lower(btrim(p_email)), nullif(btrim(p_contato), ''), btrim(p_setor), btrim(p_local), btrim(p_categoria), btrim(p_descricao), 'Média', 'Aberto', auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_public_ticket_with_receipt(text,text,text,text,text,text,text) TO anon, authenticated;