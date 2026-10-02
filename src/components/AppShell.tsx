import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import senaiIcone from "@/assets/senai-icone.png";
import senaiHero from "@/assets/senai-hero.png";

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
  const { isGestor, session, sair, regras } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBanner = (pathname === "/" || pathname === "/abrir") && (regras.paginaInicial?.mostrarBanner ?? true);
  const bannerImgSrc = regras.paginaInicial?.bannerUrl || senaiHero;
  const bannerAltText = regras.paginaInicial?.bannerAlt || "SENAI Lucas do Rio Verde - Ambiente Tecnológico de Inovação e Educação Profissional";
  const logoSrc = regras.identidadeVisual?.logoUrl || senaiIcone;
  const tituloSite = regras.identidadeVisual?.tituloSite || "TI SENAI LRV";
  const textoRodape = regras.rodape?.textoDireitos || "© 2026 TI SENAI LRV • Todos os direitos reservados • Criado por Claudinei Lima";
  const mostrarLgpd = regras.rodape?.mostrarLgpd ?? true;
  const rotuloLgpd = regras.rodape?.rotuloLgpd || "Privacidade e LGPD";
  const itens = [...navPublico, ...(isGestor ? navGestor : [])];

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
    <Button
      variant="outline"
      size="sm"
      onClick={() => sair()}
      className="font-medium text-xs text-muted-foreground hover:text-g-red hover:border-g-red/50 transition-colors"
    >
      <LogOut className="h-3.5 w-3.5 mr-1 text-g-red" /> Sair
    </Button>
  ) : (
    <Button asChild variant="outline" size="sm" className="font-medium text-xs text-muted-foreground hover:text-foreground transition-colors">
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
           <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
               <img src={logoSrc} alt={tituloSite} width={38} height={38} className="size-9.5 rounded-full object-cover shadow-sm scale-105 transition-transform duration-200" />
              <span className="text-sm font-extrabold text-foreground sm:text-base">{tituloSite}</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {links(false)}
            {botaoConta}
            {botaoAlternarTema(false)}
          </nav>
           <Button variant="outline" size="icon" className="ml-auto lg:hidden"
            onClick={() => setAberto((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
           </Button>
        </div>
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        {aberto && (
          <nav className="flex flex-col gap-2 border-t border-border bg-card p-3 lg:hidden">
            {links(true)}
            {botaoConta}
            {botaoAlternarTema(true)}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {showBanner && (
          <div className="mb-6 sm:mb-8 flex justify-center">
            <Link
              to="/"
              className={`group block w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-g-blue/60 hover:shadow-md active:scale-[0.99] ${
                pathname === "/abrir" ? "max-w-3xl" : "max-w-5xl"
              }`}
              title="Voltar para a página inicial"
            >
              <img
                src={bannerImgSrc}
                alt={bannerAltText}
                width={2048}
                height={768}
                className="aspect-[2048/768] min-h-[140px] sm:min-h-[220px] w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
              />
            </Link>
          </div>
        )}
        {children}
      </main>
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4">
        <span>{textoRodape}</span>
        {mostrarLgpd && (
          <>
            <span>•</span>
            <Link
              to="/lgpd"
              className="font-medium text-foreground/80 hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              {rotuloLgpd}
            </Link>
          </>
        )}
      </footer>
    </div>
  );
}
