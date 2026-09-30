import { Link } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Home, Menu, Headset, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    const salvo = localStorage.getItem("tema-ti") === "escuro";
    document.documentElement.classList.toggle("dark", salvo);
    setEscuro(salvo);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", escuro); }, [escuro]);
  const alternarTema = () => {
    const novo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novo);
    localStorage.setItem("tema-ti", novo ? "escuro" : "claro");
    setEscuro(novo);
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
           <Link to="/" className="flex shrink-0 items-center gap-2">
              <img src={senaiAsset.url} alt="SENAI LRV" width={40} height={40} className="size-10 rounded-xl object-contain shadow-sm" />
             <span className="text-sm font-bold text-foreground sm:text-base">TI Senai LRV</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {links(false)}
            {botaoConta}
              <Button variant="outline" size="icon" aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"} title={escuro ? "Tema claro" : "Tema escuro"} onClick={alternarTema}>{escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
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
              <Button variant="outline" onClick={alternarTema}>{escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}{escuro ? "Tema claro" : "Tema escuro"}</Button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
          TI Senai LRV
      </footer>
    </div>
  );
}
