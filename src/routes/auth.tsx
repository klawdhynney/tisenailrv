import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | TI Senai LRV" },
      { name: "description", content: "Acesse seus chamados por e-mail ou entre na gestão com uma conta autorizada." },
      { property: "og:title", content: "Entrar | TI Senai LRV" },
      { property: "og:description", content: "Acompanhe seus chamados com seu e-mail confirmado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, isGestor, authPronto, sair } = useStore();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (session && authPronto && isGestor) navigate({ to: "/atendimento" });
  }, [session, authPronto, isGestor, navigate]);

  async function entrar(provider: "microsoft" | "google") {
    setCarregando(true);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(`Não foi possível entrar com ${provider === "google" ? "Google" : "Microsoft"}.`);
    setCarregando(false);
  }

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/meus-chamados` } });
    setCarregando(false);
    if (error) toast.error("Não foi possível enviar o código. Tente novamente."); else { setEnviado(true); toast.success("Confira seu e-mail para entrar."); }
  }
  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: "email" });
    setCarregando(false);
    if (error) toast.error("Código inválido ou expirado."); else navigate({ to: "/meus-chamados" });
  }

  return (
    <div className="mx-auto max-w-md border-t-4 border-primary bg-card p-8">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-sm text-muted-foreground">Acompanhe os chamados associados ao seu e-mail.</p>
      {session && authPronto && !isGestor && <div className="mt-4 space-y-3"><p className="text-sm">Conectado como {session.user.email}</p><Button asChild className="w-full"><a href="/meus-chamados">Ver meus chamados</a></Button><Button variant="outline" className="w-full" onClick={() => sair()}>Sair desta conta</Button></div>}
      {!session && <form onSubmit={enviado ? confirmarCodigo : pedirCodigo} className="mt-6 grid gap-3"><label className="text-sm font-medium" htmlFor="email-acesso">Seu e-mail</label><Input id="email-acesso" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />{enviado && <><label className="text-sm font-medium" htmlFor="codigo-acesso">Código recebido no e-mail</label><Input id="codigo-acesso" inputMode="numeric" required value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código de acesso" /></>}<Button type="submit" disabled={carregando}>{carregando ? "Aguarde…" : enviado ? "Confirmar código" : "Receber código de acesso"}</Button>{enviado && <Button type="button" variant="ghost" onClick={() => setEnviado(false)}>Usar outro e-mail</Button>}</form>}
      <p className="mt-8 border-t border-border pt-5 text-sm font-semibold">Acesso do gestor</p>
      <p className="mt-1 text-sm text-muted-foreground">Entre com uma das contas autorizadas para gerenciar os chamados.</p>
      <div className="mt-6 grid gap-3">
        <Button className="w-full" onClick={() => entrar("microsoft")} disabled={carregando}>Entrar com Microsoft</Button>
        <Button variant="outline" className="w-full" onClick={() => entrar("google")} disabled={carregando}>Entrar com Google</Button>
      </div>
    </div>
  );
}
