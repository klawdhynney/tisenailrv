import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import senaiIcone from "@/assets/senai-icone.png";
import senaiCapa from "@/assets/senai-capa.png";

const navPublico = [
  { to: "/", label: "Início", icon: Home, variante: "google-blue" },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2, variante: "google-green" },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, variante: "google-red" },
] as const;

const navGestor = [
  { to: "/atendimento", label: "Atendimento", icon: Headset, variante: "google-green" },
  { to: "/regras", label: "Regras", icon: Settings2, variante: "google-blue" },
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
  const { isGestor, session, sair } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBanner = pathname === "/" || pathname === "/abrir";
  const itens = [...navPublico, ...(isGestor ? navGestor : [])];

  const links = (mobile: boolean) =>
    itens.map((item) => (
      <Button asChild variant={item.variante} key={item.to} className="font-bold">
      <Link
        key={item.to}
        to={item.to}
        onClick={() => mobile && setAberto(false)}
        activeOptions={{ exact: item.to === "/" }}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
      </Button>
    ));

  const botaoConta = session ? (
    <Button variant="outline" onClick={() => sair()} className="hover:border-g-red hover:text-g-red font-semibold">
      <LogOut className="h-4 w-4 text-g-red" /> Sair
    </Button>
  ) : (
    <Button asChild variant="google-yellow">
      <Link to="/auth">
        <LogIn className="h-4 w-4" /> Entrar
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
      variant="outline"
      size={mobile ? "default" : "icon"}
      onClick={alternarTema}
      aria-label={tema === "escuro" ? "Alternar para modo claro" : "Alternar para modo escuro"}
      title={tema === "escuro" ? "Alternar para modo claro" : "Alternar para modo escuro"}
      className={mobile ? "justify-start font-semibold gap-2" : "cursor-pointer transition-transform hover:scale-105"}
    >
      {tema === "escuro" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700 dark:text-slate-300" />}
      {mobile && (tema === "escuro" ? "Modo Claro" : "Modo Escuro")}
    </Button>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
           <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
               <img src={senaiIcone} alt="SENAI LRV" width={38} height={38} className="size-9.5 rounded-full object-cover shadow-sm scale-105 transition-transform duration-200" />
              <span className="text-sm font-extrabold text-foreground sm:text-base">TI SENAI LRV</span>
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
              className={`group block w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:scale-[1.012] hover:border-g-blue/60 hover:shadow-lg active:scale-[0.99] ${
                pathname === "/abrir" ? "max-w-3xl" : "max-w-5xl"
              }`}
              title="Voltar para a página inicial"
            >
              <img
                src={senaiCapa}
                alt="SENAI Lucas do Rio Verde"
                width={1024}
                height={384}
                className="aspect-[1024/384] h-auto w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </Link>
          </div>
        )}
        {children}
      </main>
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
           © 2026 TI SENAI LRV • Todos os direitos reservados • Criado por Claudinei Lima
      </footer>
    </div>
  );
}
