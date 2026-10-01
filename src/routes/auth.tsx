import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, LogOut, Mail, MessageCircle } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | TI Senai LRV" },
      {
        name: "description",
        content:
          "Acesse seus chamados com login simples por e-mail, WhatsApp ou autenticação Google / Microsoft.",
      },
      { property: "og:title", content: "Entrar | TI Senai LRV" },
      {
        property: "og:description",
        content: "Acompanhe seus chamados informando o e-mail cadastrado, WhatsApp ou conta corporativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, isGestor, authPronto, sair } = useStore();
  const navigate = useNavigate();
  const [carregandoOAuth, setCarregandoOAuth] = useState(false);
  const [carregandoEmail, setCarregandoEmail] = useState(false);
  const [carregandoWpp, setCarregandoWpp] = useState(false);
  const [modoAcesso, setModoAcesso] = useState<"email" | "whatsapp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [emailSalvo, setEmailSalvo] = useState<string | null>(null);
  const [whatsappSalvo, setWhatsappSalvo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const salvoEmail =
        localStorage.getItem("tisenai_user_email") || localStorage.getItem("tisenai_email");
      if (salvoEmail && !salvoEmail.includes("@whatsapp.senailrv.local")) {
        setEmailSalvo(salvoEmail);
      }

      const salvoWpp =
        localStorage.getItem("tisenai_user_whatsapp_display") ||
        localStorage.getItem("tisenai_user_whatsapp");
      if (salvoWpp) {
        setWhatsappSalvo(salvoWpp);
        if (!salvoEmail || salvoEmail.includes("@whatsapp.senailrv.local")) {
          setModoAcesso("whatsapp");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (session && authPronto && isGestor) {
      navigate({ to: "/atendimento" });
    }
  }, [session, authPronto, isGestor, navigate]);

  const emailAtivo = session?.user.email ?? emailSalvo;
  const whatsappAtivo = whatsappSalvo;

  async function entrarComOAuth(provider: "microsoft" | "google") {
    setCarregandoOAuth(true);
    const r = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) {
      toast.error(`Não foi possível entrar com ${provider === "google" ? "Google" : "Microsoft"}.`);
    }
    setCarregandoOAuth(false);
  }

  async function entrarComEmail(e: React.FormEvent) {
    e.preventDefault();
    const limpo = emailInput.trim().toLowerCase();

    // Validação estrita de formato de e-mail
    if (!limpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
      toast.error("Por favor, digite um e-mail válido para acessar.");
      return;
    }

    setCarregandoEmail(true);

    try {
      localStorage.setItem("tisenai_user_email", limpo);
      localStorage.setItem("tisenai_email", limpo);
      setEmailSalvo(limpo);

      try {
        await supabase.auth.signInWithOtp({
          email: limpo,
          options: {
            emailRedirectTo: window.location.origin + "/meus-chamados",
          },
        });
      } catch (err) {
        console.warn("OTP Supabase:", err);
      }

      toast.success(`Acesso liberado para o e-mail: ${limpo}`);
      navigate({ to: "/meus-chamados" });
    } catch (err: any) {
      toast.error("Ocorreu um erro ao validar seu e-mail. Tente novamente.");
    } finally {
      setCarregandoEmail(false);
    }
  }

  async function entrarComWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    const limpo = whatsappInput.trim();
    const digits = limpo.replace(/\D/g, "");

    if (digits.length < 10) {
      toast.error("Informe um número de WhatsApp válido com DDD (ex: 65 99999-9999).");
      return;
    }

    setCarregandoWpp(true);
    try {
      localStorage.setItem("tisenai_user_whatsapp", digits);
      localStorage.setItem("tisenai_user_whatsapp_display", limpo);
      const alias = `${digits}@whatsapp.senailrv.local`;
      localStorage.setItem("tisenai_user_email", alias);
      localStorage.setItem("tisenai_email", alias);
      setWhatsappSalvo(limpo);

      toast.success(`Acesso liberado para o WhatsApp: ${limpo}`);
      navigate({ to: "/meus-chamados" });
    } catch (err) {
      toast.error("Erro ao validar WhatsApp. Tente novamente.");
    } finally {
      setCarregandoWpp(false);
    }
  }

  const desconectar = async () => {
    localStorage.removeItem("tisenai_user_email");
    localStorage.removeItem("tisenai_email");
    localStorage.removeItem("tisenai_user_whatsapp");
    localStorage.removeItem("tisenai_user_whatsapp_display");
    setEmailSalvo(null);
    setWhatsappSalvo(null);
    await sair();
    toast.success("Desconectado com sucesso.");
  };

  return (
    <div className="mx-auto max-w-md py-6 px-4">
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-lg space-y-6 border-t-4 border-t-g-blue">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-g-blue/10 text-g-blue">
            {modoAcesso === "whatsapp" ? (
              <MessageCircle className="size-6 text-[#25D366]" />
            ) : (
              <Mail className="size-6 text-g-blue" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Acesso ao Sistema</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe seus chamados informando o e-mail ou o número de WhatsApp usado na abertura.
          </p>
        </div>

        {/* Status de conectado */}
        {(emailAtivo || whatsappAtivo) && (
          <div className="rounded-xl border border-g-green/30 bg-g-green/10 p-3.5 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-g-green dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <span>Conectado como</span>
            </div>
            <p className="text-xs font-mono font-medium text-foreground truncate">
              {whatsappAtivo ? `WhatsApp: ${whatsappAtivo}` : emailAtivo}
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild size="sm" variant="google-green" className="w-full font-semibold">
                <Link to="/meus-chamados">Acessar Meus Chamados</Link>
              </Button>
              {isGestor && (
                <Button asChild size="sm" variant="google-blue" className="w-full font-semibold">
                  <Link to="/atendimento">Painel de Atendimento (Gestor)</Link>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={desconectar}
              >
                <LogOut className="mr-1.5 size-3.5" /> Sair ou trocar identificação
              </Button>
            </div>
          </div>
        )}

        {/* Alternador de Método de Entrada: E-mail ou WhatsApp */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setModoAcesso("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                modoAcesso === "email"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="size-3.5 text-g-blue" /> Por E-mail
            </button>
            <button
              type="button"
              onClick={() => setModoAcesso("whatsapp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                modoAcesso === "whatsapp"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="size-3.5 text-[#25D366]" /> Por WhatsApp
            </button>
          </div>

          {modoAcesso === "email" ? (
            /* Formulário de Login por E-mail */
            <form onSubmit={entrarComEmail} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="email-acesso" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Acesso por E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email-acesso"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="seu.email@senaimt.ind.br"
                    className="pl-9 h-11 text-sm bg-background"
                    disabled={carregandoEmail}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Digite o mesmo e-mail informado ao abrir o chamado para liberar seu ambiente.
                </p>
              </div>

              <Button
                type="submit"
                variant="google-blue"
                className="w-full h-11 font-semibold gap-2 shadow-xs text-sm"
                disabled={carregandoEmail || !emailInput.trim()}
              >
                {carregandoEmail ? (
                  "Validando e acessando..."
                ) : (
                  <>
                    Acessar meus chamados <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* Formulário de Login por WhatsApp */
            <form onSubmit={entrarComWhatsapp} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp-acesso" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Acesso por WhatsApp (Número do Chamado)
                </Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#25D366]" />
                  <Input
                    id="whatsapp-acesso"
                    type="tel"
                    required
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="(65) 99999-9999"
                    className="pl-9 h-11 text-sm bg-background"
                    disabled={carregandoWpp}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Digite o mesmo número de WhatsApp utilizado na abertura do chamado.
                </p>
              </div>

              <Button
                type="submit"
                variant="google-green"
                className="w-full h-11 font-semibold gap-2 shadow-xs text-sm"
                disabled={carregandoWpp || !whatsappInput.trim()}
              >
                {carregandoWpp ? (
                  "Consultando chamados..."
                ) : (
                  <>
                    Acessar com WhatsApp <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
            <span className="bg-card px-2 text-muted-foreground">ou acesse com conta corporativa</span>
          </div>
        </div>

        {/* Opções OAuth Google / Microsoft */}
        <div className="grid gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs font-semibold gap-2 border-border/80 hover:bg-muted/50"
            onClick={() => entrarComOAuth("google")}
            disabled={carregandoOAuth}
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Entrar com Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs font-semibold gap-2 border-border/80 hover:bg-muted/50"
            onClick={() => entrarComOAuth("microsoft")}
            disabled={carregandoOAuth}
          >
            <svg className="size-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            Entrar com Microsoft
          </Button>
        </div>
      </div>
    </div>
  );
}
