import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun, Laptop, Check, Users, Mail } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore } from "@/lib/store-context";
import { type ModoTema, aplicarTemaNoDocumento, resolverEhEscuro } from "@/lib/tema";
import { supabase } from "@/integrations/supabase/client";
import defaultIcone from "@/assets/icone.png";
import { BotaoRetornar } from "@/components/BotaoRetornar";
import { ContainerPadrao } from "@/components/ContainerPadrao";
import { MENU_PADRAO, SEO_PADRAO } from "@/lib/types";

const ASSET_VERSION = "20261006_v6";

const navPublico = [
  { to: "/", label: "Início", icon: Home },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2 },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
] as const;

const navGestor = [
  { to: "/atendimento", label: "Atendimento", icon: Headset },
  { to: "/regras", label: "Painel de Ajustes", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const { isGestor, isAdmin, userRole, session, sair, regras, emailAlertsAtivos, alternarEmailAlertas } = useStore();

  const [modoTema, setModoTema] = useState<ModoTema>(() => {
    if (typeof window === "undefined") return "auto";
    const salvoModo = localStorage.getItem("tema-ti-modo");
    if (salvoModo && ["claro", "escuro", "auto"].includes(salvoModo)) {
      return salvoModo as ModoTema;
    }
    const salvoLegado = localStorage.getItem("tema-ti");
    if (salvoLegado === "escuro" || salvoLegado === "claro") {
      return salvoLegado as ModoTema;
    }
    return "auto";
  });

  // Aplica tema no DOM e meta tag
  useEffect(() => {
    const paleta = regras?.temaConfig?.paletaAtiva || "padrao";
    const custom = regras?.temaConfig?.paletaPersonalizada;
    aplicarTemaNoDocumento({
      modo: modoTema,
      paleta,
      custom,
      coresBotoes: regras?.coresBotoes,
      coresSite: regras?.coresSite,
    });
  }, [modoTema, regras?.temaConfig, regras?.coresBotoes, regras?.coresSite]);

  // Carrega tema preferido do usuário se logado
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    supabase
      .from("user_profiles")
      .select("tema_preferido")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.tema_preferido && ["claro", "escuro", "auto"].includes(data.tema_preferido)) {
          const pref = data.tema_preferido as ModoTema;
          setModoTema(pref);
        }
      });
  }, [session?.user?.id]);

  // Escuta alteração do prefers-color-scheme do sistema no modo automático
  useEffect(() => {
    if (modoTema !== "auto" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const paleta = regras?.temaConfig?.paletaAtiva || "padrao";
      const custom = regras?.temaConfig?.paletaPersonalizada;
      aplicarTemaNoDocumento({
        modo: "auto",
        paleta,
        custom,
        coresBotoes: regras?.coresBotoes,
        coresSite: regras?.coresSite,
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [modoTema, regras?.temaConfig, regras?.coresBotoes, regras?.coresSite]);

  const escolherModoTema = async (novo: ModoTema) => {
    setModoTema(novo);
    const paleta = regras?.temaConfig?.paletaAtiva || "padrao";
    const custom = regras?.temaConfig?.paletaPersonalizada;
    aplicarTemaNoDocumento({
      modo: novo,
      paleta,
      custom,
      coresBotoes: regras?.coresBotoes,
      coresSite: regras?.coresSite,
    });
    if (session?.user?.id) {
      try {
        await supabase
          .from("user_profiles")
          .update({
            tema_preferido: novo,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", session.user.id);
      } catch {}
    }
  };
  const [logoErro, setLogoErro] = useState(false);

  useEffect(() => {
    const rawFavicon = regras.identidadeVisual?.faviconUrl?.trim();
    const faviconUrl =
      !rawFavicon || rawFavicon.includes("senai") || rawFavicon.endsWith(".jpg")
        ? `${defaultIcone}?v=${ASSET_VERSION}`
        : rawFavicon.startsWith("data:")
        ? rawFavicon
        : `${rawFavicon}${rawFavicon.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`;
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    link.type = faviconUrl.endsWith(".ico") ? "image/x-icon" : "image/png";
  }, [regras.identidadeVisual?.faviconUrl]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const rawLogo = regras.identidadeVisual?.logoUrl?.trim() || "";
  useEffect(() => {
    setLogoErro(false);
  }, [rawLogo]);

  const isLogoPadrao =
    !rawLogo ||
    rawLogo === "/icone.png" ||
    rawLogo.includes("senai-") ||
    logoErro;

  const logoSrc = isLogoPadrao
    ? defaultIcone
    : (rawLogo.startsWith("data:") ? rawLogo : `${rawLogo}${rawLogo.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`);

  const tituloSite = regras.identidadeVisual?.tituloSite || "TI SENAI LRV";
  const textoRodape = regras.rodape?.textoDireitos || "© 2026 TI SENAI LRV • Todos os direitos reservados • Criado por Claudinei Lima";
  const mostrarLgpd = regras.rodape?.mostrarLgpd ?? true;
  const rotuloLgpd = regras.rodape?.rotuloLgpd || "Privacidade e LGPD";

  const emailUsuario = session?.user.email;
  const nomeUsuario =
    session?.user.user_metadata?.["full_name"] ||
    session?.user.user_metadata?.["name"] ||
    emailUsuario?.split("@")[0] ||
    "Usuário";

  const papelRotulo = isAdmin
    ? "Administrador"
    : isGestor
    ? "Gestor de TI"
    : "Usuário";

  // SEO dinâmico por página (Title e Description)
  useEffect(() => {
    const seo = regras.seo || SEO_PADRAO;
    let seoItem = seo.inicio;
    if (pathname === "/") seoItem = seo.inicio;
    else if (pathname === "/abrir") seoItem = seo.abrir;
    else if (pathname === "/dashboard") seoItem = seo.dashboard;
    else if (pathname.startsWith("/dashboard/acompanhamento")) seoItem = seo.acompanhamento;
    else if (pathname.startsWith("/dashboard/avaliacoes")) seoItem = seo.avaliacoes;
    else if (pathname === "/sobre") seoItem = seo.sobre;
    else if (pathname === "/lgpd") seoItem = seo.lgpd;
    else if (pathname === "/auth") seoItem = seo.login;

    if (seoItem?.titulo) {
      document.title = seoItem.titulo;
    }
    if (seoItem?.descricao) {
      let metaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = seoItem.descricao;
    }
  }, [pathname, regras.seo]);

  const menuConfig = regras.menu || MENU_PADRAO;
  const iconePorId: Record<string, any> = {
    inicio: Home,
    abrir: FilePlus2,
    dashboard: BarChart3,
    meusChamados: FilePlus2,
    atendimento: Headset,
    painel: Settings2,
  };

  const itens = useMemo(() => {
    return (menuConfig || MENU_PADRAO)
      .filter((item) => {
        if (!item.visivel) return false;
        if (item.id === "meusChamados") return Boolean(session && !isGestor);
        if (item.id === "atendimento" || item.id === "painel") return isGestor;
        return true;
      })
      .sort((a, b) => (a.ordem ?? 1) - (b.ordem ?? 1))
      .map((item) => ({
        to: item.to,
        label: item.label,
        icon: iconePorId[item.id] || Home,
      }));
  }, [menuConfig, session, isGestor]);

  const links = (mobile: boolean) =>
    itens.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => mobile && setAberto(false)}
        activeOptions={{ exact: item.to === "/" }}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
          mobile ? "w-full" : ""
        } text-muted-foreground hover:text-foreground hover:bg-muted/60 [&.active]:bg-muted [&.active]:text-foreground [&.active]:font-bold [&.active]:shadow-xs`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    ));

  const botaoConta = session ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu do usuário"
          className="group relative flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105 active:scale-95"
        >
          <UserAvatar
            session={session}
            className="ring-2 ring-primary/40 group-hover:ring-primary shadow-sm"
            sizeClassName="size-9"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 shadow-lg rounded-xl">
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex items-center gap-3">
            <UserAvatar session={session} sizeClassName="size-11" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground truncate" title={nomeUsuario}>
                {nomeUsuario}
              </span>
              <span className="text-xs text-muted-foreground truncate" title={emailUsuario}>
                {emailUsuario}
              </span>
              <div className="mt-1">
                <Badge
                  variant={isAdmin ? "default" : isGestor ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-medium"
                >
                  {papelRotulo}
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/meus-chamados" className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-muted-foreground" />
            <span>Meus Chamados</span>
          </Link>
        </DropdownMenuItem>
        {isGestor && (
          <>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/atendimento" className="flex items-center gap-2">
                <Headset className="h-4 w-4 text-muted-foreground" />
                <span>Atendimento</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/dashboard" search={{ tipo: undefined }} className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/regras" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span>Painel de Ajustes</span>
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/usuarios" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Gestão de Usuários</span>
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Alertas por e-mail</span>
          </div>
          <Switch
            checked={emailAlertsAtivos}
            onCheckedChange={(checked) => alternarEmailAlertas(checked)}
            aria-label="Receber alertas por e-mail"
            className="scale-90"
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => sair()}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button asChild variant="outline" size="sm" className="font-bold text-xs text-muted-foreground hover:text-foreground transition-colors shadow-2xs">
      <Link to="/auth" search={{ redirectTo: undefined, returnTo: undefined, error: undefined, error_description: undefined }}>
        <LogIn className="h-3.5 w-3.5 mr-1" /> Entrar
      </Link>
    </Button>
  );

  const seletorTemaDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Tema visual: ${modoTema === "auto" ? "Automático (sistema)" : modoTema === "escuro" ? "Modo Escuro" : "Modo Claro"}`}
          title={`Tema visual: ${modoTema === "auto" ? "Automático" : modoTema === "escuro" ? "Modo Escuro" : "Modo Claro"}`}
          className="h-8.5 w-8.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          {modoTema === "escuro" ? (
            <Moon className="size-4 text-sky-400" />
          ) : modoTema === "claro" ? (
            <Sun className="size-4 text-amber-500" />
          ) : (
            <Laptop className="size-4 text-foreground/80" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Tema de exibição
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => escolherModoTema("claro")}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <span className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" /> Claro
          </span>
          {modoTema === "claro" && <Check className="size-4 text-g-blue" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => escolherModoTema("escuro")}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <span className="flex items-center gap-2">
            <Moon className="size-4 text-sky-400" /> Escuro
          </span>
          {modoTema === "escuro" && <Check className="size-4 text-g-blue" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => escolherModoTema("auto")}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <span className="flex items-center gap-2">
            <Laptop className="size-4 text-muted-foreground" /> Automático (sistema)
          </span>
          {modoTema === "auto" && <Check className="size-4 text-g-blue" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col justify-between">
      <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)] shadow-2xs">
        <ContainerPadrao className="flex items-center justify-between gap-3 py-2.5 sm:py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 group min-h-[44px]" title={`${tituloSite} - Início`}>
            <img
              src={logoSrc}
              alt="Ícone TI SENAI LRV"
              width={38}
              height={38}
              decoding="async"
              onError={() => setLogoErro(true)}
              className="size-8.5 sm:size-9.5 rounded-full object-cover shadow-sm scale-105 transition-transform duration-200 group-hover:scale-110 shrink-0"
            />
            <span className="font-extrabold text-base sm:text-xl tracking-tight text-foreground group-hover:text-g-blue transition-colors select-none">
              TI SENAI LRV
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {links(false)}
            {botaoConta}
            {seletorTemaDropdown}
          </nav>
          <div className="flex items-center gap-1.5 lg:hidden ml-auto">
            {seletorTemaDropdown}
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] h-11 w-11"
              onClick={() => setAberto((v) => !v)}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </ContainerPadrao>
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--header-stripe-1,var(--g-blue))_0%,var(--header-stripe-1,var(--g-blue))_25%,var(--header-stripe-2,var(--g-red))_25%,var(--header-stripe-2,var(--g-red))_50%,var(--header-stripe-3,var(--g-yellow))_50%,var(--header-stripe-3,var(--g-yellow))_75%,var(--header-stripe-4,var(--g-green))_75%)]" />
        {aberto && (
          <ContainerPadrao as="nav" className="flex flex-col gap-2.5 border-t border-border bg-card p-4 lg:hidden animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-5rem)] overflow-y-auto">
            {session && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5 border border-border/60">
                  <UserAvatar session={session} sizeClassName="size-9" />
                  <div className="overflow-hidden leading-tight flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground truncate">{nomeUsuario}</p>
                      <Badge variant={isAdmin ? "default" : isGestor ? "secondary" : "outline"} className="text-[9px] px-1 py-0">
                        {papelRotulo}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{emailUsuario}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs text-foreground border border-border/50">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Alertas por e-mail</span>
                  </div>
                  <Switch
                    checked={emailAlertsAtivos}
                    onCheckedChange={(checked) => alternarEmailAlertas(checked)}
                    aria-label="Receber alertas por e-mail"
                    className="scale-90"
                  />
                </div>
              </>
            )}
            {links(true)}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <span className="text-xs font-semibold text-muted-foreground">Tema de exibição:</span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl">
                <Button
                  type="button"
                  variant={modoTema === "claro" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => escolherModoTema("claro")}
                  className="h-10 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Sun className="size-3.5 text-amber-500" /> Claro
                </Button>
                <Button
                  type="button"
                  variant={modoTema === "escuro" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => escolherModoTema("escuro")}
                  className="h-10 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Moon className="size-3.5 text-sky-400" /> Escuro
                </Button>
                <Button
                  type="button"
                  variant={modoTema === "auto" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => escolherModoTema("auto")}
                  className="h-10 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Laptop className="size-3.5" /> Auto
                </Button>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              {session ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAberto(false);
                    sair();
                  }}
                  className="font-bold text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" onClick={() => setAberto(false)} className="font-bold text-xs">
                  <Link to="/auth" search={{ redirectTo: undefined, returnTo: undefined, error: undefined, error_description: undefined }}>
                    <LogIn className="h-3.5 w-3.5 mr-1" /> Entrar
                  </Link>
                </Button>
              )}
            </div>
          </ContainerPadrao>
        )}
      </header>
      <ContainerPadrao as="main" className="pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5rem+env(safe-area-inset-top))] pb-6 sm:pb-8 flex-1">
        {children}
        {pathname !== "/" && <BotaoRetornar />}
      </ContainerPadrao>
      <footer className="mt-auto border-t border-border py-6 text-center text-xs text-muted-foreground pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <ContainerPadrao className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
          <span>{textoRodape}</span>
          <span>•</span>
          <Link
            to="/sobre"
            className="font-medium text-foreground/80 hover:text-primary hover:underline underline-offset-2 transition-colors py-1 inline-block"
          >
            Sobre
          </Link>
          {mostrarLgpd && (
            <>
              <span>•</span>
              <Link
                to="/lgpd"
                className="font-medium text-foreground/80 hover:text-primary hover:underline underline-offset-2 transition-colors py-1 inline-block"
              >
                {rotuloLgpd}
              </Link>
            </>
          )}
        </ContainerPadrao>
      </footer>
    </div>
  );
}
