import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, LogOut, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { useLoading } from "@/lib/loading-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: typeof search.redirectTo === "string" ? search.redirectTo : undefined,
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description: typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar | TI Senai LRV" },
      {
        name: "description",
        content: "Acesse seus chamados com autenticação segura via conta Google ou Microsoft.",
      },
      { property: "og:title", content: "Entrar | TI Senai LRV" },
      {
        property: "og:description",
        content: "Acesse e acompanhe seus chamados com autenticação Google ou Microsoft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, isGestor, authPronto, sair, regras } = useStore();
  const { wrapAsync, resetLoading } = useLoading();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  const [carregandoOAuth, setCarregandoOAuth] = useState<"google" | "microsoft" | null>(null);

  // Lê returnTo ou redirectTo da busca ou do sessionStorage persistido antes do OAuth
  const destino = useMemo(() => {
    const fromSearch =
      (typeof search.returnTo === "string" && search.returnTo) ||
      (typeof search.redirectTo === "string" && search.redirectTo) ||
      "";
    if (fromSearch && fromSearch.startsWith("/")) return fromSearch;

    if (typeof window !== "undefined") {
      try {
        const fromStorage = sessionStorage.getItem("auth_return_to");
        if (fromStorage && fromStorage.startsWith("/")) return fromStorage;
      } catch {}
    }
    return null;
  }, [search.returnTo, search.redirectTo]);

  // Pré-carrega o código JS da rota de destino imediatamente na montagem
  useEffect(() => {
    if (destino) {
      try {
        router.preloadRoute({ to: destino as any }).catch(() => {});
      } catch {}
    }
  }, [destino, router]);

  // Trata redirecionamento e erros de OAuth da URL
  useEffect(() => {
    if (search.error || search.error_description) {
      resetLoading();
      if (search.error === "access_denied" || search.error_description?.includes("denied")) {
        toast.info("A tentativa de entrada foi cancelada ou não autorizada.");
      } else {
        toast.error(search.error_description || "Ocorreu um erro na autenticação com o provedor.");
      }
    }
  }, [search.error, search.error_description, resetLoading]);

  // Se já estiver logado ou logo após o retorno do OAuth, redireciona imediatamente sem esperas artificiais
  useEffect(() => {
    if (session && authPronto) {
      try {
        sessionStorage.removeItem("auth_return_to");
      } catch {}
      const rotaFinal = destino || (isGestor ? "/atendimento" : "/meus-chamados");
      navigate({ to: rotaFinal as any, replace: true });
    }
  }, [session, authPronto, isGestor, destino, navigate]);

  async function entrarComOAuth(provider: "google" | "microsoft") {
    if (carregandoOAuth) return;
    setCarregandoOAuth(provider);

    await wrapAsync(async () => {
      try {
        const callbackUrl = new URL("/auth", window.location.origin);
        if (destino) {
          try {
            sessionStorage.setItem("auth_return_to", destino);
          } catch {}
          callbackUrl.searchParams.set("returnTo", destino);
          callbackUrl.searchParams.set("redirectTo", destino);
        }

        // Tenta pelo Lovable Cloud Auth
        const r = await lovable.auth.signInWithOAuth(provider, {
          redirect_uri: callbackUrl.toString(),
        });

        if (r.error) {
          console.warn("Lovable OAuth fallback para Supabase:", r.error);
          const sbProvider = provider === "microsoft" ? "azure" : "google";
          const { error: sbErr } = await supabase.auth.signInWithOAuth({
            provider: sbProvider,
            options: {
              redirectTo: callbackUrl.toString(),
              queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
            },
          });
          if (sbErr) throw sbErr;
        }
      } catch (err: unknown) {
        console.error("Falha ao entrar:", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("cancelled") || msg.includes("denied") || msg.includes("closed")) {
          toast.info("A tentativa de conexão foi cancelada.");
        } else {
          toast.error(
            `Não foi possível conectar com ${provider === "google" ? "Google" : "Microsoft"}. Verifique as configurações de login.`
          );
        }
      } finally {
        setCarregandoOAuth(null);
      }
    }, { text: `Conectando com ${provider === "google" ? "Google" : "Microsoft"}...` });
  }

  const desconectar = async () => {
    await wrapAsync(async () => {
      await sair();
      toast.success("Você saiu da sua conta.");
    }, { text: "Saindo..." });
  };

  const emailUsuario = session?.user.email;
  const nomeUsuario =
    session?.user.user_metadata?.full_name ||
    session?.user.user_metadata?.name ||
    emailUsuario?.split("@")[0];

  return (
    <div className="mx-auto max-w-md py-10 px-4 min-h-[70vh] flex flex-col justify-center">
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6 border-t-4 border-t-g-blue">
        {/* Cabeçalho (somente texto) */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-g-blue/10 border border-g-blue/30 text-g-blue font-black tracking-tight text-base sm:text-lg shadow-2xs">
            TI SENAI LRV
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Acesso ao Sistema
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Identifique-se com sua conta Google ou Microsoft para abrir chamados e acompanhar atendimentos.
          </p>
        </div>

        {/* Se já autenticado */}
        {session ? (
          <div className="rounded-2xl border border-g-green/40 bg-g-green/10 p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-g-green dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <span>Conectado no sistema</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">{nomeUsuario}</p>
              <p className="text-xs font-mono text-muted-foreground truncate">{emailUsuario}</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                asChild
                size="sm"
                variant="google-blue"
                className="w-full font-bold shadow-xs gap-1.5"
              >
                <Link to={destino || (isGestor ? "/atendimento" : "/meus-chamados")}>
                  Continuar para {destino ? "a página solicitada" : isGestor ? "Atendimento" : "Meus Chamados"}{" "}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
                onClick={desconectar}
              >
                <LogOut className="mr-1.5 size-3.5" /> Sair da conta
              </Button>
            </div>
          </div>
        ) : (
          /* Dois botões grandes e claros: Google e Microsoft */
          <div className="space-y-3.5 pt-1">
            {/* Botão Entrar com Google */}
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(carregandoOAuth)}
              onClick={() => entrarComOAuth("google")}
              className="w-full h-13 rounded-2xl border-2 border-border/80 hover:border-g-blue/60 bg-card hover:bg-muted/40 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 text-sm sm:text-base font-bold text-foreground"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{carregandoOAuth === "google" ? "Conectando ao Google..." : "Entrar com Google"}</span>
            </Button>

            {/* Botão Entrar com Microsoft */}
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(carregandoOAuth)}
              onClick={() => entrarComOAuth("microsoft")}
              className="w-full h-13 rounded-2xl border-2 border-border/80 hover:border-g-blue/60 bg-card hover:bg-muted/40 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 text-sm sm:text-base font-bold text-foreground"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span>{carregandoOAuth === "microsoft" ? "Conectando à Microsoft..." : "Entrar com Microsoft"}</span>
            </Button>
          </div>
        )}

        {/* Informações de privacidade e LGPD */}
        <div className="pt-2 border-t border-border/60 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            O acesso ao suporte técnico de TI é restrito aos colaboradores e alunos autenticados.
            Seus dados são protegidos conforme nossa{" "}
            <Link to="/lgpd" className="text-g-blue hover:underline font-semibold inline-flex items-center gap-0.5">
              Política de Privacidade e LGPD
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
