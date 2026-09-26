import { Link } from "@tanstack/react-router";
import { BarChart3, FilePlus2, Settings2, Table2, Home, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Início", icon: Home, cor: "var(--g-blue)" },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, cor: "var(--g-red)" },
  { to: "/chamados", label: "Planilha de Chamados", icon: Table2, cor: "var(--g-yellow)" },
  { to: "/abrir", label: "Abrir Chamado", icon: FilePlus2, cor: "var(--g-green)" },
  { to: "/regras", label: "Regras e Prioridades", icon: Settings2, cor: "var(--g-blue)" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--g-blue)] text-lg font-bold text-white">
              TI
            </span>
            <span className="hidden text-base font-semibold tracking-tight sm:block">
              Central de Chamados
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <item.icon className="h-4 w-4" style={{ color: item.cor }} />
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            className="ml-auto rounded-lg p-2 hover:bg-muted md:hidden"
            onClick={() => setAberto((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--g-blue)_0%,var(--g-blue)_25%,var(--g-red)_25%,var(--g-red)_50%,var(--g-yellow)_50%,var(--g-yellow)_75%,var(--g-green)_75%)]" />

        {aberto && (
          <nav className="flex flex-col gap-1 border-t border-border bg-card p-3 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted",
                )}
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <item.icon className="h-4 w-4" style={{ color: item.cor }} />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
        Central de Chamados de TI · dados salvos neste navegador
      </footer>
    </div>
  );
}
