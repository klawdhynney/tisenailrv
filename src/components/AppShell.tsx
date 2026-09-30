import { Link } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun, Palette, Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store-context";
import senaiAsset from "@/assets/senai-lrv.png.asset.json";

const navPublico = [
  { to: "/", label: "Início", icon: Home, variante: "google-blue" },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2, variante: "google-green" },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, variante: "google-red" },
] as const;

const navGestor = [
  { to: "/atendimento", label: "Atendimento", icon: Headset, variante: "google-green" },
  { to: "/regras", label: "Regras", icon: Settings2, variante: "google-blue" },
] as const;

type Tema = "claro" | "pastel" | "escuro";
const temas = [
  { valor: "claro", nome: "Claro", icon: Sun },
  { valor: "pastel", nome: "Claro pastel", icon: Palette },
  { valor: "escuro", nome: "Escuro", icon: Moon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => {
    const salvo = localStorage.getItem("tema-ti");
    const inicial: Tema = salvo === "escuro" || salvo === "pastel" ? salvo : "claro";
    document.documentElement.classList.toggle("dark", inicial === "escuro");
    document.documentElement.classList.toggle("pastel", inicial === "pastel");
    setTema(inicial);
  }, []);
  const escolherTema = (novo: Tema) => {
    document.documentElement.classList.toggle("dark", novo === "escuro");
    document.documentElement.classList.toggle("pastel", novo === "pastel");
    localStorage.setItem("tema-ti", novo);
    setTema(novo);
  };
  const { isGestor, session, sair } = useStore();
  const itens = [...navPublico, ...(isGestor ? navGestor : [])];

  const links = (mobile: boolean) =>
    itens.map((item) => (
      <Button asChild variant={item.variante} key={item.to}>
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
    <Button variant="outline" onClick={() => sair()}>
      <LogOut className="h-4 w-4 text-[var(--g-red)]" /> Sair
    </Button>
  ) : (
    <Button asChild variant="google-yellow"><Link to="/auth">
      <LogIn className="h-4 w-4 text-[var(--g-yellow)]" /> Entrar
    </Link></Button>
  );

  const seletorTema = (mobile: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={mobile ? "default" : "icon"} aria-label="Escolher tema" title="Escolher tema" className={mobile ? "justify-start" : undefined}>
          {tema === "escuro" ? <Moon className="size-4" /> : tema === "pastel" ? <Palette className="size-4" /> : <Sun className="size-4" />}
          {mobile && "Tema"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {temas.map(({ valor, nome, icon: Icon }) => (
          <DropdownMenuItem key={valor} onSelect={() => escolherTema(valor)}>
            <Icon className="size-4" /> {nome}
            {tema === valor && <Check className="ml-auto size-4" aria-label="Selecionado" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
           <Link to="/" className="flex shrink-0 items-center gap-2">
              <img src={senaiAsset.url} alt="SENAI LRV" width={40} height={40} className="size-10 rounded-xl object-contain shadow-sm" />
              <span className="text-sm font-bold text-foreground sm:text-base">TI SENAI LRV</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {links(false)}
            {botaoConta}
              {seletorTema(false)}
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
              {seletorTema(true)}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
           © 2026 TI SENAI LRV • Todos os direitos reservados • Criado por Claudinei Lima
      </footer>
    </div>
  );
}
