import { Link } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Table2, Home, Menu, Headset, LogIn, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";

const navPublico = [
  { to: "/", label: "Início", icon: Home, cor: "var(--g-blue)" },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2, cor: "var(--g-green)" },
] as const;

const navGestor = [
  { to: "/atendimento", label: "Atendimento", icon: Headset, cor: "var(--g-green)" },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, cor: "var(--g-red)" },
  { to: "/chamados", label: "Planilha", icon: Table2, cor: "var(--g-yellow)" },
  { to: "/regras", label: "Regras", icon: Settings2, cor: "var(--g-blue)" },
] as const;

const linkCls =
  "flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[var(--g-blue)] hover:bg-muted";
const ativoCls = "border-[var(--g-blue)] bg-muted shadow-[0_0_16px_-4px_var(--g-blue)]";

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const { isGestor, session, sair } = useStore();
  const itens = [...navPublico, ...(isGestor ? navGestor : [])];

  const links = (mobile: boolean) =>
    itens.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => mobile && setAberto(false)}
        className={linkCls}
        activeProps={{ className: ativoCls }}
        activeOptions={{ exact: item.to === "/" }}
      >
        <item.icon className="h-4 w-4" style={{ color: item.cor }} />
        {item.label}
      </Link>
    ));

  const botaoConta = session ? (
    <button onClick={() => sair()} className={linkCls}>
      <LogOut className="h-4 w-4 text-[var(--g-red)]" /> Sair
    </button>
  ) : (
    <Link to="/auth" className={linkCls}>
      <LogIn className="h-4 w-4 text-[var(--g-yellow)]" /> Área do gestor
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--g-blue)] bg-primary text-lg font-bold text-primary-foreground">
              TI
            </span>
            <span className="hidden text-base font-semibold tracking-tight sm:block">Central de Chamados</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {links(false)}
            {botaoConta}
          </nav>
          <button
            className="ml-auto rounded-lg border-2 border-border p-2 hover:bg-muted lg:hidden"
            onClick={() => setAberto((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />
        {aberto && (
          <nav className="flex flex-col gap-2 border-t border-border bg-card p-3 lg:hidden">
            {links(true)}
            {botaoConta}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
        Central de Chamados de TI
      </footer>
    </div>
  );
}
