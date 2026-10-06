import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import defaultIcone from "@/assets/icone.png";
import defaultCapaWebp from "@/assets/capa.webp";
import defaultCapaJpg from "@/assets/capa.jpg";
import { BotaoRetornar } from "@/components/BotaoRetornar";

const ASSET_VERSION = "20261005_v5";

const navPublico = [
  { to: "/", label: "Início", icon: Home },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2 },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
] as const;

const navGestor = [
  { to: "/atendimento", label: "Atendimento", icon: Headset },
  { to: "/regras", label: "Painel de Ajustes", icon: Settings2 },
] as const;

type Tema = "claro" | "escuro";

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => {
    const salvo = localStorage.getItem("tema-ti");
    const inicial: Tema = salvo === "escuro" ? salvo : "claro";
    document.documentElement.classList.toggle("dark", inicial === "escuro");
    document.documentElement.classList.remove("pastel");
    setTema(inicial);
  }, []);
  const escolherTema = (novo: Tema) => {
    document.documentElement.classList.toggle("dark", novo === "escuro");
    document.documentElement.classList.remove("pastel");
    localStorage.setItem("tema-ti", novo);
    setTema(novo);
  };
  const { isGestor, isAdmin, userRole, session, sair, regras } = useStore();
  const [bannerErro, setBannerErro] = useState(false);
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
  const showBanner = pathname === "/" && (regras.paginaInicial?.mostrarBanner ?? true);
  const bannerUrlSalva = regras.paginaInicial?.bannerUrl?.trim() || "";

  useEffect(() => {
    setBannerErro(false);
  }, [bannerUrlSalva]);

  // Se bannerUrlSalva for vazia, padrão (/capa.*) ou legada, usamos o pacote importado do projeto
  const isBannerPadrao =
    !bannerUrlSalva ||
    bannerUrlSalva === "/capa.png" ||
    bannerUrlSalva === "/capa.webp" ||
    bannerUrlSalva === "/capa.jpg" ||
    bannerUrlSalva.startsWith("/capa.") ||
    bannerUrlSalva.includes("iVBORw0KGgoAAASUhEUgAACAAAAAMACAIAAAA/whCdA") ||
    bannerUrlSalva.includes("senai-");

  const usarBannerPadrao = isBannerPadrao || bannerErro;
  const customBannerSrc = bannerUrlSalva.startsWith("data:")
    ? bannerUrlSalva
    : `${bannerUrlSalva}${bannerUrlSalva.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`;

  const bannerAltText = regras.paginaInicial?.bannerAlt || "TI SENAI Lucas do Rio Verde";
  const posicaoCapa = regras.paginaInicial?.posicaoCapa || "centro";
  const posicaoCapaClass =
    posicaoCapa === "topo"
      ? "object-top"
      : posicaoCapa === "base"
      ? "object-bottom"
      : "object-center";

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
    session?.user.user_metadata?.full_name ||
    session?.user.user_metadata?.name ||
    emailUsuario?.split("@")[0] ||
    "Usuário";

  const papelRotulo = isAdmin
    ? "Administrador"
    : isGestor
    ? "Gestor de TI"
    : "Usuário";

  const itens = [
    ...navPublico,
    ...(session && !isGestor ? [{ to: "/meus-chamados", label: "Meus Chamados", icon: FilePlus2 }] : []),
    ...(isGestor ? navGestor : []),
    ...(isAdmin ? [{ to: "/regras/usuarios", label: "Usuários", icon: Users }] : []),
  ];

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
              <Link to="/dashboard" className="flex items-center gap-2">
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
                <Link to="/regras/usuarios" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Gestão de Usuários</span>
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
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
      <Link to="/auth">
        <LogIn className="h-3.5 w-3.5 mr-1" /> Entrar
      </Link>
    </Button>
  );

  const alternarTema = () => {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    document.documentElement.classList.toggle("dark", novo === "escuro");
    document.documentElement.classList.remove("pastel");
    localStorage.setItem("tema-ti", novo);
    setTema(novo);
  };

  const botaoAlternarTema = (mobile: boolean) => (
    <Button
      variant="ghost"
      size={mobile ? "default" : "icon"}
      onClick={alternarTema}
      aria-label={tema === "escuro" ? "Alternar para modo claro" : "Alternar para modo escuro"}
      title={tema === "escuro" ? "Alternar para modo claro" : "Alternar para modo escuro"}
      className={mobile ? "justify-start font-medium gap-2 text-muted-foreground hover:text-foreground" : "h-8.5 w-8.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"}
    >
      {tema === "escuro" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
      {mobile && (tema === "escuro" ? "Modo Claro" : "Modo Escuro")}
    </Button>
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col justify-between">
      <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)] shadow-2xs">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
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
            {botaoAlternarTema(false)}
          </nav>
          <Button
            variant="outline"
            size="icon"
            className="ml-auto lg:hidden min-h-[44px] min-w-[44px] h-11 w-11"
            onClick={() => setAberto((v) => !v)}
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        {aberto && (
          <nav className="flex flex-col gap-2.5 border-t border-border bg-card p-4 lg:hidden animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-5rem)] overflow-y-auto">
            {session && (
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
            )}
            {links(true)}
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
                  <Link to="/auth">
                    <LogIn className="h-3.5 w-3.5 mr-1" /> Entrar
                  </Link>
                </Button>
              )}
              {botaoAlternarTema(false)}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5rem+env(safe-area-inset-top))] pb-6 sm:pb-8 flex-1">
        {showBanner && (
          <div className="mb-6 sm:mb-8 w-full">
            <Link
              to="/"
              className="group block w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:scale-[1.006] hover:border-g-blue/60 hover:shadow-md active:scale-[0.995]"
              title="Voltar para a página inicial"
            >
              <picture className="w-full block">
                {usarBannerPadrao ? (
                  <>
                    <source type="image/webp" srcSet={defaultCapaWebp} />
                    <img
                      src={defaultCapaJpg}
                      alt={bannerAltText}
                      width={1024}
                      height={384}
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        if (e.currentTarget.src !== defaultCapaJpg) {
                          e.currentTarget.src = defaultCapaJpg;
                        }
                      }}
                      className={`w-full aspect-[16/10] max-h-[220px] sm:aspect-[16/9] sm:max-h-[300px] lg:aspect-[21/9] lg:max-h-[360px] object-cover ${posicaoCapaClass} transition-transform duration-500 group-hover:scale-[1.01]`}
                    />
                  </>
                ) : (
                  <img
                    src={customBannerSrc}
                    alt={bannerAltText}
                    width={1024}
                    height={384}
                    loading="eager"
                    decoding="async"
                    onError={() => setBannerErro(true)}
                    className={`w-full aspect-[16/10] max-h-[220px] sm:aspect-[16/9] sm:max-h-[300px] lg:aspect-[21/9] lg:max-h-[360px] object-cover ${posicaoCapaClass} transition-transform duration-500 group-hover:scale-[1.01]`}
                  />
                )}
              </picture>
            </Link>
          </div>
        )}
        {children}
        {pathname !== "/" && <BotaoRetornar />}
      </main>
      <footer className="mt-auto border-t border-border py-6 text-center text-xs text-muted-foreground pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 px-4 sm:px-6 lg:px-8">
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
        </div>
      </footer>
    </div>
  );
}
