CREATE TYPE public.app_role AS ENUM ('gestor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Ver o proprio papel" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.tickets (
  id serial PRIMARY KEY,
  aberto_em date NOT NULL DEFAULT current_date,
  hora text NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  solicitante text NOT NULL,
  setor text NOT NULL,
  local text NOT NULL DEFAULT '',
  descricao text NOT NULL,
  categoria text,
  prioridade text NOT NULL DEFAULT 'Média',
  responsavel text,
  status text NOT NULL DEFAULT 'Aberto',
  fechado_em date,
  horario text,
  procedimento text,
  contato text,
  sla_reiniciado_em text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.tickets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT USAGE ON SEQUENCE public.tickets_id_seq TO anon, authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa abre chamado" ON public.tickets FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'Aberto' AND responsavel IS NULL AND procedimento IS NULL AND fechado_em IS NULL);
CREATE POLICY "Gestor ve chamados" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor cria chamados" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor atualiza chamados" ON public.tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor exclui chamados" ON public.tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER tickets_touch BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.configuracoes (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  regras jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leem regras" ON public.configuracoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Gestor cria regras" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor altera regras" ON public.configuracoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes;