import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Área do Gestor de TI" },
      { name: "description", content: "Acesso restrito da equipe de TI para atender e gerenciar chamados." },
      { property: "og:title", content: "Área do Gestor de TI" },
      { property: "og:description", content: "Acesso restrito da equipe de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useStore();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/atendimento" });
  }, [session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + "/auth" } });
    setCarregando(false);
    if (error) return toast.error(error.message);
    if (modo === "cadastrar") toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-[var(--g-blue)] bg-card p-8 shadow-[0_0_40px_-10px_var(--g-blue)]">
      <h1 className="text-2xl font-bold">Área do Gestor</h1>
      <p className="mt-1 text-sm text-muted-foreground">Acesso exclusivo da equipe de TI.</p>
      <form onSubmit={enviar} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={carregando}>
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
      <Button variant="outline" className="mt-3 w-full" onClick={google}>Entrar com Google</Button>
      <button className="mt-4 w-full text-sm text-[var(--g-blue)] underline" onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}>
        {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
